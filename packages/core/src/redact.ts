/**
 * Tool and skill names can leak private context -- an MCP server called
 * `dbqt:acme-production-db` or a skill named after an internal system says more
 * about where you work than any token count does. Only first-party tool names
 * are published by default; everything else is bucketed.
 */
const BUILTIN_TOOLS = new Set([
  // Claude Code
  "Bash",
  "Read",
  "Write",
  "Edit",
  "MultiEdit",
  "NotebookEdit",
  "Glob",
  "Grep",
  "WebSearch",
  "WebFetch",
  "Agent",
  "Task",
  "TodoWrite",
  "ToolSearch",
  "Skill",
  "Artifact",
  "SlashCommand",
  "ExitPlanMode",
  "EnterPlanMode",
  "KillShell",
  "BashOutput",
  "ListMcpResourcesTool",
  "ReadMcpResourceTool",
  "ReadMcpResourceDirTool",
  "Monitor",
  "SendMessage",
  "ListAgents",
  "AskUserQuestion",
  "Workflow",
  "StructuredOutput",
  "TaskCreate",
  "TaskUpdate",
  "TaskStop",
  "TaskOutput",
  "ScheduleWakeup",
  "SendUserFile",
  "SendFeedback",
  "PushNotification",
  "CronCreate",
  "CronDelete",
  "CronList",
  "EnterWorktree",
  "ExitWorktree",
  "RemoteTrigger",
  "ReportFindings",
  "EndConversation",
  "DesignSync",
  // Codex
  "shell",
  "apply_patch",
  "update_plan",
  "web_search",
  "view_image",
  "wait",
]);

export type RedactionMode = "safe" | "full";

/**
 * `safe` (default) publishes built-in tool names verbatim and collapses
 * everything else into coarse buckets. `full` publishes raw names -- opt-in only.
 */
export function redactToolName(raw: string, mode: RedactionMode): string | null {
  if (mode === "full") return raw;
  if (BUILTIN_TOOLS.has(raw)) return raw;
  if (raw.startsWith("mcp__")) return "MCP tools";
  return "Other tools";
}

/**
 * Skill names are almost always project- or employer-specific, so `safe` mode
 * publishes only the count, never the names.
 */
export function redactSkillName(raw: string, mode: RedactionMode): string | null {
  if (mode === "full") return raw;
  return null;
}
