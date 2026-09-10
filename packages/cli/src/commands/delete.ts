import { createInterface } from "node:readline/promises";
import { apiBase, deleteAccount } from "../api.js";
import { flagBool, parseArgs, type FlagSpecs } from "../args.js";
import { requireToken } from "../config.js";
import { userError } from "../errors.js";
import { color, out } from "../ui.js";

export const DELETE_FLAGS: FlagSpecs = {
  yes: { type: "boolean", alias: "y" },
};

/**
 * Erases the published snapshot. The local token is deliberately left in place
 * so the user can publish again without a second login -- `logout` is the
 * command that forgets credentials, and conflating the two would make it
 * impossible to delete your data without also signing out.
 */
export async function deleteCommand(argv: readonly string[]): Promise<void> {
  const flags = parseArgs(argv, DELETE_FLAGS);
  const skipConfirm = flagBool(flags, "yes");
  const token = await requireToken();
  const base = apiBase();

  if (!skipConfirm) {
    if (!process.stdin.isTTY) {
      throw userError(
        `Refusing to delete without confirmation. Re-run with --yes to confirm non-interactively.`,
      );
    }

    out(`  ${color.bold(`This deletes everything ${base} holds for your account.`)}`);
    out();
    out("  Removed:");
    out("    - Your published snapshot");
    out("    - Your card, which will start returning the empty-state image");
    out("    - Your leaderboard entry");
    out();
    out("  Kept:");
    out(`    - The GitHub login stored on this machine, so you can publish again`);
    out("    - Every session log on your disk, which was never uploaded anyway");
    out();

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(`  ${color.bold("Delete published data? [y/N] ")}`);
    rl.close();

    if (!/^y(es)?$/i.test(answer.trim())) {
      out("  Cancelled. Nothing was deleted.");
      return;
    }
    out();
  }

  const result = await deleteAccount(token);
  out(
    result.deleted
      ? `  ${color.bold("Deleted.")} ${result.message}`
      : `  ${result.message} Nothing to delete.`,
  );
}
