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

  // ── Migrations ──────────────────────────────────────────────────────────
  // Add assigned_coordinators and assigned_editors to offers
  try { db.exec(`ALTER TABLE offers ADD COLUMN assigned_coordinators TEXT DEFAULT '[]'`); } catch { /* column exists */ }
  try { db.exec(`ALTER TABLE offers ADD COLUMN assigned_editors TEXT DEFAULT '[]'`); } catch { /* column exists */ }
  // Add assigned_coordinators to topics
  try { db.exec(`ALTER TABLE topics ADD COLUMN assigned_coordinators TEXT DEFAULT '[]'`); } catch { /* column exists */ }
  // Add dashboard_config to users
  try { db.exec(`ALTER TABLE users ADD COLUMN dashboard_config TEXT DEFAULT '{}'`); } catch { /* column exists */ }
  // Add deleted_at for soft-delete / trash
  try { db.exec(`ALTER TABLE topics ADD COLUMN deleted_at TEXT DEFAULT NULL`); } catch { /* column exists */ }
  try { db.exec(`ALTER TABLE topics ADD COLUMN deleted_by TEXT DEFAULT NULL`); } catch { /* column exists */ }
  // Add module_ids and topic_ids to references for scoped visibility
  try { db.exec(`ALTER TABLE "references" ADD COLUMN module_ids TEXT DEFAULT '[]'`); } catch { /* column exists */ }
  try { db.exec(`ALTER TABLE "references" ADD COLUMN topic_ids TEXT DEFAULT '[]'`); } catch { /* column exists */ }
  // Add access_user_ids to folders for user-based access control
  try { db.exec(`ALTER TABLE folders ADD COLUMN access_user_ids TEXT DEFAULT '[]'`); } catch { /* column exists */ }
  // Add html_templates to identities for format templates
  try { db.exec(`ALTER TABLE identities ADD COLUMN html_templates TEXT DEFAULT '{}'`); } catch { /* column exists */ }

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
      },
      {
        id: 'armty-caso-clinico',
        name: 'Caso Cl\u00ednico ARMTY',
        html: '<div style="background:linear-gradient(135deg,#f0f4ff 0%,#e8edf8 100%);border:2px solid #2373BA;border-radius:10px;padding:16px 18px;margin:16px 0;"><p style="margin:0 0 8px 0;font-size:1.05rem;font-weight:700;color:#0F206C;">\ud83c\udfe5 Caso Cl\u00ednico</p><p style="margin:0;text-align:justify;font-size:medium;color:#333;">Paciente masculino de 45 a\u00f1os, ASA II, programado para reparaci\u00f3n de tend\u00f3n de Aquiles bajo bloqueo de nervio ci\u00e1tico popl\u00edteo guiado por ultrasonido...</p></div>'
      },
      {
        id: 'armty-alerta',
        name: 'Alerta / Precauci\u00f3n ARMTY',
        html: '<div style="background:#fff5f5;border-left:6px solid #e53e3e;padding:12px 14px;margin:14px 0;border-radius:0 8px 8px 0;"><p style="margin:0;font-size:medium;"><strong style="color:#c53030;">\u26a0\ufe0f Precauci\u00f3n:</strong> Informaci\u00f3n cr\u00edtica de seguridad del paciente.</p></div>'
      },
      {
        id: 'armty-recuerda',
        name: 'Recuerda ARMTY',
        html: '<div style="background:#f0fff4;border-left:6px solid #38a169;padding:12px 14px;margin:14px 0;border-radius:0 8px 8px 0;"><p style="margin:0;font-size:medium;"><strong style="color:#276749;">\ud83d\udca1 Recuerda:</strong> Punto clave para la pr\u00e1ctica cl\u00ednica.</p></div>'
      },
      {
        id: 'armty-evidencia',
        name: 'Evidencia Cient\u00edfica ARMTY',
        html: '<div style="background:#ffffff;border:1px solid #2373BA;border-radius:8px;padding:14px 16px;margin:14px 0;"><p style="margin:0 0 6px 0;font-weight:700;color:#0F206C;font-size:0.95rem;">\ud83d\udcca Evidencia Cient\u00edfica</p><p style="margin:0;text-align:justify;font-size:medium;color:#444;">Seg\u00fan un metaan\u00e1lisis reciente (2024), la t\u00e9cnica guiada por ultrasonido reduce significativamente las complicaciones...</p></div>'
      },
      {
        id: 'armty-procedimiento',
        name: 'Procedimiento Paso a Paso ARMTY',
        html: '<div style="background:#f8f9ff;border:1px solid #39528F;border-radius:8px;padding:14px 16px;margin:14px 0;"><p style="margin:0 0 8px 0;font-weight:700;color:#39528F;font-size:1rem;">\ud83d\udccb Procedimiento</p><ol style="margin:0 0 0 18px;padding:0;font-size:medium;"><li style="margin:6px 0;text-align:justify;">Paso 1: Posicionar al paciente.</li><li style="margin:6px 0;text-align:justify;">Paso 2: Identificar estructuras por ultrasonido.</li><li style="margin:6px 0;text-align:justify;">Paso 3: Realizar la t\u00e9cnica con aguja adecuada.</li></ol></div>'
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
      content: '<h1>Anatomia Funcional del Plexo Braquial</h1>' +
        '<h2>Objetivos de Aprendizaje</h2>' +
        '<ul><li>Identificar las raices, troncos, divisiones, fasciculos y ramas terminales del plexo braquial.</li><li>Correlacionar la anatomia del plexo braquial con las tecnicas de bloqueo regional.</li><li>Reconocer variantes anatomicas clinicamente relevantes.</li></ul>' +
        '<h2>Introduccion</h2>' +
        '<p style="text-align:justify">El plexo braquial es la principal red nerviosa que inerva la extremidad superior. Su conocimiento detallado es fundamental para la practica segura y eficaz de la anestesia regional. Este tema aborda la anatomia funcional desde las raices cervicales hasta las ramas terminales, con enfasis en los puntos de referencia ecograficos y las relaciones vasculares criticas.</p>' +
        '<h2>Desarrollo del Tema</h2>' +
        '<h3>1. Organizacion General del Plexo</h3>' +
        '<p style="text-align:justify">El plexo braquial se forma a partir de las ramas ventrales de los nervios espinales C5-T1. Estas raices convergen para formar tres troncos principales:</p>' +
        '<p style="text-align:center;font-weight:600;font-size:0.9em;color:#1b4b85"><strong>Tabla 1. Organizacion del plexo braquial por niveles</strong></p>' +
        '<table><thead><tr><th>Nivel</th><th>Estructura</th><th>Raices</th><th>Ubicacion</th></tr></thead><tbody>' +
        '<tr><td>Raices</td><td>5 raices cervicales</td><td>C5, C6, C7, C8, T1</td><td>Foramenes intervertebrales</td></tr>' +
        '<tr><td>Troncos</td><td>Superior, Medio, Inferior</td><td>C5-C6, C7, C8-T1</td><td>Triangulo posterior del cuello</td></tr>' +
        '<tr><td>Divisiones</td><td>Anterior y Posterior (x3)</td><td>Todas</td><td>Posterior a la clavicula</td></tr>' +
        '<tr><td>Fasciculos</td><td>Lateral, Posterior, Medial</td><td>Combinaciones</td><td>Alrededor de la arteria axilar</td></tr>' +
        '</tbody></table>' +
        '<h3>2. Relaciones Anatomicas Clave</h3>' +
        '<p style="text-align:justify">A nivel interescalenico, las raices del plexo se encuentran entre los musculos escaleno anterior y medio. La arteria subclavia se situa anterior e inferior al tronco inferior. El nervio frenico discurre sobre el escaleno anterior, lo cual explica la paralisis diafragmatica frecuente tras bloqueos interescalenicos.</p>' +
        '<div class="armty-perla" style="background:#ffffff;border-left:6px solid #2373BA;padding:10px 14px;margin:14px 0;"><p style="margin:0;text-align:justify;font-size:medium;"><strong>Perla clinica:</strong> La distancia entre el plexo braquial y la pleura a nivel supraclavicular es de solo 1-2 cm, lo que exige precaucion extrema durante la puncion.</p></div>' +
        '<h3>3. Variantes Anatomicas</h3>' +
        '<p style="text-align:justify">Las variantes anatomicas del plexo braquial se presentan en aproximadamente el 30% de la poblacion. Las mas frecuentes incluyen la contribucion de C4 (plexo prefijado) o T2 (plexo posfijado), asi como la presencia de un tronco medio bifurcado.</p>' +
        '<p style="text-align:center;font-weight:600;font-size:0.9em;color:#1b4b85"><strong>Tabla 2. Frecuencia de variantes anatomicas del plexo braquial</strong></p>' +
        '<table><thead><tr><th>Variante</th><th>Frecuencia</th><th>Relevancia clinica</th></tr></thead><tbody>' +
        '<tr><td>Plexo prefijado (C4-C8)</td><td>22%</td><td>Mayor riesgo de bloqueo incompleto distal</td></tr>' +
        '<tr><td>Plexo posfijado (C6-T2)</td><td>8%</td><td>Territorio sensitivo ampliado</td></tr>' +
        '<tr><td>Comunicacion con plexo cervical</td><td>15%</td><td>Analgesia cervical colateral</td></tr>' +
        '</tbody></table>' +
        '<h2>Conclusion</h2>' +
        '<p style="text-align:justify">El dominio de la anatomia del plexo braquial es la piedra angular de la anestesia regional exitosa. La comprension de las relaciones estructurales, las variantes anatomicas y los puntos de referencia ecograficos permite al anestesiologo planificar y ejecutar bloqueos nerviosos con mayor seguridad y eficacia.</p>' +
        '<sup style="color:#1b4b85;font-weight:600">(Tabla 1)</sup> <sup style="color:#1b4b85;font-weight:600">(Tabla 2)</sup>',
      blocks: [], referenceIds: ['ref-1', 'ref-2'], assignedEditors: ['editor-1'], templateId: 'tpl-1', order: 1,
    },
    {
      id: 'topic-2', moduleId: 'mod-1', offerId: 'offer-1',
      title: 'Tecnicas de Neuroestimulacion y Guia Ecografica',
      description: 'Comparativa de tecnicas para la localizacion nerviosa en anestesia regional',
      status: 'en_revision', author: 'Dr. Jonathan Quinonez', version: 'v1', date: '22/05/2024',
      offerName: 'Diplomado en Anestesia Regional',
      content: '<h1>Tecnicas de Neuroestimulacion y Guia Ecografica</h1>' +
        '<h2>Objetivos de Aprendizaje</h2>' +
        '<ul><li>Comparar las tecnicas de neuroestimulacion electrica con la guia ecografica.</li><li>Describir los principios fisicos del ultrasonido aplicados a la anestesia regional.</li><li>Seleccionar la tecnica adecuada segun el contexto clinico.</li></ul>' +
        '<h2>Introduccion</h2>' +
        '<p style="text-align:justify">La anestesia regional ha evolucionado significativamente con la incorporacion de tecnologias de localizacion nerviosa. Desde la neuroestimulacion electrica hasta el ultrasonido en tiempo real, cada tecnica ofrece ventajas y limitaciones especificas que el profesional debe conocer para optimizar sus resultados clinicos.</p>' +
        '<h2>Desarrollo del Tema</h2>' +
        '<h3>1. Neuroestimulacion Electrica</h3>' +
        '<p style="text-align:justify">La neuroestimulacion utiliza corrientes electricas de baja intensidad (0.1-1.0 mA) para provocar respuestas motoras que confirman la proximidad de la aguja al nervio objetivo. Los parametros optimos incluyen una duracion de pulso de 0.1 ms y una frecuencia de 2 Hz.</p>' +
        '<div class="armty-tip" style="background:#f6f7fa;border-left:6px solid #919BA5;padding:10px 14px;margin:14px 0;"><p style="margin:0;text-align:justify;font-size:medium;"><strong>Tip clinico:</strong> Una respuesta motora obtenida a menos de 0.3 mA sin parestesia sugiere contacto intraneural; retire la aguja ligeramente antes de inyectar.</p></div>' +
        '<h3>2. Guia Ecografica</h3>' +
        '<p style="text-align:justify">El ultrasonido permite la visualizacion directa de nervios, vasos y la distribucion del anestesico local en tiempo real. Los transductores lineales de alta frecuencia (10-15 MHz) son ideales para estructuras superficiales, mientras que los convexos de baja frecuencia (2-5 MHz) se utilizan para bloqueos profundos.</p>' +
        '<p style="text-align:center;font-weight:600;font-size:0.9em;color:#1b4b85"><strong>Tabla 1. Comparativa de tecnicas de localizacion nerviosa</strong></p>' +
        '<table><thead><tr><th>Parametro</th><th>Neuroestimulacion</th><th>Ultrasonido</th><th>Combinada</th></tr></thead><tbody>' +
        '<tr><td>Visualizacion directa</td><td>No</td><td>Si</td><td>Si</td></tr>' +
        '<tr><td>Confirmacion funcional</td><td>Si</td><td>No</td><td>Si</td></tr>' +
        '<tr><td>Curva de aprendizaje</td><td>Moderada</td><td>Alta</td><td>Alta</td></tr>' +
        '<tr><td>Tasa de exito (%)</td><td>85-90</td><td>92-97</td><td>95-99</td></tr>' +
        '<tr><td>Tiempo procedimiento</td><td>5-10 min</td><td>8-15 min</td><td>10-18 min</td></tr>' +
        '</tbody></table>' +
        '<h3>3. Tecnica Combinada</h3>' +
        '<p style="text-align:justify">La combinacion de ambas tecnicas ("dual guidance") maximiza la precision y seguridad. El ultrasonido guia la trayectoria de la aguja mientras la neuroestimulacion confirma la identidad del nervio antes de la inyeccion.</p>' +
        '<blockquote><p>"La guia ecografica no elimina la necesidad de comprender la anatomia; la hace mas evidente y accesible." — Dr. Admir Hadzic, 2022</p></blockquote>' +
        '<h2>Conclusion</h2>' +
        '<p style="text-align:justify">La seleccion de la tecnica de localizacion nerviosa debe basarse en la experiencia del operador, la disponibilidad de equipos y las caracteristicas anatomicas del paciente. La tendencia actual favorece la guia ecografica como estandar de cuidado, complementada con neuroestimulacion cuando la visualizacion es suboptima.</p>',
      blocks: [], referenceIds: ['ref-1', 'ref-2', 'ref-3'], assignedEditors: ['editor-2'], templateId: 'tpl-1', order: 2,
    },
    {
      id: 'topic-3', moduleId: 'mod-2', offerId: 'offer-1',
      title: 'Bloqueo del Plexo Braquial: Abordaje Supraclavicular',
      description: 'Tecnica, indicaciones y manejo de complicaciones del bloqueo supraclavicular',
      status: 'en_desarrollo', author: 'Ing. Amado Urias', version: 'v1', date: '10/06/2024',
      offerName: 'Diplomado en Anestesia Regional',
      content: '<h1>Bloqueo del Plexo Braquial: Abordaje Supraclavicular</h1>' +
        '<h2>Objetivos de Aprendizaje</h2>' +
        '<ol><li>Describir la anatomia ecografica del plexo braquial a nivel supraclavicular.</li><li>Ejecutar la tecnica de bloqueo supraclavicular paso a paso.</li><li>Identificar y manejar las complicaciones potenciales.</li></ol>' +
        '<h2>Introduccion</h2>' +
        '<p style="text-align:justify">A nivel supraclavicular, los troncos del plexo braquial se compactan en un area reducida sobre la primera costilla, lateral a la arteria subclavia. Esta disposicion compacta convierte al abordaje supraclavicular en el "bloqueo espinal de la extremidad superior", proporcionando anestesia completa y predecible del brazo.</p>' +
        '<h2>Desarrollo del Tema</h2>' +
        '<h3>1. Anatomia Ecografica</h3>' +
        '<p style="text-align:justify">En la imagen ecografica, el plexo braquial aparece como un racimo de estructuras hipoecoicas ("racimo de uvas") situado posterolateral a la arteria subclavia y superficial a la primera costilla. La pleura se visualiza como una linea hiperecogenica con deslizamiento pulmonar inferior a la costilla.</p>' +
        '<h3>2. Tecnica Paso a Paso</h3>' +
        '<ol><li><strong>Posicion del paciente:</strong> Semisentado o supino, cabeza girada al lado contralateral, brazo ipsilateral a lo largo del cuerpo.</li>' +
        '<li><strong>Preparacion:</strong> Asepsia y antisepsia de la region supraclavicular. Transductor lineal de alta frecuencia.</li>' +
        '<li><strong>Escaneo:</strong> Colocar el transductor en posicion coronal oblicua en la fosa supraclavicular. Identificar la arteria subclavia y el plexo.</li>' +
        '<li><strong>Puncion:</strong> Abordaje en plano (lateral a medial). Avanzar la aguja bajo vision directa hasta el "corner pocket" entre la arteria y la primera costilla.</li>' +
        '<li><strong>Inyeccion:</strong> Aspiracion negativa, luego inyectar 20-25 mL de anestesico local fraccionado, observando la dispersion alrededor del plexo.</li></ol>' +
        '<div class="armty-note" style="background:#ffffff;border-left:6px solid #39528F;padding:10px 14px;margin:14px 0;"><p style="margin:0;text-align:justify;font-size:medium;"><strong>Nota importante:</strong> Nunca avance la aguja sin visualizar la punta. La primera costilla es la barrera de seguridad contra el neumotorax.</p></div>' +
        '<h3>3. Complicaciones</h3>' +
        '<p style="text-align:center;font-weight:600;font-size:0.9em;color:#1b4b85"><strong>Tabla 1. Complicaciones del bloqueo supraclavicular</strong></p>' +
        '<table><thead><tr><th>Complicacion</th><th>Incidencia</th><th>Prevencion</th><th>Manejo</th></tr></thead><tbody>' +
        '<tr><td>Neumotorax</td><td>0.5-1%</td><td>Visualizacion continua de la aguja</td><td>Observacion o drenaje segun gravedad</td></tr>' +
        '<tr><td>Sindrome de Horner</td><td>1-3%</td><td>Limitar volumen de AL</td><td>Autoresolutivo (2-4 h)</td></tr>' +
        '<tr><td>Paralisis diafragmatica</td><td>25-50%</td><td>Dosis minima eficaz</td><td>Monitoreo SpO2</td></tr>' +
        '<tr><td>Puncion vascular</td><td>2-5%</td><td>Doppler color previo</td><td>Compresion directa</td></tr>' +
        '</tbody></table>' +
        '<h2>Conclusion</h2>' +
        '<p style="text-align:justify">El bloqueo supraclavicular es una tecnica altamente eficaz para la anestesia de la extremidad superior. La guia ecografica ha mejorado significativamente su seguridad al permitir la visualizacion en tiempo real de las estructuras criticas.</p>',
      blocks: [], referenceIds: ['ref-1', 'ref-2'], assignedEditors: ['editor-1', 'editor-2'], templateId: 'tpl-1', order: 1,
    },
    {
      id: 'topic-4', moduleId: 'mod-2', offerId: 'offer-1',
      title: 'Evaluacion y Monitoreo del Bloqueo Nervioso',
      description: 'Metodos de evaluacion de la calidad e instalacion del bloqueo nervioso periferico',
      status: 'en_desarrollo', author: 'Dr. Juan Saucedo', version: 'v1', date: '18/06/2024',
      offerName: 'Diplomado en Anestesia Regional',
      content: '<h1>Evaluacion y Monitoreo del Bloqueo Nervioso</h1>' +
        '<h2>Objetivos de Aprendizaje</h2>' +
        '<ul><li>Aplicar escalas estandarizadas para evaluar la calidad del bloqueo nervioso.</li><li>Interpretar el patron de instalacion del bloqueo sensorial y motor.</li><li>Documentar adecuadamente los hallazgos de la evaluacion.</li></ul>' +
        '<h2>Introduccion</h2>' +
        '<p style="text-align:justify">La evaluacion del bloqueo nervioso periferico es una competencia critica que permite determinar la calidad, extension y duracion del efecto anestesico. Una evaluacion sistematica garantiza la seguridad del paciente y optimiza las condiciones quirurgicas.</p>' +
        '<h2>Desarrollo del Tema</h2>' +
        '<h3>1. Evaluacion Sensorial</h3>' +
        '<p style="text-align:justify">La evaluacion sensorial se realiza mediante estimulos termicos (hielo o alcohol) y mecanicos (pinchazo con aguja roma) en los dermatomas correspondientes al territorio del nervio bloqueado. Se utiliza una escala de 0 a 2:</p>' +
        '<p style="text-align:center;font-weight:600;font-size:0.9em;color:#1b4b85"><strong>Tabla 1. Escala de evaluacion sensorial del bloqueo</strong></p>' +
        '<table><thead><tr><th>Grado</th><th>Descripcion</th><th>Interpretacion</th></tr></thead><tbody>' +
        '<tr><td>0</td><td>Sensibilidad normal</td><td>Sin bloqueo</td></tr>' +
        '<tr><td>1</td><td>Hipoalgesia (siente tacto, no dolor)</td><td>Bloqueo parcial</td></tr>' +
        '<tr><td>2</td><td>Analgesia/anestesia completa</td><td>Bloqueo completo</td></tr>' +
        '</tbody></table>' +
        '<h3>2. Evaluacion Motora</h3>' +
        '<p style="text-align:justify">La funcion motora se evalua solicitando al paciente que realice movimientos especificos contra resistencia. La escala de Bromage modificada es la mas utilizada:</p>' +
        '<p style="text-align:center;font-weight:600;font-size:0.9em;color:#1b4b85"><strong>Tabla 2. Escala de Bromage modificada para extremidad superior</strong></p>' +
        '<table><thead><tr><th>Grado</th><th>Movimiento</th><th>Fuerza</th></tr></thead><tbody>' +
        '<tr><td>0</td><td>Movimiento completo</td><td>Normal</td></tr>' +
        '<tr><td>1</td><td>Flexion de codo posible</td><td>Reducida</td></tr>' +
        '<tr><td>2</td><td>Solo movimiento de dedos</td><td>Muy reducida</td></tr>' +
        '<tr><td>3</td><td>Sin movimiento</td><td>Paralisis completa</td></tr>' +
        '</tbody></table>' +
        '<h3>3. Tiempos de Evaluacion</h3>' +
        '<p style="text-align:justify">Se recomienda evaluar el bloqueo a los 10, 20 y 30 minutos post-inyeccion. La mayoria de los bloqueos exitosos muestran signos de instalacion a los 10-15 minutos con anestesicos locales de accion intermedia.</p>' +
        '<div style="background:#fff8e5;border:1px solid #f0d999;border-radius:8px;padding:12px 14px;margin:20px 0;"><p style="margin:0;text-align:justify;font-size:medium;"><strong>Conclusion:</strong> La evaluacion sistematica del bloqueo nervioso es esencial para garantizar condiciones quirurgicas adecuadas y detectar oportunamente bloqueos fallidos o incompletos que requieran intervencion.</p></div>' +
        '<sup style="color:#1b4b85;font-weight:600">(Tabla 1)</sup> <sup style="color:#1b4b85;font-weight:600">(Tabla 2)</sup>',
      blocks: [], referenceIds: ['ref-1', 'ref-2', 'ref-3'], assignedEditors: ['editor-1', 'editor-2'], templateId: 'tpl-1', order: 2,
    },
    {
      id: 'topic-5', moduleId: 'mod-1', offerId: 'offer-1',
      title: 'Farmacologia de los Anestesicos Locales',
      description: 'Propiedades farmacologicas, mecanismos de accion y seleccion clinica de anestesicos locales',
      status: 'en_revision', author: 'Dr. Salvador Vilchis', version: 'v1', date: '25/04/2024',
      offerName: 'Diplomado en Anestesia Regional',
      content: '<h1>Farmacologia de los Anestesicos Locales</h1>' +
        '<h2>Objetivos de Aprendizaje</h2>' +
        '<ul><li>Clasificar los anestesicos locales segun su estructura quimica y propiedades farmacocineticas.</li><li>Calcular dosis maximas seguras para cada anestesico local.</li><li>Reconocer y tratar la toxicidad sistemica por anestesicos locales (LAST).</li></ul>' +
        '<h2>Introduccion</h2>' +
        '<p style="text-align:justify">Los anestesicos locales son farmacos que bloquean de manera reversible la conduccion nerviosa al inhibir los canales de sodio voltaje-dependientes. Su conocimiento farmacodinamico y farmacocinetico es esencial para optimizar la eficacia y minimizar los riesgos de toxicidad en la practica de la anestesia regional.</p>' +
        '<h2>Desarrollo del Tema</h2>' +
        '<h3>1. Clasificacion Quimica</h3>' +
        '<p style="text-align:justify">Los anestesicos locales se dividen en dos grandes familias segun el enlace quimico que une el anillo aromatico con la cadena intermedia: aminoesteres (procaina, cloroprocaina, tetracaina) y aminoamidas (lidocaina, bupivacaina, ropivacaina, levobupivacaina).</p>' +
        '<h3>2. Propiedades Farmacocineticas</h3>' +
        '<p style="text-align:center;font-weight:600;font-size:0.9em;color:#1b4b85"><strong>Tabla 1. Comparativa de anestesicos locales de uso comun</strong></p>' +
        '<table><thead><tr><th>Farmaco</th><th>Potencia</th><th>Inicio (min)</th><th>Duracion (h)</th><th>Dosis max (mg/kg)</th><th>Uso principal</th></tr></thead><tbody>' +
        '<tr><td>Lidocaina 1-2%</td><td>Media</td><td>5-10</td><td>1.5-2</td><td>4.5 (7 c/epi)</td><td>Bloqueos de inicio rapido</td></tr>' +
        '<tr><td>Bupivacaina 0.25-0.5%</td><td>Alta</td><td>15-20</td><td>4-8</td><td>2.5</td><td>Bloqueos prolongados</td></tr>' +
        '<tr><td>Ropivacaina 0.5-0.75%</td><td>Alta</td><td>10-15</td><td>4-6</td><td>3</td><td>Menor cardiotoxicidad</td></tr>' +
        '<tr><td>Levobupivacaina 0.5%</td><td>Alta</td><td>15-20</td><td>4-8</td><td>2.5</td><td>Perfil de seguridad mejorado</td></tr>' +
        '<tr><td>Cloroprocaina 3%</td><td>Baja</td><td>3-5</td><td>0.5-1</td><td>11</td><td>Ambulatorio, inicio ultrarapido</td></tr>' +
        '</tbody></table>' +
        '<h3>3. Toxicidad Sistemica (LAST)</h3>' +
        '<p style="text-align:justify">La toxicidad sistemica por anestesicos locales es la complicacion mas temida. Se manifiesta inicialmente con sintomas neurologicos (acufenos, parestesias periorales, agitacion, convulsiones) seguidos de cardiotoxicidad (arritmias, colapso cardiovascular).</p>' +
        '<div class="armty-note" style="background:#ffffff;border-left:6px solid #39528F;padding:10px 14px;margin:14px 0;"><p style="margin:0;text-align:justify;font-size:medium;"><strong>Nota critica:</strong> Ante cualquier sospecha de LAST, administre emulsion lipidica intravenosa al 20% (Intralipid): bolo de 1.5 mL/kg seguido de infusion a 0.25 mL/kg/min. Tenga disponible el protocolo en todas las areas donde se practique anestesia regional.</p></div>' +
        '<h3>4. Adyuvantes</h3>' +
        '<p style="text-align:justify">Los adyuvantes pueden prolongar la duracion y mejorar la calidad del bloqueo:</p>' +
        '<ul><li><strong>Epinefrina (1:200,000):</strong> Reduce la absorcion sistemica, prolonga la duracion, sirve como marcador de inyeccion intravascular.</li><li><strong>Dexametasona (4-8 mg perineural):</strong> Prolonga la analgesia hasta 8-12 horas adicionales.</li><li><strong>Clonidina (75-150 mcg):</strong> Efecto analgesico sinergico moderado.</li></ul>' +
        '<h2>Conclusion</h2>' +
        '<p style="text-align:justify">La seleccion del anestesico local debe considerar el tipo y duracion de la cirugia, las comorbilidades del paciente y la dosis maxima permitida. El conocimiento del perfil farmacologico de cada agente permite personalizar la tecnica anestesica y maximizar la seguridad.</p>' +
        '<sup style="color:#1b4b85;font-weight:600">(Tabla 1)</sup>',
      blocks: [], referenceIds: ['ref-1', 'ref-3'], assignedEditors: ['editor-1'], templateId: 'tpl-1', order: 3,
    },
    {
      id: 'topic-6', moduleId: 'mod-2', offerId: 'offer-1',
      title: 'Bloqueo del Nervio Femoral y Canal Aductor',
      description: 'Tecnicas de bloqueo para analgesia de extremidad inferior: femoral y canal de los aductores',
      status: 'en_desarrollo', author: 'Dr. Jonathan Quinonez', version: 'v1', date: '01/07/2024',
      offerName: 'Diplomado en Anestesia Regional',
      content: '<h1>Bloqueo del Nervio Femoral y Canal de los Aductores</h1>' +
        '<h2>Objetivos de Aprendizaje</h2>' +
        '<ol><li>Describir la anatomia del nervio femoral y el canal aductor.</li><li>Diferenciar las indicaciones del bloqueo femoral vs. canal aductor.</li><li>Ejecutar ambas tecnicas bajo guia ecografica con precision.</li></ol>' +
        '<h2>Introduccion</h2>' +
        '<p style="text-align:justify">El bloqueo del nervio femoral y del canal de los aductores son tecnicas fundamentales para la analgesia de la extremidad inferior. Mientras que el bloqueo femoral proporciona analgesia amplia pero con debilidad cuadricipital significativa, el bloqueo del canal aductor ofrece analgesia selectiva preservando la funcion motora, lo que facilita la deambulacion temprana.</p>' +
        '<h2>Desarrollo del Tema</h2>' +
        '<h3>1. Anatomia del Nervio Femoral</h3>' +
        '<p style="text-align:justify">El nervio femoral (L2-L4) es la rama mas grande del plexo lumbar. Desciende entre los musculos iliaco y psoas mayor, pasando bajo el ligamento inguinal lateral a la arteria femoral. En la imagen ecografica, aparece como una estructura triangular o fusiforme hiperecoica en el surco iliofascial.</p>' +
        '<h3>2. Canal de los Aductores (Hunter)</h3>' +
        '<p style="text-align:justify">El canal aductor es un tunel aponeuroptico en el tercio medio del muslo, delimitado por el musculo vasto medial (lateral), el aductor largo/magno (medial) y la membrana vastoaductora (anterior). Contiene el nervio safeno, la rama al vasto medial y fibras del nervio obturador.</p>' +
        '<h3>3. Comparativa de Tecnicas</h3>' +
        '<p style="text-align:center;font-weight:600;font-size:0.9em;color:#1b4b85"><strong>Tabla 1. Bloqueo femoral vs. canal aductor</strong></p>' +
        '<table><thead><tr><th>Caracteristica</th><th>Bloqueo Femoral</th><th>Canal Aductor</th></tr></thead><tbody>' +
        '<tr><td>Analgesia rodilla</td><td>Excelente</td><td>Excelente</td></tr>' +
        '<tr><td>Debilidad cuadricipital</td><td>Significativa (80%)</td><td>Minima (8%)</td></tr>' +
        '<tr><td>Deambulacion temprana</td><td>Limitada</td><td>Posible</td></tr>' +
        '<tr><td>Indicacion principal</td><td>Fractura femoral, cirugia de rodilla mayor</td><td>Artroplastia de rodilla, artroscopia</td></tr>' +
        '<tr><td>Volumen recomendado</td><td>20-30 mL</td><td>15-20 mL</td></tr>' +
        '</tbody></table>' +
        '<div class="armty-perla" style="background:#ffffff;border-left:6px solid #2373BA;padding:10px 14px;margin:14px 0;"><p style="margin:0;text-align:justify;font-size:medium;"><strong>Perla clinica:</strong> En protocolos de recuperacion acelerada (ERAS) para artroplastia total de rodilla, el bloqueo del canal aductor ha reemplazado al femoral como tecnica de primera linea, ya que permite la deambulacion a las 6-8 horas postcirugicas.</p></div>' +
        '<h3>4. Tecnica Ecografica del Canal Aductor</h3>' +
        '<ol><li>Colocar al paciente en supino con el muslo en ligera rotacion externa.</li><li>Posicionar el transductor lineal transversalmente en el tercio medio del muslo.</li><li>Identificar la arteria femoral superficial profunda al musculo sartorio.</li><li>El nervio safeno se visualiza como un punto hiperecoico lateral a la arteria.</li><li>Insertar la aguja en plano (lateral a medial) hasta posicionar la punta junto al nervio.</li><li>Inyectar 15-20 mL de ropivacaina al 0.5% o bupivacaina al 0.25%.</li></ol>' +
        '<h2>Conclusion</h2>' +
        '<p style="text-align:justify">La eleccion entre bloqueo femoral y canal aductor debe individualizarse segun el procedimiento quirurgico, los objetivos de rehabilitacion y el perfil de riesgo del paciente. Ambas tecnicas son complementarias y forman parte esencial del arsenal del anestesiologo regional moderno.</p>',
      blocks: [], referenceIds: ['ref-1', 'ref-2', 'ref-3'], assignedEditors: ['editor-2'], templateId: 'tpl-1', order: 3,
    },
    {
      id: 'topic-7', moduleId: 'mod-1', offerId: 'offer-1',
      title: 'Principios de Ultrasonido Aplicado a Anestesia Regional',
      description: 'Fisica del ultrasonido, optimizacion de imagen y artefactos comunes en la practica de bloqueos nerviosos',
      status: 'aprobado', author: 'Ing. Amado Urias', version: 'v2', date: '05/05/2024',
      offerName: 'Diplomado en Anestesia Regional',
      content: '<h1>Principios de Ultrasonido Aplicado a Anestesia Regional</h1>' +
        '<h2>Objetivos de Aprendizaje</h2>' +
        '<ul><li>Explicar los principios fisicos basicos del ultrasonido diagnostico.</li><li>Optimizar la imagen ecografica para la visualizacion de nervios perifericos.</li><li>Identificar y corregir los artefactos mas comunes.</li></ul>' +
        '<h2>Introduccion</h2>' +
        '<p style="text-align:justify">El ultrasonido se ha convertido en la herramienta fundamental para la anestesia regional moderna. Comprender sus principios fisicos permite al operador optimizar la calidad de la imagen, interpretar correctamente las estructuras visualizadas y reconocer artefactos que podrian conducir a errores de identificacion.</p>' +
        '<h2>Desarrollo del Tema</h2>' +
        '<h3>1. Principios Fisicos</h3>' +
        '<p style="text-align:justify">El ultrasonido diagnostico utiliza ondas sonoras de alta frecuencia (2-18 MHz) que se propagan a traves de los tejidos. Cuando estas ondas encuentran una interfaz entre tejidos con diferente impedancia acustica, parte de la energia se refleja (eco) y parte se transmite. El equipo procesa los ecos reflejados para construir la imagen bidimensional en tiempo real.</p>' +
        '<p style="text-align:center;font-weight:600;font-size:0.9em;color:#1b4b85"><strong>Tabla 1. Relacion frecuencia-profundidad en transductores</strong></p>' +
        '<table><thead><tr><th>Tipo de transductor</th><th>Frecuencia</th><th>Profundidad util</th><th>Resolucion</th><th>Aplicacion</th></tr></thead><tbody>' +
        '<tr><td>Lineal alta frecuencia</td><td>10-18 MHz</td><td>2-4 cm</td><td>Muy alta</td><td>Nervios superficiales, interescalenico</td></tr>' +
        '<tr><td>Lineal media frecuencia</td><td>6-10 MHz</td><td>4-6 cm</td><td>Alta</td><td>Supraclavicular, axilar, femoral</td></tr>' +
        '<tr><td>Convexo baja frecuencia</td><td>2-5 MHz</td><td>8-15 cm</td><td>Moderada</td><td>Lumbar, subgluteo, ciatico</td></tr>' +
        '</tbody></table>' +
        '<h3>2. Ecogenicidad de los Tejidos</h3>' +
        '<p style="text-align:justify">Los nervios perifericos presentan un patron ecografico caracteristico en corte transversal: aspecto de "panal de abejas" con multiples areas hipoecoicas (fasciculos) rodeadas por un marco hiperecoico (perineuro). Este patron se denomina "fascicular" y permite diferenciar nervios de tendones y vasos.</p>' +
        '<h3>3. Optimizacion de Imagen</h3>' +
        '<ul><li><strong>Ganancia total:</strong> Ajustar hasta que el fondo de la imagen sea gris oscuro (no negro absoluto).</li><li><strong>Ganancia por zonas (TGC):</strong> Compensar la atenuacion en profundidad.</li><li><strong>Profundidad:</strong> Ajustar para que la estructura objetivo este en el tercio central de la pantalla.</li><li><strong>Foco:</strong> Posicionar a la profundidad de la estructura de interes.</li><li><strong>Preset:</strong> Seleccionar "Nervio" o "MSK" si esta disponible en el equipo.</li></ul>' +
        '<h3>4. Artefactos Comunes</h3>' +
        '<p style="text-align:center;font-weight:600;font-size:0.9em;color:#1b4b85"><strong>Tabla 2. Artefactos ecograficos y su manejo</strong></p>' +
        '<table><thead><tr><th>Artefacto</th><th>Causa</th><th>Apariencia</th><th>Solucion</th></tr></thead><tbody>' +
        '<tr><td>Anisotropia</td><td>Angulo de incidencia oblicuo</td><td>Nervio desaparece o se oscurece</td><td>Bascular el transductor (tilting)</td></tr>' +
        '<tr><td>Sombra acustica</td><td>Estructura altamente reflectante (hueso, calificacion)</td><td>Zona oscura posterior</td><td>Cambiar la ventana acustica</td></tr>' +
        '<tr><td>Refuerzo posterior</td><td>Estructura con baja atenuacion (vaso)</td><td>Zona brillante posterior al vaso</td><td>Ajustar TGC o ganancia</td></tr>' +
        '<tr><td>Reverberacion</td><td>Rebote entre aguja y transductor</td><td>Lineas paralelas repetitivas</td><td>Ajustar angulo de insercion</td></tr>' +
        '</tbody></table>' +
        '<div class="armty-tip" style="background:#f6f7fa;border-left:6px solid #919BA5;padding:10px 14px;margin:14px 0;"><p style="margin:0;text-align:justify;font-size:medium;"><strong>Tip practico:</strong> La anisotropia es la causa mas frecuente de "desaparicion" de un nervio durante el escaneo. Si pierde la visualizacion, basculen lentamente el transductor antes de cambiar la posicion.</p></div>' +
        '<h2>Conclusion</h2>' +
        '<p style="text-align:justify">El dominio de los principios de ultrasonido es un prerequisito para la practica segura de la anestesia regional guiada por ecografia. La optimizacion sistematica de la imagen y el reconocimiento de artefactos mejoran la identificacion de estructuras y reducen las complicaciones asociadas al procedimiento.</p>' +
        '<sup style="color:#1b4b85;font-weight:600">(Tabla 1)</sup> <sup style="color:#1b4b85;font-weight:600">(Tabla 2)</sup>',
      blocks: [], referenceIds: ['ref-1', 'ref-2', 'ref-3'], assignedEditors: ['editor-1', 'editor-2'], templateId: 'tpl-1', order: 4,
    },
    {
      id: 'topic-8', moduleId: 'mod-2', offerId: 'offer-1',
      title: 'Protocolos de Seguridad en Anestesia Regional',
      description: 'Listas de verificacion, consentimiento informado y manejo de emergencias en la practica de bloqueos nerviosos',
      status: 'en_desarrollo', author: 'Dr. Juan Saucedo', version: 'v1', date: '15/07/2024',
      offerName: 'Diplomado en Anestesia Regional',
      content: '<h1>Protocolos de Seguridad en Anestesia Regional</h1>' +
        '<h2>Objetivos de Aprendizaje</h2>' +
        '<ul><li>Implementar listas de verificacion pre-procedimiento para bloqueos nerviosos.</li><li>Aplicar el protocolo estandarizado de manejo de LAST.</li><li>Documentar adecuadamente el procedimiento y el consentimiento informado.</li></ul>' +
        '<h2>Introduccion</h2>' +
        '<p style="text-align:justify">La seguridad del paciente es la prioridad absoluta en la practica de la anestesia regional. La implementacion de protocolos estandarizados, listas de verificacion y algoritmos de manejo de emergencias ha demostrado reducir significativamente la incidencia de complicaciones graves. Este tema presenta los lineamientos actuales basados en evidencia y las recomendaciones de las sociedades internacionales.</p>' +
        '<h2>Desarrollo del Tema</h2>' +
        '<h3>1. Lista de Verificacion Pre-Procedimiento</h3>' +
        '<p style="text-align:justify">Antes de realizar cualquier bloqueo nervioso, se debe completar una lista de verificacion que incluya:</p>' +
        '<ol><li>Verificacion de identidad del paciente y sitio quirurgico.</li><li>Revision de consentimiento informado firmado.</li><li>Revision de alergias (especialmente a anestesicos locales y latex).</li><li>Revision de anticoagulantes y antiagregantes plaquetarios.</li><li>Verificacion de equipo de ultrasonido funcional.</li><li>Disponibilidad de emulsion lipidica 20% (Intralipid).</li><li>Monitorizacion basica instalada (ECG, SpO2, PANI).</li><li>Acceso intravenoso permeable.</li></ol>' +
        '<h3>2. Protocolo LAST (Local Anesthetic Systemic Toxicity)</h3>' +
        '<p style="text-align:justify">El protocolo de manejo de toxicidad sistemica por anestesicos locales sigue las recomendaciones de la ASRA 2020:</p>' +
        '<p style="text-align:center;font-weight:600;font-size:0.9em;color:#1b4b85"><strong>Tabla 1. Protocolo LAST - Pasos de manejo</strong></p>' +
        '<table><thead><tr><th>Paso</th><th>Accion</th><th>Dosis/Detalle</th></tr></thead><tbody>' +
        '<tr><td>1</td><td>Suspender inyeccion de AL</td><td>Inmediato</td></tr>' +
        '<tr><td>2</td><td>Pedir ayuda y kit de LAST</td><td>Emulsion lipidica 20%</td></tr>' +
        '<tr><td>3</td><td>Manejo de via aerea</td><td>O2 100%, considerar intubacion</td></tr>' +
        '<tr><td>4</td><td>Convulsiones: benzodiacepinas</td><td>Midazolam 2-4 mg IV</td></tr>' +
        '<tr><td>5</td><td>Emulsion lipidica IV (bolo)</td><td>1.5 mL/kg en 1 min</td></tr>' +
        '<tr><td>6</td><td>Emulsion lipidica IV (infusion)</td><td>0.25 mL/kg/min x 30-60 min</td></tr>' +
        '<tr><td>7</td><td>Si paro cardiaco: RCP</td><td>Evitar vasopresina y CCB</td></tr>' +
        '<tr><td>8</td><td>Repetir bolo lipidos si necesario</td><td>Max 12 mL/kg en 1 hora</td></tr>' +
        '</tbody></table>' +
        '<div class="armty-note" style="background:#ffffff;border-left:6px solid #39528F;padding:10px 14px;margin:14px 0;"><p style="margin:0;text-align:justify;font-size:medium;"><strong>Nota de seguridad:</strong> La emulsion lipidica debe estar disponible en TODAS las areas donde se administren anestesicos locales, no solo en quirofano. Verifique la fecha de caducidad mensualmente.</p></div>' +
        '<h3>3. Consentimiento Informado</h3>' +
        '<p style="text-align:justify">El consentimiento informado para anestesia regional debe incluir:</p>' +
        '<ul><li>Descripcion del procedimiento propuesto y alternativas.</li><li>Beneficios esperados (analgesia, reduccion de opioides).</li><li>Riesgos generales: dolor en sitio de puncion, hematoma, infeccion.</li><li>Riesgos especificos del bloqueo: lesion nerviosa (transitoria 2-4%, permanente 0.02%), toxicidad por AL, neumotorax (en bloqueos supraclaviculares).</li><li>Tiempo esperado de recuperacion sensitiva y motora.</li></ul>' +
        '<h3>4. Documentacion del Procedimiento</h3>' +
        '<p style="text-align:center;font-weight:600;font-size:0.9em;color:#1b4b85"><strong>Tabla 2. Elementos de documentacion del bloqueo nervioso</strong></p>' +
        '<table><thead><tr><th>Elemento</th><th>Descripcion</th><th>Ejemplo</th></tr></thead><tbody>' +
        '<tr><td>Tipo de bloqueo</td><td>Nombre del bloqueo realizado</td><td>Bloqueo supraclavicular derecho</td></tr>' +
        '<tr><td>Tecnica de guia</td><td>Ecografica, neuroestimulacion, combinada</td><td>Guia ecografica + NE 0.4 mA</td></tr>' +
        '<tr><td>Anestesico local</td><td>Tipo, concentracion, volumen</td><td>Ropivacaina 0.5%, 20 mL</td></tr>' +
        '<tr><td>Adyuvantes</td><td>Farmacos anadidos</td><td>Dexametasona 4 mg perineural</td></tr>' +
        '<tr><td>Evaluacion del bloqueo</td><td>Resultado sensitivo y motor</td><td>Sensorial 2/2, Motor 2/3 a los 20 min</td></tr>' +
        '<tr><td>Complicaciones</td><td>Cualquier evento adverso</td><td>Ninguna</td></tr>' +
        '</tbody></table>' +
        '<h2>Conclusion</h2>' +
        '<p style="text-align:justify">La implementacion de protocolos de seguridad estandarizados es un componente no negociable de la practica de la anestesia regional. La preparacion anticipada, la disponibilidad de recursos de emergencia y la documentacion completa son las bases de una atencion segura y de calidad.</p>' +
        '<sup style="color:#1b4b85;font-weight:600">(Tabla 1)</sup> <sup style="color:#1b4b85;font-weight:600">(Tabla 2)</sup>',
      blocks: [], referenceIds: ['ref-1', 'ref-2', 'ref-3'], assignedEditors: ['editor-1', 'editor-2'], templateId: 'tpl-1', order: 4,
    },
  ];
}

export default db;
