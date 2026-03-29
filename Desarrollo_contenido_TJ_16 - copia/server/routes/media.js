import { Router } from 'express';
import db from '../database.js';
import { validateMimeType } from '../middleware/mimeValidation.js';

const router = Router();

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

router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM media').all();
    res.json(rows.map(rowToMedia));
  } catch (err) {
    console.error('[Media] GET error:', err.message);
    res.status(500).json({ error: 'Error al obtener medios' });
  }
});

router.post('/', (req, res) => {
  try {
    const m = req.body;
    if (!m.id || !m.name) return res.status(400).json({ error: 'id y name son requeridos' });

    // MIME type validation
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
    const result = db.prepare('DELETE FROM media WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Medio no encontrado' });
    res.json({ success: true });
  } catch (err) {
    console.error('[Media] DELETE error:', err.message);
    res.status(500).json({ error: 'Error al eliminar medio' });
  }
});

export default router;
