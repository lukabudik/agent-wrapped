import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { scan } from "./scan.js";

const roots: string[] = [];

after(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "agent-wrapped-test-"));
  roots.push(root);
  return root;
}

function jsonl(path: string, records: unknown[]): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, records.map((r) => JSON.stringify(r)).join("\n") + "\n");
}

/** Minimal shape of a Claude Code assistant turn. */
function turn(opts: {
  session: string;
  ts: string;
  model?: string;
  output?: number;
  cacheRead?: number;
  cw5m?: number;
  cw1h?: number;
  tools?: string[];
}) {
  return {
    type: "assistant",
    sessionId: opts.session,
    timestamp: opts.ts,
    message: {
      model: opts.model ?? "claude-opus-5",
      usage: {
        input_tokens: 10,
        output_tokens: opts.output ?? 100,
        cache_read_input_tokens: opts.cacheRead ?? 0,
        cache_creation: {
          ephemeral_5m_input_tokens: opts.cw5m ?? 0,
          ephemeral_1h_input_tokens: opts.cw1h ?? 0,
        },
        output_tokens_details: { thinking_tokens: 7 },
      },
      content: (opts.tools ?? []).map((name) => ({ type: "tool_use", name, input: {} })),
    },
  };
}

describe("scan: Claude Code transcripts", () => {
  it("aggregates tokens, tools and cost across a session", async () => {
    const root = fixture();
    jsonl(join(root, "projects", "proj-a", "s1.jsonl"), [
      turn({
        session: "s1",
        ts: "2026-03-02T09:00:00Z",
        output: 100,
        cacheRead: 1_000_000,
        tools: ["Bash", "Read"],
      }),
      turn({
        session: "s1",
        ts: "2026-03-02T10:00:00Z",
        output: 200,
        cw5m: 1_000_000,
        tools: ["Bash"],
      }),
      { type: "cost-state", sessionId: "s1", totalLinesAdded: 40, totalLinesRemoved: 5 },
    ]);

    const stats = await scan({
      claudeDir: join(root, "projects"),
      codexDir: join(root, "nope"),
    });

    assert.equal(stats.totals.sessions, 1);
    assert.equal(stats.totals.messages, 2);
    assert.equal(stats.totals.toolCalls, 3);
    assert.equal(stats.totals.tokens.output, 300);
    assert.equal(stats.totals.tokens.cacheRead, 1_000_000);
    assert.equal(stats.totals.tokens.cacheWrite, 1_000_000);
    assert.equal(stats.totals.tokens.thinking, 14);
    assert.equal(stats.totals.linesAdded, 40);
    assert.equal(stats.totals.linesRemoved, 5);
    assert.deepEqual(stats.agents, ["claude-code"]);

    // 20 input + 300 output + 1M read + 1M 5m-write, at Opus 5 rates.
    const expected = (20 * 5 + 300 * 25) / 1_000_000 + 0.5 + 6.25;
    assert.ok(Math.abs(stats.totals.apiEquivalentUsd - expected) < 1e-9);

    const bash = stats.tools.find((t) => t.name === "Bash");
    assert.equal(bash?.count, 2);
  });

  it("counts subagent transcripts without inflating the session count", async () => {
    const root = fixture();
    jsonl(join(root, "projects", "proj-a", "s1.jsonl"), [
      turn({ session: "s1", ts: "2026-03-02T09:00:00Z", tools: ["Agent"] }),
    ]);
    // Subagent files repeat their parent's sessionId.
    jsonl(join(root, "projects", "proj-a", "s1", "subagents", "agent-x.jsonl"), [
      turn({ session: "s1", ts: "2026-03-02T09:05:00Z", output: 50 }),
    ]);

    const stats = await scan({ claudeDir: join(root, "projects"), codexDir: join(root, "nope") });

    assert.equal(stats.totals.sessions, 1, "subagent file must not add a session");
    assert.equal(stats.totals.messages, 2, "subagent tokens still count");
    assert.equal(stats.totals.subagentsSpawned, 1, "counted from Agent tool calls");
  });

  it("drops models that never billed a token", async () => {
    const root = fixture();
    jsonl(join(root, "projects", "p", "s.jsonl"), [
      turn({ session: "s", ts: "2026-03-02T09:00:00Z" }),
      {
        type: "assistant",
        sessionId: "s",
        timestamp: "2026-03-02T09:01:00Z",
        message: { model: "claude-sonnet-5", usage: {}, content: [] },
      },
    ]);

    const stats = await scan({ claudeDir: join(root, "projects"), codexDir: join(root, "nope") });
    assert.deepEqual(
      stats.models.map((m) => m.id),
      ["claude-opus-5"],
    );
  });

  it("honours the since filter", async () => {
    const root = fixture();
    jsonl(join(root, "projects", "p", "s.jsonl"), [
      turn({ session: "s", ts: "2026-01-01T09:00:00Z", output: 1000 }),
      turn({ session: "s", ts: "2026-06-01T09:00:00Z", output: 7 }),
    ]);

    const stats = await scan({
      claudeDir: join(root, "projects"),
      codexDir: join(root, "nope"),
      since: "2026-05-01",
    });

    assert.equal(stats.totals.tokens.output, 7);
    assert.equal(stats.totals.messages, 1);
  });

  it("survives a truncated final line from a live session", async () => {
    const root = fixture();
    const file = join(root, "projects", "p", "s.jsonl");
    mkdirSync(join(root, "projects", "p"), { recursive: true });
    writeFileSync(
      file,
      JSON.stringify(turn({ session: "s", ts: "2026-03-02T09:00:00Z" })) + '\n{"type":"assis',
    );

    const stats = await scan({ claudeDir: join(root, "projects"), codexDir: join(root, "nope") });
    assert.equal(stats.totals.messages, 1);
  });

  it("returns an empty result when no transcript directory exists", async () => {
    const root = fixture();
    const stats = await scan({ claudeDir: join(root, "a"), codexDir: join(root, "b") });
    assert.equal(stats.totals.messages, 0);
    assert.equal(stats.totals.apiEquivalentUsd, 0);
    assert.deepEqual(stats.agents, []);
    assert.equal(stats.peakDay, null);
  });
});

describe("scan: streaks", () => {
  /** Streaks are derived from local dates, so build the fixture around today. */
  function daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(12, 0, 0, 0);
    return d.toISOString();
  }

  it("counts a run ending today as the current streak", async () => {
    const root = fixture();
    jsonl(join(root, "projects", "p", "s.jsonl"), [
      turn({ session: "s", ts: daysAgo(2) }),
      turn({ session: "s", ts: daysAgo(1) }),
      turn({ session: "s", ts: daysAgo(0) }),
    ]);

    const stats = await scan({ claudeDir: join(root, "projects"), codexDir: join(root, "nope") });
    assert.equal(stats.totals.activeDays, 3);
    assert.equal(stats.totals.currentStreak, 3);
    assert.equal(stats.totals.longestStreak, 3);
  });

  it("breaks the current streak once activity is two days stale", async () => {
    const root = fixture();
    jsonl(join(root, "projects", "p", "s.jsonl"), [
      turn({ session: "s", ts: daysAgo(4) }),
      turn({ session: "s", ts: daysAgo(3) }),
      turn({ session: "s", ts: daysAgo(2) }),
    ]);

    const stats = await scan({ claudeDir: join(root, "projects"), codexDir: join(root, "nope") });
    assert.equal(stats.totals.currentStreak, 0);
    assert.equal(stats.totals.longestStreak, 3);
  });
});

describe("scan: Codex rollouts", () => {
  it("takes the high-water mark rather than summing cumulative counters", async () => {
    const root = fixture();
    jsonl(join(root, "sessions", "2026", "03", "02", "rollout-x.jsonl"), [
      {
        type: "session_meta",
        timestamp: "2026-03-02T09:00:00Z",
        payload: { session_id: "c1", model: "gpt-5-codex" },
      },
      {
        type: "event_msg",
        timestamp: "2026-03-02T09:01:00Z",
        payload: {
          type: "token_count",
          info: {
            total_token_usage: {
              input_tokens: 100,
              cached_input_tokens: 40,
              output_tokens: 10,
              reasoning_output_tokens: 3,
              total_tokens: 110,
            },
          },
        },
      },
      {
        type: "event_msg",
        timestamp: "2026-03-02T09:02:00Z",
        payload: {
          type: "token_count",
          info: {
            total_token_usage: {
              input_tokens: 300,
              cached_input_tokens: 90,
              output_tokens: 25,
              reasoning_output_tokens: 8,
              total_tokens: 325,
            },
          },
        },
      },
      { type: "event_msg", timestamp: "2026-03-02T09:01:30Z", payload: { type: "agent_message" } },
      { type: "event_msg", timestamp: "2026-03-02T09:02:10Z", payload: { type: "agent_message" } },
      {
        type: "response_item",
        timestamp: "2026-03-02T09:02:30Z",
        payload: { type: "function_call", name: "shell" },
      },
    ]);

    const stats = await scan({ claudeDir: join(root, "none"), codexDir: join(root, "sessions") });

    assert.deepEqual(stats.agents, ["codex"]);
    assert.equal(stats.totals.tokens.output, 25, "last cumulative value wins, not the sum");
    assert.equal(stats.totals.tokens.cacheRead, 90);
    assert.equal(stats.totals.tokens.input, 210, "cached tokens are excluded from fresh input");
    assert.equal(stats.totals.toolCalls, 1);
    assert.equal(stats.totals.messages, 2, "agent replies count as turns, not one per session");
  });
});
