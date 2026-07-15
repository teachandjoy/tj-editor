import { Router } from 'express';
import crypto from 'crypto';
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

function rowToEmbedIdentity(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    logoUrl: row.logo_url || '',
    colorPrimary: row.color_primary || '#1b4b85',
    colorSecondary: row.color_secondary || '#8b2f3a',
    colorTertiary: row.color_tertiary || '#c5aa6f',
    colorBackground: row.color_background || '#ebeae7',
    colorTextPrimary: row.color_text_primary || '#2a2a32',
    fontPrimaryName: row.font_primary_name || '',
    fontPrimaryFamily: row.font_primary_family || '',
    fontPrimaryImportUrl: row.font_primary_import_url || '',
    fontSecondaryName: row.font_secondary_name || '',
    fontSecondaryFamily: row.font_secondary_family || '',
    snippet: row.snippet || '',
    blocks: JSON.parse(row.blocks || '[]'),
    htmlTemplates: JSON.parse(row.html_templates || '{}'),
  };
}

function rowToReference(row) {
  return {
    id: row.id,
    type: row.type,
    style: row.style,
    title: row.title || '',
    authors: row.authors || '',
    year: row.year || '',
    source: row.source || '',
    doi: row.doi || '',
    url: row.url || '',
    edition: row.edition || '',
    pages: row.pages || '',
    volume: row.volume || '',
    issue: row.issue || '',
    publisher: row.publisher || '',
    city: row.city || '',
    journal: row.journal || '',
    chapter: row.chapter || '',
    editors: row.editors || '',
  };
}

function tokensMatch(expected, provided) {
  if (!expected || !provided || expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
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
    if (req.query.embedToken) {
      const topic = rowToTopic(row);
      const presentationBlock = topic.blocks.find(block => block.id === '__tj-topic-presentation__');
      const embed = presentationBlock?.presentation?.embed;
      if (!embed?.enabled || !tokensMatch(embed.token, String(req.query.embedToken))) {
        return res.status(403).json({ error: 'Incrustación no autorizada' });
      }
      const offer = db.prepare('SELECT identity_id FROM offers WHERE id = ?').get(topic.offerId);
      const identityRow = offer?.identity_id
        ? db.prepare('SELECT * FROM identities WHERE id = ?').get(offer.identity_id)
        : undefined;
      const referenceIds = new Set(topic.referenceIds);
      const references = db.prepare('SELECT * FROM "references"').all()
        .filter(reference => referenceIds.has(reference.id))
        .map(rowToReference);
      topic.blocks = topic.blocks.map(block => block.id === '__tj-topic-presentation__'
        ? { ...block, presentation: { ...block.presentation, embed: { enabled: true, token: '' } } }
        : block);
      return res.json({ topic, identity: rowToEmbedIdentity(identityRow), references });
    }
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
