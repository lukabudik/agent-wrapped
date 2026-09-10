import { createReadStream, existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { createInterface } from "node:readline";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentKind, NamedCount, TokenTotals, WrappedStats } from "./types.js";
import { STATS_VERSION } from "./types.js";
import { canonicalModelId, costOf } from "./pricing.js";
import { redactSkillName, redactToolName, type RedactionMode } from "./redact.js";

export interface ScanOptions {
  claudeDir?: string;
  codexDir?: string;
  redaction?: RedactionMode;
  /** Only count activity on or after this ISO date. */
  since?: string;
  onProgress?: (filesDone: number, filesTotal: number) => void;
}

interface ModelAcc {
  messages: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite5m: number;
  cacheWrite1h: number;
  thinking: number;
}

function emptyModel(): ModelAcc {
  return {
    messages: 0,
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite5m: 0,
    cacheWrite1h: 0,
    thinking: 0,
  };
}

function toLocalISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

class Accumulator {
  models = new Map<string, ModelAcc>();
  tools = new Map<string, number>();
  skills = new Map<string, number>();
  byDay = new Map<string, number>();
  byHour = new Array<number>(24).fill(0);
  sessions = new Set<string>();
  subagents = 0;
  linesAdded = 0;
  linesRemoved = 0;
  toolCalls = 0;

  model(id: string): ModelAcc {
    let m = this.models.get(id);
    if (!m) {
      m = emptyModel();
      this.models.set(id, m);
    }
    return m;
  }

  bump(map: Map<string, number>, key: string, by = 1) {
    map.set(key, (map.get(key) ?? 0) + by);
  }

  stamp(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return;
    this.bump(this.byDay, toLocalISODate(d));
    const h = d.getHours();
    this.byHour[h] = (this.byHour[h] ?? 0) + 1;
  }
}

async function walk(dir: string, match: (name: string) => boolean): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full, match)));
    else if (e.isFile() && match(e.name)) out.push(full);
  }
  return out;
}

/** Streams a JSONL file line by line so an 80MB transcript never lands in memory. */
async function eachLine(file: string, fn: (obj: unknown) => void): Promise<void> {
  const rl = createInterface({
    input: createReadStream(file, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line || line[0] !== "{") continue;
    try {
      fn(JSON.parse(line));
    } catch {
      // A truncated final line is normal while a session is still being written.
    }
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

function scanClaudeLine(
  rec: unknown,
  acc: Accumulator,
  isSubagentFile: boolean,
  redaction: RedactionMode,
  since?: string,
) {
  if (!isObj(rec)) return;

  const sid = str(rec["sessionId"]);
  if (sid && !isSubagentFile) acc.sessions.add(sid);

  const ts = str(rec["timestamp"]);
  if (since && ts && ts.slice(0, 10) < since) return;

  const skill = str(rec["attributionSkill"]);
  if (skill) {
    const safe = redactSkillName(skill, redaction);
    // A leading space marks a bucket that topN() drops but that still counts.
    acc.bump(acc.skills, safe ?? " hidden");
  }

  if (rec["type"] === "cost-state") {
    acc.linesAdded += num(rec["totalLinesAdded"]);
    acc.linesRemoved += num(rec["totalLinesRemoved"]);
    return;
  }
  if (rec["type"] !== "assistant") return;

  const msg = rec["message"];
  if (!isObj(msg)) return;

  const modelId = canonicalModelId(str(msg["model"]) ?? "");
  if (!modelId) return;

  const m = acc.model(modelId);
  m.messages += 1;
  if (ts) acc.stamp(ts);

  const u = msg["usage"];
  if (isObj(u)) {
    m.input += num(u["input_tokens"]);
    m.output += num(u["output_tokens"]);
    m.cacheRead += num(u["cache_read_input_tokens"]);

    const cc = u["cache_creation"];
    if (isObj(cc)) {
      m.cacheWrite5m += num(cc["ephemeral_5m_input_tokens"]);
      m.cacheWrite1h += num(cc["ephemeral_1h_input_tokens"]);
    } else {
      // Older transcripts only carry the undifferentiated total; bill it at the 5m rate.
      m.cacheWrite5m += num(u["cache_creation_input_tokens"]);
    }

    const det = u["output_tokens_details"];
    if (isObj(det)) m.thinking += num(det["thinking_tokens"]);
  }

  const content = msg["content"];
  if (!Array.isArray(content)) return;
  for (const block of content) {
    if (!isObj(block) || block["type"] !== "tool_use") continue;
    const name = str(block["name"]);
    if (!name) continue;
    acc.toolCalls += 1;
    if (name === "Agent" || name === "Task") acc.subagents += 1;
    const safe = redactToolName(name, redaction);
    if (safe) acc.bump(acc.tools, safe);
  }
}

interface CodexSessionState {
  model: string;
  best: number;
  /** Agent replies in this session, the analogue of a Claude assistant turn. */
  turns: number;
  usage: ModelAcc;
}

function scanCodexLine(
  rec: unknown,
  acc: Accumulator,
  state: CodexSessionState,
  redaction: RedactionMode,
  since?: string,
) {
  if (!isObj(rec)) return;

  const ts = str(rec["timestamp"]);
  if (since && ts && ts.slice(0, 10) < since) return;

  const payload = rec["payload"];
  if (!isObj(payload)) return;

  if (rec["type"] === "session_meta" || rec["type"] === "turn_context") {
    const model = str(payload["model"]);
    if (model) state.model = model;
    const sid = str(payload["session_id"]);
    if (sid) acc.sessions.add(sid);
    return;
  }

  if (rec["type"] === "event_msg" && payload["type"] === "agent_message") {
    state.turns += 1;
    return;
  }

  if (rec["type"] === "event_msg" && payload["type"] === "token_count") {
    const info = payload["info"];
    if (!isObj(info)) return;
    const total = info["total_token_usage"];
    if (!isObj(total)) return;

    // token_count records are cumulative, so keep the session's high-water mark
    // rather than summing (compaction and rollbacks rewind the counter).
    const t = num(total["total_tokens"]);
    if (t <= state.best) return;
    state.best = t;

    const cached = num(total["cached_input_tokens"]);
    state.usage.input = Math.max(0, num(total["input_tokens"]) - cached);
    state.usage.cacheRead = cached;
    state.usage.output = num(total["output_tokens"]);
    state.usage.thinking = num(total["reasoning_output_tokens"]);
    if (ts) acc.stamp(ts);
    return;
  }

  if (rec["type"] === "response_item") {
    const t = payload["type"];
    if (t !== "function_call" && t !== "custom_tool_call") return;
    const name = str(payload["name"]);
    if (!name) return;
    acc.toolCalls += 1;
    const safe = redactToolName(name, redaction);
    if (safe) acc.bump(acc.tools, safe);
  }
}

function toTotals(m: ModelAcc): TokenTotals {
  const cacheWrite = m.cacheWrite5m + m.cacheWrite1h;
  return {
    input: m.input,
    output: m.output,
    cacheRead: m.cacheRead,
    cacheWrite,
    thinking: m.thinking,
    total: m.input + m.output + m.cacheRead + cacheWrite,
  };
}

const DAY_MS = 86_400_000;

function streaks(days: string[]): { current: number; longest: number } {
  if (days.length === 0) return { current: 0, longest: 0 };
  const sorted = [...days].sort();

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const gap = (Date.parse(sorted[i]!) - Date.parse(sorted[i - 1]!)) / DAY_MS;
    run = gap === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  // A current streak only counts if it reaches today or yesterday.
  const today = toLocalISODate(new Date());
  const last = sorted[sorted.length - 1]!;
  const lag = Math.round((Date.parse(today) - Date.parse(last)) / DAY_MS);
  let current = 0;
  if (lag <= 1) {
    current = 1;
    for (let i = sorted.length - 1; i > 0; i--) {
      if ((Date.parse(sorted[i]!) - Date.parse(sorted[i - 1]!)) / DAY_MS === 1) current++;
      else break;
    }
  }

  return { current, longest };
}

function topN(map: Map<string, number>, n: number): NamedCount[] {
  return [...map.entries()]
    .filter(([name]) => !name.startsWith(" "))
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => ({ name, count }));
}

export async function scan(opts: ScanOptions = {}): Promise<WrappedStats> {
  const redaction = opts.redaction ?? "safe";
  const claudeDir = opts.claudeDir ?? join(homedir(), ".claude", "projects");
  const codexDir = opts.codexDir ?? join(homedir(), ".codex", "sessions");

  const acc = new Accumulator();
  const agents: AgentKind[] = [];

  const claudeFiles = existsSync(claudeDir)
    ? await walk(claudeDir, (n) => n.endsWith(".jsonl"))
    : [];
  const codexFiles = existsSync(codexDir) ? await walk(codexDir, (n) => n.endsWith(".jsonl")) : [];

  if (claudeFiles.length) agents.push("claude-code");
  if (codexFiles.length) agents.push("codex");

  const fileCount = claudeFiles.length + codexFiles.length;
  let done = 0;

  for (const file of claudeFiles) {
    // Subagent transcripts repeat their parent's sessionId, so they must not
    // inflate the session count -- but their tokens and tool calls are real.
    const isSub = file.includes("/subagents/");
    await eachLine(file, (rec) => scanClaudeLine(rec, acc, isSub, redaction, opts.since));
    opts.onProgress?.(++done, fileCount);
  }

  for (const file of codexFiles) {
    const state: CodexSessionState = {
      model: "gpt-5-codex",
      best: 0,
      turns: 0,
      usage: emptyModel(),
    };
    await eachLine(file, (rec) => scanCodexLine(rec, acc, state, redaction, opts.since));
    if (state.best > 0) {
      const id = canonicalModelId(state.model) ?? "gpt-5-codex";
      const m = acc.model(id);
      m.messages += Math.max(1, state.turns);
      m.input += state.usage.input;
      m.output += state.usage.output;
      m.cacheRead += state.usage.cacheRead;
      m.thinking += state.usage.thinking;
    }
    opts.onProgress?.(++done, fileCount);
  }

  const models = [...acc.models.entries()]
    .map(([id, m]) => ({
      id,
      messages: m.messages,
      tokens: toTotals(m),
      usd: costOf(id, {
        input: m.input,
        output: m.output,
        cacheRead: m.cacheRead,
        cacheWrite5m: m.cacheWrite5m,
        cacheWrite1h: m.cacheWrite1h,
      }),
    }))
    // A model can appear in a transcript without ever billing tokens (aborted
    // turns, synthetic entries). Those are noise in the breakdown.
    .filter((m) => m.tokens.total > 0)
    .sort((a, b) => b.usd - a.usd);

  const grand: TokenTotals = {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    thinking: 0,
    total: 0,
  };
  let usd = 0;
  let messages = 0;
  for (const m of models) {
    grand.input += m.tokens.input;
    grand.output += m.tokens.output;
    grand.cacheRead += m.tokens.cacheRead;
    grand.cacheWrite += m.tokens.cacheWrite;
    grand.thinking += m.tokens.thinking;
    grand.total += m.tokens.total;
    usd += m.usd;
    messages += m.messages;
  }

  const days = [...acc.byDay.keys()];
  const sortedDays = [...days].sort();
  const { current, longest } = streaks(days);
  const peak = [...acc.byDay.entries()].sort((a, b) => b[1] - a[1])[0];
  const peakHour = acc.byHour.reduce((best, v, i, arr) => (v > (arr[best] ?? 0) ? i : best), 0);

  return {
    version: STATS_VERSION,
    generatedAt: new Date().toISOString(),
    agents,
    range: {
      from: sortedDays[0] ?? "",
      to: sortedDays[sortedDays.length - 1] ?? "",
    },
    totals: {
      tokens: grand,
      apiEquivalentUsd: usd,
      sessions: acc.sessions.size,
      messages,
      toolCalls: acc.toolCalls,
      subagentsSpawned: acc.subagents,
      linesAdded: acc.linesAdded,
      linesRemoved: acc.linesRemoved,
      activeDays: days.length,
      currentStreak: current,
      longestStreak: longest,
    },
    models,
    tools: topN(acc.tools, 10),
    skills: topN(acc.skills, 8),
    byDay: Object.fromEntries(acc.byDay),
    byHour: acc.byHour,
    peakDay: peak ? { date: peak[0], count: peak[1] } : null,
    peakHour,
  };
}
