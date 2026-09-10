import assert from "node:assert/strict";
import { test } from "node:test";
import {
  flagBool,
  flagString,
  parseArgs,
  parseSince,
  splitCommand,
  type FlagSpecs,
} from "./args.js";
import { CliError } from "./errors.js";
import { DELETE_FLAGS } from "./commands/delete.js";

const SPECS: FlagSpecs = {
  json: { type: "boolean" },
  yes: { type: "boolean", alias: "y" },
  out: { type: "string", alias: "o" },
  since: { type: "string" },
};

test("parses boolean and string flags in both forms", () => {
  const args = parseArgs(["--json", "--since", "2026-01-01", "--out=card.svg"], SPECS);
  assert.equal(flagBool(args, "json"), true);
  assert.equal(flagString(args, "since"), "2026-01-01");
  assert.equal(flagString(args, "out"), "card.svg");
  assert.deepEqual(args.positionals, []);
});

test("resolves short aliases", () => {
  const args = parseArgs(["-y", "-o", "card.svg"], SPECS);
  assert.equal(flagBool(args, "yes"), true);
  assert.equal(flagString(args, "out"), "card.svg");
});

test("--no-<flag> turns a switch off", () => {
  const args = parseArgs(["--json", "--no-json"], SPECS);
  assert.equal(flagBool(args, "json"), false);
});

test("collects positionals and stops parsing at --", () => {
  const args = parseArgs(["one", "--json", "--", "--not-a-flag"], SPECS);
  assert.deepEqual(args.positionals, ["one", "--not-a-flag"]);
  assert.equal(flagBool(args, "json"), true);
});

test("a lone dash is a positional, not a flag", () => {
  const args = parseArgs(["-"], SPECS);
  assert.deepEqual(args.positionals, ["-"]);
});

test("rejects unknown flags", () => {
  assert.throws(() => parseArgs(["--nope"], SPECS), CliError);
  assert.throws(() => parseArgs(["-z"], SPECS), CliError);
});

test("rejects a string flag with no value", () => {
  assert.throws(() => parseArgs(["--since"], SPECS), CliError);
  assert.throws(() => parseArgs(["--since", "--json"], SPECS), CliError);
});

test("rejects a value handed to a switch", () => {
  assert.throws(() => parseArgs(["--json=true"], SPECS), CliError);
  assert.throws(() => parseArgs(["--no-since"], SPECS), CliError);
});

test("missing flags read as absent, not as defaults", () => {
  const args = parseArgs([], SPECS);
  assert.equal(flagBool(args, "json"), false);
  assert.equal(flagString(args, "out"), undefined);
});

test("splitCommand defaults to scan", () => {
  assert.deepEqual(splitCommand([]), { command: "scan", rest: [] });
  assert.deepEqual(splitCommand(["--json"]), { command: "scan", rest: ["--json"] });
});

test("splitCommand takes a command only from the first token", () => {
  assert.deepEqual(splitCommand(["render", "--theme", "wrapped"]), {
    command: "render",
    rest: ["--theme", "wrapped"],
  });
  // "login" here is a flag value, not a command.
  assert.deepEqual(splitCommand(["--username", "login"]), {
    command: "scan",
    rest: ["--username", "login"],
  });
});

test("splitCommand recognises delete and keeps its flags", () => {
  assert.deepEqual(splitCommand(["delete"]), { command: "delete", rest: [] });
  assert.deepEqual(splitCommand(["delete", "--yes"]), { command: "delete", rest: ["--yes"] });
});

test("delete accepts only --yes", () => {
  assert.equal(flagBool(parseArgs(["--yes"], DELETE_FLAGS), "yes"), true);
  assert.equal(flagBool(parseArgs(["-y"], DELETE_FLAGS), "yes"), true);
  assert.equal(flagBool(parseArgs([], DELETE_FLAGS), "yes"), false);
  // Deleting is destructive, so an unrecognised flag must fail loudly rather
  // than being ignored on the way to a delete.
  assert.throws(() => parseArgs(["--force"], DELETE_FLAGS));
});

test("splitCommand rejects an unknown command", () => {
  assert.throws(() => splitCommand(["frobnicate"]), CliError);
});

test("parseSince accepts ISO dates and rejects everything else", () => {
  assert.equal(parseSince(undefined), undefined);
  assert.equal(parseSince("2026-01-01"), "2026-01-01");
  assert.throws(() => parseSince("2026-1-1"), CliError);
  assert.throws(() => parseSince("last tuesday"), CliError);
  assert.throws(() => parseSince("2026-13-45"), CliError);
});

test("CliError carries the exit code the shell will see", () => {
  try {
    parseArgs(["--nope"], SPECS);
    assert.fail("expected a throw");
  } catch (err) {
    assert.ok(err instanceof CliError);
    assert.equal(err.exitCode, 1);
  }
});
