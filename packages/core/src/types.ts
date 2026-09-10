/** Wire format uploaded by the CLI and rendered by the web service. */
export const STATS_VERSION = 1 as const;

export type AgentKind = "claude-code" | "codex";

export interface TokenTotals {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  thinking: number;
  /** input + output + cacheRead + cacheWrite */
  total: number;
}

export interface ModelBreakdown {
  /** Canonical model id, e.g. "claude-opus-5". */
  id: string;
  messages: number;
  tokens: TokenTotals;
  /** What this model's tokens would have cost at list API rates. */
  usd: number;
}

export interface NamedCount {
  name: string;
  count: number;
}

export interface WrappedStats {
  version: typeof STATS_VERSION;
  generatedAt: string;
  agents: AgentKind[];
  /** ISO dates (inclusive) covered by the scan. */
  range: { from: string; to: string };
  totals: {
    tokens: TokenTotals;
    /** Headline number: list-price cost of every token, had it gone through the API. */
    apiEquivalentUsd: number;
    sessions: number;
    /** Assistant turns, including subagent transcripts. */
    messages: number;
    toolCalls: number;
    subagentsSpawned: number;
    linesAdded: number;
    linesRemoved: number;
    activeDays: number;
    currentStreak: number;
    longestStreak: number;
  };
  models: ModelBreakdown[];
  tools: NamedCount[];
  skills: NamedCount[];
  /** ISO date -> assistant turns that day. Drives the contribution heatmap. */
  byDay: Record<string, number>;
  /** 24 buckets, local time. */
  byHour: number[];
  peakDay: { date: string; count: number } | null;
  peakHour: number;
}

export const THEMES = ["heatmap", "wrapped", "terminal"] as const;
export type Theme = (typeof THEMES)[number];

export const MODES = ["dark", "light", "auto"] as const;
export type Mode = (typeof MODES)[number];

export function isTheme(v: string | undefined | null): v is Theme {
  return !!v && (THEMES as readonly string[]).includes(v);
}
export function isMode(v: string | undefined | null): v is Mode {
  return !!v && (MODES as readonly string[]).includes(v);
}
