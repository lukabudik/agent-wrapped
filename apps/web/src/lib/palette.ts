import { DARK, LIGHT, type Palette } from "@agent-wrapped/core";

/**
 * The site reuses the card palette verbatim so an embedded SVG sits flush
 * against the page around it. These same values are mirrored as Tailwind theme
 * tokens in app/globals.css — Tailwind needs them at build time, where a
 * runtime import cannot reach.
 */
export { DARK, LIGHT };
export type { Palette };

export const FONT_SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
export const FONT_MONO =
  "ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace";

/** Bucket a value into the 5-step contribution ramp. A `max` of 0 yields step 0. */
export function rampStep(value: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0 || max <= 0) return 0;
  const q = value / max;
  if (q > 0.75) return 4;
  if (q > 0.5) return 3;
  if (q > 0.25) return 2;
  return 1;
}
