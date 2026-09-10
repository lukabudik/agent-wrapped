import { prisma } from "@/lib/db";

export const PUBLISH_LIMIT = 5;
export const PUBLISH_WINDOW_MS = 60 * 60 * 1000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the current window rolls over. */
  resetIn: number;
}

/**
 * Fixed-window counter held in Postgres. Publishing is a rare, deliberate act —
 * a handful per hour is already generous — so the coarseness of a fixed window
 * costs nothing, and it saves the service from needing a second datastore.
 */
export async function consumePublishQuota(userId: string): Promise<RateLimitResult> {
  const now = new Date();
  const windowFloor = new Date(now.getTime() - PUBLISH_WINDOW_MS);

  // Retire an expired window before counting, so the upsert below always lands
  // in a live one. The update is conditional on the window actually being
  // stale, so two concurrent publishes cannot both reset the counter.
  await prisma.publishQuota.updateMany({
    where: { userId, windowStart: { lte: windowFloor } },
    data: { windowStart: now, count: 0 },
  });

  const quota = await prisma.publishQuota.upsert({
    where: { userId },
    create: { userId, windowStart: now, count: 1 },
    update: { count: { increment: 1 } },
    select: { windowStart: true, count: true },
  });

  const resetIn = Math.max(
    0,
    Math.ceil((quota.windowStart.getTime() + PUBLISH_WINDOW_MS - now.getTime()) / 1000),
  );

  return {
    allowed: quota.count <= PUBLISH_LIMIT,
    remaining: Math.max(0, PUBLISH_LIMIT - quota.count),
    resetIn,
  };
}
