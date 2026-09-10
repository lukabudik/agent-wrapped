/**
 * Terminal presentation. Hand-rolled rather than pulled from a dependency so
 * `npx agent-wrapped` installs a single package with no transitive tree.
 */

function colorSupported(): boolean {
  const env = process.env;
  if (env["NO_COLOR"] !== undefined && env["NO_COLOR"] !== "") return false;
  if (env["FORCE_COLOR"] !== undefined && env["FORCE_COLOR"] !== "0") return true;
  if (env["TERM"] === "dumb") return false;
  return process.stdout.isTTY === true;
}

let enabled = colorSupported();

/** `--json` output must stay byte-for-byte parseable, so color is switched off wholesale. */
export function setColorEnabled(on: boolean): void {
  enabled = on && colorSupported();
}

function wrap(open: number, close: number) {
  return (s: string): string => (enabled ? `\u001b[${open}m${s}\u001b[${close}m` : s);
}

export const color = {
  bold: wrap(1, 22),
  dim: wrap(2, 22),
  red: wrap(31, 39),
  green: wrap(32, 39),
  yellow: wrap(33, 39),
  cyan: wrap(36, 39),
  // 256-color coral, matching the card's accent ramp.
  accent: (s: string): string => (enabled ? `\u001b[38;5;209m${s}\u001b[39m` : s),
};

export function out(line = ""): void {
  process.stdout.write(`${line}\n`);
}

export function err(line: string): void {
  process.stderr.write(`${line}\n`);
}

export interface Progress {
  /** Replaces the label shown on the next frame. Cheap enough to call per file. */
  update(label: string): void;
  stop(): void;
}

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/**
 * Progress goes to stderr so that `agent-wrapped --json > stats.json` still
 * produces a clean file while the user watches the scan run.
 */
export function progress(label: string): Progress {
  if (process.stderr.isTTY !== true) {
    err(label);
    return { update: () => {}, stop: () => {} };
  }

  let current = label;
  let frame = 0;
  const draw = (): void => {
    frame = (frame + 1) % FRAMES.length;
    process.stderr.write(`\r\u001b[2K${color.accent(FRAMES[frame] ?? "-")} ${current}`);
  };
  draw();

  const timer = setInterval(draw, 80);
  // Never let the spinner keep an otherwise finished process alive.
  timer.unref();

  return {
    update(next: string) {
      current = next;
    },
    stop() {
      clearInterval(timer);
      process.stderr.write("\r\u001b[2K");
    },
  };
}

export type Align = "left" | "right";

export interface Column {
  header: string;
  align?: Align;
}

/** Renders an aligned table. Widths come from the content, so nothing truncates. */
export function table(columns: readonly Column[], rows: readonly (readonly string[])[]): string[] {
  const widths = columns.map((c, i) => {
    let w = c.header.length;
    for (const row of rows) w = Math.max(w, (row[i] ?? "").length);
    return w;
  });

  const line = (cells: readonly string[], style: (s: string) => string): string =>
    cells
      .map((cell, i) => {
        const width = widths[i] ?? cell.length;
        const align = columns[i]?.align ?? "left";
        return style(align === "right" ? cell.padStart(width) : cell.padEnd(width));
      })
      .join("  ")
      .trimEnd();

  return [
    line(
      columns.map((c) => c.header),
      color.dim,
    ),
    ...rows.map((r) => line(r, (s) => s)),
  ];
}

const BLOCKS = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉"];

/** A sub-character-resolution bar, so small values still show something. */
export function bar(fraction: number, width: number): string {
  const clamped = Math.max(0, Math.min(1, fraction));
  // Round to whole eighths first, so a remainder never rounds up to a full block.
  const units = Math.round(clamped * width * 8);
  const full = Math.floor(units / 8);
  const rest = units % 8;
  return "█".repeat(full) + (BLOCKS[rest] ?? "");
}
