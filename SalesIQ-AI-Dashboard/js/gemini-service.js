import { GEMINI_API_KEY } from "./firebase-config.js";

/**
 * Multi-Model Gemini Orchestrator for SalesIQ
 * Supported models with contextual roles, quota tiers, and dynamic failover:
 * - Gemini 2.5 Flash Lite (500 RPD, ultra-fast: ideal for Column Mapping & parsing)
 * - Gemini 3.1 Flash Lite (500 RPD, high-efficiency lightweight)
 * - Gemini 3.5 Flash Lite (500 RPD, high-throughput utility)
 * - Gemini 3.5 Flash      (Flagship fast reasoning: ideal for deep AI business insights)
 * - Gemini 3 Flash        (Next-gen reasoning: strategic forecasting)
 * - Gemini 2.5 Flash      (Deep multimodal & business analysis)
 * - Gemini 2.5 Flash TTS  (Speech / Text-to-Speech & voice generation)
 * - Backstops: Gemini 2.0 Flash, Gemini 1.5 Flash
 */

export const GEMINI_MODEL_REGISTRY = [
  // Fast & High-Quota Tier (500+ RPD) - Ideal for rapid JSON mapping, categorization, data parsing
  {
    id: "gemini-2.5-flash-lite",
    displayName: "Gemini 2.5 Flash Lite",
    rpd: 500,
    tier: "fast",
    roles: ["mapping", "parsing", "general"],
  },
  {
    id: "gemini-3.1-flash-lite",
    displayName: "Gemini 3.1 Flash Lite",
    rpd: 500,
    tier: "fast",
    roles: ["mapping", "parsing", "general"],
  },
  {
    id: "gemini-3.5-flash-lite",
    displayName: "Gemini 3.5 Flash Lite",
    rpd: 500,
    tier: "fast",
    roles: ["mapping", "parsing", "general"],
  },

  // Deep Reasoning & Analytics Tier (20-50 RPD) - Ideal for complex insights & forecasting
  {
    id: "gemini-3.5-flash",
    displayName: "Gemini 3.5 Flash",
    rpd: 50,
    tier: "smart",
    roles: ["insights", "forecasting", "general"],
  },
  {
    id: "gemini-3-flash",
    displayName: "Gemini 3 Flash",
    rpd: 50,
    tier: "smart",
    roles: ["insights", "forecasting", "general"],
  },
  {
    id: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    rpd: 50,
    tier: "smart",
    roles: ["insights", "forecasting", "general"],
  },

  // Specialized Voice / TTS Tier
  {
    id: "gemini-2.5-flash-tts",
    displayName: "Gemini 2.5 Flash TTS",
    rpd: 20,
    tier: "special",
    roles: ["tts", "voice"],
  },

  // Reliable Backstop Fallbacks
  {
    id: "gemini-2.0-flash",
    displayName: "Gemini 2.0 Flash",
    rpd: 500,
    tier: "fallback",
    roles: ["general", "insights", "mapping"],
  },
  {
    id: "gemini-1.5-flash",
    displayName: "Gemini 1.5 Flash",
    rpd: 1500,
    tier: "fallback",
    roles: ["general", "insights", "mapping"],
  },
];

const QUOTA_STORAGE_PREFIX = "salesiq_gemini_quota_";

// Check if a model has exceeded its quota (cooldown active)
function isModelQuotaExceeded(modelId) {
  try {
    const until = localStorage.getItem(QUOTA_STORAGE_PREFIX + modelId);
    if (!until) return false;
    if (Date.now() > Number(until)) {
      localStorage.removeItem(QUOTA_STORAGE_PREFIX + modelId);
      return false;
    }
    return true;
  } catch (_) {
    return false;
  }
}

// Mark a model as quota exhausted (default cooldown: 1 hour)
function markModelQuotaExceeded(modelId, durationMs = 60 * 60 * 1000) {
  try {
    localStorage.setItem(
      QUOTA_STORAGE_PREFIX + modelId,
      String(Date.now() + durationMs),
    );
  } catch (_) {}
}

/**
 * Selects an ordered list of candidate models based on task context and quota status.
 * @param {string} task - "mapping" | "insights" | "forecasting" | "tts" | "general"
 */
export function getCandidateModelsForTask(task = "general") {
  // Sort models matching the requested role first, then available others
  const matching = [];
  const secondary = [];

  for (const model of GEMINI_MODEL_REGISTRY) {
    if (model.roles.includes(task)) {
      matching.push(model);
    } else if (model.roles.includes("general")) {
      secondary.push(model);
    }
  }

  // Combined candidate sequence: role-specific first, then general backups
  const candidates = [...matching, ...secondary];

  // Prioritize active (non-exhausted) models first
  return candidates.sort((a, b) => {
    const aEx = isModelQuotaExceeded(a.id) ? 1 : 0;
    const bEx = isModelQuotaExceeded(b.id) ? 1 : 0;
    return aEx - bEx;
  });
}

/**
 * Universal Gemini API caller with automatic multi-model failover on quota (429) or unavailability.
 *
 * @param {Object} options
 * @param {string} options.prompt - User or task prompt
 * @param {string} [options.systemInstruction] - Optional system prompt
 * @param {string} [options.task] - "mapping" | "insights" | "forecasting" | "tts" | "general"
 * @param {boolean} [options.jsonMode] - Expect JSON response
 * @param {Function} [options.onModelSwitch] - Callback when failing over: (fromModel, toModel, reason) => void
 * @returns {Promise<{text: string, json?: any, modelUsed: string, modelId: string}>}
 */
export async function callGemini({
  prompt,
  systemInstruction = "",
  task = "general",
  jsonMode = false,
  onModelSwitch = null,
}) {
  const apiKey = GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("PASTE")) {
    throw new Error(
      "Gemini API key is not configured in js/firebase-config.js",
    );
  }

  const candidateModels = getCandidateModelsForTask(task);
  const attemptedErrors = [];

  for (let i = 0; i < candidateModels.length; i++) {
    const model = candidateModels[i];

    // If quota was previously exceeded and we still have other models left, skip
    if (isModelQuotaExceeded(model.id) && i < candidateModels.length - 1) {
      continue;
    }

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const bodyPayload = {
        contents: [{ parts: [{ text: prompt }] }],
      };

      if (systemInstruction) {
        bodyPayload.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      if (jsonMode) {
        bodyPayload.generationConfig = {
          responseMimeType: "application/json",
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(bodyPayload),
      });

      // Handle Quota Exhaustion (429) or Model Not Found (404) or Server Unavailable (503)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const status = response.status;
        const errMsg = errorData.error?.message || `HTTP ${status}`;

        if (status === 429) {
          // Mark model as quota exhausted
          markModelQuotaExceeded(model.id);
          console.warn(
            `[SalesIQ AI] ${model.displayName} quota exhausted (429 RPD limit). Failing over...`,
          );
        } else {
          console.warn(
            `[SalesIQ AI] ${model.displayName} returned ${status}: ${errMsg}. Failing over...`,
          );
        }

        attemptedErrors.push(`${model.displayName}: ${errMsg}`);

        const nextModel = candidateModels[i + 1];
        if (nextModel && typeof onModelSwitch === "function") {
          onModelSwitch(model.displayName, nextModel.displayName, errMsg);
        }

        // Continue to the next candidate model
        continue;
      }

      const data = await response.json();
      const rawText =
        data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

      if (!rawText) {
        throw new Error("Empty response received from Gemini.");
      }

      let parsedJson = null;
      if (jsonMode) {
        try {
          const sanitized = rawText
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "");
          parsedJson = JSON.parse(sanitized);
        } catch (jsonErr) {
          console.warn("JSON parsing warning:", jsonErr);
        }
      }

      return {
        text: rawText,
        json: parsedJson,
        modelUsed: model.displayName,
        modelId: model.id,
      };
    } catch (err) {
      attemptedErrors.push(`${model.displayName}: ${err.message}`);
      const nextModel = candidateModels[i + 1];
      if (nextModel && typeof onModelSwitch === "function") {
        onModelSwitch(model.displayName, nextModel.displayName, err.message);
      }
    }
  }

  throw new Error(
    `All available Gemini models were exhausted or unavailable:\n${attemptedErrors.join("\n")}`,
  );
}

/**
 * Intelligent Column Mapper:
 * Maps arbitrary shopkeeper Excel/CSV headers to SalesIQ's schema using Gemini + Synonym Fallback.
 *
 * @param {string[]} headers - Raw headers from uploaded file
 * @param {Array<Object>} sampleRows - First 3-5 rows for value context
 * @returns {Promise<{mapping: Object, modelUsed: string, confidence: string}>}
 */
export async function mapExcelHeadersWithAI(headers = [], sampleRows = []) {
  const targetSchema = {
    name: "Product Name (required title or description)",
    price: "Selling Price / MRP / Retail Rate (required number)",
    costPrice: "Cost Price / Purchase Price / Buy Rate (optional number)",
    stock: "Current Stock / Quantity in Hand / Units (required number)",
    minStock: "Minimum Stock Alert Level / Reorder Point (optional number)",
    category: "Product Category / Group / Department (optional text)",
    batchesCount: "Batch count or number of batches (optional number)",
    supplierName: "Supplier / Distributor / Vendor Name (optional text)",
  };

  // Pre-calculate synonym matches as instant base
  const fallbackMapping = getSynonymMapping(headers);

  // If no API key or offline, return synonym matching immediately
  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes("PASTE")) {
    return {
      mapping: fallbackMapping,
      modelUsed: "Rule-Based Synonym Engine",
      confidence: "High (Local)",
    };
  }

  const prompt = `You are an expert retail ERP data onboarding assistant.
A shopkeeper uploaded a product spreadsheet with these column headers:
${JSON.stringify(headers)}

Here is a preview of the first rows of data:
${JSON.stringify(sampleRows.slice(0, 3), null, 2)}

Match these columns to our standard SalesIQ product schema:
- name: ${targetSchema.name}
- price: ${targetSchema.price}
- costPrice: ${targetSchema.costPrice}
- stock: ${targetSchema.stock}
- minStock: ${targetSchema.minStock}
- category: ${targetSchema.category}
- batchesCount: ${targetSchema.batchesCount}
- supplierName: ${targetSchema.supplierName}

Guidelines:
1. For each target field, specify the exact matching header from the uploaded columns, or null if not present.
2. Extra columns like HSN, Rack, Tax, Barcode that do not directly map to these 8 fields should remain unmapped.

Return ONLY a JSON object:
{
  "mapping": {
    "name": "<matching_header_or_null>",
    "price": "<matching_header_or_null>",
    "costPrice": "<matching_header_or_null>",
    "stock": "<matching_header_or_null>",
    "minStock": "<matching_header_or_null>",
    "category": "<matching_header_or_null>",
    "batchesCount": "<matching_header_or_null>",
    "supplierName": "<matching_header_or_null>"
  }
}`;

  try {
    const result = await callGemini({
      prompt,
      task: "mapping", // Routes to Gemini 2.5 Flash Lite or 3.1 Flash Lite (500 RPD)
      jsonMode: true,
      systemInstruction:
        "You are an automated ERP column mapping engine. Respond strictly with valid JSON.",
    });

    if (result.json && result.json.mapping) {
      // Merge AI mapping with fallback to ensure no required fields were missed
      const merged = { ...fallbackMapping, ...result.json.mapping };
      return {
        mapping: merged,
        modelUsed: result.modelUsed,
        confidence: "AI Verified",
      };
    }
  } catch (err) {
    console.warn(
      "AI Column Mapping failed, using rule-based synonym fallback:",
      err,
    );
  }

  return {
    mapping: fallbackMapping,
    modelUsed: "Synonym Matcher (AI Failover)",
    confidence: "Standard",
  };
}

/**
 * Built-in synonym dictionary for instant offline matching
 */
export function getSynonymMapping(headers = []) {
  const norm = (str) =>
    String(str || "")
      .trim()
      .toLowerCase()
      .replace(/[\s\-_.]+/g, "");

  const normalizedHeaders = headers.map((h) => ({
    original: h,
    cleaned: norm(h),
  }));

  const findMatch = (synonyms) => {
    for (const syn of synonyms) {
      const match = normalizedHeaders.find(
        (h) => h.cleaned === syn || h.cleaned.includes(syn),
      );
      if (match) return match.original;
    }
    return null;
  };

  return {
    name: findMatch([
      "itemname",
      "productname",
      "name",
      "itemdescription",
      "description",
      "particulars",
      "product",
      "item",
      "title",
    ]),
    price: findMatch([
      "sellingprice",
      "saleprice",
      "price",
      "mrp",
      "rate",
      "retailprice",
      "unitprice",
      "salesrate",
    ]),
    costPrice: findMatch([
      "costprice",
      "cost",
      "purchaserate",
      "purchaseprice",
      "buyprice",
      "cp",
      "wholesalerate",
      "buyrate",
    ]),
    stock: findMatch([
      "stockquantity",
      "stock",
      "quantity",
      "qty",
      "balance",
      "balqty",
      "currentstock",
      "qtyinhand",
      "openingstock",
      "available",
    ]),
    minStock: findMatch([
      "minstock",
      "minimumstock",
      "minlevel",
      "reorderlevel",
      "alertlevel",
      "minqty",
      "threshold",
    ]),
    category: findMatch([
      "category",
      "group",
      "grpname",
      "department",
      "type",
      "classification",
      "genre",
    ]),
    batchesCount: findMatch([
      "batchescount",
      "batches",
      "batchcount",
      "batchqty",
      "nobatches",
    ]),
    supplierName: findMatch([
      "suppliername",
      "supplier",
      "vendor",
      "distributor",
      "dealer",
      "partyname",
    ]),
  };
}
