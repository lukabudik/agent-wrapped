import { fetchWithTimeout, networkError, readJson, userError } from "./errors.js";

/** Filled in at release with the real OAuth app id; overridable for self-hosters. */
const GITHUB_CLIENT_ID = "Iv1.PLACEHOLDER";

const DEVICE_CODE_URL = "https://github.com/login/device/code";
const ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const USER_URL = "https://api.github.com/user";

/**
 * Only `read:user`. The card needs a verified GitHub login and nothing else --
 * no repo access, no email, no write scope of any kind.
 */
export const SCOPE = "read:user";

export function clientId(): string {
  const fromEnv = process.env["AGENT_WRAPPED_CLIENT_ID"];
  const id = fromEnv && fromEnv.trim() !== "" ? fromEnv.trim() : GITHUB_CLIENT_ID;
  if (id === GITHUB_CLIENT_ID) {
    throw userError(
      "This build has no GitHub OAuth client id. Set AGENT_WRAPPED_CLIENT_ID and try again.",
    );
  }
  return id;
}

export interface DeviceCode {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresAt: number;
  intervalMs: number;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

const form = (fields: Record<string, string>): RequestInit => ({
  method: "POST",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "agent-wrapped",
  },
  body: new URLSearchParams(fields).toString(),
});

/** Maps GitHub's OAuth error codes onto one actionable line each. */
function oauthError(code: string, description: string | undefined): Error {
  switch (code) {
    case "access_denied":
      return userError("Authorization was denied in the browser.");
    case "expired_token":
      return userError('The device code expired. Run "agent-wrapped login" again.');
    case "device_flow_disabled":
      return userError("This GitHub OAuth app does not have device flow enabled.");
    case "incorrect_client_credentials":
      return userError("GitHub rejected the OAuth client id. Check AGENT_WRAPPED_CLIENT_ID.");
    case "unsupported_grant_type":
    case "incorrect_device_code":
      return userError('GitHub rejected the device code. Run "agent-wrapped login" again.');
    default:
      return networkError(`GitHub returned "${code}"${description ? `: ${description}` : ""}.`);
  }
}

export async function requestDeviceCode(): Promise<DeviceCode> {
  const res = await fetchWithTimeout(
    DEVICE_CODE_URL,
    form({ client_id: clientId(), scope: SCOPE }),
    "github.com",
  );
  const body = await readJson(res);

  if (!res.ok || !isObj(body)) {
    throw networkError(`GitHub refused to start the login (HTTP ${res.status}).`);
  }
  const error = str(body["error"]);
  if (error) throw oauthError(error, str(body["error_description"]));

  const deviceCode = str(body["device_code"]);
  const userCode = str(body["user_code"]);
  const verificationUri = str(body["verification_uri"]);
  if (!deviceCode || !userCode || !verificationUri) {
    throw networkError("GitHub returned an unexpected device-code response.");
  }

  return {
    deviceCode,
    userCode,
    verificationUri,
    expiresAt: Date.now() + (num(body["expires_in"]) ?? 900) * 1000,
    intervalMs: (num(body["interval"]) ?? 5) * 1000,
  };
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Polls until the user finishes in the browser. GitHub answers `slow_down` when
 * we poll too eagerly and expects the interval to grow, so honour it.
 */
export async function pollForToken(device: DeviceCode): Promise<string> {
  let intervalMs = device.intervalMs;

  while (Date.now() < device.expiresAt) {
    await sleep(intervalMs);

    const res = await fetchWithTimeout(
      ACCESS_TOKEN_URL,
      form({
        client_id: clientId(),
        device_code: device.deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
      "github.com",
    );
    const body = await readJson(res);
    if (!isObj(body)) {
      throw networkError(`GitHub returned an unreadable token response (HTTP ${res.status}).`);
    }

    const token = str(body["access_token"]);
    if (token) return token;

    const error = str(body["error"]) ?? "unknown_error";
    if (error === "authorization_pending") continue;
    if (error === "slow_down") {
      intervalMs = (num(body["interval"]) ?? intervalMs / 1000 + 5) * 1000;
      continue;
    }
    throw oauthError(error, str(body["error_description"]));
  }

  throw userError("The device code expired before login finished. Try again.");
}

export async function fetchLogin(token: string): Promise<string> {
  const res = await fetchWithTimeout(
    USER_URL,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "agent-wrapped",
      },
    },
    "api.github.com",
  );

  if (res.status === 401)
    throw userError('GitHub rejected the token. Run "agent-wrapped login" again.');
  if (!res.ok) throw networkError(`GitHub user lookup failed (HTTP ${res.status}).`);

  const body = await readJson(res);
  const login = isObj(body) ? str(body["login"]) : undefined;
  if (!login) throw networkError("GitHub did not return a username.");
  return login;
}
