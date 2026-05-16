import { Router } from 'express';
import db from '../database.js';

const router = Router();

// GET /api/backup — Export entire database as JSON
router.get('/', (req, res) => {
  try {
    const backup = db.transaction(() => {
      return {
        exportDate: new Date().toISOString(),
        version: '1.0',
        data: {
          users: db.prepare('SELECT * FROM users').all(),
          offers: db.prepare('SELECT * FROM offers').all(),
          topics: db.prepare('SELECT * FROM topics').all(),
          templates: db.prepare('SELECT * FROM templates').all(),
          references: db.prepare('SELECT * FROM "references"').all(),
          media: db.prepare('SELECT * FROM media').all(),
          folders: db.prepare('SELECT * FROM folders').all(),
          identities: db.prepare('SELECT * FROM identities').all(),
        },
      };
    })();
    res.json(backup);
  } catch (err) {
    console.error('[Backup] Export error:', err.message);
    res.status(500).json({ error: 'Error al exportar respaldo' });
  }
});

// POST /api/restore — Import JSON and restore database
router.post('/', (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: 'Se requiere el campo data' });

    const restore = db.transaction(() => {
      // Clear all tables
      db.prepare('DELETE FROM autosave_log').run();
      db.prepare('DELETE FROM sessions').run();
      db.prepare('DELETE FROM media').run();
      db.prepare('DELETE FROM folders').run();
      db.prepare('DELETE FROM topics').run();
      db.prepare('DELETE FROM "references"').run();
      db.prepare('DELETE FROM templates').run();
      db.prepare('DELETE FROM offers').run();
      db.prepare('DELETE FROM identities').run();
      db.prepare('DELETE FROM users').run();

      // Restore users
      if (data.users) {
        const stmt = db.prepare('INSERT INTO users (id, username, password, name, email, role, avatar, permissions, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const u of data.users) {
          stmt.run(u.id, u.username, u.password, u.name, u.email, u.role, u.avatar, u.permissions, u.phone, u.created_at, u.updated_at);
        }
      }

      // Restore offers
      if (data.offers) {
        const stmt = db.prepare('INSERT INTO offers (id, name, type, institution, description, edition, authors, audience, modality, duration, prereqs, purpose, identity_id, modules, "order", created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const o of data.offers) {
          stmt.run(o.id, o.name, o.type, o.institution, o.description, o.edition, o.authors, o.audience, o.modality, o.duration, o.prereqs, o.purpose, o.identity_id, o.modules, o.order, o.created_by, o.created_at, o.updated_at);
        }
      }

      // Restore topics
      if (data.topics) {
        const stmt = db.prepare('INSERT INTO topics (id, title, module_id, offer_id, status, content, description, author, version, date, offer_name, blocks, reference_ids, assigned_editors, template_id, "order", assigned_to, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const t of data.topics) {
          stmt.run(t.id, t.title, t.module_id, t.offer_id, t.status, t.content, t.description, t.author, t.version, t.date, t.offer_name, t.blocks, t.reference_ids, t.assigned_editors, t.template_id, t.order, t.assigned_to, t.created_at, t.updated_at);
        }
      }

      // Restore templates
      if (data.templates) {
        const stmt = db.prepare('INSERT INTO templates (id, name, description, type, sections, is_default, created_by, structure, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const t of data.templates) {
          stmt.run(t.id, t.name, t.description, t.type, t.sections, t.is_default, t.created_by, t.structure, t.created_at);
        }
      }

      // Restore references
      if (data.references) {
        const stmt = db.prepare('INSERT INTO "references" (id, type, style, title, authors, year, source, doi, url, accessed_date, edition, pages, volume, issue, publisher, city, journal, chapter, editors, offer_id, module_tag, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const r of data.references) {
          stmt.run(r.id, r.type, r.style, r.title, r.authors, r.year, r.source, r.doi, r.url, r.accessed_date, r.edition, r.pages, r.volume, r.issue, r.publisher, r.city, r.journal, r.chapter, r.editors, r.offer_id, r.module_tag, r.created_at);
        }
      }

      // Restore media
      if (data.media) {
        const stmt = db.prepare('INSERT INTO media (id, name, type, size, url, folder_id, tags, description, uploaded_by, uploaded_at, offer_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const m of data.media) {
          stmt.run(m.id, m.name, m.type, m.size, m.url, m.folder_id, m.tags, m.description, m.uploaded_by, m.uploaded_at, m.offer_id, m.created_at);
        }
      }

      // Restore folders
      if (data.folders) {
        const stmt = db.prepare('INSERT INTO folders (id, name, parent_id, access_roles, offer_id, created_at) VALUES (?, ?, ?, ?, ?, ?)');
        for (const f of data.folders) {
          stmt.run(f.id, f.name, f.parent_id, f.access_roles, f.offer_id, f.created_at);
        }
      }

      // Restore identities
      if (data.identities) {
        const stmt = db.prepare('INSERT INTO identities (id, name, description, is_default, color_primary, color_secondary, color_tertiary, color_background, color_text_primary, color_buttons, color_buttons_hover, font_primary_name, font_primary_family, font_primary_import_url, font_secondary_name, font_secondary_family, button_style, border_radius, logo_url, logo_negative_url, snippet, blocks, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const i of data.identities) {
          stmt.run(i.id, i.name, i.description, i.is_default, i.color_primary, i.color_secondary, i.color_tertiary, i.color_background, i.color_text_primary, i.color_buttons, i.color_buttons_hover, i.font_primary_name, i.font_primary_family, i.font_primary_import_url, i.font_secondary_name, i.font_secondary_family, i.button_style, i.border_radius, i.logo_url, i.logo_negative_url, i.snippet, i.blocks, i.created_at, i.updated_at);
        }
      }
    });

    restore();
    res.json({ success: true, message: 'Base de datos restaurada exitosamente' });
  } catch (err) {
    console.error('[Restore] Import error:', err.message);
    res.status(500).json({ error: 'Error al restaurar respaldo: ' + err.message });
  }
});

export default router;
