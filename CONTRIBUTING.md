# Contributing

Thanks for looking. This is a small project with a clear shape, so contributions are easy to land if they fit it.

## Setup

Requirements: Node 24, pnpm 11. If you use [mise](https://mise.jdx.dev/), the versions resolve automatically.

```bash
git clone https://github.com/lukabudik/agent-wrapped.git
cd agent-wrapped
pnpm install

pnpm typecheck
pnpm test
pnpm build
```

## Layout

| Path            | What lives there                                            |
| --------------- | ----------------------------------------------------------- |
| `packages/core` | Transcript scanner, pricing table, redaction, SVG renderers |
| `packages/cli`  | The `npx agent-wrapped` binary                              |
| `apps/web`      | Next.js service — card API, profile pages, leaderboard      |

`packages/core` is deliberately dependency-free and does no network I/O. Keep it that way: anything that fetches, authenticates, or writes to a database belongs in `packages/cli` or `apps/web`.

## Ground rules

- **TypeScript strict.** No `any`. Use `unknown` and narrow it — the scanner is full of examples.
- **Never widen what leaves the machine.** If your change adds a field to `WrappedStats`, say so explicitly in the PR description and explain why it cannot identify a person, an employer, or a repo. Redaction defaults are not a knob to be loosened for convenience.
- **The scanner must not crash on bad input.** Transcripts are appended to live; the last line of an active session is routinely truncated. Parse defensively, skip what you cannot read, never throw.
- **Stream, don't slurp.** Some people have gigabytes of transcripts. Line-by-line only.
- No emojis in code, commit messages, or config.

## Common contributions

### Correcting or adding model pricing

Everything lives in `packages/core/src/pricing.ts`. Add the canonical id to `PRICING` with its list rates. Cache rates are derived from the input rate via multipliers, so you usually only supply input and output. If a model reads cache at an unusual multiplier, pass the third argument to `rates()`.

Include a link to the published price list in your PR. Rates that cannot be sourced do not get merged.

### Supporting another agent

Gemini CLI, Cursor, and Amp are all wanted. The pattern to follow is `scanClaudeLine` / `scanCodexLine` in `packages/core/src/scan.ts`:

1. Add the agent to `AgentKind` in `types.ts`.
2. Write a per-line handler that feeds the shared `Accumulator`.
3. Add its transcript directory to `scan()`, guarded by `existsSync` so a missing directory is not an error.
4. Add a fixture-based test. A handful of anonymized real lines beats a synthetic one.

Watch out for cumulative-vs-incremental token accounting — Codex reports cumulative totals, so the scanner keeps a high-water mark instead of summing. Get this wrong and the numbers inflate quietly.

### Adding a card theme

Renderers live in `packages/core/src/render/`. Read `heatmap.ts`, `wrapped.ts`, and `terminal.ts` first — they are the three worked examples. Share the palette, SVG chrome, escaping, and number formatting from `common.ts` rather than reinventing them, add your renderer to the switch in `render/index.ts`, register the theme in `THEMES` in `types.ts`, and export it from `src/index.ts`.

Constraints that are not negotiable, because a card is an SVG served to an `<img>`:

- **No remote assets.** No webfonts, no avatars, no external images. The document is sandboxed and the fetch silently fails. Use the system font stacks in `common.ts` and draw anything else.
- **No script.** Not `<script>`, not event handlers. It will not run, and it would be a vector if it did.
- **All three modes.** `dark` and `light` pin a palette; `auto` emits a `prefers-color-scheme` query. Use the CSS variables from `themeStyle` and you get this for free.
- **Escape everything interpolated.** Usernames, tool names, and model ids all reach the output. `esc()` exists for this and there is a test asserting it.

Themes must also degrade gracefully on thin data. Somebody's first card may have three active days and one model.

## Tests

```bash
pnpm --filter @agent-wrapped/core test   # 41 tests, node:test, fixture-based
pnpm test                                 # everything
```

`packages/core` already covers pricing math, model-id canonicalization, the scanner against both transcript formats, streak boundaries, redaction, and SVG well-formedness including username escaping. Follow those patterns.

Write tests where correctness is not obvious. Skip them for glue code. Coverage percentage is not a goal.

Tests must never read `~/.claude` or `~/.codex`. `scan()` takes `claudeDir` and `codexDir` options precisely so a test can point at a fixture directory; a test that passes only on your laptop is not a test.

## Commits and PRs

Conventional commit style is preferred but not enforced:

```
feat: add Gemini CLI transcript support
fix: stop subagent transcripts double-counting sessions
docs: correct Fable cache-read multiplier
```

First line 72 characters or fewer, imperative mood. One logical change per PR. If the change is user-visible, update the README in the same PR.

## Reporting a privacy or security issue

Do not open a public issue. See [SECURITY.md](SECURITY.md).
