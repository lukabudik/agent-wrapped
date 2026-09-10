import { createInterface } from "node:readline/promises";
import { group, isTheme, THEMES, type Theme, type WrappedStats } from "@agent-wrapped/core";
import { apiBase, publishStats, readmeSnippet } from "../api.js";
import { flagBool, flagString, parseArgs, parseSince, type FlagSpecs } from "../args.js";
import { collect } from "../collect.js";
import { readConfig, requireToken, updateConfig } from "../config.js";
import { userError } from "../errors.js";
import { printSummary } from "../summary.js";
import { color, out } from "../ui.js";

export const PUBLISH_FLAGS: FlagSpecs = {
  since: { type: "string" },
  "include-names": { type: "boolean" },
  theme: { type: "string" },
  yes: { type: "boolean", alias: "y" },
};

function pickTheme(raw: string | undefined): Theme {
  if (raw === undefined) return "heatmap";
  if (!isTheme(raw)) {
    throw userError(`Unknown theme "${raw}". Choose one of: ${THEMES.join(", ")}.`);
  }
  return raw;
}

/**
 * Shown once, in full, before anything is ever uploaded. It lists what the wire
 * format actually contains rather than a summary of it, so the user can check
 * the claim against the `--json` output themselves.
 */
function printNotice(stats: WrappedStats, includeNames: boolean): void {
  out(`  ${color.bold(`This is what would be uploaded to ${apiBase()}`)}`);
  out();
  out("  Aggregate counts only:");
  out(`    - Token totals per model, and their cost at API list prices`);
  out(
    `    - ${group(stats.totals.sessions)} sessions, ` +
      `${group(stats.totals.messages)} assistant turns, ` +
      `${group(stats.totals.toolCalls)} tool calls`,
  );
  out(`    - Lines of code added and removed, as two numbers`);
  out(`    - Turns per calendar day and per hour of the day, for the heatmap`);
  out(
    includeNames
      ? `    - Your real tool and skill names (${stats.tools.length} tools, ${stats.skills.length} skills)`
      : `    - The top ${stats.tools.length} tool names, redacted`,
  );
  out(`    - Your GitHub username, so the card can be served from your profile`);
  out();
  out("  Never uploaded:");
  out("    - Prompts, responses, thinking, or any file content");
  out("    - File paths, directory names, repository names, or branch names");
  out("    - Environment variables, credentials, or MCP server addresses");
  out();
  if (includeNames) {
    out(
      `  ${color.yellow("--include-names is set:")} real tool and skill names will be published,`,
    );
    out(`  including MCP and project-specific ones. Drop the flag to keep them redacted.`);
  } else {
    out(`  ${color.dim("Built-in tool names publish as-is; MCP and custom tools collapse into")}`);
    out(`  ${color.dim(`"MCP tools" and "Other tools", and skill names are dropped entirely.`)}`);
  }
  out();
}

async function confirm(question: string): Promise<boolean> {
  if (process.stdin.isTTY !== true) {
    throw userError(
      "Publishing needs a one-time confirmation, but this is not an interactive terminal. Re-run with --yes.",
    );
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(`  ${question} [y/N] `)).trim().toLowerCase();
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}

export async function publishCommand(argv: readonly string[]): Promise<void> {
  const args = parseArgs(argv, PUBLISH_FLAGS);
  const includeNames = flagBool(args, "include-names");
  const theme = pickTheme(flagString(args, "theme"));

  const token = await requireToken();
  const config = await readConfig();

  const stats = await collect({
    since: parseSince(flagString(args, "since")),
    includeNames,
  });

  printSummary(stats);

  if (config.hasConfirmedPublish !== true) {
    printNotice(stats, includeNames);
    if (!flagBool(args, "yes") && !(await confirm("Publish these stats?"))) {
      out("  Nothing was uploaded.");
      return;
    }
    await updateConfig({ hasConfirmedPublish: true });
  }

  const result = await publishStats(stats, token);

  out(`  Published to ${color.bold(result.profileUrl)}`);
  out();
  out(`  ${color.dim("Paste this into your profile README:")}`);
  out();
  out(readmeSnippet(result.username, theme, result.profileUrl));
  out();
}
