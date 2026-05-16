import db from '../database.js';

/**
 * Log a critical action to the audit_log table.
 * @param {string} userId
 * @param {string} userName
 * @param {string} action - e.g. 'user.create', 'topic.delete', 'permission.update'
 * @param {string} targetType - e.g. 'user', 'topic', 'offer'
 * @param {string} targetId
 * @param {object} details - additional JSON details
 * @param {string} ipAddress
 */
export function logAudit(userId, userName, action, targetType, targetId, details = {}, ipAddress = '') {
  try {
    db.prepare(
      'INSERT INTO audit_log (user_id, user_name, action, target_type, target_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(userId, userName, action, targetType, targetId, JSON.stringify(details), ipAddress);
  } catch (err) {
    console.error('[Audit] Error logging action:', err.message);
  }
}

/**
 * Express middleware that attaches audit helper to req.
 */
export function auditMiddleware(req, _res, next) {
  req.audit = (action, targetType, targetId, details = {}) => {
    const userId = req.user?.id || 'anonymous';
    const userName = req.user?.name || 'Anónimo';
    const ip = req.ip || req.headers['x-forwarded-for'] || '';
    logAudit(userId, userName, action, targetType, targetId, details, ip);
  };
  next();
}
