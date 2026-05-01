# Teamwork Codex Plugin

Codex plugin for working with Teamwork.com tasks and projects from terminal sessions.

The runtime path is intentionally small:

```text
Codex skill -> compiled Node CLI -> Teamwork REST API
```

Teamwork MCP may be used during development for discovery, but normal plugin use should go through the compact CLI.

## Requirements

- Node.js 20+
- pnpm
- Codex using local `~/.codex/config.toml`
- Teamwork API credentials

Teamwork auth docs:

- https://apidocs.teamwork.com/guides/teamwork/authentication
- https://apidocs.teamwork.com/guides/teamwork/app-login-flow

For personal/local use, the plugin accepts either:

- `TEAMWORK_BEARER_TOKEN`
- `TEAMWORK_API_TOKEN`

`TEAMWORK_BEARER_TOKEN` is preferred when available. `TEAMWORK_API_TOKEN` is used as a fallback.

## Install For Codex

Fast install:

```bash
curl -fsSL https://raw.githubusercontent.com/jdrly/teamwork-codex-plugin/main/install.sh | bash
```

Safer install:

Clone the repo:

```bash
git clone https://github.com/jdrly/teamwork-codex-plugin.git
cd teamwork-codex-plugin
```

Install dependencies and build:

```bash
pnpm install
pnpm build
pnpm test
```

Install into the local Codex plugin folder:

```bash
pnpm prepare:local
```

This copies the plugin to:

```text
~/.codex/plugins/teamwork
```

Add the Teamwork skill to `~/.codex/config.toml`:

```toml
[[skills.config]]
path = "/Users/YOUR_USER/.codex/plugins/teamwork/skills/teamwork/SKILL.md"
enabled = true
```

Replace `/Users/YOUR_USER` with your real home path.

## Environment

Add these values to `~/.codex/config.toml` under `[shell_environment_policy.set]`:

```toml
[shell_environment_policy.set]
TEAMWORK_URL = "https://your-site.teamwork.com"
TEAMWORK_BEARER_TOKEN = "your-bearer-token"
TEAMWORK_API_TOKEN = "your-api-token"
TEAMWORK_USER_AGENT = "Codex-Teamwork-Plugin/0.1"
```

Notes:

- `TEAMWORK_URL` is your Teamwork site base URL, for example `https://example.teamwork.com`.
- `TEAMWORK_BEARER_TOKEN` and `TEAMWORK_API_TOKEN` are secrets. Do not commit them.
- At least one token must be set.
- Restart Codex after changing `~/.codex/config.toml`.

If you prefer shell env instead of Codex config, export the same variables before starting Codex:

```bash
export TEAMWORK_URL="https://your-site.teamwork.com"
export TEAMWORK_BEARER_TOKEN="your-bearer-token"
export TEAMWORK_API_TOKEN="your-api-token"
export TEAMWORK_USER_AGENT="Codex-Teamwork-Plugin/0.1"
```

The CLI never prints token values.

## Verify Install

Run:

```bash
node ~/.codex/plugins/teamwork/dist/cli.js auth check
```

Expected shape:

```text
Auth OK - userID: 123456 - user: Your Name
```

Then test assigned tasks:

```bash
node ~/.codex/plugins/teamwork/dist/cli.js tasks mine --limit 10
```

## Claude Code Adapter

Claude Code support is experimental and untested by this repo owner. The shared Teamwork CLI is the same, but the adapter installs a Claude Code skill instead of a Codex skill.

Official Claude Code docs used for adapter shape:

- https://code.claude.com/docs/en/slash-commands
- https://code.claude.com/docs/en/settings

Install from a local checkout:

```bash
./install-claude-code.sh
```

This copies:

```text
~/.claude/teamwork-codex-plugin
~/.claude/skills/teamwork/SKILL.md
```

Start Claude Code with the same Teamwork environment variables exported:

```bash
export TEAMWORK_URL="https://your-site.teamwork.com"
export TEAMWORK_BEARER_TOKEN="your-bearer-token"
export TEAMWORK_API_TOKEN="your-api-token"
export TEAMWORK_USER_AGENT="Claude-Code-Teamwork-Plugin/0.1"
```

No Claude Code runtime validation has been performed here.

## CLI

```bash
node ~/.codex/plugins/teamwork/dist/cli.js auth check
node ~/.codex/plugins/teamwork/dist/cli.js bootstrap
node ~/.codex/plugins/teamwork/dist/cli.js tasks mine --limit 10
node ~/.codex/plugins/teamwork/dist/cli.js tasks mine --limit 10 --top-level
node ~/.codex/plugins/teamwork/dist/cli.js tasks search "homepage"
node ~/.codex/plugins/teamwork/dist/cli.js tasks get 24783426 --comments
node ~/.codex/plugins/teamwork/dist/cli.js projects list --limit 10
node ~/.codex/plugins/teamwork/dist/cli.js comments create --task-id 123 --body "Comment body"
node ~/.codex/plugins/teamwork/dist/cli.js time log --task-id 123 --date 2026-05-01 --hours 1 --minutes 30 --description "Work done"
```

Assigned task output uses compact blocks:

```text
Project name - Task name

[Task name](https://forecom.eu.teamwork.com/app/tasks/123)

Deadline: 2026-05-01 | Priority: high

────────────────────────────────────────────────────────────────────────────────
```

Empty deadline/priority fields are omitted.
Divider spans the terminal width.

## Development

```bash
pnpm install
pnpm build
pnpm test
```

Reinstall local build after changes:

```bash
pnpm prepare:local
```
