---
name: teamwork
description: Use when interacting with Teamwork.com projects, tasklists, tasks, subtasks, comments, timers, timelogs, or assigned work. Trigger whenever the user mentions Teamwork, Teamwork.com, tasks assigned/tagged to them, time tracking, project tasklists, subtasks, or comments in Teamwork.
---

# Teamwork.com

Use the local compiled CLI. Do not ask the user for credentials in chat.

```bash
node /Users/jd/.codex/plugins/teamwork/dist/cli.js <command>
```

Credentials are expected from environment variables:

- `TEAMWORK_URL`
- `TEAMWORK_API_TOKEN`
- `TEAMWORK_BEARER_TOKEN`
- `TEAMWORK_USER_AGENT`

If required env vars are missing, tell the user which variable is missing and stop.

## First Run

Run bootstrap before deeper work if the cache may be missing:

```bash
node /Users/jd/.codex/plugins/teamwork/dist/cli.js bootstrap --json
```

This validates auth and caches current user metadata. The cache is an optimization only.

## Common Commands

```bash
# Auth/current user
node /Users/jd/.codex/plugins/teamwork/dist/cli.js auth check --json

# My assigned work, matching Teamwork table by including subtasks
node /Users/jd/.codex/plugins/teamwork/dist/cli.js tasks mine --limit 20 --json

# Smaller top-level-only view
node /Users/jd/.codex/plugins/teamwork/dist/cli.js tasks mine --limit 20 --top-level --json

# Search tasks
node /Users/jd/.codex/plugins/teamwork/dist/cli.js tasks search "query" --json

# Task detail and comments
node /Users/jd/.codex/plugins/teamwork/dist/cli.js tasks get 123456 --comments --json

# Projects
node /Users/jd/.codex/plugins/teamwork/dist/cli.js projects list --limit 20 --json
```

## Mutations

Confirm before destructive actions. Creating tasks, comments, and timelogs is not destructive but still echo the target in the final response.

```bash
node /Users/jd/.codex/plugins/teamwork/dist/cli.js tasks create --tasklist-id 123 --name "Task name" --description "Details" --json
node /Users/jd/.codex/plugins/teamwork/dist/cli.js subtasks create --task-id 123 --name "Subtask name" --json
node /Users/jd/.codex/plugins/teamwork/dist/cli.js comments create --task-id 123 --body "Comment body" --json
node /Users/jd/.codex/plugins/teamwork/dist/cli.js time log --task-id 123 --date 2026-05-01 --hours 1 --minutes 30 --description "Work done" --json
node /Users/jd/.codex/plugins/teamwork/dist/cli.js tasks complete 123 --json
```

## Output Rules

Follow Freelo-style entity clarity. Every existing Teamwork entity mentioned in final responses should include a link.

Prefer terminal-detected links for Teamwork entities. Keep the raw URL in parentheses after the entity name so Ghostty/tmux can detect it.

```text
1. Task name (https://forecom.eu.teamwork.com/app/tasks/123)
   Project: Project name (https://forecom.eu.teamwork.com/app/projects/456)
   Due: 2026-05-01
   Status: active
```

Never print token values.
