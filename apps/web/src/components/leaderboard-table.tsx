import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { agentLabel, compact, group, money, relativeDate } from "@/lib/format";
import { SORT_KEYS, SORT_LABELS, type LeaderboardEntry, type SortKey } from "@/lib/leaderboard";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  sort: SortKey;
}

function metricText(entry: LeaderboardEntry, sort: SortKey): string {
  switch (sort) {
    case "usd":
      return money(entry.apiEquivalentUsd);
    case "streak":
      return `${group(entry.currentStreak)}d`;
    case "days":
      return group(entry.activeDays);
    case "tokens":
      return compact(entry.totalTokens);
  }
}

export function LeaderboardTable({ entries, sort }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <p className="panel px-4 py-6 text-sm text-dim">
        Nobody has published yet. Run{" "}
        <code className="font-mono text-coral">npx agent-wrapped publish</code> and you are rank
        one.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-edge text-left text-[11px] tracking-wide text-faint uppercase">
            <th className="py-2 pr-3 font-medium">#</th>
            <th className="py-2 pr-4 font-medium">Developer</th>
            {SORT_KEYS.map((key) => (
              <th key={key} className="py-2 pr-4 text-right font-medium">
                <Link
                  href={`/leaderboard?sort=${key}`}
                  aria-current={key === sort ? "true" : undefined}
                  className={`transition-colors hover:text-ink ${
                    key === sort ? "text-coral" : "text-faint"
                  }`}
                >
                  {SORT_LABELS[key]}
                  {key === sort ? " ↓" : ""}
                </Link>
              </th>
            ))}
            <th className="py-2 text-right font-medium">Published</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.login} className="border-b border-edge/60 last:border-0">
              <td className="py-2.5 pr-3 font-mono tabular-nums text-faint">{entry.rank}</td>
              <td className="py-2.5 pr-4">
                <Link href={`/u/${entry.login}`} className="group flex items-center gap-2.5">
                  <Avatar login={entry.login} url={entry.avatarUrl} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink group-hover:text-coral">
                      {entry.name ?? entry.login}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-faint">
                      @{entry.login} · {entry.agents.map(agentLabel).join(" + ") || "unknown agent"}
                    </span>
                  </span>
                </Link>
              </td>
              <Cell active={sort === "tokens"}>{compact(entry.totalTokens)}</Cell>
              <Cell active={sort === "usd"}>{money(entry.apiEquivalentUsd)}</Cell>
              <Cell active={sort === "streak"}>{group(entry.currentStreak)}d</Cell>
              <Cell active={sort === "days"}>{group(entry.activeDays)}</Cell>
              <td className="py-2.5 text-right font-mono text-[11px] tabular-nums text-faint">
                {relativeDate(entry.publishedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <td
      className={`py-2.5 pr-4 text-right font-mono tabular-nums ${
        active ? "font-semibold text-coral" : "text-dim"
      }`}
    >
      {children}
    </td>
  );
}

interface TopThreeProps {
  entries: LeaderboardEntry[];
  sort: SortKey;
}

/** Compact social-proof strip for the landing page. */
export function TopEntries({ entries, sort }: TopThreeProps) {
  if (entries.length === 0) return null;

  return (
    <ul className="flex flex-col divide-y divide-edge/60">
      {entries.map((entry) => (
        <li key={entry.login}>
          <Link
            href={`/u/${entry.login}`}
            className="group flex items-center gap-3 py-2.5 transition-colors"
          >
            <span className="w-5 shrink-0 font-mono text-xs tabular-nums text-faint">
              {entry.rank}
            </span>
            <Avatar login={entry.login} url={entry.avatarUrl} size={24} />
            <span className="min-w-0 flex-1 truncate font-mono text-sm text-dim group-hover:text-ink">
              @{entry.login}
            </span>
            <span className="shrink-0 font-mono text-sm tabular-nums text-coral">
              {metricText(entry, sort)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
