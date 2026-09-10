import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { bearerToken, resolveIdentity } from "@/lib/github";
import { consumePublishQuota, PUBLISH_LIMIT } from "@/lib/rate-limit";
import { appUrl } from "@/lib/site";
import { markdownSnippet, DEFAULT_MODE, DEFAULT_THEME } from "@/lib/card-params";
import { wrappedStatsSchema } from "@/lib/stats-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function error(status: number, message: string, extra?: Record<string, unknown>): Response {
  return Response.json(
    { error: message, ...extra },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  const token = bearerToken(request.headers.get("authorization"));
  if (!token) {
    return error(401, "Missing Authorization: Bearer <github token>.");
  }

  const identity = await resolveIdentity(token);
  if (!identity.ok) {
    return error(identity.status, identity.message);
  }
  const { githubId, login, name, avatarUrl } = identity.identity;

  const raw: unknown = await request.json().catch(() => null);
  if (raw === null) {
    return error(400, "Body must be JSON.");
  }

  const parsed = wrappedStatsSchema.safeParse(raw);
  if (!parsed.success) {
    return error(422, "Stats payload does not match the expected shape.", {
      issues: parsed.error.issues.slice(0, 20).map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  const stats = parsed.data;

  // The user row has to exist before the quota can key off it, so identity is
  // resolved and upserted first; the quota then guards the expensive write.
  const user = await prisma.user.upsert({
    where: { githubId },
    create: { githubId, login, name, avatarUrl },
    update: { login, name, avatarUrl },
    select: { id: true, login: true },
  });

  const quota = await consumePublishQuota(user.id);
  if (!quota.allowed) {
    return Response.json(
      {
        error: `Rate limited: ${PUBLISH_LIMIT} publishes per hour.`,
        retryAfter: quota.resetIn,
      },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(quota.resetIn),
          "X-RateLimit-Limit": String(PUBLISH_LIMIT),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  const denormalised = {
    stats: stats as unknown as Prisma.InputJsonValue,
    totalTokens: BigInt(Math.round(stats.totals.tokens.total)),
    apiEquivalentUsd: new Prisma.Decimal(stats.totals.apiEquivalentUsd.toFixed(4)),
    activeDays: stats.totals.activeDays,
    currentStreak: stats.totals.currentStreak,
    linesAdded: stats.totals.linesAdded,
    agents: stats.agents,
  };

  await prisma.snapshot.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...denormalised },
    update: { ...denormalised, createdAt: new Date() },
  });

  const origin = appUrl();
  return Response.json(
    {
      ok: true,
      login: user.login,
      profileUrl: `${origin}/u/${user.login}`,
      markdown: markdownSnippet(origin, user.login, DEFAULT_THEME, DEFAULT_MODE),
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-RateLimit-Limit": String(PUBLISH_LIMIT),
        "X-RateLimit-Remaining": String(quota.remaining),
      },
    },
  );
}
