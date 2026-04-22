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
import {
  GuidelinesSchema,
  AnalyzeSchema,
  CompareSchema,
  ReverseEngineerSchema,
  ParseBaselineSchema,
  MarketRatesSchema,
  SuggestAdjustmentsSchema,
  AuditSchema,
  validate
} from '../validation';

const router = Router();
router.use(requireAuth);

router.post('/guidelines', async (req: AuthenticatedRequest, res) => {
  const body = validate(GuidelinesSchema, req.body, res);
  if (!body) return;
  try {
    const text = await fetchCarrierGuidelines(body.carrier);
    res.json({ text });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/analyze', async (req: AuthenticatedRequest, res) => {
  const body = validate(AnalyzeSchema, req.body, res);
  if (!body) return;
  try {
    const result = await analyzeDamage(body.platform as any, body.carrier, body.synopsis, body.guidelines, body.evidence as any, body.rooms as any);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/compare', async (req: AuthenticatedRequest, res) => {
  const body = validate(CompareSchema, req.body, res);
  if (!body) return;
  try {
    const result = await compareEstimates(body.fileA as any, body.fileB as any, body.platformA as any, body.platformB as any, body.baseline as any);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reverse-engineer', async (req: AuthenticatedRequest, res) => {
  const body = validate(ReverseEngineerSchema, req.body, res);
  if (!body) return;
  try {
    const items = await reverseEngineerEstimate(body.sourceFile as any, body.sourcePlatform as any, body.targetPlatform as any);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/parse-baseline', async (req: AuthenticatedRequest, res) => {
  const body = validate(ParseBaselineSchema, req.body, res);
  if (!body) return;
  try {
    const items = await parseBaselineFile(body.file as any, body.platform as any);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/market-rates', async (req: AuthenticatedRequest, res) => {
  const body = validate(MarketRatesSchema, req.body, res);
  if (!body) return;
  try {
    const intel = await searchMarketRates(body.zipCode);
    res.json(intel);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/suggest-adjustments', async (req: AuthenticatedRequest, res) => {
  const body = validate(SuggestAdjustmentsSchema, req.body, res);
  if (!body) return;
  try {
    const adjustments = await suggestBaselineAdjustments(body.baseline as any, body.marketIntel as any);
    res.json(adjustments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/audit', async (req: AuthenticatedRequest, res) => {
  const body = validate(AuditSchema, req.body, res);
  if (!body) return;
  try {
    const result = await auditEstimate(body.estimateFile as any, body.carrier, body.guidelines, body.platform as any);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
