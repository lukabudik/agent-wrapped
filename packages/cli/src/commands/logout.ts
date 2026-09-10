import { parseArgs, type FlagSpecs } from "../args.js";
import { configFile, deleteConfig } from "../config.js";
import { color, out } from "../ui.js";

export const LOGOUT_FLAGS: FlagSpecs = {};

/**
 * Removes the whole config rather than just the token: the only other thing in
 * it is the publish confirmation, and signing out should reset that too.
 */
export async function logoutCommand(argv: readonly string[]): Promise<void> {
  parseArgs(argv, LOGOUT_FLAGS);

  const existed = await deleteConfig();
  out(
    existed
      ? `  Signed out. Removed ${color.dim(configFile())}.`
      : "  Nothing to do -- no stored credentials.",
  );
}
