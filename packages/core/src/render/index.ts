import type { Mode, Theme, WrappedStats } from "../types.js";
import { close, esc, open, text } from "./common.js";
import { renderHeatmap } from "./heatmap.js";
import { renderTerminal } from "./terminal.js";
import { renderWrapped } from "./wrapped.js";

export interface RenderOptions {
  theme: Theme;
  mode: Mode;
  username: string;
  /**
   * Accepted for API symmetry but intentionally unused: an SVG served to an
   * <img> is a sandboxed document, so a remote avatar would silently fail to
   * load. Inlining one as a data URI would also blow past a sane card size.
   */
  avatarUrl?: string;
}

export function renderCard(stats: WrappedStats, opts: RenderOptions): string {
  switch (opts.theme) {
    case "wrapped":
      return renderWrapped(stats, opts.username, opts.mode);
    case "terminal":
      return renderTerminal(stats, opts.username, opts.mode);
    case "heatmap":
    default:
      return renderHeatmap(stats, opts.username, opts.mode);
  }
}

/**
 * GitHub renders README images through its camo proxy, so an error response
 * shows up as a broken image for every visitor. Unknown users and users who
 * have not published yet get a real card instead.
 */
export function renderEmptyCard(username: string, mode: Mode, message?: string): string {
  const css = `.u{fill:var(--tx)}.m{fill:var(--dim)}.b{fill:var(--faint)}.a{fill:var(--ac)}`;
  return [
    open({ width: 880, height: 140 }, mode, css),
    text(28, 40, "AGENT WRAPPED", { cls: "b", size: 10, weight: 600 }),
    text(28, 76, esc(username), { cls: "u", size: 22, weight: 700 }),
    text(28, 100, message ?? "No stats published yet.", { cls: "m", size: 13 }),
    text(28, 120, "npx agent-wrapped publish", { cls: "a", size: 12, mono: true }),
    close(),
  ].join("");
}

export { renderHeatmap, renderTerminal, renderWrapped };
