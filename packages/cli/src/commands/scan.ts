import { flagBool, flagString, parseArgs, parseSince, type FlagSpecs } from "../args.js";
import { collect } from "../collect.js";
import { printSummary } from "../summary.js";
import { out, setColorEnabled } from "../ui.js";

export const SCAN_FLAGS: FlagSpecs = {
  since: { type: "string" },
  json: { type: "boolean" },
  "include-names": { type: "boolean" },
};

export async function scanCommand(argv: readonly string[]): Promise<void> {
  const args = parseArgs(argv, SCAN_FLAGS);
  const json = flagBool(args, "json");
  if (json) setColorEnabled(false);

  const stats = await collect({
    since: parseSince(flagString(args, "since")),
    includeNames: flagBool(args, "include-names"),
  });

  if (json) {
    out(JSON.stringify(stats, null, 2));
    return;
  }
  printSummary(stats);
}
