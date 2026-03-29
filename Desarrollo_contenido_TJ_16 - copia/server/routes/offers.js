import { Router } from 'express';
import db from '../database.js';

const router = Router();

function rowToOffer(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    institution: row.institution,
    description: row.description,
    edition: row.edition || '',
    authors: row.authors || '',
    audience: row.audience || '',
    modality: row.modality || '',
    duration: row.duration || '',
    prereqs: row.prereqs || '',
    purpose: row.purpose || '',
    identityId: row.identity_id || '',
    modules: JSON.parse(row.modules || '[]'),
    order: row.order || 0,
  };
}

// GET /api/offers
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM offers ORDER BY "order" ASC').all();
    res.json(rows.map(rowToOffer));
  } catch (err) {
    console.error('[Offers] GET error:', err.message);
    res.status(500).json({ error: 'Error al obtener ofertas' });
  }
});

// GET /api/offers/:id
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Oferta no encontrada' });
    res.json(rowToOffer(row));
  } catch (err) {
    console.error('[Offers] GET/:id error:', err.message);
    res.status(500).json({ error: 'Error al obtener oferta' });
  }
});

// POST /api/offers
router.post('/', (req, res) => {
  try {
    const o = req.body;
    if (!o.id || !o.name) return res.status(400).json({ error: 'id y name son requeridos' });
    db.prepare(`INSERT INTO offers (id, name, type, institution, description, edition, authors, audience, modality, duration, prereqs, purpose, identity_id, modules, "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(o.id, o.name, o.type || null, o.institution || null, o.description || null, o.edition || null, o.authors || null, o.audience || null, o.modality || null, o.duration || null, o.prereqs || null, o.purpose || null, o.identityId || null, JSON.stringify(o.modules || []), o.order || 0);
    const row = db.prepare('SELECT * FROM offers WHERE id = ?').get(o.id);
    res.status(201).json(rowToOffer(row));
  } catch (err) {
    console.error('[Offers] POST error:', err.message);
    res.status(500).json({ error: 'Error al crear oferta' });
  }
});

// PUT /api/offers/:id
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Oferta no encontrada' });
    const o = req.body;
    db.prepare(`UPDATE offers SET name = ?, type = ?, institution = ?, description = ?, edition = ?, authors = ?, audience = ?, modality = ?, duration = ?, prereqs = ?, purpose = ?, identity_id = ?, modules = ?, "order" = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(
        o.name ?? existing.name, o.type ?? existing.type, o.institution ?? existing.institution,
        o.description ?? existing.description, o.edition ?? existing.edition, o.authors ?? existing.authors,
        o.audience ?? existing.audience, o.modality ?? existing.modality, o.duration ?? existing.duration,
        o.prereqs ?? existing.prereqs, o.purpose ?? existing.purpose,
        o.identityId !== undefined ? o.identityId : existing.identity_id,
        o.modules !== undefined ? JSON.stringify(o.modules) : existing.modules,
        o.order ?? existing.order, req.params.id
      );
    const row = db.prepare('SELECT * FROM offers WHERE id = ?').get(req.params.id);
    res.json(rowToOffer(row));
  } catch (err) {
    console.error('[Offers] PUT error:', err.message);
    res.status(500).json({ error: 'Error al actualizar oferta' });
  }
});

// PUT /api/offers (batch reorder)
router.put('/', (req, res) => {
  try {
    const offers = req.body;
    if (!Array.isArray(offers)) return res.status(400).json({ error: 'Se espera un array' });
    const updateOrder = db.prepare('UPDATE offers SET "order" = ?, updated_at = datetime(\'now\') WHERE id = ?');
    const tx = db.transaction(() => {
      offers.forEach((o, idx) => updateOrder.run(o.order ?? idx, o.id));
    });
    tx();
    const rows = db.prepare('SELECT * FROM offers ORDER BY "order" ASC').all();
    res.json(rows.map(rowToOffer));
  } catch (err) {
    console.error('[Offers] PUT batch error:', err.message);
    res.status(500).json({ error: 'Error al reordenar ofertas' });
  }
});

// DELETE /api/offers/:id
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM offers WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Oferta no encontrada' });
    res.json({ success: true });
  } catch (err) {
    console.error('[Offers] DELETE error:', err.message);
    res.status(500).json({ error: 'Error al eliminar oferta' });
  }
});

export default router;
