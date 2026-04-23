import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { requireAuth, AuthenticatedRequest } from './middleware/auth';
import aiRouter from './routes/ai';
import { logger } from './logger';
import { CreateReportSchema, CreateBaselineSchema, validate } from './validation';

dotenv.config();

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000'];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(pinoHttp({ logger }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(globalLimiter);

const PORT = process.env.PORT || 3001;

// Convert snake_case DB row keys to camelCase for the frontend
function toCamel(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
      v,
    ])
  );
}

// ============================================
// HEALTH (Public)
// ============================================
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: 'core-api', db: 'connected', ts: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'degraded', service: 'core-api', db: 'unreachable', ts: new Date().toISOString() });
  }
});

// ============================================
// AI ROUTES (stricter rate limit: 30 req/min)
// ============================================
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI request limit reached, please wait a moment.' }
});
app.use('/api/ai', aiLimiter, aiRouter);

// ============================================
// REPORTS (Protected)
// ============================================
app.get('/api/reports', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM saved_reports WHERE user_id = $1 ORDER BY timestamp DESC',
      [req.user.uid]
    );
    res.json(result.rows.map(toCamel));
  } catch (error) {
    logger.error({ error }, 'Fetch reports error');
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

app.post('/api/reports', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  const body = validate(CreateReportSchema, req.body, res);
  if (!body) return;

  try {
    const id = body.id || randomUUID();
    const result = await pool.query(
      `INSERT INTO saved_reports (id, user_id, type, title, carrier, timestamp, platform, state)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, req.user.uid, body.type, body.title, body.carrier, body.timestamp, body.platform, JSON.stringify(body.state)]
    );
    res.status(201).json(toCamel(result.rows[0]));
  } catch (error) {
    logger.error({ error }, 'Save report error');
    res.status(500).json({ error: 'Failed to save report' });
  }
});

app.delete('/api/reports/:id', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params as { id: string };
    const check = await pool.query('SELECT user_id FROM saved_reports WHERE id = $1', [id]);
    if (!check.rows[0] || check.rows[0].user_id !== req.user.uid) {
      return res.status(403).json({ error: 'Not authorized or not found' });
    }
    await pool.query('DELETE FROM saved_reports WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Delete report error');
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

// ============================================
// BASELINES (Protected)
// ============================================
app.get('/api/baselines', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM master_baselines WHERE user_id = $1 ORDER BY timestamp DESC',
      [req.user.uid]
    );
    res.json(result.rows.map(toCamel));
  } catch (error) {
    logger.error({ error }, 'Fetch baselines error');
    res.status(500).json({ error: 'Failed to fetch baselines' });
  }
});

app.post('/api/baselines', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  const body = validate(CreateBaselineSchema, req.body, res);
  if (!body) return;

  try {
    if (body.id) {
      const check = await pool.query('SELECT user_id FROM master_baselines WHERE id = $1', [body.id]);
      if (check.rows[0]) {
        if (check.rows[0].user_id !== req.user.uid) {
          return res.status(403).json({ error: 'Not authorized' });
        }
        const result = await pool.query(
          `UPDATE master_baselines
           SET name=$1, description=$2, platform=$3, timestamp=$4, line_items=$5, metadata=$6
           WHERE id=$7
           RETURNING *`,
          [body.name, body.description, body.platform, body.timestamp,
           JSON.stringify(body.lineItems), body.metadata ? JSON.stringify(body.metadata) : null,
           body.id]
        );
        return res.json(toCamel(result.rows[0]));
      }
    }
    const id = body.id || randomUUID();
    const result = await pool.query(
      `INSERT INTO master_baselines (id, user_id, name, description, platform, timestamp, line_items, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, req.user.uid, body.name, body.description, body.platform, body.timestamp,
       JSON.stringify(body.lineItems), body.metadata ? JSON.stringify(body.metadata) : null]
    );
    res.status(201).json(toCamel(result.rows[0]));
  } catch (error) {
    logger.error({ error }, 'Save baseline error');
    res.status(500).json({ error: 'Failed to save baseline' });
  }
});

app.delete('/api/baselines/:id', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params as { id: string };
    const check = await pool.query('SELECT user_id FROM master_baselines WHERE id = $1', [id]);
    if (!check.rows[0] || check.rows[0].user_id !== req.user.uid) {
      return res.status(403).json({ error: 'Not authorized or not found' });
    }
    await pool.query('DELETE FROM master_baselines WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Delete baseline error');
    res.status(500).json({ error: 'Failed to delete baseline' });
  }
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Core API listening');
});
