import { Router } from 'express';
import db from '../database.js';

const router = Router();

function rowToTemplate(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    type: row.type || 'diplomado',
    sections: JSON.parse(row.sections || '[]'),
    isDefault: !!row.is_default,
    createdBy: row.created_by || '',
  };
}

router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM templates').all();
    res.json(rows.map(rowToTemplate));
  } catch (err) {
    console.error('[Templates] GET error:', err.message);
    res.status(500).json({ error: 'Error al obtener plantillas' });
  }
});

router.post('/', (req, res) => {
  try {
    const t = req.body;
    if (!t.id || !t.name) return res.status(400).json({ error: 'id y name son requeridos' });
    db.prepare('INSERT INTO templates (id, name, description, type, sections, is_default, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(t.id, t.name, t.description || null, t.type || 'diplomado', JSON.stringify(t.sections || []), t.isDefault ? 1 : 0, t.createdBy || null);
    const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(t.id);
    res.status(201).json(rowToTemplate(row));
  } catch (err) {
    console.error('[Templates] POST error:', err.message);
    res.status(500).json({ error: 'Error al crear plantilla' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Plantilla no encontrada' });
    const t = req.body;
    db.prepare('UPDATE templates SET name = ?, description = ?, type = ?, sections = ?, is_default = ?, created_by = ? WHERE id = ?')
      .run(t.name ?? existing.name, t.description !== undefined ? t.description : existing.description, t.type ?? existing.type, t.sections !== undefined ? JSON.stringify(t.sections) : existing.sections, t.isDefault !== undefined ? (t.isDefault ? 1 : 0) : existing.is_default, t.createdBy !== undefined ? t.createdBy : existing.created_by, req.params.id);
    const row = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
    res.json(rowToTemplate(row));
  } catch (err) {
    console.error('[Templates] PUT error:', err.message);
    res.status(500).json({ error: 'Error al actualizar plantilla' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Plantilla no encontrada' });
    res.json({ success: true });
  } catch (err) {
    console.error('[Templates] DELETE error:', err.message);
    res.status(500).json({ error: 'Error al eliminar plantilla' });
  }
});

export default router;
