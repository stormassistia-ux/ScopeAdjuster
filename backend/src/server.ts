import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from './middleware/auth';
import aiRouter from './routes/ai';
import { logger } from './logger';
import { CreateReportSchema, CreateBaselineSchema, validate } from './validation';

dotenv.config();

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000'];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(pinoHttp({ logger }));

// Global rate limit: 120 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(globalLimiter);

const PORT = process.env.PORT || 3001;

// ============================================
// HEALTH (Public)
// ============================================
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
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
    const reports = await prisma.savedReport.findMany({
      where: { userId: req.user.uid },
      orderBy: { timestamp: 'desc' }
    });
    res.json(reports);
  } catch (error) {
    logger.error({ error }, 'Fetch reports error');
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

app.post('/api/reports', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  const body = validate(CreateReportSchema, req.body, res);
  if (!body) return;

  try {
    const newReport = await prisma.savedReport.create({
      data: { ...body, id: body.id || undefined, userId: req.user.uid, state: body.state as any }
    });
    res.status(201).json(newReport);
  } catch (error) {
    logger.error({ error }, 'Save report error');
    res.status(500).json({ error: 'Failed to save report' });
  }
});

app.delete('/api/reports/:id', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params as { id: string };
    const report = await prisma.savedReport.findUnique({ where: { id } });
    if (!report || report.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Not authorized or not found' });
    }
    await prisma.savedReport.delete({ where: { id } });
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
    const baselines = await prisma.masterBaseline.findMany({
      where: { userId: req.user.uid },
      orderBy: { timestamp: 'desc' }
    });
    res.json(baselines);
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
      const existing = await prisma.masterBaseline.findUnique({ where: { id: body.id } });
      if (existing) {
        if (existing.userId !== req.user.uid) return res.status(403).json({ error: 'Not authorized' });
        const updated = await prisma.masterBaseline.update({
          where: { id: body.id },
          data: { name: body.name, description: body.description, platform: body.platform, timestamp: body.timestamp, lineItems: body.lineItems as any, metadata: body.metadata as any }
        });
        return res.json(updated);
      }
    }
    const newBaseline = await prisma.masterBaseline.create({
      data: { ...body, id: body.id || undefined, userId: req.user.uid, lineItems: body.lineItems as any, metadata: body.metadata as any }
    });
    res.status(201).json(newBaseline);
  } catch (error) {
    logger.error({ error }, 'Save baseline error');
    res.status(500).json({ error: 'Failed to save baseline' });
  }
});

app.delete('/api/baselines/:id', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params as { id: string };
    const baseline = await prisma.masterBaseline.findUnique({ where: { id } });
    if (!baseline || baseline.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Not authorized or not found' });
    }
    await prisma.masterBaseline.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Delete baseline error');
    res.status(500).json({ error: 'Failed to delete baseline' });
  }
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Core API listening');
});
