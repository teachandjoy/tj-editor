import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './database.js';
import { auditMiddleware } from './middleware/audit.js';
import { loginLimiter } from './middleware/rateLimit.js';
import usersRouter from './routes/users.js';
import sessionsRouter from './routes/sessions.js';
import offersRouter from './routes/offers.js';
import topicsRouter from './routes/topics.js';
import templatesRouter from './routes/templates.js';
import referencesRouter from './routes/references.js';
import mediaRouter from './routes/media.js';
import foldersRouter from './routes/folders.js';
import identitiesRouter from './routes/identities.js';
import backupRouter from './routes/backup.js';
import auditLogRouter from './routes/auditLog.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Audit middleware — attaches req.audit() helper
app.use(auditMiddleware);

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check / heartbeat
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rate limit on login
app.use('/api/sessions/login', loginLimiter);

// Routes
app.use('/api/users', usersRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/offers', offersRouter);
app.use('/api/topics', topicsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/references', referencesRouter);
app.use('/api/media', mediaRouter);
app.use('/api/folders', foldersRouter);
app.use('/api/identities', identitiesRouter);
app.use('/api/backup', backupRouter);
app.use('/api/restore', backupRouter);
app.use('/api/audit-log', auditLogRouter);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err.stack || err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Initialize database and start server
initializeDatabase();

app.listen(PORT, () => {
  console.log(`[Server] Backend running on http://localhost:${PORT}`);
  console.log(`[Server] API available at http://localhost:${PORT}/api`);
});
