import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

async function gitUserName(): Promise<string | undefined> {
  try {
    const { stdout } = await run("git", ["config", "--get", "user.name"], { timeout: 2000 });
    const name = stdout.trim();
    return name === "" ? undefined : name;
  } catch {
    // No git, no repo, or no configured name -- all equally uninteresting here.
    return undefined;
  }
}

/**
 * Best-effort display name for a locally rendered card. Explicit flag wins,
 * then whatever the user already signed in as, then their git identity.
 */
export async function resolveUsername(
  explicit: string | undefined,
  stored: string | undefined,
): Promise<string> {
  const candidates = [
    explicit,
    stored,
    await gitUserName(),
    process.env["USER"],
    process.env["USERNAME"],
  ];
  for (const candidate of candidates) {
    if (candidate && candidate.trim() !== "") return candidate.trim();
  }
  return "you";
}
