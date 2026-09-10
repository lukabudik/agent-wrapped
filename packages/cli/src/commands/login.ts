import { parseArgs, type FlagSpecs } from "../args.js";
import { fetchLogin, pollForToken, requestDeviceCode, SCOPE } from "../auth.js";
import { configFile, readConfig, updateConfig } from "../config.js";
import { color, err, out, progress } from "../ui.js";

export const LOGIN_FLAGS: FlagSpecs = {};

export async function loginCommand(argv: readonly string[]): Promise<void> {
  parseArgs(argv, LOGIN_FLAGS);

  const existing = await readConfig();
  if (existing.githubToken && existing.githubLogin) {
    out(`  Already signed in as ${color.bold(existing.githubLogin)}.`);
    out(`  ${color.dim(`Run "agent-wrapped logout" first to switch accounts.`)}`);
    return;
  }

  const device = await requestDeviceCode();

  out();
  out(`  Open ${color.bold(device.verificationUri)} and enter this code:`);
  out();
  out(`      ${color.accent(color.bold(device.userCode))}`);
  out();
  out(`  ${color.dim(`Requesting the "${SCOPE}" scope only -- no repository access.`)}`);
  out();

  const spinner = progress("Waiting for GitHub...");
  let token: string;
  try {
    token = await pollForToken(device);
  } finally {
    spinner.stop();
  }

  const login = await fetchLogin(token);
  await updateConfig({ githubToken: token, githubLogin: login });

  out(`  Signed in as ${color.bold(login)}.`);
  err(color.dim(`  Token stored at ${configFile()} (mode 0600).`));
}
