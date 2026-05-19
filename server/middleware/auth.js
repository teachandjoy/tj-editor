import jwt from 'jsonwebtoken';
import db from '../database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tj-secret-key-change-in-production-2024';

export function generateToken(userId, role) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Middleware: require valid JWT token
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación requerido' });
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  // Check session exists in DB
  const session = db.prepare('SELECT * FROM sessions WHERE token = ? AND user_id = ?').get(token, decoded.userId);
  if (!session) {
    return res.status(401).json({ error: 'Sesión no válida' });
  }

  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(session.id);
    return res.status(401).json({ error: 'Sesión expirada' });
  }

  // Attach user info to request
  const user = db.prepare('SELECT id, name, email, role, avatar, phone, username, permissions FROM users WHERE id = ?').get(decoded.userId);
  if (!user) {
    return res.status(401).json({ error: 'Usuario no encontrado' });
  }

  req.user = user;
  req.token = token;
  next();
}

// Middleware: require specific role
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tiene permisos suficientes' });
    }
    next();
  };
}

// Middleware: require specific permission
export function requirePermission(module, action) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    // Admin always has all permissions
    if (req.user.role === 'admin') return next();

    const perms = req.user.permissions ? (typeof req.user.permissions === 'string' ? JSON.parse(req.user.permissions) : req.user.permissions) : null;
    if (perms && perms[module] && perms[module][action]) {
      return next();
    }

    // Check role defaults
    const defaults = getDefaultPermsForRole(req.user.role);
    if (defaults[module] && defaults[module][action]) {
      return next();
    }

    return res.status(403).json({ error: `No tiene permiso: ${module}.${action}` });
  };
}

function getDefaultPermsForRole(role) {
  if (role === 'coordinador') {
    return {
      dashboard: { ver: true },
      temas: { ver: true, crear: true, editar: true, publicar: true },
      ofertas: { ver: true, crear: true, editar: true },
      usuarios: { ver: true, crear: true, editar: true },
      multimedia: { ver: true, crear: true },
      referencias: { ver: true, crear: true, editar: true },
      identidades: { ver: true, crear: true, editar: true },
      configuracion: { ver: true },
    };
  }
  if (role === 'editor') {
    return {
      dashboard: { ver: true },
      temas: { ver: true, editar: true },
      multimedia: { ver: true },
      referencias: { ver: true },
    };
  }
  return {};
}

export { JWT_SECRET };
