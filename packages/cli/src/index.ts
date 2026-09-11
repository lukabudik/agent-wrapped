#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { splitCommand, type Command } from "./args.js";
import { scanCommand } from "./commands/scan.js";
import { renderCommand } from "./commands/render.js";
import { deleteCommand } from "./commands/delete.js";
import { loginCommand } from "./commands/login.js";
import { logoutCommand } from "./commands/logout.js";
import { publishCommand } from "./commands/publish.js";
import { CliError } from "./errors.js";
import { color, err, out } from "./ui.js";

const HELP = `
  ${color.bold("agent-wrapped")} - your Claude Code and Codex work, as a card

  Usage
    agent-wrapped [scan] [options]     Scan local logs, print a summary
    agent-wrapped render [options]     Render an SVG card locally
    agent-wrapped login                Sign in with GitHub (device flow)
    agent-wrapped publish [options]    Upload stats, print a README snippet
    agent-wrapped delete [--yes]       Erase your published data from the service
    agent-wrapped logout               Forget the stored GitHub token

  Scan options
    --since <YYYY-MM-DD>   Ignore activity before this date
    --json                 Machine-readable output, no color
    --include-names        Keep real tool and skill names instead of redacting

  Render options
    --out, -o <file>       Output path (default agent-wrapped.svg)
    --theme <name>         heatmap | wrapped | terminal (default heatmap)
    --mode <name>          dark | light | auto (default auto)
    --username <name>      Name on the card (default: git config user.name)

  Publish options
    --yes, -y              Skip the one-time upload confirmation, for CI
    --theme <name>         Theme used in the printed README snippet

  Global
    -h, --help             Show this help
    -v, --version          Show the version

  Environment
    AGENT_WRAPPED_API         API base URL (default https://agentwrapped.dev)
    AGENT_WRAPPED_CLIENT_ID   GitHub OAuth client id used by login
    NO_COLOR                   Disable color

  Scanning and rendering are entirely local. Only "publish" sends anything,
  and it asks first.
`;

/**
 * Replaced at bundle time by esbuild's --define. The single-file build has no
 * package.json beside it to read, so without this `--version` reports unknown.
 */
declare const __AGENT_WRAPPED_VERSION__: string | undefined;

function version(): string {
  if (typeof __AGENT_WRAPPED_VERSION__ === "string") return __AGENT_WRAPPED_VERSION__;
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const parsed: unknown = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8"));
    if (typeof parsed === "object" && parsed !== null) {
      const value = (parsed as Record<string, unknown>)["version"];
      if (typeof value === "string") return value;
    }
  } catch {
    // A missing package.json only matters to `--version`, not to the commands.
  }
  return "unknown";
}

/** Help and version are checked ahead of parsing so they work on any subcommand. */
function scanForGlobal(argv: readonly string[], names: readonly string[]): boolean {
  for (const token of argv) {
    if (token === "--") return false;
    if (names.includes(token)) return true;
  }
  return false;
}

const RUNNERS: Record<Command, (argv: readonly string[]) => Promise<void>> = {
  scan: scanCommand,
  render: renderCommand,
  delete: deleteCommand,
  login: loginCommand,
  logout: logoutCommand,
  publish: publishCommand,
};

async function main(argv: readonly string[]): Promise<void> {
  if (scanForGlobal(argv, ["-h", "--help", "help"])) {
    out(HELP);
    return;
  }
  if (scanForGlobal(argv, ["-v", "--version"])) {
    out(version());
    return;
  }

  const { command, rest } = splitCommand(argv);
  await RUNNERS[command](rest);
}

try {
  await main(process.argv.slice(2));
} catch (error) {
  // A stack trace is noise for everyone except whoever is debugging the CLI.
  if (process.env["AGENT_WRAPPED_DEBUG"] && error instanceof Error && error.stack) {
    err(error.stack);
  }
  const message = error instanceof Error ? error.message : String(error);
  err(`${color.red("error")} ${message}`);
  process.exitCode = error instanceof CliError ? error.exitCode : 1;
}
