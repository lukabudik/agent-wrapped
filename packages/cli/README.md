# agent-wrapped

Turn your local Claude Code and Codex session logs into a stats card for your GitHub profile README.

```sh
npx agent-wrapped
```

No install, no config, no account needed to look at your own numbers.

## Commands

| Command                                | What it does                                                       |
| -------------------------------------- | ------------------------------------------------------------------ |
| `agent-wrapped` / `agent-wrapped scan` | Scan `~/.claude/projects` and `~/.codex/sessions`, print a summary |
| `agent-wrapped render`                 | Render an SVG card from those logs, locally                        |
| `agent-wrapped login`                  | Sign in with GitHub (device flow, `read:user` only)                |
| `agent-wrapped publish`                | Upload the summary and print a README snippet                      |
| `agent-wrapped logout`                 | Delete the stored token                                            |

### `scan`

```sh
agent-wrapped --since 2026-01-01
agent-wrapped --json > stats.json
```

| Flag                   | Default     | Meaning                                                  |
| ---------------------- | ----------- | -------------------------------------------------------- |
| `--since <YYYY-MM-DD>` | all history | Ignore activity before this date                         |
| `--json`               | off         | Machine-readable output, no color                        |
| `--include-names`      | off         | Keep real tool and skill names instead of redacting them |

### `render`

```sh
agent-wrapped render --out card.svg --theme heatmap --mode dark
```

| Flag          | Default                | Meaning                                                     |
| ------------- | ---------------------- | ----------------------------------------------------------- |
| `--out`, `-o` | `agent-wrapped.svg`    | Where to write the SVG                                      |
| `--theme`     | `heatmap`              | `heatmap`, `wrapped` or `terminal`                          |
| `--mode`      | `auto`                 | `dark`, `light` or `auto` (follows the viewer's OS setting) |
| `--username`  | `git config user.name` | Name shown on the card                                      |

`render` never touches the network.

### `login` / `publish` / `logout`

```sh
agent-wrapped login
agent-wrapped publish
```

`login` prints a code, you paste it into github.com, and the resulting token is
stored at `~/.config/agent-wrapped/config.json` with mode `0600`. The requested
scope is `read:user` and nothing else: no repository access, no email, no writes.

`publish` shows exactly what will be uploaded and asks once before the first
upload ever happens. Pass `--yes` in CI. `logout` deletes the stored file.

## Privacy

Everything is computed on your machine. `scan` and `render` are fully offline.

`publish` uploads aggregate counts only: token totals per model and their cost at
API list prices, how many sessions, assistant turns, tool calls and subagents you
ran, lines added and removed, how many turns happened on each calendar day and in
each hour, and your GitHub username. It never uploads prompts, responses,
thinking, file contents, file paths, directory or repository names, branch names,
environment variables, credentials, or MCP server addresses.

Tool and skill names are redacted by default, because they leak more than token
counts do: built-in tool names are published as-is, MCP and custom tools collapse
into `MCP tools` and `Other tools`, and skill names are dropped entirely. Pass
`--include-names` if you would rather publish them.

Run `agent-wrapped --json` first if you want to read the exact payload before
sending it anywhere.

## Environment

| Variable                  | Purpose                                           |
| ------------------------- | ------------------------------------------------- |
| `AGENT_WRAPPED_API`       | API base URL (default `https://agentwrapped.dev`) |
| `AGENT_WRAPPED_CLIENT_ID` | GitHub OAuth client id used by `login`            |
| `XDG_CONFIG_HOME`         | Overrides the `~/.config` config location         |
| `NO_COLOR`                | Disables color                                    |

## Exit codes

| Code | Meaning                                                |
| ---- | ------------------------------------------------------ |
| `0`  | Success                                                |
| `1`  | Usage error, or something on this machine needs fixing |
| `2`  | Network or server failure — retrying later may work    |
