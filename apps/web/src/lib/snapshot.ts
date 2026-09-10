import { prisma } from "@/lib/db";
import { isPlausibleLogin, normaliseLogin } from "@/lib/login";
import { parseStoredStats } from "@/lib/stats-schema";
import type { WrappedStats } from "@agent-wrapped/core";

export interface Profile {
  login: string;
  name: string | null;
  avatarUrl: string | null;
  stats: WrappedStats;
  publishedAt: string;
}

/**
 * Returns null both for "no such user" and "user exists but the stored payload
 * no longer parses". A snapshot written by an older wire format is treated as
 * absent rather than crashing the card route, which would break every README
 * embedding it.
 */
export async function fetchProfile(username: string): Promise<Profile | null> {
  const login = normaliseLogin(username);
  if (!isPlausibleLogin(login)) return null;

  const user = await prisma.user.findUnique({
    where: { login },
    select: {
      login: true,
      name: true,
      avatarUrl: true,
      snapshot: { select: { stats: true, createdAt: true } },
    },
  });

  if (!user?.snapshot) return null;

  const stats = parseStoredStats(user.snapshot.stats);
  if (!stats) return null;

  return {
    login: user.login,
    name: user.name,
    avatarUrl: user.avatarUrl,
    stats,
    publishedAt: user.snapshot.createdAt.toISOString(),
  };
}

/** Logins with a published snapshot, newest first. Used for the landing preview. */
export async function fetchRecentLogins(limit: number): Promise<string[]> {
  const rows = await prisma.snapshot.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { user: { select: { login: true } } },
  });
  return rows.map((r) => r.user.login);
}

export async function countPublishedProfiles(): Promise<number> {
  return prisma.snapshot.count();
}
