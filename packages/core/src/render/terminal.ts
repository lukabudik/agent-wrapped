import type { Mode, WrappedStats } from "../types.js";
import { close, compact, esc, group, money, open, prettyModel, text } from "./common.js";

const W = 880;
const H = 344;
const PAD = 28;

const LOGO_X = PAD + 4;
const LOGO_Y = 76;
const PIXEL = 11;

const ROW_X = 190;
const ROW_TOP = 112;
const ROW_STEP = 21;
const ROW_SIZE = 12.5;

/**
 * Every row is a single monospace <text>, padded in characters rather than
 * positioned in pixels. Absolute x-offsets for the value column would drift
 * against the leader dots on any font fallback and overlap the value.
 */
const LEAD_COLS = 22;

const MONO_ATTR = 'font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"';

/** A pixel sunburst, drawn as rects so the theme stays honest to its terminal look. */
const LOGO: readonly string[] = [
  "..x.x..",
  ".x.x.x.",
  "..xxx..",
  "xxxxxxx",
  "..xxx..",
  ".x.x.x.",
  "..x.x..",
];

function logo(): string {
  const out: string[] = [];
  for (let r = 0; r < LOGO.length; r++) {
    const row = LOGO[r]!;
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== "x") continue;
      // The centre of the burst reads brighter than the rays.
      const mid = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      out.push(
        `<rect x="${LOGO_X + c * PIXEL}" y="${LOGO_Y + r * PIXEL}" width="${PIXEL - 2}" ` +
          `height="${PIXEL - 2}" fill="var(--${mid ? "ac" : "acs"})"/>`,
      );
    }
  }
  return out.join("");
}

/** neofetch's leader dots, sized in characters so the value column always lines up. */
function lead(key: string): string {
  const dots = Math.max(3, LEAD_COLS - key.length - 2);
  return (
    `<tspan class="k" font-weight="700">${esc(key)}</tspan>` +
    `<tspan class="d"> ${".".repeat(dots)} </tspan>`
  );
}

function row(index: number, key: string, value: string, valueClass = "v"): string {
  const y = ROW_TOP + index * ROW_STEP;
  return (
    `<text x="${ROW_X}" y="${y}" font-size="${ROW_SIZE}" ${MONO_ATTR}>` +
    lead(key) +
    `<tspan class="${valueClass}">${esc(value)}</tspan>` +
    `</text>`
  );
}

export function renderTerminal(stats: WrappedStats, username: string, mode: Mode): string {
  const css =
    `.p{fill:var(--ac)}.c{fill:var(--tx)}.k{fill:var(--dim)}.d{fill:var(--faint)}` +
    `.v{fill:var(--tx)}.va{fill:var(--ac)}.add{fill:var(--add)}.del{fill:var(--del)}.hint{fill:var(--faint)}`;

  const t = stats.totals;
  const agents = stats.agents
    .map((a) => (a === "claude-code" ? "Claude Code" : "Codex"))
    .join(", ");
  const topTool = stats.tools[0];
  const host = stats.agents.includes("claude-code") ? "claude-code" : "codex";

  const parts: string[] = [
    open({ width: W, height: H }, mode, css),

    // Prompt line, on its own row above everything else.
    `<text x="${PAD}" y="38" font-size="13" ${MONO_ATTR}>` +
      `<tspan class="p">$</tspan><tspan class="c"> npx agent-wrapped</tspan></text>`,

    logo(),

    // Identity header, aligned with the top of the logo.
    `<text x="${ROW_X}" y="80" font-size="14" font-weight="700" ${MONO_ATTR}>` +
      `<tspan class="va">${esc(username)}</tspan><tspan class="k">@</tspan>` +
      `<tspan class="c">${esc(host)}</tspan></text>`,
    `<line x1="${ROW_X}" y1="92" x2="${W - PAD}" y2="92" stroke="var(--bd)"/>`,

    row(0, "Agents", agents),
    row(1, "Tokens", `${compact(t.tokens.total)} · ${money(t.apiEquivalentUsd)} at API list`, "va"),
    row(2, "Sessions", group(t.sessions)),
    row(3, "Turns", group(t.messages)),
    row(
      4,
      "Tool calls",
      topTool ? `${group(t.toolCalls)} · top ${topTool.name}` : group(t.toolCalls),
    ),
    row(5, "Subagents", group(t.subagentsSpawned)),
    row(
      7,
      "Active days",
      `${group(t.activeDays)} · streak ${t.currentStreak}, best ${t.longestStreak}`,
    ),
    row(8, "Peak hour", `${String(stats.peakHour).padStart(2, "0")}:00`),
    row(
      9,
      "Models",
      stats.models
        .slice(0, 3)
        .map((m) => prettyModel(m.id))
        .join(" · "),
    ),
  ];

  // Lines written needs two colours, so it bypasses row().
  const linesY = ROW_TOP + 6 * ROW_STEP;
  parts.push(
    `<text x="${ROW_X}" y="${linesY}" font-size="${ROW_SIZE}" ${MONO_ATTR}>` +
      lead("Lines") +
      `<tspan class="add">+${group(t.linesAdded)}</tspan>` +
      `<tspan class="d"> / </tspan>` +
      `<tspan class="del">-${group(t.linesRemoved)}</tspan></text>`,
  );

  // neofetch-style palette strip, tucked under the logo, reusing the heat ramp.
  const stripY = LOGO_Y + LOGO.length * PIXEL + 18;
  for (let i = 0; i < 5; i++) {
    parts.push(
      `<rect x="${LOGO_X + i * 22}" y="${stripY}" width="20" height="10" fill="var(--r${i})"/>`,
    );
  }

  parts.push(
    text(W - PAD, H - 22, `${stats.range.from} to ${stats.range.to}`, {
      cls: "hint",
      size: 10.5,
      anchor: "end",
      mono: true,
    }),
    text(PAD, H - 22, "agentwrapped.dev", { cls: "hint", size: 10.5, mono: true }),
    close(),
  );

  return parts.join("");
}
