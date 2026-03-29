import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'app.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──────────────────────────────────────────────────────────────────

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT,
      password TEXT,
      name TEXT NOT NULL,
      email TEXT,
      role TEXT NOT NULL DEFAULT 'editor',
      avatar TEXT,
      permissions TEXT DEFAULT '{}',
      phone TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      institution TEXT,
      description TEXT,
      edition TEXT,
      authors TEXT,
      audience TEXT,
      modality TEXT,
      duration TEXT,
      prereqs TEXT,
      purpose TEXT,
      identity_id TEXT,
      modules TEXT DEFAULT '[]',
      "order" INTEGER DEFAULT 0,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      module_id TEXT,
      offer_id TEXT,
      status TEXT DEFAULT 'en_desarrollo',
      content TEXT DEFAULT '',
      description TEXT,
      author TEXT,
      version TEXT,
      date TEXT,
      offer_name TEXT,
      blocks TEXT DEFAULT '[]',
      reference_ids TEXT DEFAULT '[]',
      assigned_editors TEXT DEFAULT '[]',
      template_id TEXT,
      "order" INTEGER DEFAULT 0,
      assigned_to TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT,
      sections TEXT DEFAULT '[]',
      is_default INTEGER DEFAULT 0,
      created_by TEXT,
      structure TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS "references" (
      id TEXT PRIMARY KEY,
      type TEXT,
      style TEXT,
      title TEXT,
      authors TEXT,
      year TEXT,
      source TEXT,
      doi TEXT,
      url TEXT,
      accessed_date TEXT,
      edition TEXT,
      pages TEXT,
      volume TEXT,
      issue TEXT,
      publisher TEXT,
      city TEXT,
      journal TEXT,
      chapter TEXT,
      editors TEXT,
      offer_id TEXT,
      module_tag TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      size INTEGER DEFAULT 0,
      url TEXT,
      folder_id TEXT,
      tags TEXT DEFAULT '[]',
      description TEXT,
      uploaded_by TEXT,
      uploaded_at TEXT,
      offer_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      access_roles TEXT DEFAULT '[]',
      offer_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS identities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      is_default INTEGER DEFAULT 0,
      color_primary TEXT DEFAULT '#1b4b85',
      color_secondary TEXT DEFAULT '#8b2f3a',
      color_tertiary TEXT DEFAULT '#c5aa6f',
      color_background TEXT DEFAULT '#ebeae7',
      color_text_primary TEXT DEFAULT '#2a2a32',
      color_buttons TEXT DEFAULT '#1b4b85',
      color_buttons_hover TEXT DEFAULT '#8b2f3a',
      font_primary_name TEXT,
      font_primary_family TEXT,
      font_primary_import_url TEXT,
      font_secondary_name TEXT,
      font_secondary_family TEXT,
      button_style TEXT,
      border_radius TEXT,
      logo_url TEXT,
      logo_negative_url TEXT,
      snippet TEXT DEFAULT '',
      blocks TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT
    );

    CREATE TABLE IF NOT EXISTS autosave_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      data TEXT,
      saved_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      user_name TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      details TEXT DEFAULT '{}',
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed default data if empty
  seedData();
}

// ── Seed Data ───────────────────────────────────────────────────────────────

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
  if (userCount.cnt > 0) return; // Already seeded

  console.log('[DB] Seeding default data...');

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, role, username, password) VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertOffer = db.prepare(`
    INSERT INTO offers (id, name, type, institution, description, edition, authors, audience, modality, duration, prereqs, purpose, identity_id, modules, "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertTopic = db.prepare(`
    INSERT INTO topics (id, module_id, offer_id, title, description, status, author, version, date, offer_name, content, blocks, reference_ids, assigned_editors, template_id, "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertTemplate = db.prepare(`
    INSERT INTO templates (id, name, description, type, sections, is_default, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertRef = db.prepare(`
    INSERT INTO "references" (id, style, type, authors, title, year, journal, volume, issue, pages, doi, url, publisher, city, edition, offer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMedia = db.prepare(`
    INSERT INTO media (id, name, url, type, description, uploaded_by, uploaded_at, size, folder_id, offer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertFolder = db.prepare(`
    INSERT INTO folders (id, name, parent_id, access_roles, offer_id) VALUES (?, ?, ?, ?, ?)
  `);
  const insertIdentity = db.prepare(`
    INSERT INTO identities (id, name, description, logo_url, logo_negative_url, color_primary, color_secondary, color_tertiary, color_background, color_text_primary, color_buttons, color_buttons_hover, font_primary_name, font_primary_family, font_primary_import_url, font_secondary_name, font_secondary_family, button_style, border_radius, snippet, blocks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedTransaction = db.transaction(() => {
    // Users — passwords hashed with bcrypt for security
    const hashPw = (pw) => bcrypt.hashSync(pw, 10);
    insertUser.run('admin-1', 'Dr. Salvador Vilchis', 'svilchis@teachjoy.mx', 'admin', 'teachandjoy', hashPw('teachandjoy25'));
    insertUser.run('coord-1', 'Dr. Juan Saucedo', 'jsaucedo@teachjoy.mx', 'coordinador', 'jsaucedo', hashPw('password123'));
    insertUser.run('editor-1', 'Ing. Amado Urias', 'aurias@teachjoy.mx', 'editor', 'aurias', hashPw('password123'));
    insertUser.run('editor-2', 'Dr. Jonathan Quinonez', 'jquinonez@teachjoy.mx', 'editor', 'jquinonez', hashPw('password123'));

    // Templates
    insertTemplate.run(
      'tpl-1',
      'Plantilla Curso/Diplomado Completa',
      'Plantilla predeterminada con estructura completa para cursos y diplomados de alto nivel academico',
      'diplomado',
      JSON.stringify([
        { id: 'ts-1', title: 'Objetivos de Aprendizaje', description: 'Objetivos del tema', order: 1, required: true },
        { id: 'ts-2', title: 'Introduccion', description: 'Introduccion al tema', order: 2, required: true },
        { id: 'ts-3', title: 'Desarrollo del Tema', description: 'Contenido principal', order: 3, required: true },
        { id: 'ts-4', title: 'Actividades', description: 'Actividades de aprendizaje', order: 4, required: false },
        { id: 'ts-5', title: 'Conclusion', description: 'Cierre y resumen', order: 5, required: true },
        { id: 'ts-6', title: 'Referencias', description: 'Bibliografia y referencias', order: 6, required: true },
      ]),
      1,
      'admin-1'
    );

    // References
    insertRef.run('ref-1', 'apa', 'book', 'Hadzic, A., & Lopez, M.', 'Peripheral Nerve Blocks and Anatomy for Ultrasound-Guided Regional Anesthesia', '2022', null, null, null, null, null, null, 'McGraw-Hill Education', 'New York', null, 'offer-1');
    insertRef.run('ref-2', 'vancouver', 'article', 'Garcia-Fernandez J, Martinez-Lopez A', 'Anatomia funcional del plexo braquial: revision sistematica', '2023', 'Revista de Anestesiologia Regional', '45', '2', '112-128', '10.1016/j.rar.2023.02.005', null, null, null, null, 'offer-1');
    insertRef.run('ref-3', 'apa', 'article', 'Sites, B. D., Chan, V. W., Neal, J. M., Weller, R., Grau, T., Koscielniak-Nielsen, Z. J., & Ivani, G.', 'The American Society of Regional Anesthesia and Pain Medicine and the European Society of Regional Anaesthesia and Pain Therapy Joint Committee recommendations for education and training in ultrasound-guided regional anesthesia', '2021', 'Regional Anesthesia and Pain Medicine', '46', '1', '1-12', '10.1136/rapm-2020-101820', null, null, null, null, 'offer-1');

    // Media
    insertMedia.run('media-1', 'plexo-braquial-anatomia.png', '', 'image', 'Diagrama anatomico del plexo braquial', 'editor-1', '2024-04-10', 245000, 'folder-1-1', 'offer-1');

    // Folders
    insertFolder.run('root', 'Repositorio General', null, JSON.stringify(['admin', 'coordinador', 'editor']), null);
    insertFolder.run('folder-1', 'Diplomado Anestesia Regional', 'root', JSON.stringify(['admin', 'coordinador', 'editor']), 'offer-1');
    insertFolder.run('folder-1-1', 'Modulo 1 - Fundamentos', 'folder-1', JSON.stringify(['admin', 'coordinador', 'editor']), 'offer-1');
    insertFolder.run('folder-2', 'Curso Manejo del Dolor', 'root', JSON.stringify(['admin', 'coordinador']), 'offer-2');

    // Identities
    insertIdentity.run(
      'tj-default', 'Teach & Joy', 'Identidad corporativa principal de Teach & Joy',
      'https://repositorio.paincare.mx/public/Logo_TeachJ_PNG.png',
      'https://repositorio.paincare.mx/public/Logo_TeachJ_Blanco_2.png',
      '#1b4b85', '#8b2f3a', '#c5aa6f', '#ebeae7', '#2a2a32', '#1b4b85', '#8b2f3a',
      'Montserrat', "'Montserrat', sans-serif",
      'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap',
      'Open Sans', "'Open Sans', sans-serif",
      'semi-rounded', '8px', '', '[]'
    );

    // ARMTY Identity
    const armtyBlocks = [
      {
        id: 'armty-tip',
        name: 'Tip ARMTY',
        html: '<div class="armty-tip" style="background:#f6f7fa;border-left:6px solid #919BA5;padding:10px 14px;margin:14px 0;"><p style="margin:0;text-align:justify;font-size:medium;"><strong>Tip ARMTY:</strong> Mensaje breve y pr\u00e1ctico.</p></div>'
      },
      {
        id: 'armty-perla',
        name: 'Perla ARMTY',
        html: '<div class="armty-perla" style="background:#ffffff;border-left:6px solid #2373BA;padding:10px 14px;margin:14px 0;"><p style="margin:0;text-align:justify;font-size:medium;"><strong>Perla ARMTY:</strong> Idea clave sustentada por la evidencia ya expuesta.</p></div>'
      },
      {
        id: 'armty-nota',
        name: 'Nota ARMTY',
        html: '<div class="armty-note" style="background:#ffffff;border-left:6px solid #39528F;padding:10px 14px;margin:14px 0;"><p style="margin:0;text-align:justify;font-size:medium;"><strong>Nota ARMTY:</strong> Aclaraci\u00f3n t\u00e9cnica o advertencia.</p></div>'
      },
      {
        id: 'armty-conclusion',
        name: 'Conclusi\u00f3n ARMTY',
        html: '<div style="background:#fff8e5;border:1px solid #f0d999;border-radius:8px;padding:12px 14px;margin:20px 0;"><p style="margin:0;text-align:justify;font-size:medium;"><strong>Conclusi\u00f3n:</strong> S\u00edntesis final del tema.</p></div>'
      },
      {
        id: 'armty-objetivos',
        name: 'Objetivos ARMTY',
        html: '<h2 style="color:#39528F;margin:14px 0 8px 0;font-size:1.25rem;">Objetivos de la unidad</h2><div style="background:#f6f7fa;border:1px solid #919BA5;border-radius:8px;padding:10px 14px;margin:10px 0;"><ul style="margin:0 0 0 18px;padding:0;font-size:medium;"><li style="margin:6px 0;text-align:justify;"><strong>Verbo</strong> objetivo 1.</li><li style="margin:6px 0;text-align:justify;"><strong>Verbo</strong> objetivo 2.</li></ul></div>'
      },
      {
        id: 'armty-tabla',
        name: 'Tabla ARMTY',
        html: '<h4 style="color:#39528F;margin:16px 0 8px 0;font-size:1.05rem;">Ejemplo de tabla \u00b7 Formato ARMTY</h4><div style="overflow-x:auto;border-radius:8px;margin:10px 0;"><table style="width:100%;border-collapse:collapse;font-size:13px;line-height:1.35;"><thead style="background:#0F206C;color:#ffffff;text-align:center;"><tr><th style="padding:8px;border:1px solid #e5e7eb;">Encabezado 1</th><th style="padding:8px;border:1px solid #e5e7eb;">Encabezado 2</th><th style="padding:8px;border:1px solid #e5e7eb;">Encabezado 3</th></tr></thead><tbody><tr style="background:#ffffff;"><td style="padding:8px;border:1px solid #e5e7eb;text-align:left;"><strong>Dato A</strong></td><td style="padding:8px;border:1px solid #e5e7eb;text-align:justify;">Texto descriptivo del contenido de la fila.</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">Referencia 1</td></tr><tr style="background:#fafafa;"><td style="padding:8px;border:1px solid #e5e7eb;text-align:left;"><strong>Dato B</strong></td><td style="padding:8px;border:1px solid #e5e7eb;text-align:justify;">Texto explicativo con detalles espec\u00edficos.</td><td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">Referencia 2</td></tr></tbody></table></div>'
      },
      {
        id: 'armty-figura',
        name: 'Figura / Imagen ARMTY',
        html: '<div style="text-align:center;margin:12px 0;"><img src="URL_IMAGEN" alt="Descripci\u00f3n de la imagen" style="width:70%;max-width:900px;height:auto;border-radius:8px;box-shadow:0 1px 6px rgba(0,0,0,0.08);"><p style="font-size:medium;color:#606C7B;margin:6px 0 0 0;"><em><strong>Figura 1.</strong> Descripci\u00f3n breve de la figura.</em></p></div>'
      },
      {
        id: 'armty-parrafos-listas',
        name: 'P\u00e1rrafos y Listas ARMTY',
        html: '<p style="text-align:justify;font-size:medium;">Texto del usuario aqu\u00ed (NO modificar contenido).</p><ul style="margin:0 0 0 18px;padding:0;font-size:medium;"><li style="margin:4px 0;text-align:justify;">Elemento de lista 1.</li></ul><ol style="margin:0 0 0 18px;padding:0;font-size:medium;"><li style="margin:4px 0;text-align:justify;">Paso 1.</li></ol>'
      },
      {
        id: 'armty-referencias',
        name: 'Referencias ARMTY',
        html: '<details style="border:1px solid #919BA5;border-radius:8px;overflow:hidden;background:#ffffff;margin-top:16px;"><summary style="list-style:none;cursor:pointer;background:#0F206C;color:#ffffff;padding:12px 14px;font-size:1.05rem;outline:none;">Referencias (clic para desplegar/ocultar)</summary><div style="padding:12px 14px;background:#f6f7fa;border-top:1px solid #919BA5;"><ol style="margin:0 0 0 18px;padding:0;font-size:medium;"><li style="margin:4px 0;text-align:justify;">Autor AA, Autor BB. T\u00edtulo del art\u00edculo. <em>Nombre de la Revista</em>. A\u00f1o;volumen(n\u00famero):p\u00e1ginas.</li><li style="margin:4px 0;text-align:justify;">Autor AA, Autor BB. <em>T\u00edtulo del libro</em>. Edici\u00f3n. Ciudad: Editorial; A\u00f1o. p. xx\u2013yy.</li><li style="margin:4px 0;text-align:justify;">Organizaci\u00f3n. T\u00edtulo del documento. Edici\u00f3n (si aplica). Ciudad: Editor; A\u00f1o.</li></ol></div></details>'
      }
    ];

    insertIdentity.run(
      'armty', 'ARMTY - Anestesia Regional Monterrey', 'Identidad corporativa de ARMTY para contenidos de anestesia regional',
      '', '',
      '#0F206C', '#39528F', '#919BA5', '#f6f7fa', '#212121', '#0F206C', '#39528F',
      'Arial', "Arial, Helvetica, sans-serif",
      '',
      'Arial', "Arial, Helvetica, sans-serif",
      'rounded', '8px', '', JSON.stringify(armtyBlocks)
    );

    // Offers (with embedded modules as JSON)
    insertOffer.run(
      'offer-1', 'Diplomado en Anestesia Regional', 'diplomado', 'Teach & Joy',
      'Formacion avanzada en tecnicas de anestesia regional guiada por ultrasonido',
      '2024-1', 'Dr. Salvador Vilchis · Teach & Joy', 'Medicos en formacion de especialidad',
      'eLearning', '120 horas', 'Licenciatura en Medicina',
      'El participante aplicara tecnicas de anestesia regional con dominio anatomico y guia ultrasonografica.',
      'tj-default',
      JSON.stringify([
        { id: 'mod-1', offerId: 'offer-1', name: 'Modulo 1: Fundamentos Anatomicos', description: 'Bases anatomicas y fisiologicas del sistema nervioso periferico', objectives: 'Dominar las bases anatomicas y fisiologicas del SNP para su aplicacion en tecnicas de bloqueo.', topics: [], assignedEditors: ['editor-1', 'editor-2'], order: 1 },
        { id: 'mod-2', offerId: 'offer-1', name: 'Modulo 2: Tecnicas de Bloqueo', description: 'Tecnicas de bloqueo nervioso periferico guiado por ultrasonido', objectives: 'Ejecutar bloqueos nerviosos perifericos con tecnica correcta y segura bajo guia ecografica.', topics: [], assignedEditors: ['editor-2'], order: 2 },
      ]),
      1
    );
    insertOffer.run(
      'offer-2', 'Curso de Manejo del Dolor', 'curso', 'Teach & Joy',
      'Curso integral sobre manejo del dolor cronico y agudo',
      '2024-2', 'Dr. Juan Saucedo', 'Medicos generales y especialistas',
      'bLearning', '40 horas', '',
      'El participante disenara planes de manejo del dolor basados en evidencia actual.',
      '',
      JSON.stringify([]),
      2
    );
  });

  seedTransaction();

  // Seed topics separately (large content)
  seedTopics();

  console.log('[DB] Seed data inserted successfully.');
}

function seedTopics() {
  const insertTopic = db.prepare(`
    INSERT INTO topics (id, module_id, offer_id, title, description, status, author, version, date, offer_name, content, blocks, reference_ids, assigned_editors, template_id, "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const topicData = getDefaultTopics();
  const tx = db.transaction(() => {
    for (const t of topicData) {
      insertTopic.run(
        t.id, t.moduleId, t.offerId, t.title, t.description, t.status,
        t.author, t.version, t.date, t.offerName, t.content,
        JSON.stringify(t.blocks), JSON.stringify(t.referenceIds),
        JSON.stringify(t.assignedEditors), t.templateId, t.order
      );
    }
  });
  tx();
}

function getDefaultTopics() {
  return [
    {
      id: 'topic-1', moduleId: 'mod-1', offerId: 'offer-1',
      title: 'Anatomia Funcional del Plexo Braquial',
      description: 'Bases anatomicas y topograficas para anestesia regional de extremidad superior',
      status: 'aprobado', author: 'Dr. Salvador Vilchis', version: 'v2', date: '15/04/2024',
      offerName: 'Diplomado en Anestesia Regional',
      content: '<h1>Anatomia Funcional del Plexo Braquial</h1><p>El plexo braquial es la principal red nerviosa que inerva la extremidad superior.</p>',
      blocks: [], referenceIds: ['ref-1', 'ref-2'], assignedEditors: ['editor-1'], templateId: 'tpl-1', order: 1,
    },
    {
      id: 'topic-2', moduleId: 'mod-1', offerId: 'offer-1',
      title: 'Tecnicas de Neuroestimulacion y Guia Ecografica',
      description: 'Comparativa de tecnicas para la localizacion nerviosa en anestesia regional',
      status: 'en_revision', author: 'Dr. Jonathan Quinonez', version: 'v1', date: '22/05/2024',
      offerName: 'Diplomado en Anestesia Regional',
      content: '<h1>Tecnicas de Neuroestimulacion y Guia Ecografica</h1><p>La anestesia regional ha evolucionado significativamente.</p>',
      blocks: [], referenceIds: ['ref-1', 'ref-2', 'ref-3'], assignedEditors: ['editor-2'], templateId: 'tpl-1', order: 2,
    },
    {
      id: 'topic-3', moduleId: 'mod-2', offerId: 'offer-1',
      title: 'Bloqueo del Plexo Braquial: Abordaje Supraclavicular',
      description: 'Tecnica, indicaciones y manejo de complicaciones del bloqueo supraclavicular',
      status: 'en_desarrollo', author: 'Ing. Amado Urias', version: 'v1', date: '10/06/2024',
      offerName: 'Diplomado en Anestesia Regional',
      content: '<h1>Bloqueo del Plexo Braquial: Abordaje Supraclavicular</h1><p>A nivel supraclavicular, los troncos del plexo braquial se compactan.</p>',
      blocks: [], referenceIds: ['ref-1', 'ref-2'], assignedEditors: ['editor-1', 'editor-2'], templateId: 'tpl-1', order: 1,
    },
    {
      id: 'topic-4', moduleId: 'mod-2', offerId: 'offer-1',
      title: 'Evaluacion y Monitoreo del Bloqueo Nervioso',
      description: 'Metodos de evaluacion de la calidad e instalacion del bloqueo nervioso periferico',
      status: 'en_desarrollo', author: 'Dr. Juan Saucedo', version: 'v1', date: '18/06/2024',
      offerName: 'Diplomado en Anestesia Regional',
      content: '<h1>Evaluacion y Monitoreo del Bloqueo Nervioso</h1><p>La evaluacion del bloqueo nervioso periferico es una competencia critica.</p>',
      blocks: [], referenceIds: ['ref-1', 'ref-2', 'ref-3'], assignedEditors: ['editor-1', 'editor-2'], templateId: 'tpl-1', order: 2,
    },
  ];
}

export default db;
