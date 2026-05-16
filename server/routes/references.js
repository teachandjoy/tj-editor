import { Router } from 'express';
import db from '../database.js';

const router = Router();

function rowToRef(row) {
  return {
    id: row.id,
    style: row.style || 'apa',
    type: row.type || 'article',
    authors: row.authors || '',
    title: row.title || '',
    year: row.year || '',
    journal: row.journal || undefined,
    volume: row.volume || undefined,
    issue: row.issue || undefined,
    pages: row.pages || undefined,
    publisher: row.publisher || undefined,
    city: row.city || undefined,
    doi: row.doi || undefined,
    url: row.url || undefined,
    accessDate: row.accessed_date || undefined,
    edition: row.edition || undefined,
    chapter: row.chapter || undefined,
    editors: row.editors || undefined,
    offerId: row.offer_id || undefined,
    moduleTag: row.module_tag || undefined,
  };
}

router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM "references"').all();
    res.json(rows.map(rowToRef));
  } catch (err) {
    console.error('[References] GET error:', err.message);
    res.status(500).json({ error: 'Error al obtener referencias' });
  }
});

router.post('/', (req, res) => {
  try {
    const r = req.body;
    if (!r.id || !r.title) return res.status(400).json({ error: 'id y title son requeridos' });
    db.prepare('INSERT INTO "references" (id, style, type, authors, title, year, journal, volume, issue, pages, doi, url, accessed_date, edition, chapter, editors, publisher, city, offer_id, module_tag) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(r.id, r.style || 'apa', r.type || 'article', r.authors || null, r.title, r.year || null, r.journal || null, r.volume || null, r.issue || null, r.pages || null, r.doi || null, r.url || null, r.accessDate || null, r.edition || null, r.chapter || null, r.editors || null, r.publisher || null, r.city || null, r.offerId || null, r.moduleTag || null);
    const row = db.prepare('SELECT * FROM "references" WHERE id = ?').get(r.id);
    res.status(201).json(rowToRef(row));
  } catch (err) {
    console.error('[References] POST error:', err.message);
    res.status(500).json({ error: 'Error al crear referencia' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM "references" WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Referencia no encontrada' });
    const r = req.body;
    db.prepare('UPDATE "references" SET style = ?, type = ?, authors = ?, title = ?, year = ?, journal = ?, volume = ?, issue = ?, pages = ?, doi = ?, url = ?, accessed_date = ?, edition = ?, chapter = ?, editors = ?, publisher = ?, city = ?, offer_id = ?, module_tag = ? WHERE id = ?')
      .run(r.style ?? existing.style, r.type ?? existing.type, r.authors !== undefined ? r.authors : existing.authors, r.title ?? existing.title, r.year ?? existing.year, r.journal !== undefined ? r.journal : existing.journal, r.volume !== undefined ? r.volume : existing.volume, r.issue !== undefined ? r.issue : existing.issue, r.pages !== undefined ? r.pages : existing.pages, r.doi !== undefined ? r.doi : existing.doi, r.url !== undefined ? r.url : existing.url, r.accessDate !== undefined ? r.accessDate : existing.accessed_date, r.edition !== undefined ? r.edition : existing.edition, r.chapter !== undefined ? r.chapter : existing.chapter, r.editors !== undefined ? r.editors : existing.editors, r.publisher !== undefined ? r.publisher : existing.publisher, r.city !== undefined ? r.city : existing.city, r.offerId !== undefined ? r.offerId : existing.offer_id, r.moduleTag !== undefined ? r.moduleTag : existing.module_tag, req.params.id);
    const row = db.prepare('SELECT * FROM "references" WHERE id = ?').get(req.params.id);
    res.json(rowToRef(row));
  } catch (err) {
    console.error('[References] PUT error:', err.message);
    res.status(500).json({ error: 'Error al actualizar referencia' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM "references" WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Referencia no encontrada' });
    res.json({ success: true });
  } catch (err) {
    console.error('[References] DELETE error:', err.message);
    res.status(500).json({ error: 'Error al eliminar referencia' });
  }
});

export default router;
