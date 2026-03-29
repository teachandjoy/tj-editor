import rateLimit from 'express-rate-limit';

// Rate limiter for login endpoint: 5 attempts per 15 minutes per IP
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de inicio de sesión. Intente de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
