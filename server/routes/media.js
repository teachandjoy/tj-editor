import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../database.js';
import { validateMimeType } from '../middleware/mimeValidation.js';
import { requireAuth } from '../middleware/auth.js';
import { getAccessibleOfferIds } from '../middleware/rbac.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure server/data/media directory exists
const mediaDir = path.join(__dirname, '..', 'data', 'media');
if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

// Multer storage: save files to server/data/media/ with unique names
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, mediaDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `${base}_${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

const router = Router();

// Helper: build absolute URL for a stored file
function buildFileUrl(req, filename) {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${protocol}://${host}/media/${filename}`;
}

function rowToMedia(row) {
  return {
    id: row.id,
    name: row.name,
    url: row.url || '',
    type: row.type || 'image',
    description: row.description || '',
    uploadedBy: row.uploaded_by || '',
    uploadedAt: row.uploaded_at || '',
    size: row.size || 0,
    folderId: row.folder_id || undefined,
    offerId: row.offer_id || undefined,
  };
}

// GET /api/media — RBAC filtered by accessible offer IDs
router.get('/', requireAuth, (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM media').all();
    const accessibleIds = getAccessibleOfferIds(req.user.id, req.user.role);

    if (accessibleIds === null) {
      return res.json(rows.map(rowToMedia));
    }

    const filtered = rows.filter(m => {
      if (!m.offer_id) return false;
      return accessibleIds.has(m.offer_id);
    });
    res.json(filtered.map(rowToMedia));
  } catch (err) {
    console.error('[Media] GET error:', err.message);
    res.status(500).json({ error: 'Error al obtener medios' });
  }
});

// POST /api/media/upload — Upload file to server/data/media/ and create DB record
router.post('/upload', requireAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

    const file = req.file;
    const id = req.body.id || `media-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const description = req.body.description || file.originalname;
    const folderId = req.body.folderId || null;
    const offerId = req.body.offerId || null;
    const uploadedBy = req.body.uploadedBy || req.user.id;
    const uploadedAt = req.body.uploadedAt || new Date().toISOString().split('T')[0];

    // Determine type from mime
    let mediaType = 'document';
    if (file.mimetype.startsWith('image/')) mediaType = 'image';
    else if (file.mimetype.startsWith('video/')) mediaType = 'video';

    // Build absolute URL
    const fileUrl = buildFileUrl(req, file.filename);

    db.prepare('INSERT INTO media (id, name, url, type, description, uploaded_by, uploaded_at, size, folder_id, offer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, file.originalname, fileUrl, mediaType, description, uploadedBy, uploadedAt, file.size, folderId, offerId);

    const row = db.prepare('SELECT * FROM media WHERE id = ?').get(id);
    res.status(201).json(rowToMedia(row));
  } catch (err) {
    console.error('[Media] Upload error:', err.message);
    res.status(500).json({ error: 'Error al subir archivo' });
  }
});

// PUT /api/media/:id/replace — Replace file content, keeps same media ID AND same public URL
router.put('/:id/replace', requireAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

    const existing = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Medio no encontrado' });

    // Extract old filename from URL to keep the same public URL
    const oldUrl = existing.url || '';
    const oldFilename = oldUrl.split('/media/').pop();

    if (oldFilename) {
      const oldPath = path.join(mediaDir, oldFilename);
      const newTempPath = req.file.path; // multer saved new file with a temp name

      // Delete old file from disk
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch { /* ignore */ }
      }

      // Rename new file to the old filename so the URL stays the same
      try {
        fs.renameSync(newTempPath, oldPath);
      } catch {
        // If rename fails (cross-device), copy + delete
        fs.copyFileSync(newTempPath, oldPath);
        try { fs.unlinkSync(newTempPath); } catch { /* ignore */ }
      }
    } else {
      // No old filename — keep the new file as-is and build a new URL
      // This shouldn't normally happen
    }

    // URL stays the same — only update name, size, date
    db.prepare('UPDATE media SET name = ?, size = ?, uploaded_at = ? WHERE id = ?')
      .run(req.file.originalname, req.file.size, new Date().toISOString().split('T')[0], req.params.id);

    const row = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
    res.json(rowToMedia(row));
  } catch (err) {
    console.error('[Media] Replace error:', err.message);
    res.status(500).json({ error: 'Error al reemplazar archivo' });
  }
});

// POST /api/media — JSON-based create (legacy/fallback)
router.post('/', (req, res) => {
  try {
    const m = req.body;
    if (!m.id || !m.name) return res.status(400).json({ error: 'id y name son requeridos' });

    if (m.mimeType || m.type) {
      const mimeToCheck = m.mimeType || (m.type === 'image' ? 'image/png' : m.type === 'video' ? 'video/mp4' : 'application/pdf');
      const validation = validateMimeType(m.name, mimeToCheck);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
    }

    db.prepare('INSERT INTO media (id, name, url, type, description, uploaded_by, uploaded_at, size, folder_id, offer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(m.id, m.name, m.url || '', m.type || 'image', m.description || '', m.uploadedBy || null, m.uploadedAt || null, m.size || 0, m.folderId || null, m.offerId || null);
    const row = db.prepare('SELECT * FROM media WHERE id = ?').get(m.id);
    res.status(201).json(rowToMedia(row));
  } catch (err) {
    console.error('[Media] POST error:', err.message);
    res.status(500).json({ error: 'Error al crear medio' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    // Delete the file from disk too
    const existing = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
    if (existing && existing.url) {
      const filename = existing.url.split('/media/').pop();
      if (filename) {
        const filePath = path.join(mediaDir, filename);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch { /* ignore */ }
        }
      }
    }

    const result = db.prepare('DELETE FROM media WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Medio no encontrado' });
    res.json({ success: true });
  } catch (err) {
    console.error('[Media] DELETE error:', err.message);
    res.status(500).json({ error: 'Error al eliminar medio' });
  }
});

export default router;
