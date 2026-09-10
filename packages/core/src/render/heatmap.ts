import type { Mode, WrappedStats } from "../types.js";
import { close, compact, group, money, open, prettyModel, stackedBar, text } from "./common.js";

const W = 880;
const H = 384;
const PAD = 24;

const CELL = 12;
const GAP = 3;
const STEP = CELL + GAP;
const WEEKS = 53;
const GRID_TOP = 172;

const DAY_MS = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function iso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Quartile thresholds over the *active* days only. Using the global max instead
 * would flatten a normal week into level 1 whenever a single outlier day exists,
 * which is exactly what a heavy agent user's history looks like.
 */
function thresholds(counts: number[]): [number, number, number, number] {
  const active = counts.filter((c) => c > 0).sort((a, b) => a - b);
  if (active.length === 0) return [1, 2, 3, 4];
  const q = (f: number) => active[Math.min(active.length - 1, Math.floor(active.length * f))] ?? 1;
  return [1, q(0.25), q(0.5), q(0.75)];
}

function level(count: number, t: [number, number, number, number]): number {
  if (count <= 0) return 0;
  if (count < t[1]) return 1;
  if (count < t[2]) return 2;
  if (count < t[3]) return 3;
  return 4;
}

/** The grid ends on the week containing the most recent day with activity. */
function gridStart(lastDay: Date): Date {
  const end = new Date(lastDay);
  end.setDate(end.getDate() - end.getDay()); // back up to Sunday
  const start = new Date(end);
  start.setDate(start.getDate() - (WEEKS - 1) * 7);
  return start;
}

function renderGrid(stats: WrappedStats): { cells: string; months: string } {
  const byDay = stats.byDay;
  const last = stats.range.to ? new Date(`${stats.range.to}T12:00:00`) : new Date();
  const start = gridStart(last);
  const t = thresholds(Object.values(byDay));

  const cells: string[] = [];
  const months: string[] = [];
  let lastMonth = -1;

  for (let w = 0; w < WEEKS; w++) {
    const x = PAD + w * STEP;
    const colStart = new Date(start.getTime() + w * 7 * DAY_MS);

    // Label a column when its week introduces a new month, and leave room so
    // adjacent labels never collide.
    if (colStart.getMonth() !== lastMonth && colStart.getDate() <= 7) {
      lastMonth = colStart.getMonth();
      months.push(text(x, GRID_TOP - 8, MONTHS[lastMonth]!, { cls: "mo", size: 10 }));
    }

    for (let d = 0; d < 7; d++) {
      const day = new Date(colStart.getTime() + d * DAY_MS);
      if (day > last) continue;
      const count = byDay[iso(day)] ?? 0;
      const y = GRID_TOP + d * STEP;
      // No <title> tooltip: the card is consumed as an <img>, where SVG is a
      // static document and tooltips never fire. Emitting one per day added
      // roughly 40KB of markup that no viewer could ever see.
      cells.push(
        `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2.5" ` +
          `fill="var(--r${level(count, t)})"/>`,
      );
    }
  }

  return { cells: cells.join(""), months: months.join("") };
}

function chip(x: number, y: number, label: string, value: string): string {
  return (
    text(x, y, value, { cls: "cv", size: 15, weight: 700 }) +
    text(x, y + 15, label, { cls: "cl", size: 10.5 })
  );
}

export function renderHeatmap(stats: WrappedStats, username: string, mode: Mode): string {
  const css =
    `.u{fill:var(--tx)}.sub{fill:var(--dim)}.mo{fill:var(--dim)}.brand{fill:var(--faint)}` +
    `.hero{fill:var(--ac)}.herou{fill:var(--dim)}.note{fill:var(--dim)}` +
    `.cv{fill:var(--tx)}.cl{fill:var(--dim)}.add{fill:var(--add)}.del{fill:var(--del)}`;

  const { cells, months } = renderGrid(stats);
  const t = stats.totals;
  const agents = stats.agents
    .map((a) => (a === "claude-code" ? "Claude Code" : "Codex"))
    .join(" + ");

  // Model mix as a single stacked bar, ordered by spend so the dominant model leads.
  const totalTokens = Math.max(1, t.tokens.total);
  const shades = ["var(--r4)", "var(--r3)", "var(--r2)", "var(--r1)"];
  const segments = stats.models.slice(0, 4).map((m, i) => ({
    frac: m.tokens.total / totalTokens,
    fill: shades[i] ?? "var(--r1)",
  }));

  const legendY = GRID_TOP + 7 * STEP + 19;
  const dividerY = legendY + 20;
  const footerY = dividerY + 30;

  const parts: string[] = [
    open({ width: W, height: H }, mode, css),

    // Header
    text(PAD, 34, username, { cls: "u", size: 19, weight: 700 }),
    text(PAD, 52, agents, { cls: "sub", size: 11.5 }),
    text(W - PAD, 34, "AGENT WRAPPED", { cls: "brand", size: 10, weight: 600, anchor: "end" }),
    text(W - PAD, 52, `${stats.range.from} to ${stats.range.to}`, {
      cls: "sub",
      size: 10.5,
      anchor: "end",
      mono: true,
    }),

    // Hero
    text(PAD, 108, compact(t.tokens.total), { cls: "hero", size: 46, weight: 800 }),
    text(PAD + measure(compact(t.tokens.total), 46) + 10, 108, "tokens", {
      cls: "herou",
      size: 17,
      weight: 600,
    }),
    text(PAD, 132, `${money(t.apiEquivalentUsd)} if every one had gone through the API`, {
      cls: "note",
      size: 12.5,
    }),

    // Model mix, right-aligned against the hero
    text(W - PAD, 100, "MODEL MIX", { cls: "brand", size: 9.5, weight: 600, anchor: "end" }),
    stackedBar(W - PAD - 260, 108, 260, 8, segments),
    text(
      W - PAD,
      132,
      stats.models
        .slice(0, 3)
        .map((m) => prettyModel(m.id))
        .join("  ·  "),
      {
        cls: "sub",
        size: 10.5,
        anchor: "end",
      },
    ),

    months,
    cells,
  ];

  // Legend
  parts.push(text(PAD, legendY, "Less", { cls: "sub", size: 10 }));
  for (let i = 0; i < 5; i++) {
    parts.push(
      `<rect x="${PAD + 32 + i * 15}" y="${legendY - 9}" width="${CELL}" height="${CELL}" rx="2.5" fill="var(--r${i})"/>`,
    );
  }
  parts.push(text(PAD + 32 + 5 * 15 + 6, legendY, "More", { cls: "sub", size: 10 }));
  parts.push(
    text(
      W - PAD,
      legendY,
      `${group(t.activeDays)} active days · ${group(t.currentStreak)} day streak`,
      {
        cls: "sub",
        size: 10.5,
        anchor: "end",
      },
    ),
  );

  // Footer stats
  parts.push(
    `<line x1="${PAD}" y1="${dividerY}" x2="${W - PAD}" y2="${dividerY}" stroke="var(--bd)"/>`,
  );
  const cols = [PAD, PAD + 168, PAD + 336, PAD + 504, PAD + 672];
  parts.push(
    chip(cols[0]!, footerY, "sessions", group(t.sessions)),
    chip(cols[1]!, footerY, "tool calls", group(t.toolCalls)),
    chip(cols[2]!, footerY, "subagents spawned", group(t.subagentsSpawned)),
    chip(cols[3]!, footerY, "peak hour", `${String(stats.peakHour).padStart(2, "0")}:00`),
  );

  // Lines added/removed gets its own two-tone treatment.
  parts.push(
    `<text x="${cols[4]}" y="${footerY}" font-size="15" font-weight="700">` +
      `<tspan class="add">+${compact(t.linesAdded)}</tspan>` +
      `<tspan class="cl" font-size="12"> / </tspan>` +
      `<tspan class="del">-${compact(t.linesRemoved)}</tspan></text>`,
    text(cols[4]!, footerY + 15, "lines", { cls: "cl", size: 10.5 }),
  );

  parts.push(close());
  return parts.join("");
}

/**
 * Rough advance width for the hero numeral so the "tokens" label can sit beside
 * it. SVG has no text metrics without a layout engine; the hero string is always
 * digits plus one suffix letter, which are near-uniform in the system stack.
 */
function measure(s: string, size: number): number {
  return s.length * size * 0.58;
}
