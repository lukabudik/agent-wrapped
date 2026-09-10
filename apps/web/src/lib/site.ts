/** Absolute origin of this deployment, without a trailing slash. */
export function appUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "http://localhost:3000");
  return raw.replace(/\/+$/, "");
}

export const SITE_NAME = "agent-wrapped";
export const SITE_TAGLINE =
  "Turn your local Claude Code and Codex logs into a stats card for your GitHub README.";
export const REPO_URL = "https://github.com/lukabudik/agent-wrapped";
