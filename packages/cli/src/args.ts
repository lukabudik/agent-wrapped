import { userError } from "./errors.js";

/**
 * A deliberately small parser. It covers exactly the shapes this CLI documents
 * (`--flag`, `--flag value`, `--flag=value`, `--no-flag`, `-a`, `--`) and
 * rejects anything else loudly, which beats silently ignoring a typo'd flag.
 */
export type FlagType = "boolean" | "string";

export interface FlagSpec {
  readonly type: FlagType;
  readonly alias?: string;
}

export type FlagSpecs = Readonly<Record<string, FlagSpec>>;

export interface ParsedArgs {
  readonly positionals: readonly string[];
  readonly flags: ReadonlyMap<string, string | boolean>;
}

function resolve(specs: FlagSpecs, token: string): string {
  if (specs[token]) return token;
  for (const [name, spec] of Object.entries(specs)) {
    if (spec.alias === token) return name;
  }
  throw userError(`Unknown option "${token.length === 1 ? "-" : "--"}${token}".`);
}

export function parseArgs(argv: readonly string[], specs: FlagSpecs): ParsedArgs {
  const positionals: string[] = [];
  const flags = new Map<string, string | boolean>();

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;

    if (token === "--") {
      positionals.push(...argv.slice(i + 1));
      break;
    }

    if (token.length < 2 || token[0] !== "-") {
      positionals.push(token);
      continue;
    }

    const isLong = token.startsWith("--");
    const body = isLong ? token.slice(2) : token.slice(1);
    const eq = body.indexOf("=");
    const rawName = eq === -1 ? body : body.slice(0, eq);
    const inlineValue = eq === -1 ? undefined : body.slice(eq + 1);

    if (isLong && rawName.startsWith("no-") && inlineValue === undefined) {
      const name = resolve(specs, rawName.slice(3));
      if (specs[name]?.type !== "boolean") {
        throw userError(`Option "--${name}" takes a value, so "--${rawName}" is not valid.`);
      }
      flags.set(name, false);
      continue;
    }

    const name = resolve(specs, rawName);
    const spec = specs[name]!;

    if (spec.type === "boolean") {
      if (inlineValue !== undefined) {
        throw userError(`Option "--${name}" is a switch and does not take a value.`);
      }
      flags.set(name, true);
      continue;
    }

    if (inlineValue !== undefined) {
      flags.set(name, inlineValue);
      continue;
    }

    const next = argv[i + 1];
    // A value that itself looks like a flag is almost always a forgotten argument.
    if (next === undefined || (next.length > 1 && next.startsWith("-"))) {
      throw userError(`Option "--${name}" expects a value.`);
    }
    flags.set(name, next);
    i++;
  }

  return { positionals, flags };
}

export function flagBool(args: ParsedArgs, name: string): boolean {
  return args.flags.get(name) === true;
}

export function flagString(args: ParsedArgs, name: string): string | undefined {
  const value = args.flags.get(name);
  return typeof value === "string" ? value : undefined;
}

export const COMMANDS = ["scan", "render", "login", "publish", "logout"] as const;
export type Command = (typeof COMMANDS)[number];

export function isCommand(value: string): value is Command {
  return (COMMANDS as readonly string[]).includes(value);
}

export interface CommandLine {
  readonly command: Command;
  readonly rest: readonly string[];
}

/**
 * Only argv[0] can name a command, git-style. Looking any further would let a
 * flag value (`--since 2026-01-01`) be mistaken for one.
 */
export function splitCommand(argv: readonly string[]): CommandLine {
  const first = argv[0];
  if (first === undefined || first.startsWith("-")) {
    return { command: "scan", rest: argv };
  }
  if (!isCommand(first)) {
    throw userError(`Unknown command "${first}". Run "agent-wrapped --help" for usage.`);
  }
  return { command: first, rest: argv.slice(1) };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** `--since` feeds a string comparison in the scanner, so the shape has to be exact. */
export function parseSince(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (!ISO_DATE.test(value) || Number.isNaN(Date.parse(value))) {
    throw userError(`--since expects a date like 2026-01-01, got "${value}".`);
  }
  return value;
}
