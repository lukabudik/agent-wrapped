import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { scan, type WrappedStats } from "@agent-wrapped/core";
import { userError } from "./errors.js";
import { progress } from "./ui.js";

export interface CollectOptions {
  since?: string | undefined;
  includeNames: boolean;
}

const CLAUDE_DIR = join(homedir(), ".claude", "projects");
const CODEX_DIR = join(homedir(), ".codex", "sessions");

/**
 * Wraps the core scanner with the two things a CLI owes the user: something
 * moving on screen during a multi-gigabyte read, and a plain explanation when
 * there is simply nothing to scan.
 */
export async function collect(opts: CollectOptions): Promise<WrappedStats> {
  if (!existsSync(CLAUDE_DIR) && !existsSync(CODEX_DIR)) {
    throw userError(`No session logs found. Looked in ${CLAUDE_DIR} and ${CODEX_DIR}.`);
  }

  const spinner = progress("Scanning session logs...");
  let stats: WrappedStats;
  try {
    stats = await scan({
      redaction: opts.includeNames ? "full" : "safe",
      ...(opts.since ? { since: opts.since } : {}),
      onProgress: (done, total) => {
        spinner.update(`Scanning session logs... ${done}/${total} files`);
      },
    });
  } finally {
    spinner.stop();
  }

  if (stats.agents.length === 0) {
    throw userError(
      `No transcripts found in ${CLAUDE_DIR} or ${CODEX_DIR}. Use Claude Code or Codex once, then try again.`,
    );
  }
  if (stats.totals.messages === 0) {
    throw userError(
      opts.since
        ? `No activity on or after ${opts.since}.`
        : "Found transcripts but no assistant turns to count.",
    );
  }

  return stats;
}
