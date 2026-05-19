import { Router } from 'express';
import db from '../database.js';

const router = Router();

// GET /api/audit-log — list audit entries (admin only)
router.get('/', (req, res) => {
  try {
    const { action, targetType, userId, limit = 100, offset = 0 } = req.query;
    let query = 'SELECT * FROM audit_log WHERE 1=1';
    const params = [];

    if (action) { query += ' AND action LIKE ?'; params.push(`%${action}%`); }
    if (targetType) { query += ' AND target_type = ?'; params.push(targetType); }
    if (userId) { query += ' AND user_id = ?'; params.push(userId); }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const rows = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) as cnt FROM audit_log').get();

    res.json({ entries: rows.map(r => ({ ...r, details: JSON.parse(r.details || '{}') })), total: total.cnt });
  } catch (err) {
    console.error('[AuditLog] GET error:', err.message);
    res.status(500).json({ error: 'Error al obtener log de auditoría' });
  }
});

// GET /api/audit-log/export — CSV export
router.get('/export', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM audit_log ORDER BY created_at DESC').all();
    const csv = ['ID,Usuario,Acción,Tipo,Target,Detalles,IP,Fecha']
      .concat(rows.map(r =>
        `${r.id},"${r.user_name || ''}","${r.action}","${r.target_type || ''}","${r.target_id || ''}","${(r.details || '').replace(/"/g, '""')}","${r.ip_address || ''}","${r.created_at}"`
      )).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=audit_log.csv');
    res.send(csv);
  } catch (err) {
    console.error('[AuditLog] Export error:', err.message);
    res.status(500).json({ error: 'Error al exportar auditoría' });
  }
});

export default router;
