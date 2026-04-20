import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRouter from './domains/auth/router';
import projectsRouter from './domains/projects/router';
import catalogRouter from './domains/catalog/router';
import estimationRouter from './domains/estimation/router';
import activityRouter from './domains/activity/router';

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
app.use(helmet());
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost', 'http://localhost:5173', 'http://localhost:4173', 'http://localhost:80'],
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/projects', apiLimiter, projectsRouter);
app.use('/api/catalog', apiLimiter, catalogRouter);
app.use('/api/estimation', apiLimiter, estimationRouter);
app.use('/api/activity', apiLimiter, activityRouter);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 SmetaApp backend running on http://localhost:${PORT}`);
});

export default app;
