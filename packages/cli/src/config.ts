import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { userError } from "./errors.js";

export interface CliConfig {
  /** GitHub OAuth token from the device flow. Never leaves this machine except as a bearer header. */
  githubToken?: string;
  githubLogin?: string;
  /** Set once the user has read and accepted the upload notice. */
  hasConfirmedPublish?: boolean;
}

export function defaultConfigDir(): string {
  const xdg = process.env["XDG_CONFIG_HOME"];
  const base = xdg && xdg.trim() !== "" ? xdg : join(homedir(), ".config");
  return join(base, "agent-wrapped");
}

export function configFile(dir: string = defaultConfigDir()): string {
  return join(dir, "config.json");
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function coerce(raw: unknown, path: string): CliConfig {
  if (!isObj(raw)) {
    throw userError(`${path} is not a JSON object. Delete it and run "agent-wrapped login" again.`);
  }
  const config: CliConfig = {};
  if (typeof raw["githubToken"] === "string") config.githubToken = raw["githubToken"];
  if (typeof raw["githubLogin"] === "string") config.githubLogin = raw["githubLogin"];
  if (raw["hasConfirmedPublish"] === true) config.hasConfirmedPublish = true;
  return config;
}

/** A missing config is the normal first-run state, so it reads as an empty config. */
export async function readConfig(dir: string = defaultConfigDir()): Promise<CliConfig> {
  const path = configFile(dir);
  let body: string;
  try {
    body = await readFile(path, "utf8");
  } catch (err) {
    if (isObj(err) && err["code"] === "ENOENT") return {};
    const message = err instanceof Error ? err.message : String(err);
    throw userError(`Could not read ${path}: ${message}`);
  }

  if (body.trim() === "") return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(body) as unknown;
  } catch {
    throw userError(`${path} is not valid JSON. Delete it and run "agent-wrapped login" again.`);
  }
  return coerce(parsed, path);
}

/**
 * Written through a temp file so an interrupted write cannot leave a truncated
 * config behind, and chmod'd explicitly because the mode option only applies
 * when the file is created.
 */
export async function writeConfig(
  config: CliConfig,
  dir: string = defaultConfigDir(),
): Promise<void> {
  const path = configFile(dir);
  const tmp = `${path}.tmp`;
  try {
    await mkdir(dir, { recursive: true, mode: 0o700 });
    await writeFile(tmp, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
    await chmod(tmp, 0o600);
    await rename(tmp, path);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw userError(`Could not write ${path}: ${message}`);
  }
}

export async function updateConfig(
  patch: CliConfig,
  dir: string = defaultConfigDir(),
): Promise<CliConfig> {
  const next = { ...(await readConfig(dir)), ...patch };
  await writeConfig(next, dir);
  return next;
}

/** Returns false when there was nothing stored to begin with. */
export async function deleteConfig(dir: string = defaultConfigDir()): Promise<boolean> {
  const path = configFile(dir);
  try {
    await rm(path);
    return true;
  } catch (err) {
    if (isObj(err) && err["code"] === "ENOENT") return false;
    const message = err instanceof Error ? err.message : String(err);
    throw userError(`Could not delete ${path}: ${message}`);
  }
}

export async function requireToken(dir: string = defaultConfigDir()): Promise<string> {
  const { githubToken } = await readConfig(dir);
  if (!githubToken) {
    throw userError(`Not signed in. Run "agent-wrapped login" first.`);
  }
  return githubToken;
}
