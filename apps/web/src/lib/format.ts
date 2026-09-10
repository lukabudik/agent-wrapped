import { compact, group, money, prettyModel } from "@agent-wrapped/core";

export { compact, group, money, prettyModel };

export function percent(part: number, whole: number, digits = 1): string {
  if (whole <= 0) return "0%";
  return `${((part / whole) * 100).toFixed(digits)}%`;
}

export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

const AGENT_LABELS: Record<string, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
};

export function agentLabel(agent: string): string {
  return AGENT_LABELS[agent] ?? agent;
}

/** "2026-09-10" -> "10 Sep 2026". Fixed locale so server and client agree. */
export function prettyDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "unknown";
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
