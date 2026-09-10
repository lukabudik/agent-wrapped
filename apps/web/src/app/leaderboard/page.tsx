import type { Metadata } from "next";
import Link from "next/link";
import { LeaderboardTable } from "@/components/leaderboard-table";
import {
  DEFAULT_LIMIT,
  fetchLeaderboard,
  readSort,
  SORT_LABELS,
  type LeaderboardPage,
} from "@/lib/leaderboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Who is burning the most tokens through Claude Code and Codex.",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LeaderboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sort = readSort(firstParam(params["sort"]));
  const cursor = firstParam(params["cursor"]);
  const parsedOffset = Number.parseInt(firstParam(params["offset"]) ?? "", 10);
  const offset = Number.isFinite(parsedOffset) && parsedOffset > 0 ? parsedOffset : 0;

  let page: LeaderboardPage | null = null;
  let failed = false;
  try {
    page = await fetchLeaderboard({ sort, limit: DEFAULT_LIMIT, cursor, offset });
  } catch (error) {
    console.error("leaderboard page failed", { sort, cursor, error });
    failed = true;
  }

  const nextHref =
    page?.nextCursor != null
      ? `/leaderboard?sort=${sort}&cursor=${encodeURIComponent(page.nextCursor)}&offset=${offset + DEFAULT_LIMIT}`
      : null;

  return (
    <div className="mx-auto max-w-5xl px-5 py-14">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="max-w-prose text-sm leading-6 text-dim">
          Ranked by {SORT_LABELS[sort].toLowerCase()}. Numbers come from whatever each person chose
          to publish — this is a scoreboard for fun, not an audit.
        </p>
      </header>

      <div className="mt-8">
        {failed ? (
          <p className="panel px-4 py-6 text-sm text-dim">
            The leaderboard is temporarily unavailable. Try again in a moment.
          </p>
        ) : (
          <LeaderboardTable entries={page?.entries ?? []} sort={sort} />
        )}
      </div>

      <div className="mt-8 flex items-center justify-between gap-4 text-sm">
        {offset > 0 ? (
          <Link
            href={`/leaderboard?sort=${sort}`}
            className="text-dim transition-colors hover:text-coral"
          >
            ← Back to the top
          </Link>
        ) : (
          <span />
        )}
        {nextHref ? (
          <Link
            href={nextHref}
            className="rounded-lg border border-edge px-4 py-2 text-dim transition-colors hover:border-coral hover:text-coral"
          >
            Next {DEFAULT_LIMIT} →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
