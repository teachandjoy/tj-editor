import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../database.js';
import { v4 as uuidv4 } from 'uuid';
import { generateToken, verifyToken, requireAuth } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = Router();

// POST /api/sessions/login — authenticate with username + password
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      logAudit(user.id, user.name, 'login.failed', 'session', '', { reason: 'invalid_password' }, req.ip || '');
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const token = generateToken(user.id, user.role);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    db.prepare('INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)')
      .run(uuidv4(), user.id, token, expiresAt);

    logAudit(user.id, user.name, 'login.success', 'session', '', {}, req.ip || '');

    const { password: _pw, ...safeUser } = user;
    if (safeUser.permissions && typeof safeUser.permissions === 'string') {
      try { safeUser.permissions = JSON.parse(safeUser.permissions); } catch { /* keep */ }
    }

    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('[Sessions] Login error:', err.message);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// POST /api/sessions/verify
router.post('/verify', (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token es requerido' });

    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ error: 'Token inválido o expirado' });

    const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
    if (!session) return res.status(401).json({ error: 'Sesión no válida' });

    if (new Date(session.expires_at) < new Date()) {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(session.id);
      return res.status(401).json({ error: 'Sesión expirada' });
    }

    const user = db.prepare('SELECT id, name, email, role, avatar, phone, username, permissions FROM users WHERE id = ?').get(session.user_id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (user.permissions && typeof user.permissions === 'string') {
      try { user.permissions = JSON.parse(user.permissions); } catch { /* keep */ }
    }

    res.json({ user, token });
  } catch (err) {
    console.error('[Sessions] Verify error:', err.message);
    res.status(500).json({ error: 'Error al verificar sesión' });
  }
});

// POST /api/sessions/logout
router.post('/logout', (req, res) => {
  try {
    const { token } = req.body;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) logAudit(decoded.userId, '', 'logout', 'session', '', {}, req.ip || '');
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[Sessions] Logout error:', err.message);
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
});

// GET /api/sessions/me — for permission polling
router.get('/me', requireAuth, (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, role, avatar, phone, username, permissions FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (user.permissions && typeof user.permissions === 'string') {
      try { user.permissions = JSON.parse(user.permissions); } catch { /* keep */ }
    }
    res.json(user);
  } catch (err) {
    console.error('[Sessions] Me error:', err.message);
    res.status(500).json({ error: 'Error al obtener usuario actual' });
  }
});

export default router;
