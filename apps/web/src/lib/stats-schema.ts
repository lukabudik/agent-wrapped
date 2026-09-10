import { z } from "zod";
import { STATS_VERSION, type WrappedStats } from "@agent-wrapped/core";

/**
 * Runtime guard for the wire format. The CLI is the only intended writer, but
 * it is an npm package running on someone else's machine — an old version, a
 * patched fork or a hand-rolled curl can all reach this endpoint, so nothing
 * from the body is trusted before it parses.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

/** Counts are integers and can be large, but never negative and never Infinity. */
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const amount = z.number().nonnegative().finite();

const tokenTotals = z.object({
  input: count,
  output: count,
  cacheRead: count,
  cacheWrite: count,
  thinking: count,
  total: count,
});

const modelBreakdown = z.object({
  id: z.string().min(1).max(120),
  messages: count,
  tokens: tokenTotals,
  usd: amount,
});

const namedCount = z.object({
  name: z.string().min(1).max(120),
  count: count,
});

export const wrappedStatsSchema = z.object({
  version: z.literal(STATS_VERSION),
  generatedAt: z.string().min(1).max(40),
  agents: z
    .array(z.enum(["claude-code", "codex"]))
    .min(1)
    .max(2),
  range: z.object({ from: isoDate, to: isoDate }),
  totals: z.object({
    tokens: tokenTotals,
    apiEquivalentUsd: amount,
    sessions: count,
    messages: count,
    toolCalls: count,
    subagentsSpawned: count,
    linesAdded: count,
    linesRemoved: count,
    activeDays: count,
    currentStreak: count,
    longestStreak: count,
  }),
  // Caps keep a malformed or hostile payload from turning into a multi-megabyte
  // jsonb row; the real scanner never comes close to any of them.
  models: z.array(modelBreakdown).max(64),
  tools: z.array(namedCount).max(256),
  skills: z.array(namedCount).max(256),
  byDay: z.record(isoDate, count).refine((v) => Object.keys(v).length <= 4000, {
    message: "byDay covers more than ten years",
  }),
  byHour: z.array(count).length(24),
  peakDay: z.object({ date: isoDate, count: count }).nullable(),
  peakHour: z.number().int().min(0).max(23),
});

export type ParsedStats = z.infer<typeof wrappedStatsSchema>;

// Fails to compile if core's wire format and this schema drift apart.
const _assignable: (s: ParsedStats) => WrappedStats = (s) => s;
void _assignable;

/** Narrow an untyped jsonb column back to the wire format. */
export function parseStoredStats(value: unknown): WrappedStats | null {
  const result = wrappedStatsSchema.safeParse(value);
  return result.success ? result.data : null;
}
