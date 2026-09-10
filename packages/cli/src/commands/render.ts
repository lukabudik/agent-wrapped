import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { isMode, isTheme, renderCard, THEMES, type Mode, type Theme } from "@agent-wrapped/core";
import { flagBool, flagString, parseArgs, parseSince, type FlagSpecs } from "../args.js";
import { collect } from "../collect.js";
import { readConfig } from "../config.js";
import { userError } from "../errors.js";
import { color, out } from "../ui.js";
import { resolveUsername } from "../user.js";

export const RENDER_FLAGS: FlagSpecs = {
  out: { type: "string", alias: "o" },
  theme: { type: "string" },
  mode: { type: "string" },
  username: { type: "string" },
  since: { type: "string" },
  "include-names": { type: "boolean" },
};

const DEFAULT_OUT = "agent-wrapped.svg";

function pickTheme(raw: string | undefined): Theme {
  if (raw === undefined) return "heatmap";
  if (!isTheme(raw)) {
    throw userError(`Unknown theme "${raw}". Choose one of: ${THEMES.join(", ")}.`);
  }
  return raw;
}

function pickMode(raw: string | undefined): Mode {
  if (raw === undefined) return "auto";
  if (!isMode(raw)) {
    throw userError(`Unknown mode "${raw}". Choose one of: dark, light, auto.`);
  }
  return raw;
}

/** Renders entirely from local logs -- nothing here touches the network. */
export async function renderCommand(argv: readonly string[]): Promise<void> {
  const args = parseArgs(argv, RENDER_FLAGS);
  const theme = pickTheme(flagString(args, "theme"));
  const mode = pickMode(flagString(args, "mode"));
  const target = resolve(flagString(args, "out") ?? DEFAULT_OUT);

  const config = await readConfig();
  const username = await resolveUsername(flagString(args, "username"), config.githubLogin);

  const stats = await collect({
    since: parseSince(flagString(args, "since")),
    includeNames: flagBool(args, "include-names"),
  });

  const svg = renderCard(stats, { theme, mode, username });

  try {
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, svg, "utf8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw userError(`Could not write ${target}: ${message}`);
  }

  out(`  Wrote ${color.bold(target)} ${color.dim(`(${theme}, ${mode})`)}`);
}
