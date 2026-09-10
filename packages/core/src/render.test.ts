import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderCard, renderEmptyCard } from "./render/index.js";
import { compact, group, money, prettyModel } from "./render/common.js";
import { redactSkillName, redactToolName } from "./redact.js";
import { THEMES, type WrappedStats } from "./types.js";

function sample(overrides: Partial<WrappedStats> = {}): WrappedStats {
  return {
    version: 1,
    generatedAt: "2026-09-10T00:00:00.000Z",
    agents: ["claude-code", "codex"],
    range: { from: "2026-05-15", to: "2026-09-10" },
    totals: {
      tokens: {
        input: 5_767_263,
        output: 69_864_733,
        cacheRead: 22_753_438_856,
        cacheWrite: 962_460_958,
        thinking: 22_294_056,
        total: 23_791_531_810,
      },
      apiEquivalentUsd: 23_691,
      sessions: 89,
      messages: 104_530,
      toolCalls: 61_873,
      subagentsSpawned: 484,
      linesAdded: 102_382,
      linesRemoved: 18_553,
      activeDays: 35,
      currentStreak: 4,
      longestStreak: 13,
    },
    models: [
      {
        id: "claude-opus-5",
        messages: 88_118,
        usd: 17_488,
        tokens: {
          input: 1,
          output: 1,
          cacheRead: 1,
          cacheWrite: 1,
          thinking: 1,
          total: 20_000_000_000,
        },
      },
      {
        id: "claude-fable-5",
        messages: 14_631,
        usd: 5_773,
        tokens: {
          input: 1,
          output: 1,
          cacheRead: 1,
          cacheWrite: 1,
          thinking: 1,
          total: 3_000_000_000,
        },
      },
    ],
    tools: [
      { name: "Bash", count: 33_653 },
      { name: "MCP tools", count: 10_344 },
    ],
    skills: [],
    byDay: { "2026-09-08": 120, "2026-09-09": 900, "2026-09-10": 43 },
    byHour: Array.from({ length: 24 }, (_, i) => (i === 12 ? 4000 : i * 10)),
    peakDay: { date: "2026-09-09", count: 900 },
    peakHour: 12,
    ...overrides,
  };
}

describe("renderCard", () => {
  for (const theme of THEMES) {
    it(`produces a well-formed ${theme} card`, () => {
      const svg = renderCard(sample(), { theme, mode: "auto", username: "lukabudik" });
      assert.ok(svg.startsWith("<svg "), "starts with an svg element");
      assert.ok(svg.endsWith("</svg>"), "closes the svg element");
      assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'), "carries the SVG namespace");
      assert.ok(svg.includes("lukabudik"), "shows the username");
      assert.equal((svg.match(/<svg /g) ?? []).length, 1, "exactly one root element");
    });

    it(`emits both palettes for ${theme} in auto mode`, () => {
      const svg = renderCard(sample(), { theme, mode: "auto", username: "x" });
      assert.ok(svg.includes("prefers-color-scheme:dark"), "adapts to the OS theme");
    });

    it(`pins a single palette for ${theme} in dark mode`, () => {
      const svg = renderCard(sample(), { theme, mode: "dark", username: "x" });
      assert.ok(!svg.includes("prefers-color-scheme"), "no media query when pinned");
    });
  }

  it("escapes a username containing markup", () => {
    const svg = renderCard(sample(), {
      theme: "terminal",
      mode: "dark",
      username: '"><script>alert(1)</script>',
    });
    assert.ok(!svg.includes("<script>"), "no raw script tag survives");
    assert.ok(svg.includes("&lt;script&gt;"), "the angle brackets are escaped");
  });

  it("handles a user with no activity at all", () => {
    const empty = sample({
      byDay: {},
      peakDay: null,
      models: [],
      tools: [],
      range: { from: "", to: "" },
      totals: {
        ...sample().totals,
        tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, thinking: 0, total: 0 },
        apiEquivalentUsd: 0,
      },
    });
    for (const theme of THEMES) {
      const svg = renderCard(empty, { theme, mode: "dark", username: "new" });
      assert.ok(svg.endsWith("</svg>"));
    }
  });
});

describe("renderEmptyCard", () => {
  it("returns a real card so a README never shows a broken image", () => {
    const svg = renderEmptyCard("someone", "auto");
    assert.ok(svg.startsWith("<svg "));
    assert.ok(svg.includes("npx agent-wrapped publish"));
  });

  it("escapes the username", () => {
    assert.ok(!renderEmptyCard("<b>", "dark").includes("<b>"));
  });
});

describe("formatting", () => {
  it("compacts large numbers to three significant figures", () => {
    assert.equal(compact(23_791_531_810), "23.79B");
    assert.equal(compact(1_500_000), "1.5M");
    assert.equal(compact(2_400), "2.4K");
    assert.equal(compact(42), "42");
  });

  it("groups and formats money", () => {
    assert.equal(group(102_382), "102,382");
    assert.equal(money(23_691), "$23,691");
    assert.equal(money(4.5), "$4.50");
  });

  it("prettifies model ids", () => {
    assert.equal(prettyModel("claude-opus-5"), "Opus 5");
    assert.equal(prettyModel("claude-fable-5-1"), "Fable 5.1");
    assert.equal(prettyModel("claude-haiku-4-5"), "Haiku 4.5");
    assert.equal(prettyModel("gpt-5.3-codex"), "GPT-5.3 Codex");
    assert.equal(prettyModel("gpt-5.6-sol"), "GPT-5.6 Sol");
    assert.equal(prettyModel("gpt-6-astra"), "GPT-6 Astra");
    assert.equal(prettyModel("gpt-5.5"), "GPT-5.5");
    assert.equal(prettyModel("codex-auto-review"), "Codex Auto Review");
  });
});

describe("redaction", () => {
  it("publishes first-party tool names as-is", () => {
    assert.equal(redactToolName("Bash", "safe"), "Bash");
    assert.equal(redactToolName("shell", "safe"), "shell");
  });

  it("buckets MCP servers so private names never leave the machine", () => {
    assert.equal(redactToolName("mcp__acme_internal_db__query", "safe"), "MCP tools");
    assert.equal(redactToolName("some_custom_thing", "safe"), "Other tools");
  });

  it("omits skill names entirely in safe mode", () => {
    assert.equal(redactSkillName("dbqt:acme-production", "safe"), null);
  });

  it("passes everything through when the user opts in", () => {
    assert.equal(redactToolName("mcp__acme__query", "full"), "mcp__acme__query");
    assert.equal(redactSkillName("dbqt:acme-production", "full"), "dbqt:acme-production");
  });
});
