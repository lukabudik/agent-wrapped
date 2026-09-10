# agent-wrapped — build board

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

## packages/core — scanner, pricing, renderers

- [x] `types.ts` — `WrappedStats` wire format, themes, modes
- [x] `pricing.ts` — list API rates + cache multipliers (read 0.1x / write 1.25x / 1h 2x)
- [x] `redact.ts` — tool + skill name redaction (`safe` default, `full` opt-in)
- [x] `scan.ts` — streaming JSONL scanner for Claude Code + Codex
- [x] `render/common.ts` — palette, SVG primitives, number formatting
- [x] `render/heatmap.ts` — contribution-graph twin
- [x] `render/wrapped.ts` — Wrapped poster
- [x] `render/terminal.ts` — neofetch readout
- [x] `render/index.ts` — theme dispatcher
- [x] `index.ts` — public exports
- [x] Unit tests: 41 passing (pricing, canonicalization, both scanners, streaks, redaction, SVG)

## packages/cli — `npx agent-wrapped`

- [x] `scan` (default) — local scan, print summary table
- [x] `--out card.svg --theme <t>` — render locally, no network
- [x] `login` — GitHub device flow, token to `~/.config/agent-wrapped/`
- [x] `publish` — POST stats to the API, print README snippet
- [x] `logout`, `--json`, `--since`, `--include-names`
- [x] Privacy notice + explicit confirm before first publish

## apps/web — Next.js on Railway

- [x] Skeleton: Next 15 App Router, TS strict, Tailwind
- [x] Prisma schema + migrations (User, Snapshot, ModelStat)
- [x] `GET /api/card/[username]` — SVG, themed, cache headers
- [x] `POST /api/publish` — verify GitHub token, upsert snapshot
- [x] `GET /api/leaderboard` — ranked, paginated
- [x] Landing page — live theme picker, copy-markdown
- [x] `/u/[username]` — full profile
- [x] `/leaderboard` — ranked table
- [x] Rate limiting on publish
- [x] OG images

## Repo / release

- [x] README with hero card, install, privacy section
- [x] LICENSE (MIT), CONTRIBUTING, CODE_OF_CONDUCT, SECURITY
- [x] GitHub Actions: typecheck + test + build
- [x] Dockerfile + `railway.json`
- [ ] Publish CLI to npm as `agent-wrapped` (name confirmed available)

## Blocked on you

- [ ] Register `agentwrapped.dev` (confirmed available)
- [ ] Create the GitHub OAuth app, set `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
- [ ] Provision Railway project + Postgres, deploy
- [ ] Create the GitHub repo `lukabudik/agent-wrapped` and push

## Deferred (post-launch)

- [ ] Anti-inflation: signed stats, plausibility bounds
- [ ] Gemini CLI / Cursor / Amp transcript support
- [ ] Animated SVG variant
- [ ] Self-host guide
