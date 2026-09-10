import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AgentKind } from "@agent-wrapped/core";

export const SORT_KEYS = ["tokens", "usd", "streak", "days"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const DEFAULT_SORT: SortKey = "tokens";
export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 100;

export const SORT_LABELS: Record<SortKey, string> = {
  tokens: "Tokens",
  usd: "API-equivalent spend",
  streak: "Current streak",
  days: "Active days",
};

export function readSort(value: string | null | undefined): SortKey {
  return (SORT_KEYS as readonly string[]).includes(value ?? "") ? (value as SortKey) : DEFAULT_SORT;
}

export function readLimit(value: string | null | undefined): number {
  const n = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

export interface LeaderboardEntry {
  rank: number;
  login: string;
  name: string | null;
  avatarUrl: string | null;
  totalTokens: number;
  apiEquivalentUsd: number;
  activeDays: number;
  currentStreak: number;
  linesAdded: number;
  agents: AgentKind[];
  publishedAt: string;
  /** The value this ranking sorts by, already resolved for the caller. */
  metric: number;
}

export interface LeaderboardPage {
  sort: SortKey;
  entries: LeaderboardEntry[];
  nextCursor: string | null;
}

// The tie-break on id keeps the ordering total, which is what makes cursor
// pagination stable when two people have identical metrics.
function orderFor(sort: SortKey): Prisma.SnapshotOrderByWithRelationInput[] {
  switch (sort) {
    case "usd":
      return [{ apiEquivalentUsd: "desc" }, { id: "asc" }];
    case "streak":
      return [{ currentStreak: "desc" }, { id: "asc" }];
    case "days":
      return [{ activeDays: "desc" }, { id: "asc" }];
    case "tokens":
      return [{ totalTokens: "desc" }, { id: "asc" }];
  }
}

function isAgentKind(value: string): value is AgentKind {
  return value === "claude-code" || value === "codex";
}

export interface LeaderboardQuery {
  sort: SortKey;
  limit: number;
  cursor?: string | undefined;
  /** Rank of the first row on this page, for continued pages. */
  offset?: number;
}

export async function fetchLeaderboard({
  sort,
  limit,
  cursor,
  offset = 0,
}: LeaderboardQuery): Promise<LeaderboardPage> {
  const rows = await prisma.snapshot.findMany({
    orderBy: orderFor(sort),
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      totalTokens: true,
      apiEquivalentUsd: true,
      activeDays: true,
      currentStreak: true,
      linesAdded: true,
      agents: true,
      createdAt: true,
      user: { select: { login: true, name: true, avatarUrl: true } },
    },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const entries = page.map((row, index): LeaderboardEntry => {
    const totalTokens = Number(row.totalTokens);
    const apiEquivalentUsd = Number(row.apiEquivalentUsd);
    const metric =
      sort === "usd"
        ? apiEquivalentUsd
        : sort === "streak"
          ? row.currentStreak
          : sort === "days"
            ? row.activeDays
            : totalTokens;

    return {
      rank: offset + index + 1,
      login: row.user.login,
      name: row.user.name,
      avatarUrl: row.user.avatarUrl,
      totalTokens,
      apiEquivalentUsd,
      activeDays: row.activeDays,
      currentStreak: row.currentStreak,
      linesAdded: row.linesAdded,
      agents: row.agents.filter(isAgentKind),
      publishedAt: row.createdAt.toISOString(),
      metric,
    };
  });

  const last = page.at(-1);
  return { sort, entries, nextCursor: hasMore && last ? last.id : null };
}
