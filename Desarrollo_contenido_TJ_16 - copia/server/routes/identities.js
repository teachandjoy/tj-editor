import { Router } from 'express';
import db from '../database.js';

const router = Router();

function rowToIdentity(row) {
  const parsed = JSON.parse(row.blocks || '[]');
  // blocks column may contain IdentityBlock objects [{id,name,html}] or plain strings
  const isBlockObjects = Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object';
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    logoUrl: row.logo_url || '',
    logoNegativeUrl: row.logo_negative_url || '',
    colorPrimary: row.color_primary || '#1b4b85',
    colorSecondary: row.color_secondary || '#8b2f3a',
    colorTertiary: row.color_tertiary || '#c5aa6f',
    colorBackground: row.color_background || '#ebeae7',
    colorTextPrimary: row.color_text_primary || '#2a2a32',
    colorButtons: row.color_buttons || '#1b4b85',
    colorButtonsHover: row.color_buttons_hover || '#8b2f3a',
    fontPrimaryName: row.font_primary_name || '',
    fontPrimaryFamily: row.font_primary_family || '',
    fontPrimaryImportUrl: row.font_primary_import_url || '',
    fontSecondaryName: row.font_secondary_name || '',
    fontSecondaryFamily: row.font_secondary_family || '',
    buttonStyle: row.button_style || '',
    borderRadius: row.border_radius || '',
    snippet: row.snippet || '',
    blocks: isBlockObjects ? parsed : [],
    detectedBlocks: isBlockObjects ? [] : parsed,
  };
}

router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM identities').all();
    res.json(rows.map(rowToIdentity));
  } catch (err) {
    console.error('[Identities] GET error:', err.message);
    res.status(500).json({ error: 'Error al obtener identidades' });
  }
});

router.post('/', (req, res) => {
  try {
    const i = req.body;
    if (!i.id || !i.name) return res.status(400).json({ error: 'id y name son requeridos' });
    db.prepare('INSERT INTO identities (id, name, description, logo_url, logo_negative_url, color_primary, color_secondary, color_tertiary, color_background, color_text_primary, color_buttons, color_buttons_hover, font_primary_name, font_primary_family, font_primary_import_url, font_secondary_name, font_secondary_family, button_style, border_radius, snippet, blocks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(i.id, i.name, i.description || null, i.logoUrl || null, i.logoNegativeUrl || null, i.colorPrimary || '#1b4b85', i.colorSecondary || '#8b2f3a', i.colorTertiary || '#c5aa6f', i.colorBackground || '#ebeae7', i.colorTextPrimary || '#2a2a32', i.colorButtons || '#1b4b85', i.colorButtonsHover || '#8b2f3a', i.fontPrimaryName || null, i.fontPrimaryFamily || null, i.fontPrimaryImportUrl || null, i.fontSecondaryName || null, i.fontSecondaryFamily || null, i.buttonStyle || null, i.borderRadius || null, i.snippet || '', JSON.stringify(i.blocks && i.blocks.length > 0 ? i.blocks : i.detectedBlocks || []));
    const row = db.prepare('SELECT * FROM identities WHERE id = ?').get(i.id);
    res.status(201).json(rowToIdentity(row));
  } catch (err) {
    console.error('[Identities] POST error:', err.message);
    res.status(500).json({ error: 'Error al crear identidad' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM identities WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Identidad no encontrada' });
    const i = req.body;
    db.prepare(`UPDATE identities SET name = ?, description = ?, logo_url = ?, logo_negative_url = ?, color_primary = ?, color_secondary = ?, color_tertiary = ?, color_background = ?, color_text_primary = ?, color_buttons = ?, color_buttons_hover = ?, font_primary_name = ?, font_primary_family = ?, font_primary_import_url = ?, font_secondary_name = ?, font_secondary_family = ?, button_style = ?, border_radius = ?, snippet = ?, blocks = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(
        i.name ?? existing.name,
        i.description !== undefined ? i.description : existing.description,
        i.logoUrl !== undefined ? i.logoUrl : existing.logo_url,
        i.logoNegativeUrl !== undefined ? i.logoNegativeUrl : existing.logo_negative_url,
        i.colorPrimary ?? existing.color_primary,
        i.colorSecondary ?? existing.color_secondary,
        i.colorTertiary ?? existing.color_tertiary,
        i.colorBackground ?? existing.color_background,
        i.colorTextPrimary ?? existing.color_text_primary,
        i.colorButtons ?? existing.color_buttons,
        i.colorButtonsHover ?? existing.color_buttons_hover,
        i.fontPrimaryName !== undefined ? i.fontPrimaryName : existing.font_primary_name,
        i.fontPrimaryFamily !== undefined ? i.fontPrimaryFamily : existing.font_primary_family,
        i.fontPrimaryImportUrl !== undefined ? i.fontPrimaryImportUrl : existing.font_primary_import_url,
        i.fontSecondaryName !== undefined ? i.fontSecondaryName : existing.font_secondary_name,
        i.fontSecondaryFamily !== undefined ? i.fontSecondaryFamily : existing.font_secondary_family,
        i.buttonStyle !== undefined ? i.buttonStyle : existing.button_style,
        i.borderRadius !== undefined ? i.borderRadius : existing.border_radius,
        i.snippet !== undefined ? i.snippet : existing.snippet,
        i.blocks !== undefined ? JSON.stringify(i.blocks) : (i.detectedBlocks !== undefined ? JSON.stringify(i.detectedBlocks) : existing.blocks),
        req.params.id
      );
    const row = db.prepare('SELECT * FROM identities WHERE id = ?').get(req.params.id);
    res.json(rowToIdentity(row));
  } catch (err) {
    console.error('[Identities] PUT error:', err.message);
    res.status(500).json({ error: 'Error al actualizar identidad' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM identities WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Identidad no encontrada' });
    res.json({ success: true });
  } catch (err) {
    console.error('[Identities] DELETE error:', err.message);
    res.status(500).json({ error: 'Error al eliminar identidad' });
  }
});

export default router;
