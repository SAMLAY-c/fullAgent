import path from 'path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import botRoutes from './routes/bots';
import chatRoutes from './routes/chat';
import statsRoutes from './routes/stats';
import analyticsRoutes from './routes/analytics';
import logsRoutes from './routes/logs';
import groupsRoutes from './routes/groups';
import templatesRoutes from './routes/templates';
import knowledgeRoutes from './routes/knowledge';
import systemRoutes from './routes/system';
import scheduleRoutes from './routes/schedule';
import foldersRoutes from './routes/folders';
import conversationsRoutes from './routes/conversations';
import memoriesRouter from './routes/memories';
import schedulerService from './services/scheduler.service';
import { normalizeUtf8Value } from './utils/encoding';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const FRONTEND_DIR = path.resolve(__dirname, '../../frontend/public');
const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // file:// pages and some tools may send "null" or no origin.
      if (!origin || origin === 'null') {
        callback(null, true);
        return;
      }

      if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, _res, next) => {
  if (req.body) req.body = normalizeUtf8Value(req.body);
  if (req.query) req.query = normalizeUtf8Value(req.query) as express.Request['query'];
  next();
});
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  next();
});

app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
app.use(express.static(FRONTEND_DIR));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/bots', botRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/memories', memoriesRouter);
app.use('/api/stats', statsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/folders', foldersRoutes);

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Requested API resource does not exist',
        numeric_code: 404
      }
    });
    return;
  }
  next();
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(err?.status || 500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: err?.message || 'Internal server error',
      numeric_code: 500
    }
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`Bot Agent backend listening on http://localhost:${PORT}`);
    await schedulerService.init();
  });
}

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

export default app;
