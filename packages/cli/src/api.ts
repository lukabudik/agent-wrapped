import type { Theme, WrappedStats } from "@agent-wrapped/core";
import { fetchWithTimeout, networkError, readJson, userError } from "./errors.js";

const DEFAULT_API = "https://agentwrapped.dev";

export function apiBase(): string {
  const raw = process.env["AGENT_WRAPPED_API"];
  const base = raw && raw.trim() !== "" ? raw.trim() : DEFAULT_API;
  return base.replace(/\/+$/, "");
}

export interface PublishResult {
  username: string;
  profileUrl: string;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** Seconds to wait, from a Retry-After header that may be seconds or an HTTP date. */
function retryAfterSeconds(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(1, Math.round(seconds));
  const at = Date.parse(header);
  if (Number.isNaN(at)) return undefined;
  return Math.max(1, Math.round((at - Date.now()) / 1000));
}

export async function publishStats(stats: WrappedStats, token: string): Promise<PublishResult> {
  const base = apiBase();
  const res = await fetchWithTimeout(
    `${base}/api/publish`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "agent-wrapped",
      },
      body: JSON.stringify(stats),
    },
    base,
    30_000,
  );

  if (res.status === 401 || res.status === 403) {
    throw userError('The stored GitHub token was rejected. Run "agent-wrapped login" again.');
  }
  if (res.status === 429) {
    const wait = retryAfterSeconds(res.headers.get("retry-after"));
    throw networkError(
      `Rate limited by ${base}.${wait ? ` Try again in ${wait}s.` : " Try again in a few minutes."}`,
    );
  }
  if (!res.ok) {
    const body = await readJson(res);
    const detail = isObj(body) && typeof body["error"] === "string" ? `: ${body["error"]}` : "";
    throw networkError(`Publish failed (HTTP ${res.status})${detail}.`);
  }

  const body = await readJson(res);
  const username =
    isObj(body) && typeof body["username"] === "string" ? body["username"] : undefined;
  if (!username) throw networkError("The server accepted the upload but returned no username.");

  return { username, profileUrl: `${base}/u/${encodeURIComponent(username)}` };
}

export function cardUrl(username: string, theme: Theme, mode?: "dark" | "light"): string {
  const query = new URLSearchParams({ theme });
  if (mode) query.set("mode", mode);
  return `${apiBase()}/api/card/${encodeURIComponent(username)}?${query.toString()}`;
}

/**
 * The `<picture>` form is what makes the card match GitHub's own theme: an
 * <img> in a README cannot see the page theme, so each mode is pinned to a
 * source and the browser picks. Ampersands are escaped because this is HTML.
 */
export function readmeSnippet(username: string, theme: Theme, profileUrl: string): string {
  const esc = (url: string): string => url.replace(/&/g, "&amp;");
  const alt = `${username}'s Claude Code stats`;
  return [
    `<a href="${profileUrl}">`,
    `  <picture>`,
    `    <source media="(prefers-color-scheme: dark)" srcset="${esc(cardUrl(username, theme, "dark"))}">`,
    `    <source media="(prefers-color-scheme: light)" srcset="${esc(cardUrl(username, theme, "light"))}">`,
    `    <img alt="${alt}" src="${esc(cardUrl(username, theme))}">`,
    `  </picture>`,
    `</a>`,
  ].join("\n");
}
