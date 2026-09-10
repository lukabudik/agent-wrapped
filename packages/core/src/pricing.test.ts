import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canonicalModelId, costOf, ratesFor } from "./pricing.js";

describe("canonicalModelId", () => {
  it("passes through ids that are already canonical", () => {
    assert.equal(canonicalModelId("claude-opus-5"), "claude-opus-5");
  });

  it("strips a trailing date snapshot", () => {
    assert.equal(canonicalModelId("claude-haiku-4-5-20251001"), "claude-haiku-4-5");
  });

  it("strips a Vertex-style version suffix", () => {
    assert.equal(canonicalModelId("claude-opus-4-5@20251101"), "claude-opus-4-5");
  });

  it("is case insensitive and trims", () => {
    assert.equal(canonicalModelId("  Claude-Opus-5 "), "claude-opus-5");
  });

  it("rejects synthetic and empty entries", () => {
    assert.equal(canonicalModelId("<synthetic>"), null);
    assert.equal(canonicalModelId(""), null);
  });

  it("keeps an unrecognised id rather than dropping its tokens", () => {
    assert.equal(canonicalModelId("gpt-9-future"), "gpt-9-future");
  });
});

describe("ratesFor", () => {
  it("derives cache rates from the input rate", () => {
    const r = ratesFor("claude-opus-5");
    assert.equal(r.input, 5);
    assert.equal(r.output, 25);
    assert.equal(r.cacheRead, 0.5); // 0.1x
    assert.equal(r.cacheWrite5m, 6.25); // 1.25x
    assert.equal(r.cacheWrite1h, 10); // 2x
  });

  it("gives Fable 5.1 its cheaper 0.025x cache read", () => {
    assert.equal(ratesFor("claude-fable-5-1").cacheRead, 0.25);
  });

  it("estimates an unknown model at a mid tier rather than the top tier", () => {
    const unknown = ratesFor("gpt-9-future");
    assert.ok(unknown.input < ratesFor("claude-fable-5").input);
    assert.equal(unknown.input, 3);
  });
});

describe("costOf", () => {
  it("prices each token class at its own rate", () => {
    const usd = costOf("claude-opus-5", {
      input: 1_000_000,
      output: 1_000_000,
      cacheRead: 1_000_000,
      cacheWrite5m: 1_000_000,
      cacheWrite1h: 1_000_000,
    });
    // 5 + 25 + 0.5 + 6.25 + 10
    assert.equal(usd, 46.75);
  });

  it("returns zero for a model with no usage", () => {
    assert.equal(
      costOf("claude-opus-5", {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite5m: 0,
        cacheWrite1h: 0,
      }),
      0,
    );
  });

  it("scales linearly below a million tokens", () => {
    const usd = costOf("claude-sonnet-5", {
      input: 500_000,
      output: 0,
      cacheRead: 0,
      cacheWrite5m: 0,
      cacheWrite1h: 0,
    });
    assert.equal(usd, 1); // $2/MTok * 0.5M
  });
});
