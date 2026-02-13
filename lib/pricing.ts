import { Usage } from "./types";

// Prices in USD per million tokens
interface ModelPricing {
  input: number;
  output: number;
  cacheWrite: number; // 5-minute cache (default for Claude Code)
  cacheRead: number;
}

const PRICING: Record<string, ModelPricing> = {
  // Opus 4.6 / 4.5 tier
  "claude-opus-4-6": { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  "claude-opus-4-5-20251101": { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  "claude-opus-4-5": { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },

  // Opus 4.1 / 4 tier (legacy, more expensive)
  "claude-opus-4-1": { input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 },
  "claude-opus-4": { input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 },

  // Sonnet tier
  "claude-sonnet-4-5": { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  "claude-sonnet-4-5-20250929": { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  "claude-sonnet-4": { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  "claude-sonnet-3-7": { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },

  // Haiku tier
  "claude-haiku-4-5": { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
  "claude-haiku-3-5": { input: 0.8, output: 4, cacheWrite: 1, cacheRead: 0.08 },
};

// Default to Opus 4.6 pricing (most common in Claude Code)
const DEFAULT_PRICING: ModelPricing = PRICING["claude-opus-4-6"];

function matchPricing(model: string): ModelPricing {
  if (!model || model === "<synthetic>") return DEFAULT_PRICING;

  // Exact match
  if (PRICING[model]) return PRICING[model];

  // Fuzzy match: strip date suffixes and try again
  const base = model.replace(/-\d{8}$/, "");
  if (PRICING[base]) return PRICING[base];

  // Match by family prefix
  if (model.includes("opus-4-6") || model.includes("opus-4-5")) {
    return PRICING["claude-opus-4-6"];
  }
  if (model.includes("opus-4-1") || model.includes("opus-4")) {
    return PRICING["claude-opus-4-1"];
  }
  if (model.includes("sonnet")) {
    return PRICING["claude-sonnet-4-5"];
  }
  if (model.includes("haiku")) {
    return PRICING["claude-haiku-4-5"];
  }

  return DEFAULT_PRICING;
}

/**
 * Calculate cost in USD for a single API call.
 */
export function calculateCost(model: string, usage: Usage): number {
  const p = matchPricing(model);
  const M = 1_000_000;

  const inputCost = (usage.input_tokens / M) * p.input;
  const outputCost = (usage.output_tokens / M) * p.output;
  const cacheWriteCost = ((usage.cache_creation_input_tokens || 0) / M) * p.cacheWrite;
  const cacheReadCost = ((usage.cache_read_input_tokens || 0) / M) * p.cacheRead;

  return inputCost + outputCost + cacheWriteCost + cacheReadCost;
}
