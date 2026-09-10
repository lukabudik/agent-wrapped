import type { NextRequest } from "next/server";
import { fetchLeaderboard, readLimit, readSort } from "@/lib/leaderboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  const params = request.nextUrl.searchParams;
  const sort = readSort(params.get("sort"));
  const limit = readLimit(params.get("limit"));
  const cursor = params.get("cursor") ?? undefined;
  // Ranks are positional, so a cursor page has to be told where it starts or
  // every page would confidently report a rank of 1.
  const parsedOffset = Number.parseInt(params.get("offset") ?? "", 10);
  const offset = Number.isFinite(parsedOffset) && parsedOffset > 0 ? parsedOffset : 0;

  try {
    const page = await fetchLeaderboard({ sort, limit, cursor, offset });
    return Response.json(
      {
        sort,
        limit,
        offset,
        nextCursor: page.nextCursor,
        entries: page.entries.map((entry) => ({
          rank: entry.rank,
          login: entry.login,
          name: entry.name,
          avatarUrl: entry.avatarUrl,
          agents: entry.agents,
          metric: entry.metric,
          totalTokens: entry.totalTokens,
          apiEquivalentUsd: entry.apiEquivalentUsd,
          currentStreak: entry.currentStreak,
          activeDays: entry.activeDays,
          publishedAt: entry.publishedAt,
        })),
      },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (err) {
    // An unknown cursor is a client mistake, not a server fault: Prisma raises
    // it as a "record not found" on the cursor row.
    console.error("leaderboard query failed", { sort, limit, cursor, offset, err });
    return Response.json(
      { error: "Could not read the leaderboard." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
