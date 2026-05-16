import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../database.js';

const router = Router();

// GET /api/users — exclude password from response
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, name, email, role, avatar, phone, username, permissions, dashboard_config, created_at, updated_at FROM users').all();
    const parsed = rows.map(r => {
      if (r.permissions && typeof r.permissions === 'string') {
        try { r.permissions = JSON.parse(r.permissions); } catch { /* keep */ }
      }
      if (r.dashboard_config && typeof r.dashboard_config === 'string') {
        try { r.dashboard_config = JSON.parse(r.dashboard_config); } catch { r.dashboard_config = {}; }
      } else {
        r.dashboard_config = {};
      }
      return r;
    });
    res.json(parsed);
  } catch (err) {
    console.error('[Users] GET error:', err.message);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// GET /api/users/:id — exclude password
router.get('/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT id, name, email, role, avatar, phone, username, permissions, dashboard_config, created_at, updated_at FROM users WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (row.permissions && typeof row.permissions === 'string') {
      try { row.permissions = JSON.parse(row.permissions); } catch { /* keep */ }
    }
    if (row.dashboard_config && typeof row.dashboard_config === 'string') {
      try { row.dashboard_config = JSON.parse(row.dashboard_config); } catch { row.dashboard_config = {}; }
    } else {
      row.dashboard_config = {};
    }
    res.json(row);
  } catch (err) {
    console.error('[Users] GET/:id error:', err.message);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

// POST /api/users
router.post('/', (req, res) => {
  try {
    const { id, name, email, role, avatar, phone, username, password, permissions, dashboard_config } = req.body;
    if (!id || !name || !role) return res.status(400).json({ error: 'id, name, y role son requeridos' });
    const hashedPw = password ? bcrypt.hashSync(password, 10) : null;
    const permsStr = permissions ? (typeof permissions === 'object' ? JSON.stringify(permissions) : permissions) : '{}';
    const dashStr = dashboard_config ? (typeof dashboard_config === 'object' ? JSON.stringify(dashboard_config) : dashboard_config) : '{}';
    db.prepare('INSERT INTO users (id, name, email, role, avatar, phone, username, password, permissions, dashboard_config) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, name, email || null, role, avatar || null, phone || null, username || null, hashedPw, permsStr, dashStr);

    if (req.audit) req.audit('user.create', 'user', id, { name, role });

    const user = db.prepare('SELECT id, name, email, role, avatar, phone, username, permissions, dashboard_config, created_at, updated_at FROM users WHERE id = ?').get(id);
    if (user.permissions && typeof user.permissions === 'string') {
      try { user.permissions = JSON.parse(user.permissions); } catch { /* keep */ }
    }
    if (user.dashboard_config && typeof user.dashboard_config === 'string') {
      try { user.dashboard_config = JSON.parse(user.dashboard_config); } catch { user.dashboard_config = {}; }
    }
    res.status(201).json(user);
  } catch (err) {
    console.error('[Users] POST error:', err.message);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// PUT /api/users/:id
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Usuario no encontrado' });
    const { name, email, role, avatar, phone, username, password, permissions, dashboard_config } = req.body;
    const hashedPw = password ? bcrypt.hashSync(password, 10) : null;
    const permsStr = permissions !== undefined
      ? (typeof permissions === 'object' ? JSON.stringify(permissions) : permissions)
      : existing.permissions;
    const dashStr = dashboard_config !== undefined
      ? (typeof dashboard_config === 'object' ? JSON.stringify(dashboard_config) : dashboard_config)
      : existing.dashboard_config;

    db.prepare("UPDATE users SET name = ?, email = ?, role = ?, avatar = ?, phone = ?, username = ?, password = COALESCE(?, password), permissions = ?, dashboard_config = ?, updated_at = datetime('now') WHERE id = ?")
      .run(name ?? existing.name, email ?? existing.email, role ?? existing.role, avatar ?? existing.avatar,
        phone ?? existing.phone, username ?? existing.username, hashedPw, permsStr, dashStr, req.params.id);

    if (req.audit) {
      const changes = {};
      if (role && role !== existing.role) changes.roleChange = { from: existing.role, to: role };
      if (permissions !== undefined) changes.permissionsUpdated = true;
      if (password) changes.passwordChanged = true;
      if (dashboard_config !== undefined) changes.dashboardConfigUpdated = true;
      req.audit('user.update', 'user', req.params.id, changes);
    }

    const user = db.prepare('SELECT id, name, email, role, avatar, phone, username, permissions, dashboard_config, created_at, updated_at FROM users WHERE id = ?').get(req.params.id);
    if (user.permissions && typeof user.permissions === 'string') {
      try { user.permissions = JSON.parse(user.permissions); } catch { /* keep */ }
    }
    if (user.dashboard_config && typeof user.dashboard_config === 'string') {
      try { user.dashboard_config = JSON.parse(user.dashboard_config); } catch { user.dashboard_config = {}; }
    }
    res.json(user);
  } catch (err) {
    console.error('[Users] PUT error:', err.message);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', (req, res) => {
  try {
    const user = db.prepare('SELECT name, role FROM users WHERE id = ?').get(req.params.id);
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (req.audit && user) req.audit('user.delete', 'user', req.params.id, { name: user.name, role: user.role });
    res.json({ success: true });
  } catch (err) {
    console.error('[Users] DELETE error:', err.message);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

export default router;
