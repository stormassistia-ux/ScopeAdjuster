import { GoogleGenAI, Type } from "@google/genai";
import { Platform, EvidenceItem, LineItem, DamageCategory, ComparisonResult, AuditResult, MasterBaseline, MarketIntel, PriceAdjustment } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });

/**
 * Helper to handle common error logging and user-friendly message generation
 */
const handleApiError = (error: any, context: string): string => {
  console.error(`[AdjusterAI Service] Error in ${context}:`, error);
  
  const message = error?.message || "";
  if (message.includes("429") || message.toLowerCase().includes("quota")) {
    return "API Quota exceeded. Please wait a moment before trying again.";
  }
  if (message.includes("500") || message.toLowerCase().includes("overloaded")) {
    return "The AI engine is currently overloaded. Please retry in 10 seconds.";
  }
  if (message.toLowerCase().includes("safety")) {
    return "The content was flagged by safety filters. Please rephrase your synopsis.";
  }
  return error?.message || `An unexpected error occurred during ${context}. Please check your connection.`;
};

/**
 * Extracts the base64 data portion of a Data URL without duplicating large strings via split()
 */
const getBase64Data = (dataUrl: string): string => {
  const index = dataUrl.indexOf(',');
  return index !== -1 ? dataUrl.substring(index + 1) : dataUrl;
};

export const fetchCarrierGuidelines = async (carrier: string): Promise<string> => {
  const prompt = `Find the 2024-2025 property estimating and repair guidelines for the insurance carrier: ${carrier}. 
  Summarize key rules for material waste, overhead and profit, and mandatory line items.`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { 
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are an expert insurance industry researcher specializing in property claim guidelines.",
      },
    });
    
    if (!response.text) {
      throw new Error("Empty response from guidelines engine.");
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as any[] | undefined;
    let sourceLinks = "";
    if (groundingChunks && groundingChunks.length > 0) {
      const links = groundingChunks
        .map((chunk: any) => chunk.web ? `[${chunk.web.title}](${chunk.web.uri})` : null)
        .filter(Boolean);
      if (links.length > 0) {
        sourceLinks = "\n\nSources:\n" + links.join("\n");
      }
    }
    
    return response.text + sourceLinks;
  } catch (error) {
    throw new Error(handleApiError(error, "fetching guidelines"));
  }
};

export const analyzeDamage = async (
  platform: Platform,
  carrier: string,
  synopsis: string,
  guidelines: string,
  evidence: EvidenceItem[],
  rooms: { [id: string]: string }
): Promise<{ lineItems: LineItem[]; labeledEvidence: EvidenceItem[] }> => {
  try {
    const mediaParts = evidence.map(item => ({
      inlineData: { 
        data: getBase64Data(item.base64), 
        mimeType: item.mimeType 
      }
    }));

    const prompt = `Target Platform: ${platform}. 
      Insurance Carrier: ${carrier}.
      Carrier Guidelines: ${guidelines}
      Site Synopsis: ${synopsis}

      TASK:
      Analyze the provided site data to generate a forensic repair scope.

      1. Extract measurements and damage evidence from all sources.
      2. Categorize damage type.
      3. Generate ${platform} specific line items with justification based on industry standards, carrier rules, and the most current International Residential Code (IRC).
      4. For each line item, provide the relevant IRC section reference (e.g., IRC R311.7.5.1) and cross-reference the equivalent item in both Xactimate and Symbility/CoreLogic databases.
      5. Provide professional labels for evidence.

      Output valid JSON with "lineItems" and "evidenceResults".`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: { parts: [...mediaParts, { text: prompt }] },
      config: {
        systemInstruction: "You are an expert Forensic Insurance Adjuster and Estimator. You have mastery over the International Residential Code (IRC) and the Xactimate and Symbility/CoreLogic price databases.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lineItems: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: { 
                  code: { type: Type.STRING }, 
                  description: { type: Type.STRING }, 
                  quantity: { type: Type.NUMBER }, 
                  unit: { type: Type.STRING }, 
                  roomName: { type: Type.STRING }, 
                  justification: { type: Type.STRING },
                  ircReference: { type: Type.STRING },
                  databaseMapping: {
                    type: Type.OBJECT,
                    properties: {
                      xactimate: { type: Type.STRING },
                      symbility: { type: Type.STRING }
                    }
                  }
                }, 
                required: ["code", "description", "quantity", "unit", "roomName", "justification", "ircReference"] 
              } 
            },
            evidenceResults: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: { 
                  id: { type: Type.STRING }, 
                  label: { type: Type.STRING }, 
                  damageCategory: { type: Type.STRING }, 
                  confidence: { type: Type.NUMBER }, 
                  observations: { type: Type.STRING } 
                }, 
                required: ["id", "label"] 
              } 
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    return {
      lineItems: (result.lineItems || []).map((li: any, index: number) => ({ ...li, id: `li-${index}-${Date.now()}` })),
      labeledEvidence: evidence.map(e => {
        const match = result.evidenceResults?.find((res: any) => res.id === e.id);
        return { 
          ...e, 
          label: match?.label || "Site Evidence", 
          detectedDamage: match?.damageCategory ? { 
            category: match.damageCategory as DamageCategory, 
            confidence: match.confidence || 0, 
            observations: match.observations || "Evidence reviewed." 
          } : undefined 
        };
      })
    };
  } catch (error) {
    throw new Error(handleApiError(error, "investigation analysis"));
  }
};

export const compareEstimates = async (
  fileA: EvidenceItem,
  fileB: EvidenceItem,
  platformA: Platform,
  platformB: Platform,
  baseline?: MasterBaseline
): Promise<ComparisonResult> => {
  try {
    const baselineInfo = baseline 
      ? `\nMASTER BASELINE: Use the following pre-defined "Gold Standard" line items as a reference for correct scope and pricing:
         ${JSON.stringify(baseline.lineItems.map(li => ({ code: li.code, desc: li.description, qty: li.quantity, unit: li.unit })))}`
      : "";

    const prompt = `
      Compare these two repair estimates for a property claim:
      Estimate A (${platformA}): From file "${fileA.fileName}"
      Estimate B (${platformB}): From file "${fileB.fileName}"
      ${baselineInfo}

      STRICT INSTRUCTIONS:
      1. Mapping: Align equivalent line items even if codes differ.
      2. Parsing: Extract line items, quantities, and prices. Handle handwritten script if platform is "Hand Written" using advanced vision OCR.
      3. Financial Summary: Calculate total Labor, Material, and Grand Totals for both.
      4. Variance Analysis: Note Quantity, Rate, and Scope variances. If a Master Baseline is provided, highlight where Estimate A or B deviates from the baseline's recommended scope or pricing.
      5. Narrative Summary: Professional explanation of the variance.

      Output valid JSON matching the schema.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: getBase64Data(fileA.base64), mimeType: fileA.mimeType } },
          { inlineData: { data: getBase64Data(fileB.base64), mimeType: fileB.mimeType } },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: "You are an expert Forensic Auditor specializing in insurance estimate reconciliation. You excel at OCR and transcribing handwritten scope sheets.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { 
              type: Type.OBJECT, 
              properties: { 
                labor: { type: Type.OBJECT, properties: { a: { type: Type.NUMBER }, b: { type: Type.NUMBER } } }, 
                material: { type: Type.OBJECT, properties: { a: { type: Type.NUMBER }, b: { type: Type.NUMBER } } }, 
                total: { type: Type.OBJECT, properties: { a: { type: Type.NUMBER }, b: { type: Type.NUMBER } } } 
            } 
            },
            variances: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: { 
                  category: { type: Type.STRING }, 
                  itemA: { type: Type.STRING }, 
                  itemB: { type: Type.STRING }, 
                  delta: { type: Type.NUMBER }, 
                  reason: { type: Type.STRING } 
                } 
              } 
            },
            narrative: { type: Type.STRING }
          }
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    if (!parsed.summary) throw new Error("Invalid comparison data returned by AI.");
    
    return parsed as ComparisonResult;
  } catch (error) {
    throw new Error(handleApiError(error, "estimate comparison"));
  }
};

export const reverseEngineerEstimate = async (
  sourceFile: EvidenceItem,
  sourcePlatform: Platform,
  targetPlatform: Platform
): Promise<LineItem[]> => {
  try {
    const prompt = `
      REVERSE ENGINEER ESTIMATE:
      Source Platform: ${sourcePlatform}
      Target Platform: ${targetPlatform}
      
      TASK:
      1. Parse the provided estimate file. 
      2. If it is handwritten, use high-precision OCR to extract every line item.
      3. For every source line item, identify the EXACT equivalent code and description in the ${targetPlatform} database.
      4. Validate each repair against the most current International Residential Code (IRC) standards.
      5. Provide the relevant IRC section reference for each repair.
      6. Cross-reference the equivalent item in both Xactimate and Symbility/CoreLogic databases.
      7. Maintain quantities and units.
      8. Provide a justification for why the specific ${targetPlatform} code was chosen, citing IRC compliance where applicable.

      Output valid JSON with an array of "lineItems".
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: getBase64Data(sourceFile.base64), mimeType: sourceFile.mimeType } },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: "You are a master Database Transmuter specializing in property insurance estimates. You have deep technical knowledge of Xactimate, Symbility, and CoreLogic databases, and you are an expert in the International Residential Code (IRC).",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lineItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING },
                  description: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  roomName: { type: Type.STRING },
                  justification: { type: Type.STRING },
                  ircReference: { type: Type.STRING },
                  databaseMapping: {
                    type: Type.OBJECT,
                    properties: {
                      xactimate: { type: Type.STRING },
                      symbility: { type: Type.STRING }
                    }
                  }
                },
                required: ["code", "description", "quantity", "unit", "roomName", "justification", "ircReference"]
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return (result.lineItems || []).map((li: any, index: number) => ({
      ...li,
      id: `rev-${index}-${Date.now()}`
    }));
  } catch (error) {
    throw new Error(handleApiError(error, "estimate reverse engineering"));
  }
};

export const parseBaselineFile = async (file: EvidenceItem, platform: Platform): Promise<LineItem[]> => {
  try {
    const prompt = `
      EXTRACT MASTER BASELINE:
      Platform: ${platform}
      
      TASK:
      1. Parse the provided estimate file. 
      2. Extract every line item including code, description, quantity, unit, unit price, and room/area name.
      3. This will be used as a "Gold Standard" baseline for future comparisons.
      
      Output valid JSON with an array of "lineItems".
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: getBase64Data(file.base64), mimeType: file.mimeType } },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: "You are an expert Estimate Parser. Your goal is to accurately extract line items from insurance estimates.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lineItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING },
                  description: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  unitPrice: { type: Type.NUMBER },
                  roomName: { type: Type.STRING }
                },
                required: ["code", "description", "quantity", "unit", "unitPrice", "roomName"]
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return (result.lineItems || []).map((li: any, index: number) => ({
      ...li,
      id: `base-${index}-${Date.now()}`,
      total: (li.quantity || 0) * (li.unitPrice || 0),
      justification: "Baseline Item",
      ircReference: "N/A"
    }));
  } catch (error) {
    throw new Error(handleApiError(error, "baseline parsing"));
  }
};

export const searchMarketRates = async (zipCode: string): Promise<MarketIntel> => {
  const prompt = `Find the most recent property insurance estimating price list versions for Xactimate and Symbility (CoreLogic) for the zip code or region: ${zipCode}. 
  Also, identify the top 5 material or labor pricing trends (increases/decreases) for this month in the property restoration industry.
  
  Format the response as JSON.`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { 
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a market intelligence analyst for the property restoration industry. Provide accurate, grounded data on software price list versions and pricing trends.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            xactimateVersion: { type: Type.STRING },
            symbilityVersion: { type: Type.STRING },
            trends: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  change: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["category", "change", "description"]
              }
            }
          },
          required: ["xactimateVersion", "symbilityVersion", "trends"]
        }
      },
    });
    
    const parsed = JSON.parse(response.text || '{}');
    
    // Extract sources from grounding metadata
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as any[] | undefined;
    const sources = groundingChunks
      ? groundingChunks.map((chunk: any) => chunk.web?.uri).filter(Boolean)
      : [];

    return {
      lastUpdated: Date.now(),
      zipCode,
      xactimateVersion: parsed.xactimateVersion || "Unknown",
      symbilityVersion: parsed.symbilityVersion || "Unknown",
      trends: parsed.trends || [],
      sources
    };
  } catch (error) {
    throw new Error(handleApiError(error, "searching market rates"));
  }
};

export const suggestBaselineAdjustments = async (
  baseline: MasterBaseline,
  marketIntel: MarketIntel
): Promise<PriceAdjustment[]> => {
  const prompt = `
    Analyze the following Master Baseline line items against the provided Market Intelligence trends.
    
    MASTER BASELINE:
    ${JSON.stringify(baseline.lineItems.map(li => ({ id: li.id, code: li.code, desc: li.description, price: li.unitPrice || 0 })))}
    
    MARKET INTELLIGENCE (Region: ${marketIntel.zipCode}):
    ${JSON.stringify(marketIntel.trends)}
    
    TASK:
    1. Identify line items in the baseline that belong to categories mentioned in the market trends.
    2. Suggest a price adjustment (increase or decrease) based on the trend percentage or description.
    3. If a trend says "Drywall prices up 10%", increase all DRY codes by 10%.
    
    Output valid JSON with an array of "adjusters".
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are a forensic estimating auditor. Your goal is to keep master baselines synchronized with current market pricing trends.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            adjustments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  lineItemId: { type: Type.STRING },
                  itemCode: { type: Type.STRING },
                  currentPrice: { type: Type.NUMBER },
                  suggestedPrice: { type: Type.NUMBER },
                  reason: { type: Type.STRING },
                  percentageChange: { type: Type.NUMBER }
                },
                required: ["lineItemId", "itemCode", "currentPrice", "suggestedPrice", "reason", "percentageChange"]
              }
            }
          },
          required: ["adjustments"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result.adjustments || [];
  } catch (error) {
    throw new Error(handleApiError(error, "suggesting price adjustments"));
  }
};

export const auditEstimate = async (
  estimateFile: EvidenceItem,
  carrier: string,
  guidelines: string,
  platform: Platform
): Promise<AuditResult> => {
  try {
    const prompt = `
      Perform a comprehensive Compliance Audit on the provided insurance estimate file.
      
      Carrier: ${carrier}
      Platform: ${platform}
      Carrier Guidelines: ${guidelines || 'Standard Industry Best Practices'}
      Primary Standard: International Residential Code (IRC)
      
      YOUR TASK:
      1. Identify "Leakage": Overlapping line items where the same work is being charged twice (e.g., floor protection included in another item).
      2. Identify "Missed Items": Necessary repair steps required by IRC or carrier rules that are missing (e.g., missing baseboard detach/reset for flooring).
      3. Identify "Non-Compliant Items": Items that violate the specific carrier guidelines provided.
      4. Identify "IRC Violations": Repair methods in the estimate that do not meet current building codes.
      
      For each finding, provide:
      - Type (Missed, Overlapping, Non-Compliant, IRC Violation)
      - Item Code (if applicable)
      - Description of the issue
      - Suggested Action to fix it
      - Severity (Low, Medium, High)
      
      Also provide a "Compliance Score" from 0-100 and a high-level summary of the audit.
      
      Output valid JSON matching the schema.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: {
        parts: [
          { inlineData: { data: getBase64Data(estimateFile.base64), mimeType: estimateFile.mimeType } },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: "You are a Senior Insurance Compliance Auditor and IRC Building Code Expert. Your goal is to find errors, omissions, and overlaps in insurance estimates to ensure accuracy and compliance.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['Missed', 'Overlapping', 'Non-Compliant', 'IRC Violation'] },
                  itemCode: { type: Type.STRING },
                  description: { type: Type.STRING },
                  suggestedAction: { type: Type.STRING },
                  severity: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] }
                },
                required: ['id', 'type', 'description', 'suggestedAction', 'severity']
              }
            }
          },
          required: ['score', 'summary', 'suggestions']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result as AuditResult;
  } catch (error) {
    throw new Error(handleApiError(error, "compliance audit"));
  }
};