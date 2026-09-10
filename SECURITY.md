# Security Policy

## Supported versions

This project is pre-1.0. Only the latest release on `main` and the latest version published to npm receive fixes.

## Reporting a vulnerability

**Do not open a public issue.**

Use GitHub's private vulnerability reporting: go to the [Security tab](https://github.com/lukabudik/agent-wrapped/security/advisories/new) and open a draft advisory. That channel is private to the maintainers until a fix ships.

Please include:

- What the issue is and where in the code it lives.
- Reproduction steps, or a transcript fixture that triggers it — with your own data stripped out.
- What an attacker gets out of it.

Expect an acknowledgement within a few days. Since this is a solo-maintained side project, a fix may take longer than that; you will be told where things stand rather than left waiting.

## What counts as a security issue here

The threat model of this project is narrow and specific: **private data on a developer's machine must not escape it without an explicit, informed decision by that developer.** Anything that breaks that is in scope, even if it is not exploitable by a remote attacker.

In scope:

- **Any data leak through the published payload.** A field in `WrappedStats` that carries a file path, a repo name, a prompt fragment, an employer-identifying string, a hostname, or a local username. This is the single most important class of bug in this repo.
- **Redaction bypass.** `safe` mode publishing a raw MCP server name, a skill name, or any non-first-party tool name.
- **Publishing without consent.** Any code path that sends data before the user confirms, or that makes `--include-names` the effective default.
- **Credential handling.** The GitHub token written by `login` being logged, world-readable, or transmitted anywhere other than the API it authenticates to.
- **Service-side issues.** Authentication bypass on `POST /api/publish`, one user overwriting or reading another's snapshot, injection through a username or a rendered stat, SVG output that can execute script in a viewer's context.
- **Supply chain.** A dependency or build step that could tamper with the published npm package.

Out of scope:

- The dollar figure being wrong or a model missing from the pricing table. That is a normal bug — open an issue.
- Users deliberately publishing real tool names with `--include-names`. That is the documented purpose of the flag.
- Someone inflating their own stats by editing their own transcripts. Anti-inflation measures are a known gap, tracked publicly in `TODO.md`.
- Denial of service against the hosted card endpoint via ordinary request volume. Report it, but it is rate-limiting work, not an advisory.

## Deleting your data

If you have published and want it gone, `npx agent-wrapped delete` removes your snapshot and card from the service. If that command is unavailable or fails, open a normal issue asking for deletion — no advisory needed.
