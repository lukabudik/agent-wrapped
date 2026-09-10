export interface GitHubIdentity {
  githubId: string;
  login: string;
  name: string | null;
  avatarUrl: string | null;
}

export type IdentityResult =
  { ok: true; identity: GitHubIdentity } | { ok: false; status: 401 | 502; message: string };

/** Extract a bearer token from an Authorization header, if it looks like one. */
export function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1]! : null;
}

interface GitHubUserResponse {
  id: number;
  login: string;
  name?: string | null;
  avatar_url?: string | null;
}

function isUserResponse(value: unknown): value is GitHubUserResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v["id"] === "number" && typeof v["login"] === "string";
}

/**
 * The token is the whole identity check: whoever holds it is whoever GitHub
 * says it belongs to. The client never gets to name itself, so a stolen or
 * forged username in the request body is meaningless.
 */
export async function resolveIdentity(token: string): Promise<IdentityResult> {
  let res: Response;
  try {
    res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "agent-wrapped",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return { ok: false, status: 502, message: "Could not reach GitHub to verify the token." };
  }

  if (res.status === 401 || res.status === 403) {
    return { ok: false, status: 401, message: "GitHub rejected this token." };
  }
  if (!res.ok) {
    return { ok: false, status: 502, message: `GitHub returned ${res.status}.` };
  }

  const body: unknown = await res.json().catch(() => null);
  if (!isUserResponse(body)) {
    return { ok: false, status: 502, message: "GitHub returned an unexpected user payload." };
  }

  return {
    ok: true,
    identity: {
      githubId: String(body.id),
      login: body.login.toLowerCase(),
      name: typeof body.name === "string" && body.name.length > 0 ? body.name : null,
      avatarUrl: typeof body.avatar_url === "string" ? body.avatar_url : null,
    },
  };
}
