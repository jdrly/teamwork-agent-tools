# Teamwork Codex Plugin

Codex plugin for working with Teamwork.com tasks and projects from terminal sessions.

The runtime path is intentionally small:

```text
Codex skill -> compiled Node CLI -> Teamwork REST API
```

Teamwork MCP may be used during development for discovery, but normal plugin use should go through the compact CLI.

## Development

```bash
pnpm install
pnpm build
pnpm test
```

Required environment variables:

```text
TEAMWORK_URL
TEAMWORK_API_TOKEN
TEAMWORK_BEARER_TOKEN
TEAMWORK_USER_AGENT
```

The CLI never prints token values.

## CLI

```bash
node dist/cli.js auth check
node dist/cli.js bootstrap
node dist/cli.js tasks mine --limit 10
node dist/cli.js tasks mine --limit 10 --top-level
node dist/cli.js tasks search "homepage"
node dist/cli.js tasks get 24783426 --comments
node dist/cli.js projects list --limit 10
```

Assigned task output uses compact blocks:

```text
Project name - Task name

[Task name](https://forecom.eu.teamwork.com/app/tasks/123)

Task body

Deadline: 2026-05-01 | Priority: high
------------------------------------
```

Empty deadline/priority fields are omitted.
