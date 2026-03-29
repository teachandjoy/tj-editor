import { Router } from 'express';
import db from '../database.js';

const router = Router();

function rowToFolder(row) {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id || null,
    accessRoles: JSON.parse(row.access_roles || '[]'),
    offerId: row.offer_id || undefined,
  };
}

router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM folders').all();
    res.json(rows.map(rowToFolder));
  } catch (err) {
    console.error('[Folders] GET error:', err.message);
    res.status(500).json({ error: 'Error al obtener carpetas' });
  }
});

router.post('/', (req, res) => {
  try {
    const f = req.body;
    if (!f.id || !f.name) return res.status(400).json({ error: 'id y name son requeridos' });
    db.prepare('INSERT INTO folders (id, name, parent_id, access_roles, offer_id) VALUES (?, ?, ?, ?, ?)')
      .run(f.id, f.name, f.parentId || null, JSON.stringify(f.accessRoles || []), f.offerId || null);
    const row = db.prepare('SELECT * FROM folders WHERE id = ?').get(f.id);
    res.status(201).json(rowToFolder(row));
  } catch (err) {
    console.error('[Folders] POST error:', err.message);
    res.status(500).json({ error: 'Error al crear carpeta' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM folders WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Carpeta no encontrada' });
    const f = req.body;
    db.prepare('UPDATE folders SET name = ?, parent_id = ?, access_roles = ?, offer_id = ? WHERE id = ?')
      .run(f.name ?? existing.name, f.parentId !== undefined ? f.parentId : existing.parent_id, f.accessRoles !== undefined ? JSON.stringify(f.accessRoles) : existing.access_roles, f.offerId !== undefined ? f.offerId : existing.offer_id, req.params.id);
    const row = db.prepare('SELECT * FROM folders WHERE id = ?').get(req.params.id);
    res.json(rowToFolder(row));
  } catch (err) {
    console.error('[Folders] PUT error:', err.message);
    res.status(500).json({ error: 'Error al actualizar carpeta' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM folders WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Carpeta no encontrada' });
    res.json({ success: true });
  } catch (err) {
    console.error('[Folders] DELETE error:', err.message);
    res.status(500).json({ error: 'Error al eliminar carpeta' });
  }
});

export default router;
