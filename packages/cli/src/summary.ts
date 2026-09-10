import { compact, group, money, prettyModel, type WrappedStats } from "@agent-wrapped/core";
import { bar, color, out, table } from "./ui.js";

function hour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

function range(stats: WrappedStats): string {
  const { from, to } = stats.range;
  if (!from) return "no dated activity";
  return from === to ? from : `${from} to ${to}`;
}

export function printSummary(stats: WrappedStats): void {
  const t = stats.totals;

  out();
  out(`  ${color.bold("agent-wrapped")}  ${color.dim(stats.agents.join(" + "))}`);
  out();
  out(
    `  ${color.accent(color.bold(`${compact(t.tokens.total)} tokens`))}  ` +
      `${color.bold(money(t.apiEquivalentUsd))} ${color.dim("at API list price")}`,
  );
  out(
    `  ${color.dim(
      `${range(stats)} · ${group(t.activeDays)} active days · ` +
        `${group(t.currentStreak)}-day streak (longest ${group(t.longestStreak)})`,
    )}`,
  );

  if (stats.models.length > 0) {
    out();
    const rows = stats.models.map((m) => [
      prettyModel(m.id),
      group(m.messages),
      compact(m.tokens.total),
      money(m.usd),
    ]);
    const lines = table(
      [
        { header: "Model" },
        { header: "Turns", align: "right" },
        { header: "Tokens", align: "right" },
        { header: "Cost", align: "right" },
      ],
      rows,
    );
    for (const line of lines) out(`  ${line}`);
  }

  if (stats.tools.length > 0) {
    const top = stats.tools[0]?.count ?? 1;
    out();
    out(`  ${color.dim("Top tools")}`);
    const width = Math.max(...stats.tools.map((x) => x.name.length));
    for (const tool of stats.tools.slice(0, 8)) {
      const count = group(tool.count).padStart(9);
      out(`  ${tool.name.padEnd(width)} ${count}  ${color.accent(bar(tool.count / top, 24))}`);
    }
  }

  if (stats.skills.length > 0) {
    out();
    out(`  ${color.dim("Top skills")}`);
    const width = Math.max(...stats.skills.map((x) => x.name.length));
    for (const skill of stats.skills.slice(0, 5)) {
      out(`  ${skill.name.padEnd(width)} ${group(skill.count).padStart(9)}`);
    }
  }

  out();
  out(
    `  ${color.dim("Sessions")} ${group(t.sessions)}   ` +
      `${color.dim("Turns")} ${group(t.messages)}   ` +
      `${color.dim("Tool calls")} ${group(t.toolCalls)}   ` +
      `${color.dim("Subagents")} ${group(t.subagentsSpawned)}`,
  );
  out(
    `  ${color.dim("Lines")} ${color.green(`+${group(t.linesAdded)}`)} ` +
      `${color.red(`-${group(t.linesRemoved)}`)}   ` +
      `${color.dim("Cache read")} ${compact(t.tokens.cacheRead)}   ` +
      `${color.dim("Thinking")} ${compact(t.tokens.thinking)}`,
  );

  const peakDay = stats.peakDay
    ? `${stats.peakDay.date} (${group(stats.peakDay.count)} turns)`
    : "n/a";
  out(`  ${color.dim("Peak day")} ${peakDay}   ${color.dim("Peak hour")} ${hour(stats.peakHour)}`);
  out();
}
