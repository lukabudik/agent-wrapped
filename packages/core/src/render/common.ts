import type { Mode } from "../types.js";

/**
 * Palettes deliberately echo GitHub's own card chrome (#0d1117 / #ffffff with
 * matching borders) so the card reads as part of the profile rather than as a
 * foreign embed. The accent ramp is coral rather than green so it never gets
 * mistaken for the real contribution graph sitting above it.
 */
export interface Palette {
  bg: string;
  panel: string;
  border: string;
  text: string;
  dim: string;
  faint: string;
  accent: string;
  accentSoft: string;
  /** Diff colours for added / removed lines. */
  add: string;
  del: string;
  ramp: [string, string, string, string, string];
}

export const DARK: Palette = {
  bg: "#0d1117",
  panel: "#161b22",
  border: "#30363d",
  text: "#e6edf3",
  dim: "#8b949e",
  faint: "#484f58",
  accent: "#ef7a52",
  accentSoft: "#d97757",
  add: "#3fb950",
  del: "#f85149",
  ramp: ["#161b22", "#4a2118", "#7d3826", "#b85337", "#ef7a52"],
};

export const LIGHT: Palette = {
  bg: "#ffffff",
  panel: "#f6f8fa",
  border: "#d1d9e0",
  text: "#1f2328",
  dim: "#59636e",
  faint: "#afb8c1",
  accent: "#c8451f",
  accentSoft: "#e0663c",
  add: "#1a7f37",
  del: "#cf222e",
  ramp: ["#ebedf0", "#ffd9cc", "#ffab8f", "#f2734d", "#c8451f"],
};

export const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
export const MONO =
  "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace";

/** SVG has no entity table beyond the XML five, so escape all of them. */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 23_791_531_810 -> "23.79B". Keeps three significant figures. */
export function compact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
}

export function group(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function money(n: number): string {
  if (n >= 1000) return `$${group(n)}`;
  return `$${n.toFixed(2)}`;
}

function titleCase(s: string): string {
  return s
    .split("-")
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * "claude-opus-5" -> "Opus 5"; "gpt-5.3-codex" -> "GPT-5.3 Codex";
 * "codex-auto-review" -> "Codex Auto Review". Unrecognised ids are title-cased
 * rather than dropped, so a model released after this shipped still reads well.
 */
export function prettyModel(id: string): string {
  const m = id.match(/^claude-(fable|mythos|opus|sonnet|haiku)-(\d+)(?:-(\d+))?/);
  if (m) {
    const family = m[1]![0]!.toUpperCase() + m[1]!.slice(1);
    return `${family} ${m[2]}${m[3] ? `.${m[3]}` : ""}`;
  }

  const g = id.match(/^gpt-([\d.]+)(?:-(.+))?$/);
  if (g) return `GPT-${g[1]}${g[2] ? ` ${titleCase(g[2])}` : ""}`;

  return titleCase(id);
}

/**
 * The card is served to an <img>, so no script can run and the GitHub theme is
 * not observable. `auto` therefore keys off the viewer's OS setting; explicit
 * `dark` / `light` exist because the README author can pin them per <picture>
 * source and get an exact match with the GitHub theme.
 */
export function themeStyle(mode: Mode): string {
  if (mode === "dark") return vars(DARK);
  if (mode === "light") return vars(LIGHT);
  return `${vars(LIGHT)}@media(prefers-color-scheme:dark){${vars(DARK)}}`;
}

function vars(p: Palette): string {
  return (
    `:root{--bg:${p.bg};--panel:${p.panel};--bd:${p.border};--tx:${p.text};` +
    `--dim:${p.dim};--faint:${p.faint};--ac:${p.accent};--acs:${p.accentSoft};` +
    `--add:${p.add};--del:${p.del};` +
    p.ramp.map((c, i) => `--r${i}:${c};`).join("") +
    `}`
  );
}

export interface CardChrome {
  width: number;
  height: number;
  radius?: number;
}

export function open({ width, height, radius = 8 }: CardChrome, mode: Mode, css: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}" role="img" font-family="${FONT}">` +
    `<style>${themeStyle(mode)}${css}</style>` +
    `<rect width="${width}" height="${height}" rx="${radius}" fill="var(--bg)" stroke="var(--bd)"/>`
  );
}

export function close(): string {
  return "</svg>";
}

export function text(
  x: number,
  y: number,
  content: string,
  opts: {
    cls?: string;
    size?: number;
    weight?: number | string;
    fill?: string;
    anchor?: string;
    mono?: boolean;
  } = {},
): string {
  const a: string[] = [`x="${x}"`, `y="${y}"`];
  if (opts.cls) a.push(`class="${opts.cls}"`);
  if (opts.size) a.push(`font-size="${opts.size}"`);
  if (opts.weight) a.push(`font-weight="${opts.weight}"`);
  if (opts.fill) a.push(`fill="${opts.fill}"`);
  if (opts.anchor) a.push(`text-anchor="${opts.anchor}"`);
  if (opts.mono) a.push(`font-family="${MONO}"`);
  return `<text ${a.join(" ")}>${esc(content)}</text>`;
}

/** A horizontal stacked bar. Segments are [width fraction 0-1, fill]. */
export function stackedBar(
  x: number,
  y: number,
  width: number,
  height: number,
  segments: Array<{ frac: number; fill: string }>,
): string {
  let cursor = x;
  const parts: string[] = [];
  for (const s of segments) {
    const w = Math.max(0, s.frac * width);
    if (w < 0.5) continue;
    parts.push(
      `<rect x="${cursor.toFixed(2)}" y="${y}" width="${w.toFixed(2)}" height="${height}" fill="${s.fill}"/>`,
    );
    cursor += w;
  }
  return `<g clip-path="inset(0 round ${height / 2}px)">${parts.join("")}</g>`;
}
