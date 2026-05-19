import { Router } from 'express';
import db from '../database.js';
import { requireAuth } from '../middleware/auth.js';
import { filterTopicsForUser } from '../middleware/rbac.js';

const router = Router();

function rowToTopic(row) {
  return {
    id: row.id,
    moduleId: row.module_id,
    offerId: row.offer_id,
    title: row.title,
    description: row.description || '',
    status: row.status,
    author: row.author || '',
    version: row.version || '',
    date: row.date || '',
    offerName: row.offer_name || '',
    content: row.content || '',
    blocks: JSON.parse(row.blocks || '[]'),
    referenceIds: JSON.parse(row.reference_ids || '[]'),
    assignedEditors: JSON.parse(row.assigned_editors || '[]'),
    assignedCoordinators: JSON.parse(row.assigned_coordinators || '[]'),
    templateId: row.template_id || '',
    order: row.order || 0,
  };
}

// GET /api/topics — RBAC filtered (excludes trashed)
router.get('/', requireAuth, (req, res) => {
  try {
    const allTopics = db.prepare('SELECT * FROM topics WHERE deleted_at IS NULL ORDER BY "order" ASC').all();
    const allOffers = db.prepare('SELECT * FROM offers').all();
    const filtered = filterTopicsForUser(allTopics, allOffers, req.user.id, req.user.role);
    res.json(filtered.map(rowToTopic));
  } catch (err) {
    console.error('[Topics] GET error:', err.message);
    res.status(500).json({ error: 'Error al obtener temas' });
  }
});

// GET /api/topics/trash — list soft-deleted topics (admin/coordinador only)
router.get('/trash', requireAuth, (req, res) => {
  try {
    if (req.user.role === 'editor') return res.json([]);
    const trashed = db.prepare('SELECT * FROM topics WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC').all();
    if (req.user.role === 'admin') {
      return res.json(trashed.map(rowToTopic));
    }
    // Coordinators: only topics they have access to
    const allOffers = db.prepare('SELECT * FROM offers').all();
    const filtered = filterTopicsForUser(trashed, allOffers, req.user.id, req.user.role);
    res.json(filtered.map(rowToTopic));
  } catch (err) {
    console.error('[Topics] GET /trash error:', err.message);
    res.status(500).json({ error: 'Error al obtener papelera' });
  }
});

// GET /api/topics/:id — RBAC filtered
router.get('/:id', requireAuth, (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM topics WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Tema no encontrado' });

    if (req.user.role !== 'admin') {
      const allOffers = db.prepare('SELECT * FROM offers').all();
      const filtered = filterTopicsForUser([row], allOffers, req.user.id, req.user.role);
      if (filtered.length === 0) return res.status(403).json({ error: 'No tiene acceso a este tema' });
    }

    res.json(rowToTopic(row));
  } catch (err) {
    console.error('[Topics] GET/:id error:', err.message);
    res.status(500).json({ error: 'Error al obtener tema' });
  }
});

// POST /api/topics
router.post('/', (req, res) => {
  try {
    const t = req.body;
    if (!t.id || !t.title) return res.status(400).json({ error: 'id y title son requeridos' });
    db.prepare(`INSERT INTO topics (id, module_id, offer_id, title, description, status, author, version, date, offer_name, content, blocks, reference_ids, assigned_editors, assigned_coordinators, template_id, "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(t.id, t.moduleId || null, t.offerId || null, t.title, t.description || null, t.status || 'en_desarrollo', t.author || null, t.version || null, t.date || null, t.offerName || null, t.content || '', JSON.stringify(t.blocks || []), JSON.stringify(t.referenceIds || []), JSON.stringify(t.assignedEditors || []), JSON.stringify(t.assignedCoordinators || []), t.templateId || null, t.order || 0);
    const row = db.prepare('SELECT * FROM topics WHERE id = ?').get(t.id);
    res.status(201).json(rowToTopic(row));
  } catch (err) {
    console.error('[Topics] POST error:', err.message);
    res.status(500).json({ error: 'Error al crear tema' });
  }
});

// PUT /api/topics/:id
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM topics WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Tema no encontrado' });
    const t = req.body;
    db.prepare(`UPDATE topics SET module_id = ?, offer_id = ?, title = ?, description = ?, status = ?, author = ?, version = ?, date = ?, offer_name = ?, content = ?, blocks = ?, reference_ids = ?, assigned_editors = ?, assigned_coordinators = ?, template_id = ?, "order" = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(
        t.moduleId !== undefined ? t.moduleId : existing.module_id,
        t.offerId !== undefined ? t.offerId : existing.offer_id,
        t.title ?? existing.title,
        t.description !== undefined ? t.description : existing.description,
        t.status ?? existing.status,
        t.author !== undefined ? t.author : existing.author,
        t.version !== undefined ? t.version : existing.version,
        t.date !== undefined ? t.date : existing.date,
        t.offerName !== undefined ? t.offerName : existing.offer_name,
        t.content !== undefined ? t.content : existing.content,
        t.blocks !== undefined ? JSON.stringify(t.blocks) : existing.blocks,
        t.referenceIds !== undefined ? JSON.stringify(t.referenceIds) : existing.reference_ids,
        t.assignedEditors !== undefined ? JSON.stringify(t.assignedEditors) : existing.assigned_editors,
        t.assignedCoordinators !== undefined ? JSON.stringify(t.assignedCoordinators) : existing.assigned_coordinators,
        t.templateId !== undefined ? t.templateId : existing.template_id,
        t.order !== undefined ? t.order : existing.order,
        req.params.id
      );
    const row = db.prepare('SELECT * FROM topics WHERE id = ?').get(req.params.id);
    res.json(rowToTopic(row));
  } catch (err) {
    console.error('[Topics] PUT error:', err.message);
    res.status(500).json({ error: 'Error al actualizar tema' });
  }
});

// DELETE /api/topics/:id — soft delete (move to trash)
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM topics WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Tema no encontrado' });
    db.prepare('UPDATE topics SET deleted_at = datetime(\'now\'), deleted_by = ? WHERE id = ?')
      .run(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[Topics] DELETE error:', err.message);
    res.status(500).json({ error: 'Error al eliminar tema' });
  }
});

// PUT /api/topics/:id/restore — restore from trash
router.put('/:id/restore', requireAuth, (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM topics WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Tema no encontrado' });
    db.prepare('UPDATE topics SET deleted_at = NULL, deleted_by = NULL WHERE id = ?')
      .run(req.params.id);
    const row = db.prepare('SELECT * FROM topics WHERE id = ?').get(req.params.id);
    res.json(rowToTopic(row));
  } catch (err) {
    console.error('[Topics] RESTORE error:', err.message);
    res.status(500).json({ error: 'Error al restaurar tema' });
  }
});

// DELETE /api/topics/:id/permanent — permanently delete from trash
router.delete('/:id/permanent', requireAuth, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Solo admin puede eliminar permanentemente' });
    const result = db.prepare('DELETE FROM topics WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Tema no encontrado' });
    res.json({ success: true });
  } catch (err) {
    console.error('[Topics] PERMANENT DELETE error:', err.message);
    res.status(500).json({ error: 'Error al eliminar permanentemente' });
  }
});

export default router;
