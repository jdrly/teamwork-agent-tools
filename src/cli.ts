#!/usr/bin/env node
import { getBoolean, getNumber, getNumberList, getRequiredNumber, getRequiredString, getString, parseArgs } from './args.js';
import { bootstrap, getCurrentUserId } from './bootstrap.js';
import { clearCache, loadConfig, readCache } from './config.js';
import {
  emitResult,
  formatBootstrap,
  formatProjectList,
  formatTaskDetail,
  formatTaskList,
  summarizeTasks,
} from './format.js';
import { TeamworkApiError, TeamworkClient } from './rest.js';
import type { CliResult } from './types.js';

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const json = getBoolean(args, 'json');

  try {
    const config = loadConfig();
    const client = new TeamworkClient(config);
    const [resource, action, maybeId] = args.positionals;

    let result: CliResult;
    if (!resource || resource === 'help' || getBoolean(args, 'help')) {
      result = help();
    } else if (resource === 'auth' && action === 'check') {
      result = await authCheck(client);
    } else if (resource === 'bootstrap') {
      result = await bootstrapCommand(config, client);
    } else if (resource === 'cache' && action === 'clear') {
      await clearCache(config);
      result = { ok: true, type: 'cache.clear', message: 'Teamwork cache cleared.' };
    } else if (resource === 'cache' && action === 'show') {
      const cache = await readCache(config);
      result = { ok: true, type: 'cache.show', data: cache, message: cache ? JSON.stringify(cache, null, 2) : 'No cache found.' };
    } else if (resource === 'tasks' && action === 'mine') {
      result = await tasksMine(config, client, args);
    } else if (resource === 'tasks' && action === 'search') {
      result = await tasksSearch(config, client, args);
    } else if (resource === 'tasks' && action === 'get') {
      result = await taskGet(config, client, Number(maybeId), args);
    } else if (resource === 'tasks' && action === 'create') {
      result = await taskCreate(config, client, args);
    } else if (resource === 'tasks' && action === 'complete') {
      result = await taskComplete(client, Number(maybeId));
    } else if (resource === 'subtasks' && action === 'create') {
      result = await subtaskCreate(config, client, args);
    } else if (resource === 'comments' && action === 'create') {
      result = await commentCreate(client, args);
    } else if (resource === 'time' && action === 'log') {
      result = await timeLog(client, args);
    } else if (resource === 'projects' && action === 'list') {
      result = await projectsList(config, client, args);
    } else {
      result = {
        ok: false,
        type: 'unsupported',
        message: `Unsupported command: ${args.positionals.join(' ')}\n\n${help().message}`,
      };
    }

    emitResult(result, json);
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    const result = errorResult(error);
    emitResult(result, json);
    process.exitCode = 1;
  }
}

function help(): CliResult {
  return {
    ok: true,
    type: 'help',
    message: [
      'Teamwork Codex CLI',
      '',
      'Commands:',
      '  auth check [--json]',
      '  bootstrap [--json]',
      '  cache show|clear [--json]',
      '  tasks mine [--limit 20] [--page 1] [--subtasks] [--json]',
      '  tasks search <query> [--limit 20] [--subtasks] [--json]',
      '  tasks get <id> [--comments] [--json]',
      '  tasks create --tasklist-id <id> --name <name> [--description text] [--json]',
      '  tasks complete <id> [--json]',
      '  subtasks create --task-id <id> --name <name> [--description text] [--json]',
      '  comments create --task-id <id> --body <text> [--json]',
      '  time log --task-id <id> --date YYYY-MM-DD --hours N --minutes N [--description text] [--json]',
      '  projects list [--search query] [--limit 20] [--json]',
    ].join('\n'),
  };
}

async function authCheck(client: TeamworkClient): Promise<CliResult> {
  const response = await client.me();
  const person = response.person;
  const name = [person.firstName, person.lastName].filter(Boolean).join(' ');
  return {
    ok: true,
    type: 'auth.check',
    data: { person },
    message: `Auth OK - userID: ${person.id}${name ? ` - user: ${name}` : ''}`,
  };
}

async function bootstrapCommand(config: ReturnType<typeof loadConfig>, client: TeamworkClient): Promise<CliResult> {
  const cache = await bootstrap(config, client);
  return {
    ok: true,
    type: 'bootstrap',
    data: cache,
    message: formatBootstrap(cache),
  };
}

async function tasksMine(
  config: ReturnType<typeof loadConfig>,
  client: TeamworkClient,
  args: ReturnType<typeof parseArgs>,
): Promise<CliResult> {
  const currentUserId = await getCurrentUserId(config, client);
  const pageSize = getNumber(args, 'limit') || getNumber(args, 'page-size') || 20;
  const page = getNumber(args, 'page') || 1;
  const response = await client.listTasks({
    responsiblePartyIds: [currentUserId],
    getSubTasks: getBoolean(args, 'subtasks'),
    nestSubTasks: getBoolean(args, 'subtasks'),
    include: ['tasklists', 'projects'],
    page,
    pageSize,
  });
  const summaries = summarizeTasks(response.tasks || [], config.baseUrl, response.included);
  return {
    ok: true,
    type: 'tasks.mine',
    data: { tasks: summaries, meta: response.meta },
    message: formatTaskList(response.tasks || [], config.baseUrl, response.included),
  };
}

async function tasksSearch(
  config: ReturnType<typeof loadConfig>,
  client: TeamworkClient,
  args: ReturnType<typeof parseArgs>,
): Promise<CliResult> {
  const query = args.positionals.slice(2).join(' ') || getRequiredString(args, 'query');
  const pageSize = getNumber(args, 'limit') || getNumber(args, 'page-size') || 20;
  const response = await client.listTasks({
    searchTerm: query,
    pageSize,
    page: getNumber(args, 'page') || 1,
    getSubTasks: getBoolean(args, 'subtasks'),
    nestSubTasks: getBoolean(args, 'subtasks'),
    include: ['tasklists', 'projects'],
  });
  const summaries = summarizeTasks(response.tasks || [], config.baseUrl, response.included);
  return {
    ok: true,
    type: 'tasks.search',
    data: { tasks: summaries, meta: response.meta },
    message: formatTaskList(response.tasks || [], config.baseUrl, response.included),
  };
}

async function taskGet(
  config: ReturnType<typeof loadConfig>,
  client: TeamworkClient,
  id: number,
  args: ReturnType<typeof parseArgs>,
): Promise<CliResult> {
  assertId(id, 'task id');
  const response = await client.getTask(id, { include: ['tasklists', 'projects'] });
  const comments = getBoolean(args, 'comments')
    ? (await client.listTaskComments(id)).comments
    : undefined;
  return {
    ok: true,
    type: 'tasks.get',
    data: { ...response, comments },
    message: formatTaskDetail(response.task, config.baseUrl, comments, response.included),
  };
}

async function projectsList(
  config: ReturnType<typeof loadConfig>,
  client: TeamworkClient,
  args: ReturnType<typeof parseArgs>,
): Promise<CliResult> {
  const response = await client.listProjects({
    searchTerm: getString(args, 'search'),
    page: getNumber(args, 'page') || 1,
    pageSize: getNumber(args, 'limit') || getNumber(args, 'page-size') || 20,
  });
  return {
    ok: true,
    type: 'projects.list',
    data: response,
    message: formatProjectList(response.projects || [], config.baseUrl),
  };
}

async function taskCreate(
  config: ReturnType<typeof loadConfig>,
  client: TeamworkClient,
  args: ReturnType<typeof parseArgs>,
): Promise<CliResult> {
  const response = await client.createTask({
    tasklistId: getRequiredNumber(args, 'tasklist-id'),
    name: getRequiredString(args, 'name'),
    description: getString(args, 'description'),
    dueDate: getString(args, 'due-date'),
    startDate: getString(args, 'start-date'),
    priority: getString(args, 'priority'),
    assigneeIds: getNumberList(args, 'assignee-ids'),
    tagIds: getNumberList(args, 'tag-ids'),
  });
  return {
    ok: true,
    type: 'tasks.create',
    data: response,
    message: `Task created. Inspect JSON for returned IDs.\n${config.baseUrl}/app/tasks`,
  };
}

async function subtaskCreate(
  config: ReturnType<typeof loadConfig>,
  client: TeamworkClient,
  args: ReturnType<typeof parseArgs>,
): Promise<CliResult> {
  const response = await client.createSubtask({
    taskId: getRequiredNumber(args, 'task-id'),
    name: getRequiredString(args, 'name'),
    description: getString(args, 'description'),
    dueDate: getString(args, 'due-date'),
    startDate: getString(args, 'start-date'),
    priority: getString(args, 'priority'),
    assigneeIds: getNumberList(args, 'assignee-ids'),
    tagIds: getNumberList(args, 'tag-ids'),
  });
  return {
    ok: true,
    type: 'subtasks.create',
    data: response,
    message: `Subtask created. Inspect JSON for returned IDs.\n${config.baseUrl}/app/tasks`,
  };
}

async function commentCreate(
  client: TeamworkClient,
  args: ReturnType<typeof parseArgs>,
): Promise<CliResult> {
  const taskId = getRequiredNumber(args, 'task-id');
  const response = await client.createComment({
    taskId,
    body: getRequiredString(args, 'body'),
    contentType: getString(args, 'content-type'),
    notify: getBoolean(args, 'notify'),
  });
  return {
    ok: true,
    type: 'comments.create',
    data: response,
    message: `Comment created on task ${taskId}.`,
  };
}

async function taskComplete(client: TeamworkClient, id: number): Promise<CliResult> {
  assertId(id, 'task id');
  const response = await client.completeTask(id);
  return {
    ok: true,
    type: 'tasks.complete',
    data: response,
    message: `Task ${id} marked complete.`,
  };
}

async function timeLog(client: TeamworkClient, args: ReturnType<typeof parseArgs>): Promise<CliResult> {
  const response = await client.createTimelog({
    taskId: getNumber(args, 'task-id'),
    projectId: getNumber(args, 'project-id'),
    date: getRequiredString(args, 'date'),
    time: getString(args, 'time'),
    hours: getRequiredNumber(args, 'hours'),
    minutes: getRequiredNumber(args, 'minutes'),
    description: getString(args, 'description'),
    billable: getBoolean(args, 'billable'),
  });
  return {
    ok: true,
    type: 'time.log',
    data: response,
    message: 'Timelog created.',
  };
}

function assertId(id: number, label: string): void {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid ${label}`);
  }
}

function errorResult(error: unknown): CliResult {
  if (error instanceof TeamworkApiError) {
    return {
      ok: false,
      type: 'teamwork.api_error',
      message: error.message,
      data: {
        status: error.status,
        statusText: error.statusText,
        responseBody: error.responseBody,
      },
    };
  }
  return {
    ok: false,
    type: 'error',
    message: error instanceof Error ? error.message : String(error),
  };
}

await main();
