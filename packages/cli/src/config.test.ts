import assert from "node:assert/strict";
import { mkdtemp, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  configFile,
  deleteConfig,
  defaultConfigDir,
  readConfig,
  requireToken,
  updateConfig,
  writeConfig,
} from "./config.js";
import { CliError } from "./errors.js";

async function scratch(): Promise<string> {
  return join(await mkdtemp(join(tmpdir(), "agent-wrapped-")), "config");
}

test("a missing config reads as empty, not as an error", async () => {
  assert.deepEqual(await readConfig(await scratch()), {});
});

test("round-trips through disk", async () => {
  const dir = await scratch();
  await writeConfig(
    { githubToken: "gho_test", githubLogin: "octocat", hasConfirmedPublish: true },
    dir,
  );
  assert.deepEqual(await readConfig(dir), {
    githubToken: "gho_test",
    githubLogin: "octocat",
    hasConfirmedPublish: true,
  });
});

test("the token file is not readable by anyone else", async () => {
  const dir = await scratch();
  await writeConfig({ githubToken: "gho_test" }, dir);
  assert.equal((await stat(configFile(dir))).mode & 0o777, 0o600);
  assert.equal((await stat(dir)).mode & 0o777, 0o700);
});

test("updateConfig merges rather than replaces", async () => {
  const dir = await scratch();
  await writeConfig({ githubToken: "gho_test", githubLogin: "octocat" }, dir);
  const merged = await updateConfig({ hasConfirmedPublish: true }, dir);
  assert.deepEqual(merged, {
    githubToken: "gho_test",
    githubLogin: "octocat",
    hasConfirmedPublish: true,
  });
  assert.deepEqual(await readConfig(dir), merged);
});

test("unknown and wrongly typed fields are dropped, not trusted", async () => {
  const dir = await scratch();
  await writeConfig({ githubToken: "gho_test" }, dir);
  await writeFile(
    configFile(dir),
    JSON.stringify({ githubToken: 42, hasConfirmedPublish: "yes", surprise: true }),
  );
  assert.deepEqual(await readConfig(dir), {});
});

test("a malformed config produces a usage error, not a crash", async () => {
  const dir = await scratch();
  await writeConfig({}, dir);
  await writeFile(configFile(dir), "{ not json");
  await assert.rejects(() => readConfig(dir), CliError);

  await writeFile(configFile(dir), "[1,2,3]");
  await assert.rejects(() => readConfig(dir), CliError);
});

test("an empty file reads as empty", async () => {
  const dir = await scratch();
  await writeConfig({}, dir);
  await writeFile(configFile(dir), "   \n");
  assert.deepEqual(await readConfig(dir), {});
});

test("deleteConfig reports whether anything was there", async () => {
  const dir = await scratch();
  assert.equal(await deleteConfig(dir), false);
  await writeConfig({ githubToken: "gho_test" }, dir);
  assert.equal(await deleteConfig(dir), true);
  assert.deepEqual(await readConfig(dir), {});
});

test("requireToken explains how to sign in", async () => {
  const dir = await scratch();
  await assert.rejects(() => requireToken(dir), /agent-wrapped login/);
  await writeConfig({ githubToken: "gho_test" }, dir);
  assert.equal(await requireToken(dir), "gho_test");
});

test("the default location honours XDG_CONFIG_HOME", () => {
  const previous = process.env["XDG_CONFIG_HOME"];
  try {
    process.env["XDG_CONFIG_HOME"] = "/tmp/xdg";
    assert.equal(defaultConfigDir(), join("/tmp/xdg", "agent-wrapped"));
    assert.equal(configFile(), join("/tmp/xdg", "agent-wrapped", "config.json"));
  } finally {
    if (previous === undefined) delete process.env["XDG_CONFIG_HOME"];
    else process.env["XDG_CONFIG_HOME"] = previous;
  }
});
