import type { Mode, WrappedStats } from "../types.js";
import {
  close,
  compact,
  esc,
  group,
  money,
  open,
  prettyModel,
  stackedBar,
  text,
} from "./common.js";

const W = 880;
const H = 452;
const PAD = 28;

/**
 * A raw token count is unreadable at billion scale, so anchor it to something
 * physical. Roughly 95,000 tokens per novel and 750 per printed page.
 */
const TOKENS_PER_NOVEL = 95_000;
const TOKENS_PER_PAGE = 750;

function equivalence(tokens: number): string {
  const novels = tokens / TOKENS_PER_NOVEL;
  if (novels >= 2) return `roughly ${group(Math.round(novels))} novels of text`;
  const pages = Math.round(tokens / TOKENS_PER_PAGE);
  return `roughly ${group(pages)} printed pages of text`;
}

function statRow(x: number, y: number, label: string, value: string, accent = false): string {
  return (
    text(x, y, label.toUpperCase(), { cls: "sl", size: 9.5, weight: 600 }) +
    text(x + 250, y, value, {
      cls: accent ? "sva" : "sv",
      size: 16,
      weight: 700,
      anchor: "end",
      mono: true,
    })
  );
}

/** 24 bars, one per hour, scaled to the busiest hour. */
function hourChart(
  stats: WrappedStats,
  x: number,
  y: number,
  width: number,
  height: number,
): string {
  const max = Math.max(1, ...stats.byHour);
  const slot = width / 24;
  const barW = slot - 4;
  const out: string[] = [];

  for (let h = 0; h < 24; h++) {
    const v = stats.byHour[h] ?? 0;
    const bh = Math.max(v > 0 ? 2 : 1, (v / max) * height);
    const bx = x + h * slot;
    const isPeak = h === stats.peakHour;
    out.push(
      `<rect x="${bx.toFixed(1)}" y="${(y + height - bh).toFixed(1)}" width="${barW.toFixed(1)}" ` +
        `height="${bh.toFixed(1)}" rx="2" fill="${isPeak ? "var(--ac)" : "var(--r2)"}"/>`,
    );
    if (h % 6 === 0) {
      out.push(
        text(bx, y + height + 13, `${String(h).padStart(2, "0")}`, {
          cls: "sl",
          size: 9.5,
          mono: true,
        }),
      );
    }
  }
  return out.join("");
}

function chips(names: string[], x: number, y: number, maxWidth: number): string {
  const out: string[] = [];
  let cursor = x;
  for (const name of names) {
    const w = name.length * 6.6 + 20;
    if (cursor + w > x + maxWidth) break;
    out.push(
      `<rect x="${cursor.toFixed(1)}" y="${y - 12}" width="${w.toFixed(1)}" height="20" rx="10" ` +
        `fill="none" stroke="var(--bd)"/>` +
        `<text x="${(cursor + w / 2).toFixed(1)}" y="${y + 2}" font-size="10.5" ` +
        `text-anchor="middle" fill="var(--dim)">${esc(name)}</text>`,
    );
    cursor += w + 7;
  }
  return out.join("");
}

export function renderWrapped(stats: WrappedStats, username: string, mode: Mode): string {
  const css =
    `.brand{fill:var(--faint)}.u{fill:var(--tx)}.hero{fill:var(--ac)}` +
    `.hl{fill:var(--tx)}.note{fill:var(--dim)}.sl{fill:var(--dim)}` +
    `.sv{fill:var(--tx)}.sva{fill:var(--ac)}.add{fill:var(--add)}.del{fill:var(--del)}`;

  const t = stats.totals;
  const year = (stats.range.to || stats.generatedAt).slice(0, 4);
  const totalTokens = Math.max(1, t.tokens.total);
  const shades = ["var(--r4)", "var(--r3)", "var(--r2)", "var(--r1)"];
  const segments = stats.models.slice(0, 4).map((m, i) => ({
    frac: m.tokens.total / totalTokens,
    fill: shades[i] ?? "var(--r1)",
  }));

  const rightX = 520;
  const parts: string[] = [
    open({ width: W, height: H }, mode, css),

    text(PAD, 36, `AGENT WRAPPED · ${year}`, { cls: "brand", size: 10.5, weight: 700 }),
    text(W - PAD, 36, username, { cls: "u", size: 14, weight: 700, anchor: "end" }),
    `<line x1="${PAD}" y1="52" x2="${W - PAD}" y2="52" stroke="var(--bd)"/>`,

    // Hero
    text(PAD, 132, compact(t.tokens.total), { cls: "hero", size: 76, weight: 800 }),
    text(PAD, 160, "TOKENS THROUGH AI CODING AGENTS", { cls: "hl", size: 12, weight: 700 }),
    text(PAD, 182, equivalence(t.tokens.total), { cls: "note", size: 12 }),

    text(PAD, 222, money(t.apiEquivalentUsd), { cls: "hero", size: 30, weight: 800 }),
    text(PAD, 244, "what those tokens would list for at API rates", { cls: "note", size: 11.5 }),

    // Right-hand stat ledger
    statRow(rightX, 96, "sessions", group(t.sessions)),
    statRow(rightX, 122, "assistant turns", group(t.messages)),
    statRow(rightX, 148, "tool calls", group(t.toolCalls)),
    statRow(rightX, 174, "subagents spawned", group(t.subagentsSpawned)),
    statRow(rightX, 200, "active days", group(t.activeDays)),
    statRow(rightX, 226, "longest streak", `${group(t.longestStreak)}d`, true),
    statRow(rightX, 252, "thinking tokens", compact(t.tokens.thinking)),
  ];

  // Lines added / removed
  parts.push(
    text(rightX, 278, "LINES WRITTEN", { cls: "sl", size: 9.5, weight: 600 }),
    `<text x="${rightX + 250}" y="278" font-size="16" font-weight="700" text-anchor="end" ` +
      `font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace">` +
      `<tspan class="add">+${compact(t.linesAdded)}</tspan>` +
      `<tspan class="sl" font-size="12"> / </tspan>` +
      `<tspan class="del">-${compact(t.linesRemoved)}</tspan></text>`,
  );

  // Hour-of-day rhythm
  parts.push(
    `<line x1="${PAD}" y1="296" x2="${W - PAD}" y2="296" stroke="var(--bd)"/>`,
    text(PAD, 318, "WHEN YOU SHIP", { cls: "sl", size: 9.5, weight: 600 }),
    text(W - PAD, 318, `peak ${String(stats.peakHour).padStart(2, "0")}:00`, {
      cls: "sva",
      size: 10.5,
      weight: 700,
      anchor: "end",
    }),
    hourChart(stats, PAD, 328, W - PAD * 2, 48),
  );

  // Tools and model mix
  parts.push(
    text(PAD, 418, "TOP TOOLS", { cls: "sl", size: 9.5, weight: 600 }),
    chips(
      stats.tools.slice(0, 6).map((x) => x.name),
      PAD + 76,
      418,
      380,
    ),
    text(
      W - PAD,
      404,
      stats.models
        .slice(0, 3)
        .map((m) => prettyModel(m.id))
        .join("  ·  "),
      {
        cls: "sl",
        size: 10,
        anchor: "end",
      },
    ),
    stackedBar(W - PAD - 240, 412, 240, 8, segments),
  );

  parts.push(close());
  return parts.join("");
}
