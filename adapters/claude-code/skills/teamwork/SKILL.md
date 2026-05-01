---
name: teamwork
description: Use when interacting with Teamwork.com projects, tasklists, tasks, subtasks, comments, timers, timelogs, or assigned work. Trigger whenever the user mentions Teamwork, Teamwork.com, tasks assigned to them, time tracking, project tasklists, subtasks, or comments in Teamwork.
---

# Teamwork.com

Use the local compiled CLI. Do not ask the user for credentials in chat.

```bash
node ~/.claude/teamwork-agent-tools/dist/cli.js <command>
```

Required environment:

- `TEAMWORK_URL`
- `TEAMWORK_BEARER_TOKEN` or `TEAMWORK_API_TOKEN`
- `TEAMWORK_USER_AGENT`

If required env vars are missing, tell the user which variable is missing and stop.

## Commands

```bash
# Auth/current user
node ~/.claude/teamwork-agent-tools/dist/cli.js auth check --json

# My assigned work, including nested subtask rows
node ~/.claude/teamwork-agent-tools/dist/cli.js tasks mine --limit 20 --json

# Top-level-only assigned work
node ~/.claude/teamwork-agent-tools/dist/cli.js tasks mine --limit 20 --top-level --json

# Search tasks
node ~/.claude/teamwork-agent-tools/dist/cli.js tasks search "query" --json

# Task detail and comments
node ~/.claude/teamwork-agent-tools/dist/cli.js tasks get 123456 --comments --json

# Projects
node ~/.claude/teamwork-agent-tools/dist/cli.js projects list --limit 20 --json
```

## Mutations

Confirm before destructive actions. Creating tasks, comments, and timelogs is not destructive but still echo the target in the final response.

When copying a body/description from another system into a Teamwork comment, post the copied content directly. Do not add labels or prefixes such as "Freelo body copy:" unless the user explicitly asks for that wording.

```bash
node ~/.claude/teamwork-agent-tools/dist/cli.js tasks create --tasklist-id 123 --name "Task name" --description "Details" --json
node ~/.claude/teamwork-agent-tools/dist/cli.js subtasks create --task-id 123 --name "Subtask name" --json
node ~/.claude/teamwork-agent-tools/dist/cli.js comments create --task-id 123 --body "Comment body" --json
node ~/.claude/teamwork-agent-tools/dist/cli.js time log --task-id 123 --date 2026-05-01 --hours 1 --minutes 30 --description "Work done" --json
node ~/.claude/teamwork-agent-tools/dist/cli.js tasks complete 123 --json
```

## Output

Every existing Teamwork entity mentioned in final responses should include a link.

For assigned task/subtask output, use this block format:

```text
Project name - Task name

[Task name](https://example.teamwork.com/app/tasks/123)

Deadline: 2026-05-01 | Priority: high

────────────────────────────────────────────────────────────────────────────────
```

Omit deadline or priority when value is empty. If both are empty, omit the whole line.

Never print token values.
