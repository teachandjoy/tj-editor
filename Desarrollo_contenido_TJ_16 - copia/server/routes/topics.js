import { Router } from 'express';
import db from '../database.js';

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
    templateId: row.template_id || '',
    order: row.order || 0,
  };
}

router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM topics ORDER BY "order" ASC').all();
    res.json(rows.map(rowToTopic));
  } catch (err) {
    console.error('[Topics] GET error:', err.message);
    res.status(500).json({ error: 'Error al obtener temas' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM topics WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Tema no encontrado' });
    res.json(rowToTopic(row));
  } catch (err) {
    console.error('[Topics] GET/:id error:', err.message);
    res.status(500).json({ error: 'Error al obtener tema' });
  }
});

router.post('/', (req, res) => {
  try {
    const t = req.body;
    if (!t.id || !t.title) return res.status(400).json({ error: 'id y title son requeridos' });
    db.prepare(`INSERT INTO topics (id, module_id, offer_id, title, description, status, author, version, date, offer_name, content, blocks, reference_ids, assigned_editors, template_id, "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(t.id, t.moduleId || null, t.offerId || null, t.title, t.description || null, t.status || 'en_desarrollo', t.author || null, t.version || null, t.date || null, t.offerName || null, t.content || '', JSON.stringify(t.blocks || []), JSON.stringify(t.referenceIds || []), JSON.stringify(t.assignedEditors || []), t.templateId || null, t.order || 0);
    const row = db.prepare('SELECT * FROM topics WHERE id = ?').get(t.id);
    res.status(201).json(rowToTopic(row));
  } catch (err) {
    console.error('[Topics] POST error:', err.message);
    res.status(500).json({ error: 'Error al crear tema' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM topics WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Tema no encontrado' });
    const t = req.body;
    db.prepare(`UPDATE topics SET module_id = ?, offer_id = ?, title = ?, description = ?, status = ?, author = ?, version = ?, date = ?, offer_name = ?, content = ?, blocks = ?, reference_ids = ?, assigned_editors = ?, template_id = ?, "order" = ?, updated_at = datetime('now') WHERE id = ?`)
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

router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM topics WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Tema no encontrado' });
    res.json({ success: true });
  } catch (err) {
    console.error('[Topics] DELETE error:', err.message);
    res.status(500).json({ error: 'Error al eliminar tema' });
  }
});

export default router;
