import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import {
  fetchCarrierGuidelines,
  analyzeDamage,
  compareEstimates,
  reverseEngineerEstimate,
  parseBaselineFile,
  searchMarketRates,
  suggestBaselineAdjustments,
  auditEstimate
} from '../services/geminiService';

const router = Router();

// All AI routes require authentication
router.use(requireAuth);

router.post('/guidelines', async (req: AuthenticatedRequest, res) => {
  const { carrier } = req.body;
  if (!carrier) return res.status(400).json({ error: 'carrier is required' });
  try {
    const text = await fetchCarrierGuidelines(carrier);
    res.json({ text });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/analyze', async (req: AuthenticatedRequest, res) => {
  const { platform, carrier, synopsis, guidelines, evidence, rooms } = req.body;
  if (!platform || !carrier || !synopsis || !evidence || !rooms) {
    return res.status(400).json({ error: 'platform, carrier, synopsis, evidence, and rooms are required' });
  }
  try {
    const result = await analyzeDamage(platform, carrier, synopsis, guidelines, evidence, rooms);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/compare', async (req: AuthenticatedRequest, res) => {
  const { fileA, fileB, platformA, platformB, baseline } = req.body;
  if (!fileA || !fileB || !platformA || !platformB) {
    return res.status(400).json({ error: 'fileA, fileB, platformA, and platformB are required' });
  }
  try {
    const result = await compareEstimates(fileA, fileB, platformA, platformB, baseline);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reverse-engineer', async (req: AuthenticatedRequest, res) => {
  const { sourceFile, sourcePlatform, targetPlatform } = req.body;
  if (!sourceFile || !sourcePlatform || !targetPlatform) {
    return res.status(400).json({ error: 'sourceFile, sourcePlatform, and targetPlatform are required' });
  }
  try {
    const items = await reverseEngineerEstimate(sourceFile, sourcePlatform, targetPlatform);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/parse-baseline', async (req: AuthenticatedRequest, res) => {
  const { file, platform } = req.body;
  if (!file || !platform) {
    return res.status(400).json({ error: 'file and platform are required' });
  }
  try {
    const items = await parseBaselineFile(file, platform);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/market-rates', async (req: AuthenticatedRequest, res) => {
  const { zipCode } = req.body;
  if (!zipCode) return res.status(400).json({ error: 'zipCode is required' });
  try {
    const intel = await searchMarketRates(zipCode);
    res.json(intel);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/suggest-adjustments', async (req: AuthenticatedRequest, res) => {
  const { baseline, marketIntel } = req.body;
  if (!baseline || !marketIntel) {
    return res.status(400).json({ error: 'baseline and marketIntel are required' });
  }
  try {
    const adjustments = await suggestBaselineAdjustments(baseline, marketIntel);
    res.json(adjustments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/audit', async (req: AuthenticatedRequest, res) => {
  const { estimateFile, carrier, guidelines, platform } = req.body;
  if (!estimateFile || !carrier || !platform) {
    return res.status(400).json({ error: 'estimateFile, carrier, and platform are required' });
  }
  try {
    const result = await auditEstimate(estimateFile, carrier, guidelines, platform);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
