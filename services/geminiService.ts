import { auth } from '../src/firebase';
import { Platform, EvidenceItem, LineItem, ComparisonResult, AuditResult, MasterBaseline, MarketIntel, PriceAdjustment } from '../types';

const getBase = () => {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (!base) throw new Error('VITE_API_BASE_URL is not set.');
  return `${base}/api/ai`;
};

const getAuthHeaders = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('User is not authenticated.');
  const token = await user.getIdToken();
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
};

const post = async <T>(path: string, body: unknown): Promise<T> => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getBase()}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
};

// Strip base64 before sending to backend — files are already in Supabase Storage.
// The backend fetches file content from storageUrl to stay under Vercel's 4.5MB body limit.
const slim = ({ base64: _b, ...rest }: EvidenceItem) => rest;

export const fetchCarrierGuidelines = async (carrier: string): Promise<string> => {
  const { text } = await post<{ text: string }>('/guidelines', { carrier });
  return text;
};

export const analyzeDamage = async (
  platform: Platform,
  carrier: string,
  synopsis: string,
  guidelines: string,
  evidence: EvidenceItem[],
  rooms: { [id: string]: string }
): Promise<{ lineItems: LineItem[]; labeledEvidence: EvidenceItem[] }> => {
  return post('/analyze', { platform, carrier, synopsis, guidelines, evidence: evidence.map(slim), rooms });
};

export const compareEstimates = async (
  fileA: EvidenceItem,
  fileB: EvidenceItem,
  platformA: Platform,
  platformB: Platform,
  baseline?: MasterBaseline
): Promise<ComparisonResult> => {
  return post('/compare', { fileA: slim(fileA), fileB: slim(fileB), platformA, platformB, baseline });
};

export const reverseEngineerEstimate = async (
  sourceFile: EvidenceItem,
  sourcePlatform: Platform,
  targetPlatform: Platform
): Promise<LineItem[]> => {
  return post('/reverse-engineer', { sourceFile: slim(sourceFile), sourcePlatform, targetPlatform });
};

export const parseBaselineFile = async (file: EvidenceItem, platform: Platform): Promise<LineItem[]> => {
  return post('/parse-baseline', { file: slim(file), platform });
};

export const searchMarketRates = async (zipCode: string): Promise<MarketIntel> => {
  return post('/market-rates', { zipCode });
};

export const suggestBaselineAdjustments = async (
  baseline: MasterBaseline,
  marketIntel: MarketIntel
): Promise<PriceAdjustment[]> => {
  return post('/suggest-adjustments', { baseline, marketIntel });
};

export const auditEstimate = async (
  estimateFile: EvidenceItem,
  carrier: string,
  guidelines: string,
  platform: Platform
): Promise<AuditResult> => {
  return post('/audit', { estimateFile: slim(estimateFile), carrier, guidelines, platform });
};
