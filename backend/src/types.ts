export enum Platform {
  XACTIMATE = 'Xactimate',
  SYMBILITY_COTALITY = 'Symbility / Cotality',
  HAND_WRITTEN = 'Hand Written'
}

export enum AppMode {
  DASHBOARD = 'Dashboard',
  INVESTIGATION = 'Investigation',
  COMPARISON = 'Comparison',
  REVERSE_ENGINEER = 'Reverse Engineer',
  COMPLIANCE_AUDIT = 'Compliance Audit',
  SETTINGS = 'Settings',
  REPORTS = 'Reports',
  LIBRARY = 'Library'
}

export type DamageCategory = 'Water' | 'Fire' | 'Structural' | 'Cosmetic' | 'Mold/Microbial' | 'Unknown';

export type EvidenceType = 'Photo' | 'PDF Package' | 'Scope Sheet' | 'Measurement Report' | 'Technical Document' | 'Estimate File';

export interface AuditSuggestion {
  id: string;
  type: 'Missed' | 'Overlapping' | 'Non-Compliant' | 'IRC Violation';
  itemCode?: string;
  description: string;
  suggestedAction: string;
  severity: 'Low' | 'Medium' | 'High';
}

export interface AuditResult {
  score: number;
  suggestions: AuditSuggestion[];
  summary: string;
}

export interface Room {
  id: string;
  name: string;
  type: 'Room' | 'Exterior Face';
}

export interface EvidenceItem {
  id: string;
  roomId?: string;
  type: EvidenceType;
  base64: string;
  storageUrl?: string;
  mimeType: string;
  fileName: string;
  label?: string;
  timestamp?: number;
  detectedDamage?: {
    category: DamageCategory;
    confidence: number;
    observations: string;
  };
}

export interface LineItem {
  id: string;
  code: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  total?: number;
  roomName: string;
  justification?: string;
  ircReference?: string;
  databaseMapping?: {
    xactimate?: string;
    symbility?: string;
  };
}

export interface PriceAdjustment {
  lineItemId: string;
  itemCode: string;
  currentPrice: number;
  suggestedPrice: number;
  reason: string;
  percentageChange: number;
}

export interface VarianceDetail {
  category: string;
  itemA: string;
  itemB: string;
  delta: number;
  reason: string;
}

export interface ComparisonSummary {
  labor: { a: number; b: number };
  material: { a: number; b: number };
  total: { a: number; b: number };
}

export interface ComparisonResult {
  summary: ComparisonSummary;
  variances: VarianceDetail[];
  narrative: string;
}

export interface MasterBaseline {
  id: string;
  userId: string;
  name: string;
  description: string;
  platform: Platform;
  timestamp: number;
  lineItems: LineItem[];
  metadata?: {
    zipCode?: string;
    priceListMonth?: string;
  };
}

export interface MarketIntel {
  lastUpdated: number;
  zipCode: string;
  xactimateVersion: string;
  symbilityVersion: string;
  trends: {
    category: string;
    change: string;
    description: string;
  }[];
  sources: string[];
}

export interface SavedReport {
  id: string;
  userId: string;
  type: 'Investigation' | 'Comparison' | 'Transmutation' | 'Compliance Audit';
  title: string;
  carrier: string;
  timestamp: number;
  platform: string;
  state: any;
}

export interface EstimationState {
  mode: AppMode;
  carrier: string;
  insuredName?: string;
  claimNumber?: string;
  synopsis: string;
  platform: Platform;
  rooms: Room[];
  evidence: EvidenceItem[];
  lineItems: LineItem[];
  isAnalyzing: boolean;
  analysisComplete: boolean;
  customGuidelines?: string;
  uploadedGuidelineName?: string;
  
  // Comparison & Reverse Engineer specific
  fileA?: EvidenceItem;
  fileB?: EvidenceItem;
  platformA: Platform;
  platformB: Platform;
  comparisonResult?: ComparisonResult;
  auditResult?: AuditResult;

  // Master Baseline specific
  activeBaselineId?: string;
}
