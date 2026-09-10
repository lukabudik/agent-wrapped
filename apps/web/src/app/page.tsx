import Link from "next/link";
import { CardPreview } from "@/components/card-preview";
import { CodeBlock } from "@/components/code-block";
import { TopEntries } from "@/components/leaderboard-table";
import { fetchLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard";
import { countPublishedProfiles } from "@/lib/snapshot";
import { appUrl, REPO_URL, SITE_TAGLINE } from "@/lib/site";
import { group } from "@/lib/format";

// The hero preview and the social-proof strip both read live rows, so there is
// nothing useful to prerender at build time — and doing so would need a
// database during the Docker build.
export const dynamic = "force-dynamic";

const PRIVACY_POINTS: Array<{ title: string; body: string }> = [
  {
    title: "Aggregates only",
    body: "The CLI reads your local session logs and uploads counters: token totals, per-model sums, turns per day, turns per hour. The transcripts stay where they are.",
  },
  {
    title: "No prompts, ever",
    body: "Message content is never parsed into anything that leaves the machine. Not the first line, not a summary, not a hash.",
  },
  {
    title: "No paths, no repo names",
    body: "Working directories, file paths, branch names and repository names are dropped during the scan, not filtered afterwards.",
  },
  {
    title: "Tool and skill names redacted by default",
    body: "Built-in tools keep their names because they are the same for everyone. Anything project-specific — MCP servers, custom skills — is bucketed unless you pass --include-names.",
  },
  {
    title: "You see it before it sends",
    body: "The first publish prints the exact JSON payload and waits for a yes. Run the scan with --json to inspect it any time without publishing.",
  },
  {
    title: "Yours to delete",
    body: "Publishing replaces your single stored snapshot. Nothing is versioned, nothing is archived, and the whole service is open source.",
  },
];

export default async function LandingPage() {
  let top: LeaderboardEntry[] = [];
  let published = 0;

  // The landing page has to render even with a cold or unreachable database —
  // the install instructions are the point, the leaderboard is decoration.
  try {
    const [page, count] = await Promise.all([
      fetchLeaderboard({ sort: "tokens", limit: 5 }),
      countPublishedProfiles(),
    ]);
    top = page.entries;
    published = count;
  } catch (error) {
    console.error("landing page data unavailable", error);
  }

  const origin = appUrl();
  const sampleUsername = top[0]?.login ?? "octocat";

  return (
    <div className="mx-auto max-w-5xl px-5">
      <section className="grid gap-12 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:py-24">
        <div className="flex min-w-0 flex-col gap-6">
          <p className="font-mono text-xs tracking-wide text-coral uppercase">
            Claude Code + Codex
          </p>
          <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
            Your year in AI coding agents, as a README card.
          </h1>
          <p className="max-w-prose text-base leading-7 text-dim">
            {SITE_TAGLINE} One command scans the JSONL sessions already sitting on your disk, adds
            up the tokens, prices them at list API rates, and hands you a card to paste into your
            GitHub profile.
          </p>

          <div className="flex flex-col gap-3">
            <CodeBlock value="npx agent-wrapped publish" label="Copy" />
            <p className="text-xs text-faint">
              No install and no account beyond the GitHub device-flow login the publish step asks
              for.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Link
              href="/leaderboard"
              className="rounded-lg border border-edge px-4 py-2 text-dim transition-colors hover:border-coral hover:text-coral"
            >
              See the leaderboard
            </Link>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="text-dim transition-colors hover:text-ink"
            >
              Read the source
            </a>
            {published > 0 ? (
              <span className="font-mono text-xs text-faint">
                {group(published)} published{published === 1 ? " profile" : " profiles"}
              </span>
            ) : null}
          </div>
        </div>

        <CardPreview sampleUsername={sampleUsername} origin={origin} />
      </section>

      <section className="border-t border-edge py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              What actually leaves your machine
            </h2>
            <p className="mt-2 max-w-prose text-sm leading-6 text-dim">
              This tool reads the most sensitive directory a developer has. That only works if the
              boundary is boring and checkable, so here it is in full.
            </p>
            <dl className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {PRIVACY_POINTS.map((point) => (
                <div key={point.title}>
                  <dt className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <span className="size-1.5 rounded-full bg-coral" aria-hidden />
                    {point.title}
                  </dt>
                  <dd className="mt-1.5 text-sm leading-6 text-dim">{point.body}</dd>
                </div>
              ))}
            </dl>
          </div>

          <aside className="panel h-fit px-5 py-5">
            <h3 className="font-mono text-xs tracking-wide text-faint uppercase">
              The whole payload
            </h3>
            <p className="mt-3 text-sm leading-6 text-dim">
              A published snapshot is one JSON object: token counters, per-model totals, a
              date-to-count map, a 24-slot hour histogram, and ranked tool and skill names. That is
              the entire shape — nothing else has anywhere to hide.
            </p>
            <p className="mt-4 text-sm leading-6 text-dim">Inspect yours before you send it:</p>
            <div className="mt-3">
              <CodeBlock value="npx agent-wrapped --json" label="Copy" />
            </div>
          </aside>
        </div>
      </section>

      <section className="border-t border-edge py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Three ways to wear it</h2>
            <p className="mt-2 max-w-prose text-sm leading-6 text-dim">
              Every card is a plain SVG served from one URL. Swap{" "}
              <code className="font-mono text-coral">theme</code> for a different layout and{" "}
              <code className="font-mono text-coral">mode</code> to pin dark or light — leave mode
              on <code className="font-mono text-coral">auto</code> and it follows whoever is
              reading.
            </p>
            <ul className="mt-6 flex flex-col gap-4 text-sm">
              <li>
                <span className="font-mono text-coral">heatmap</span>
                <span className="ml-2 text-dim">
                  A second contribution graph, coral instead of green, driven by turns per day.
                </span>
              </li>
              <li>
                <span className="font-mono text-coral">wrapped</span>
                <span className="ml-2 text-dim">
                  The poster: headline token count, API-equivalent spend, top model, peak hour.
                </span>
              </li>
              <li>
                <span className="font-mono text-coral">terminal</span>
                <span className="ml-2 text-dim">
                  A neofetch-style readout for profiles that are already all monospace.
                </span>
              </li>
            </ul>
          </div>

          <div className="panel h-fit px-5 py-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-mono text-xs tracking-wide text-faint uppercase">
                Most tokens burned
              </h3>
              <Link
                href="/leaderboard"
                className="text-xs text-dim transition-colors hover:text-coral"
              >
                All
              </Link>
            </div>
            <div className="mt-2">
              {top.length > 0 ? (
                <TopEntries entries={top} sort="tokens" />
              ) : (
                <p className="py-3 text-sm text-dim">
                  The board is empty. Publish and take the top spot.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
