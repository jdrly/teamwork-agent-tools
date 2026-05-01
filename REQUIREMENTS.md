# Teamwork Codex Plugin Requirements

## Goal

Build a Codex plugin for Teamwork.com that behaves like the existing Freelo skill:

- Let Codex manage Teamwork tasks/projects from terminal sessions.
- Keep normal Codex context small.
- Avoid loading broad external tool surfaces globally for every project.
- Use the Teamwork REST API through a compact wrapper.
- Prefer TypeScript source and compiled JavaScript runtime.
- Version the plugin as an OSS-ready repo that can later be published officially.

## Current Direction

Use a local Codex plugin with:

- A compact Teamwork skill for routing, rules, and output contracts.
- A TypeScript REST CLI/wrapper for common operations.
- Compiled JavaScript in `dist/` as the stable runtime called by Codex.

Expected local target:

```text
/Users/jd/.codex/plugins/teamwork/
  .codex-plugin/plugin.json
  skills/teamwork/SKILL.md
  package.json
  pnpm-lock.yaml
  tsconfig.json
  src/
    cli.ts
    config.ts
    teamwork-rest.ts
    format.ts
    schemas.ts
  dist/
    cli.js
```

Source repo target:

```text
/Users/jd/Development/personal/teamwork-codex-plugin/
```

The repo should be the source of truth. The local Codex plugin install can be generated, copied, or symlinked from this repo once implementation starts.

Skill should call compiled JS, not TypeScript directly:

```bash
node /Users/jd/.codex/plugins/teamwork/dist/cli.js <command>
```

Development should use pnpm:

```bash
pnpm install
pnpm build
pnpm test
```

## Runtime Model

Default path:

```text
Codex task
  -> Teamwork skill triggers
  -> node dist/cli.js ...
  -> CLI calls Teamwork REST API
  -> CLI returns compact JSON or Markdown
  -> Codex formats final response
```

Unsupported operation path:

```text
Codex task
  -> Teamwork skill triggers
  -> node dist/cli.js ...
  -> CLI reports unsupported operation with the closest implemented commands
  -> Codex asks for implementation or recommends manual Teamwork UI action
```

First-run path:

```text
Codex task
  -> Teamwork skill triggers
  -> node dist/cli.js bootstrap
  -> CLI validates auth and captures essential account metadata
  -> CLI writes a local cache for faster future validation and fewer API calls
```

## Materials Needed

### Teamwork Auth

- Teamwork account base URL: `https://forecom.eu.teamwork.com`.
- Preferred auth method for REST: API token.
- Bearer token is required for the configured Teamwork MCP server.
- Credentials are configured locally and must not be printed in chat, docs, logs, or generated source.

Configured env names:

```text
TEAMWORK_URL
TEAMWORK_API_TOKEN
TEAMWORK_BEARER_TOKEN
TEAMWORK_USER_AGENT
```

Current local env location:

```text
/Users/jd/.codex/env/teamwork.zsh
```

That file is sourced from:

```text
/Users/jd/.zshenv
```

This matters because Codex HTTP MCP `bearer_token_env_var` reads the parent process environment. `[shell_environment_policy.set]` alone is not enough for HTTP MCP auth.

### Teamwork MCP Preflight

Teamwork MCP is already registered globally in Codex for discovery and validation:

```text
Name: teamwork
URL: https://mcp.ai.teamwork.com
Auth env: TEAMWORK_BEARER_TOKEN
Transport: streamable_http
Status: enabled
```

Codex config entry:

```toml
[mcp_servers.teamwork]
url = "https://mcp.ai.teamwork.com"
bearer_token_env_var = "TEAMWORK_BEARER_TOKEN"
```

Verification performed on 2026-05-01:

- Direct Teamwork REST probe returned HTTP 200.
- Fresh `codex exec` read-only Teamwork MCP call succeeded.
- Tool called by Codex: `twprojects-list_tasks`.
- Probe returned task `24783426`, `PPC analýza a optimalizace`.
- Global `phpstorm` MCP server was removed after causing unrelated `127.0.0.1:64342` connection noise.

Use Teamwork MCP only for discovery/preflight while developing the plugin. The finished plugin should still expose a compact skill + TypeScript CLI so agents do not need broad MCP context for normal work.

Known MCP setup references:

- Teamwork MCP repo: <https://github.com/Teamwork/mcp>
- Teamwork MCP usage guide: <https://github.com/Teamwork/mcp/blob/main/docs/usage/README.md>
- Teamwork HTTP setup example: <https://github.com/Teamwork/mcp/blob/main/docs/usage/claude-code.md>
- Teamwork API auth docs: <https://apidocs.teamwork.com/guides/teamwork/authentication>

### Discovery Sources

Primary discovery source:

```text
Configured Codex MCP server: teamwork
```

Secondary discovery source:

```text
/Users/jd/Development/esoul/forecom-seek/executor.jsonc
```

The secondary source exposes Teamwork's remote tool surface with a local namespace prefix. The prefix is an Executor artifact and should not appear in the plugin's command names or user-facing docs.

Examples:

```text
teamwork_com.twprojects_list_tasks      -> plugin command/API concept: list tasks
teamwork_com.twprojects_get_task        -> plugin command/API concept: get task
teamwork_com.twprojects_create_task     -> plugin command/API concept: create task
teamwork_com.twprojects_update_task     -> plugin command/API concept: update task
teamwork_com.twprojects_complete_task   -> plugin command/API concept: complete task
teamwork_com.twprojects_create_comment  -> plugin command/API concept: create comment
teamwork_com.twprojects_create_timelog  -> plugin command/API concept: create timelog
```

Use discovery output to map operation names, schemas, and endpoint behavior, then implement the plugin through the compact TypeScript CLI. The plugin should not require users or agents to know broad MCP or Executor concepts.

### Discovered MCP Tools

Projects:

- `twprojects_list_projects`
- `twprojects_get_project`
- `twprojects_create_project`
- `twprojects_update_project`
- `twprojects_clone_project`

Tasks:

- `twprojects_list_tasks`
- `twprojects_get_task`
- `twprojects_create_task`
- `twprojects_update_task`
- `twprojects_complete_task`

Tasklists:

- `twprojects_list_tasklists`
- `twprojects_get_tasklist`
- `twprojects_create_tasklist`
- `twprojects_update_tasklist`
- `twprojects_list_tasklist_budgets`

Comments:

- `twprojects_list_comments`
- `twprojects_get_comment`
- `twprojects_create_comment`
- `twprojects_update_comment`

Timers:

- `twprojects_list_timers`
- `twprojects_get_timer`
- `twprojects_create_timer`
- `twprojects_update_timer`
- `twprojects_pause_timer`
- `twprojects_resume_timer`
- `twprojects_complete_timer`

Timelogs:

- `twprojects_list_timelogs`
- `twprojects_get_timelog`
- `twprojects_create_timelog`
- `twprojects_update_timelog`

### Discovered MCP Schemas

`twprojects_list_tasks`

- Inputs: `assignee_user_ids`, `completed_after`, `completed_before`, `created_after`, `created_before`, `created_by_user_ids`, `match_all_tags`, `page`, `page_size`, `project_id`, `search_term`, `tag_ids`, `tasklist_id`, `updated_after`, `updated_before`.
- Observed output includes `{ meta: { page: { hasMore } }, tasks: [...] }`.
- Task fields observed: `id`, `name`, `description`, `descriptionContentType`, `priority`, `progress`, `startDate`, `dueDate`, `estimateMinutes`, `status`, `assignees`, `tags`, `tasklist`, `parentTask`, `createdAt`, `updatedAt`, `meta.webLink`.

`twprojects_get_task`

- Inputs: `id` required.

`twprojects_create_task`

- Required inputs: `name`, `tasklist_id`.
- Optional inputs: `assignees`, `change_followers`, `comment_followers`, `complete_followers`, `description`, `description_content_type`, `due_date`, `estimated_minutes`, `parent_task_id`, `predecessors`, `priority`, `progress`, `start_date`, `tag_ids`.

`twprojects_create_comment`

- Required inputs: `body`, `object` with `{ id, type }`.
- Optional inputs: `content_type`, `notify`, `notify_current_user`.

`twprojects_complete_task`

- Inputs: `id` required.

`twprojects_create_timelog`

- Required inputs: `date`, `hours`, `minutes`, `time`.
- Optional inputs: `billable`, `description`, `is_utc`, `project_id`, `tag_ids`, `task_id`, `user_id`.
- Constraint: provide either `project_id` or `task_id`, not both.

`twprojects_list_projects`

- Inputs: `match_all_tags`, `page`, `page_size`, `project_category_ids`, `search_term`, `tag_ids`.

`twprojects_get_project`

- Inputs: `id` required.

### Teamwork API Docs

- API docs root: <https://apidocs.teamwork.com/>
- API reference: <https://apidocs.teamwork.com/docs/teamwork>
- Authentication docs: <https://apidocs.teamwork.com/guides/teamwork/authentication>
- Tasks list endpoint: `GET /projects/api/v3/tasks.json`
- Subtask create endpoint: `POST /projects/api/v3/tasks/{taskId}/subtasks.json`
- Task time endpoint: `GET /projects/api/v3/tasks/{taskId}/time.json`
- Comments list endpoint: `GET /projects/api/v3/comments.json`
- Tasklists list endpoint: `GET /projects/api/v3/tasklists`
- Need confirm pagination, rate limits, web URL patterns, and error response shapes during Phase 1.

### Core Workflows

Initial top commands should cover:

- Auth check / current user.
- Bootstrap/cache current user and account metadata.
- List tasks assigned/tagged to me.
- Include subtasks when listing my work.
- List tasks by project.
- Search tasks.
- Search projects.
- Read task detail, including body/description.
- Read comments/activity if available.
- Create task.
- Create subtask under a task.
- Add comment to task.
- Add comment/response to subtask.
- Finish/complete task.
- Reopen task.
- Log time to task.
- Log time to subtask.
- List projects.

Destructive actions requiring confirmation:

- Delete task.
- Delete comment if supported.
- Archive project.
- Delete project.
- Any force-delete operation.

### Output Contract

Follow the Freelo skill pattern: every existing Teamwork entity mentioned in final responses should include a useful link. Because the user is in terminal/Codex, default to terminal-safe two-line link format when listing entities:

```text
1. Task name
   https://...
   Project: Project name
   Due: 2026-05-01
   Status: active
```

Markdown links are acceptable where the renderer preserves link text, especially in short prose confirmations. For dense lists/tables, prefer visible name plus URL so the task name is never hidden behind a rendered URL.

Need URL patterns for:

- Task.
- Project.
- Task list.
- Milestone.
- Comment/activity entry if available.
- Time entry if available.

Default task fields to show:

- Name.
- URL.
- Project.
- Task list.
- Status.
- Due date.
- Assignee.
- Priority.
- Tags.
- Last updated.
- Last comment summary if cheap to fetch.

### Data Model Notes

Need confirm Teamwork shapes:

- Project/task/list/milestone relationships.
- Task ID type.
- Project ID type.
- User/assignee ID type.
- Task status values.
- Priority values.
- Date/time format and timezone handling.
- Pagination shape.
- Comment/body model.
- Time tracking/work log model.
- Attachments model if needed.

### Validation Access

Need safe live probes:

- Auth check endpoint expected success shape.
- Safe read-only task already observed: `24783426`, `PPC analýza a optimalizace`.
- Any project is acceptable for read-only validation.
- Prefer projects/tasks where the user is tagged or assigned.
- Permission granted for non-destructive reads.
- Explicit confirmation before create/edit/delete tests.

### Local Cache

On first run, the plugin should capture essential metadata for quicker validation and fewer repeated calls.

Cache should include at minimum:

- Current Teamwork user ID.
- Current user display name/email if available.
- Base URL/account URL.
- Timestamp of last auth validation.
- Optional project/user lookup maps only after they are needed.

Cache rules:

- Store under the plugin's local state directory, not in source.
- Never cache raw API token or bearer token.
- Provide a command to refresh or clear cache.
- Treat cache as optimization only; stale or missing cache must not break commands.

## Implementation Phases

### Phase 1 - Research

- Inspect Teamwork REST docs.
- Use configured Teamwork MCP server to inspect operation names and schemas where helpful.
- Verify auth with a read-only current-user call.
- Map entity URL patterns.
- Identify common response and error shapes.
- Verify REST equivalents for all MCP-backed core workflows.
- Confirm assigned/tagged task filtering and subtask inclusion.

### Phase 2 - Plugin Scaffold

- Create local plugin under `/Users/jd/.codex/plugins/teamwork`.
- Add `.codex-plugin/plugin.json`.
- Add `skills/teamwork/SKILL.md`.
- Add TypeScript project files.
- Add CLI command skeleton.

### Phase 3 - REST Wrapper

- Implement config/env loading.
- Implement HTTP client.
- Implement schemas/normalizers.
- Implement first commands:
  - `auth check`
  - `bootstrap`
  - `projects list`
  - `tasks mine`
  - `tasks search`
  - `tasks get`

### Phase 4 - Formatting

- Implement terminal-safe linked output.
- Keep JSON output mode for Codex parsing.
- Normalize dates to Europe/Prague where needed.
- Surface IDs and URLs in every created/modified entity result.

### Phase 5 - Mutations

- Implement create task/create subtask/comment/complete/reopen/log-time.
- Add confirmation requirements in skill docs for destructive operations.
- Re-fetch created/modified entities when response is lean.

### Phase 6 - Verification

- Run `pnpm build`.
- Run unit tests for formatting/config/schemas.
- Run read-only live probes.
- Run one safe create/edit test only after explicit permission.
- Confirm Codex skill can call `node dist/cli.js`.

## Open Questions

- Exact current-user REST endpoint and response shape.
- Exact assigned/tagged task filters for "my work".
- Whether Teamwork REST can return subtasks inline reliably, or whether subtasks need a second call.
- Exact create-subtask response shape and whether follow-up GET is needed.
- Exact comment object type for task vs. subtask comments.
- Exact timelog behavior for subtasks.
