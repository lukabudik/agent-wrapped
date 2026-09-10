/**
 * List API pricing, $ per million tokens.
 *
 * Cache multipliers (Anthropic prompt-caching economics):
 *   read      = 0.10x input  -- except Fable 5.1, which reads at 0.025x ($0.25/MTok)
 *   write 5m  = 1.25x input
 *   write 1h  = 2.00x input
 *
 * These are first-party Anthropic rates. Bedrock/Vertex are partner-priced and differ;
 * we deliberately quote first-party list price because that is the number a subscriber
 * would have paid to do the same work through the API.
 */
export interface ModelRates {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
}

function rates(input: number, output: number, readMultiplier = 0.1): ModelRates {
  return {
    input,
    output,
    cacheRead: input * readMultiplier,
    cacheWrite5m: input * 1.25,
    cacheWrite1h: input * 2.0,
  };
}

export const PRICING: Record<string, ModelRates> = {
  "claude-fable-5-1": rates(10, 50, 0.025),
  "claude-mythos-5-1": rates(10, 50, 0.025),
  "claude-fable-5": rates(10, 50),
  "claude-mythos-5": rates(10, 50),
  "claude-opus-5": rates(5, 25),
  "claude-opus-4-8": rates(5, 25),
  "claude-opus-4-7": rates(5, 25),
  "claude-opus-4-6": rates(5, 25),
  "claude-sonnet-5": rates(2, 10),
  "claude-sonnet-4-6": rates(3, 15),
  "claude-haiku-4-5": rates(1, 5),
  // OpenAI models, for Codex transcripts. Best-effort list pricing.
  "gpt-5.3-codex": rates(1.25, 10),
  "gpt-5.1-codex": rates(1.25, 10),
  "gpt-5-codex": rates(1.25, 10),
};

/**
 * Models released after this table was written still need a number. A mid-tier
 * rate is used rather than the top tier so an unknown model estimates low
 * instead of inflating the headline figure.
 */
const FALLBACK = rates(3, 15);

/**
 * Session logs carry dated ids (`claude-haiku-4-5-20251001`) and occasional
 * synthetic entries. Reduce to the canonical id used in PRICING.
 */
export function canonicalModelId(raw: string): string | null {
  if (!raw || raw === "<synthetic>") return null;
  const id = raw.trim().toLowerCase();
  if (PRICING[id]) return id;
  // Strip a trailing -YYYYMMDD date snapshot, then a Vertex-style @version
  // suffix, and always return the most reduced form so two spellings of the
  // same model never accumulate as separate rows.
  const undated = id.replace(/-\d{8}$/, "");
  if (PRICING[undated]) return undated;
  const unversioned = undated.split("@")[0]!.replace(/-\d{8}$/, "");
  return unversioned || null;
}

export function ratesFor(modelId: string): ModelRates {
  return PRICING[modelId] ?? FALLBACK;
}

export interface UsageCounts {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
}

/** Dollar cost of these tokens at list API rates. */
export function costOf(modelId: string, u: UsageCounts): number {
  const r = ratesFor(modelId);
  return (
    (u.input * r.input +
      u.output * r.output +
      u.cacheRead * r.cacheRead +
      u.cacheWrite5m * r.cacheWrite5m +
      u.cacheWrite1h * r.cacheWrite1h) /
    1_000_000
  );
}
