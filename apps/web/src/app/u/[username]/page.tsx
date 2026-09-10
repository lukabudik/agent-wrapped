import type { Metadata } from "next";
import Link from "next/link";
import { ActivityHeatmap, HeatmapLegend } from "@/components/activity-heatmap";
import { Avatar } from "@/components/avatar";
import { CodeBlock } from "@/components/code-block";
import { HourHistogram } from "@/components/hour-histogram";
import { ModelTable } from "@/components/model-table";
import { NamedBars } from "@/components/named-bars";
import { StatTile } from "@/components/stat-tile";
import { cardUrl, DEFAULT_MODE, DEFAULT_THEME, markdownSnippet, THEMES } from "@/lib/card-params";
import {
  agentLabel,
  compact,
  group,
  hourLabel,
  money,
  prettyDate,
  prettyModel,
  relativeDate,
} from "@/lib/format";
import { normaliseLogin } from "@/lib/login";
import { fetchProfile } from "@/lib/snapshot";
import { appUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const login = normaliseLogin(username);
  const profile = await fetchProfile(login).catch(() => null);

  if (!profile) {
    return { title: `@${login}`, description: "No wrapped published yet." };
  }

  const { totals } = profile.stats;
  return {
    title: `@${profile.login}`,
    description: `${compact(totals.tokens.total)} tokens across ${group(totals.sessions)} sessions — ${money(totals.apiEquivalentUsd)} at list API rates.`,
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;
  const login = normaliseLogin(username);
  const profile = await fetchProfile(login);
  if (!profile) return <UnpublishedProfile login={login} />;

  const { stats } = profile;
  const { totals } = stats;
  const origin = appUrl();
  const topModel = [...stats.models].sort((a, b) => b.tokens.total - a.tokens.total)[0];

  return (
    <div className="mx-auto max-w-5xl px-5 py-14">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <Avatar login={profile.login} url={profile.avatarUrl} size={56} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {profile.name ?? profile.login}
            </h1>
            <p className="mt-0.5 font-mono text-sm text-dim">
              <a
                href={`https://github.com/${profile.login}`}
                target="_blank"
                rel="noreferrer noopener"
                className="transition-colors hover:text-coral"
              >
                @{profile.login}
              </a>
            </p>
          </div>
        </div>
        <dl className="flex flex-col gap-1 text-xs text-faint sm:text-right">
          <div>
            <dt className="inline">Scanned </dt>
            <dd className="inline font-mono text-dim">
              {prettyDate(stats.range.from)} – {prettyDate(stats.range.to)}
            </dd>
          </div>
          <div>
            <dt className="inline">Agents </dt>
            <dd className="inline font-mono text-dim">
              {stats.agents.map(agentLabel).join(" + ")}
            </dd>
          </div>
          <div>
            <dt className="inline">Published </dt>
            <dd className="inline font-mono text-dim">{relativeDate(profile.publishedAt)}</dd>
          </div>
        </dl>
      </header>

      <section className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatTile
          label="Tokens"
          value={compact(totals.tokens.total)}
          hint={`${group(totals.tokens.total)} in total`}
          accent
        />
        <StatTile
          label="API equivalent"
          value={money(totals.apiEquivalentUsd)}
          hint="At first-party list rates"
          accent
        />
        <StatTile label="Sessions" value={group(totals.sessions)} />
        <StatTile label="Assistant turns" value={group(totals.messages)} />
        <StatTile label="Tool calls" value={group(totals.toolCalls)} />
        <StatTile label="Subagents" value={group(totals.subagentsSpawned)} />
        <StatTile
          label="Lines changed"
          value={`+${compact(totals.linesAdded)}`}
          hint={`-${compact(totals.linesRemoved)} removed`}
        />
        <StatTile
          label="Active days"
          value={group(totals.activeDays)}
          hint={`${group(totals.currentStreak)}d streak · ${group(totals.longestStreak)}d best`}
        />
      </section>

      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Cards</h2>
          <span className="font-mono text-xs text-faint">mode: {DEFAULT_MODE}</span>
        </div>
        <div className="mt-4 flex min-w-0 flex-col gap-6">
          {THEMES.map((theme) => (
            <figure key={theme} className="flex min-w-0 flex-col gap-2">
              <figcaption className="font-mono text-xs tracking-wide text-faint uppercase">
                {theme}
              </figcaption>
              <div className="panel flex justify-center overflow-hidden p-5">
                {/* eslint-disable-next-line @next/next/no-img-element -- a plain img: the card is already an optimised SVG and next/image would proxy it for nothing */}
                <img
                  src={cardUrl("", profile.login, theme, DEFAULT_MODE)}
                  alt={`${theme} card for @${profile.login}`}
                  className="max-w-full"
                  loading="lazy"
                />
              </div>
              <CodeBlock
                value={markdownSnippet(origin, profile.login, theme, DEFAULT_MODE)}
                label="Copy markdown"
                wrap
              />
            </figure>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Activity</h2>
          <HeatmapLegend />
        </div>
        <div className="panel mt-4 px-4 py-5">
          <ActivityHeatmap byDay={stats.byDay} end={stats.range.to} />
        </div>
        {stats.peakDay ? (
          <p className="mt-3 text-sm text-dim">
            Busiest day was{" "}
            <span className="font-mono text-ink">{prettyDate(stats.peakDay.date)}</span> with{" "}
            <span className="font-mono text-coral">{group(stats.peakDay.count)}</span> assistant
            turns.
          </p>
        ) : null}
      </section>

      <section className="mt-14">
        <h2 className="text-lg font-semibold tracking-tight">When the work happens</h2>
        <p className="mt-1 text-sm text-dim">
          Local time on the machine that ran the scan. Peak hour is{" "}
          <span className="font-mono text-coral">{hourLabel(stats.peakHour)}</span>.
        </p>
        <div className="panel mt-4 px-4 py-5">
          <HourHistogram byHour={stats.byHour} peakHour={stats.peakHour} />
        </div>
      </section>

      <section className="mt-14">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Models</h2>
          {topModel ? (
            <span className="font-mono text-xs text-faint">mostly {prettyModel(topModel.id)}</span>
          ) : null}
        </div>
        <div className="panel mt-4 px-4 py-3">
          <ModelTable models={stats.models} totalTokens={totals.tokens.total} />
        </div>
      </section>

      <section className="mt-14 grid gap-8 lg:grid-cols-2">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">Tool mix</h2>
          <p className="mt-1 text-sm text-dim">
            {group(totals.toolCalls)} calls across {group(stats.tools.length)} distinct tools.
          </p>
          <div className="panel mt-4 px-4 py-4">
            <NamedBars items={stats.tools} emptyMessage="No tool calls recorded." />
          </div>
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">Skills</h2>
          <p className="mt-1 text-sm text-dim">
            Custom skill names are redacted unless the scan ran with{" "}
            <span className="font-mono">--include-names</span>.
          </p>
          <div className="panel mt-4 px-4 py-4">
            <NamedBars items={stats.skills} emptyMessage="No skill invocations recorded." />
          </div>
        </div>
      </section>

      <p className="mt-14 text-sm text-dim">
        Want one of these?{" "}
        <Link href="/" className="text-coral transition-colors hover:underline">
          Run the scan
        </Link>{" "}
        — it never leaves your machine until you say so.
      </p>
    </div>
  );
}

/**
 * A GitHub user who has not published is not a 404 — the page is reachable, the
 * person is real, there is simply no snapshot yet. Showing the placeholder card
 * and the one command that fills it is more useful than a dead end, and it is
 * the page someone lands on when a friend sends them their own profile URL.
 */
function UnpublishedProfile({ login }: { login: string }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-20">
      <p className="font-mono text-xs tracking-wide text-coral uppercase">Nothing published</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">@{login} has no wrapped yet.</h1>
      <p className="mt-3 text-sm leading-6 text-dim">
        Cards are opt-in. If this is you, one command scans the session logs already on your disk
        and puts a card at this URL.
      </p>
      <div className="panel mt-8 flex justify-center overflow-hidden p-5">
        {/* eslint-disable-next-line @next/next/no-img-element -- a plain img: the card is already an optimised SVG and next/image would proxy it for nothing */}
        <img
          src={cardUrl("", login, DEFAULT_THEME, DEFAULT_MODE)}
          alt={`No published card for @${login}`}
          className="max-w-full"
        />
      </div>
      <div className="mt-4">
        <CodeBlock value="npx agent-wrapped publish" label="Copy" />
      </div>
      <Link
        href="/"
        className="mt-8 inline-block rounded-lg border border-edge px-4 py-2 text-sm text-dim transition-colors hover:border-coral hover:text-coral"
      >
        What is this?
      </Link>
    </div>
  );
}
