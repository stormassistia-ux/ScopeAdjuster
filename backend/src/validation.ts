import { z } from 'zod';

const FIVE_MB = 5 * 1024 * 1024;

// Zod v4: z.record() requires (keySchema, valueSchema)
const jsonRecord = z.record(z.string(), z.unknown());

const stateSizeCheck = (val: unknown) =>
  JSON.stringify(val).length <= FIVE_MB;

export const CreateReportSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['Investigation', 'Comparison', 'Transmutation', 'Compliance Audit']),
  title: z.string().min(1).max(200),
  carrier: z.string().min(1).max(100),
  timestamp: z.number(),
  platform: z.string().min(1).max(50),
  state: jsonRecord.refine(stateSizeCheck, {
    message: 'Report state exceeds 5 MB — strip base64 image data before saving'
  })
});

export const CreateBaselineSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).default(''),
  platform: z.enum(['Xactimate', 'Symbility / Cotality', 'Hand Written']),
  timestamp: z.number(),
  lineItems: z.array(jsonRecord),
  metadata: jsonRecord.optional()
});

export const GuidelinesSchema = z.object({
  carrier: z.string().min(1).max(100)
});

export const AnalyzeSchema = z.object({
  platform: z.string().min(1),
  carrier: z.string().min(1).max(100),
  synopsis: z.string().min(1).max(10000),
  guidelines: z.string().max(50000).default(''),
  evidence: z.array(jsonRecord).max(30),
  rooms: z.record(z.string(), z.string())
});

export const CompareSchema = z.object({
  fileA: jsonRecord,
  fileB: jsonRecord,
  platformA: z.string().min(1),
  platformB: z.string().min(1),
  baseline: jsonRecord.optional()
});

export const ReverseEngineerSchema = z.object({
  sourceFile: jsonRecord,
  sourcePlatform: z.string().min(1),
  targetPlatform: z.string().min(1)
});

export const ParseBaselineSchema = z.object({
  file: jsonRecord,
  platform: z.string().min(1)
});

export const MarketRatesSchema = z.object({
  zipCode: z.string().min(3).max(10)
});

export const SuggestAdjustmentsSchema = z.object({
  baseline: jsonRecord,
  marketIntel: jsonRecord
});

export const AuditSchema = z.object({
  estimateFile: jsonRecord,
  carrier: z.string().min(1).max(100),
  guidelines: z.string().max(50000).default(''),
  platform: z.string().min(1)
});

/** Validates req.body against a Zod schema; sends 400 on failure and returns null. */
export function validate<T>(
  schema: z.ZodType<T>,
  body: unknown,
  res: { status: (code: number) => { json: (data: unknown) => void } }
): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    res.status(400).json({ error: 'Validation error', details: result.error.flatten() });
    return null;
  }
  return result.data;
}
