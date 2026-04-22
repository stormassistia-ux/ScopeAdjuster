import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from './middleware/auth';
import aiRouter from './routes/ai';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000'];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3001;

// Health check endpoint (Public)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'core-api' });
});

// ============================================
// AI ROUTES (Protected — proxies Gemini calls)
// ============================================
app.use('/api/ai', aiRouter);

// ============================================
// API ROUTES (Protected)
// ============================================

// 1. Saved Reports (Replaces Firestore `reports` collection)
app.get('/api/reports', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const userId = req.user.uid;
    const reports = await prisma.savedReport.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' }
    });
    res.json(reports);
  } catch (error) {
    console.error('Fetch reports error:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

app.post('/api/reports', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const userId = req.user.uid;
    const { id, type, title, carrier, timestamp, platform, state } = req.body;
    
    const newReport = await prisma.savedReport.create({
      data: {
        id: id || undefined,
        userId,
        type,
        title,
        carrier,
        timestamp,
        platform,
        state
      }
    });
    res.status(201).json(newReport);
  } catch (error) {
    console.error('Save report error:', error);
    res.status(500).json({ error: 'Failed to save report' });
  }
});

app.delete('/api/reports/:id', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user.uid;

    const report = await prisma.savedReport.findUnique({ where: { id } });
    if (!report || report.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized or not found' });
    }

    await prisma.savedReport.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

// 2. Master Baselines (Replaces Firestore `baselines` collection)
app.get('/api/baselines', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const userId = req.user.uid;
    const baselines = await prisma.masterBaseline.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' }
    });
    res.json(baselines);
  } catch (error) {
    console.error('Fetch baselines error:', error);
    res.status(500).json({ error: 'Failed to fetch baselines' });
  }
});

app.post('/api/baselines', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const userId = req.user.uid;
    const { id, name, description, platform, timestamp, lineItems, metadata } = req.body;
    
    // Check if it already exists -> then update instead (acting like setDoc)
    if (id) {
        const existing = await prisma.masterBaseline.findUnique({ where: { id } });
        if (existing) {
             if (existing.userId !== userId) return res.status(403).json({ error: 'Not authorized' });
             const updated = await prisma.masterBaseline.update({
                 where: { id },
                 data: { name, description, platform, timestamp, lineItems, metadata }
             });
             return res.json(updated);
        }
    }

    const newBaseline = await prisma.masterBaseline.create({
      data: {
        id: id || undefined,
        userId,
        name,
        description,
        platform,
        timestamp,
        lineItems,
        metadata
      }
    });
    res.status(201).json(newBaseline);
  } catch (error) {
    console.error('Save baseline error:', error);
    res.status(500).json({ error: 'Failed to save baseline' });
  }
});

app.delete('/api/baselines/:id', requireAuth, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const id = req.params.id as string;
    const userId = req.user.uid;

    const baseline = await prisma.masterBaseline.findUnique({ where: { id } });
    if (!baseline || baseline.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized or not found' });
    }

    await prisma.masterBaseline.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete baseline error:', error);
    res.status(500).json({ error: 'Failed to delete baseline' });
  }
});


app.listen(PORT, () => {
  console.log(`Core API Node Backend listening on port ${PORT}`);
});
