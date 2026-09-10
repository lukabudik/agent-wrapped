import type { Mode, Theme } from "@agent-wrapped/core";
import { normaliseLogin } from "@/lib/login";

/**
 * The theme and mode lists are re-declared here rather than re-exported from
 * core. Core's entrypoint is a barrel that also reaches the filesystem scanner,
 * and this module is imported by the client-side theme picker — pulling the
 * barrel in would drag node:fs into the browser bundle. The type-only import
 * above is erased at compile time; the two assertions below fail to compile if
 * these lists and core's unions ever drift apart.
 */
export const THEMES = ["heatmap", "wrapped", "terminal"] as const satisfies readonly Theme[];
export const MODES = ["dark", "light", "auto"] as const satisfies readonly Mode[];

const _everyTheme: (typeof THEMES)[number] = null as unknown as Theme;
const _everyMode: (typeof MODES)[number] = null as unknown as Mode;
void _everyTheme;
void _everyMode;

export type { Mode, Theme };

export const DEFAULT_THEME: Theme = "heatmap";
export const DEFAULT_MODE: Mode = "auto";

/** Cards are embedded in READMEs, so a bad query param degrades instead of erroring. */
export function readTheme(value: string | null | undefined): Theme {
  return (THEMES as readonly string[]).includes(value ?? "") ? (value as Theme) : DEFAULT_THEME;
}

export function readMode(value: string | null | undefined): Mode {
  return (MODES as readonly string[]).includes(value ?? "") ? (value as Mode) : DEFAULT_MODE;
}

/** Cache for half an hour, serve stale for a day while revalidating. */
export const CARD_CACHE_CONTROL =
  "public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400";

export const SVG_CONTENT_TYPE = "image/svg+xml; charset=utf-8";

/** Pass an empty origin for a same-origin URL, an absolute one for the snippet. */
export function cardUrl(origin: string, username: string, theme: Theme, mode: Mode): string {
  const query = new URLSearchParams({ theme, mode });
  return `${origin}/api/card/${encodeURIComponent(normaliseLogin(username))}?${query.toString()}`;
}

/** The markdown a user pastes into their profile README. */
export function markdownSnippet(
  origin: string,
  username: string,
  theme: Theme,
  mode: Mode,
): string {
  const login = normaliseLogin(username);
  return `[![agent-wrapped](${cardUrl(origin, login, theme, mode)})](${origin}/u/${encodeURIComponent(login)})`;
}
