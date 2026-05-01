import type {
  CacheData,
  CliResult,
  IncludedEntities,
  TaskSummary,
  TeamworkComment,
  TeamworkProject,
  TeamworkTask,
} from './types.js';

export function taskUrl(task: Pick<TeamworkTask, 'id' | 'meta'>, baseUrl: string): string {
  return task.meta?.webLink || `${baseUrl}/app/tasks/${task.id}`;
}

export function projectUrl(project: Pick<TeamworkProject, 'id' | 'meta'>, baseUrl: string): string {
  return project.meta?.webLink || `${baseUrl}/app/projects/${project.id}`;
}

export function markdownLink(label: string | number, url: string): string {
  const safeLabel = String(label).replace(/]/g, '\\]');
  return `[${safeLabel}](${url})`;
}

export function terminalLink(label: string | number, url: string): string {
  return `${label} (${url})`;
}

const TASK_SEPARATOR_CHAR = '─';
const MIN_TASK_SEPARATOR_WIDTH = 36;
const CZECH_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Prague',
  hourCycle: 'h23',
});

export function formatTaskList(
  tasks: TeamworkTask[],
  baseUrl: string,
  included?: IncludedEntities,
  options: { duplicateNestedSubtasks?: boolean; separatorWidth?: number } = {},
): string {
  if (tasks.length === 0) return 'No tasks found.';
  const summaries = summarizeTasks(tasks, baseUrl, included);
  const rows = options.duplicateNestedSubtasks ? duplicateNestedSubtasks(summaries) : summaries;
  const separator = taskSeparator(options.separatorWidth);
  return rows
    .map((task) => {
      const projectName = task.project?.name || task.project?.id || 'Unknown project';
      const lines = [
        `${projectName} - ${task.name}`,
        '',
        markdownLink(task.name, task.url),
        '',
        formatTaskMeta(task),
        '',
        separator,
      ].filter((line, index, all) => line !== '' || all[index - 1] !== '');
      return lines.join('\n');
    })
    .join('\n');
}

export function taskSeparator(
  width = process.stdout.columns || Number(process.env.COLUMNS) || MIN_TASK_SEPARATOR_WIDTH,
): string {
  const safeWidth = Math.max(MIN_TASK_SEPARATOR_WIDTH, Math.floor(width));
  return TASK_SEPARATOR_CHAR.repeat(safeWidth);
}

function formatTaskMeta(task: TaskSummary): string {
  const parts = [];
  if (task.dueDate) parts.push(`Deadline: ${formatCzechDateTime(task.dueDate)}`);
  if (task.priority) parts.push(`Priority: ${task.priority}`);
  return parts.join(' | ');
}

export function formatCzechDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return CZECH_DATE_TIME_FORMATTER.format(date);
}

export function duplicateNestedSubtasks(tasks: TaskSummary[]): TaskSummary[] {
  const subtasksByParentId = new Map<number, TaskSummary[]>();
  for (const task of tasks) {
    if (!task.parentTaskId) continue;
    const existing = subtasksByParentId.get(task.parentTaskId) || [];
    existing.push({ ...task, name: `Subtask: ${task.name}` });
    subtasksByParentId.set(task.parentTaskId, existing);
  }

  const rows: TaskSummary[] = [];
  for (const task of tasks) {
    rows.push(task);
    const nestedSubtasks = subtasksByParentId.get(task.id);
    if (nestedSubtasks) rows.push(...nestedSubtasks);
  }
  return rows;
}

export function summarizeTasks(
  tasks: TeamworkTask[],
  baseUrl: string,
  included?: IncludedEntities,
): TaskSummary[] {
  return tasks.map((task) => {
    const tasklistId = task.tasklist?.id || task.tasklistId;
    const tasklist = tasklistId ? included?.tasklists?.[String(tasklistId)] : undefined;
    const projectId = tasklist?.project?.id || tasklist?.projectId;
    const project = projectId ? included?.projects?.[String(projectId)] : undefined;
    const summary: TaskSummary = {
      id: task.id,
      name: task.name,
      url: taskUrl(task, baseUrl),
      body: task.description,
      status: task.status,
      dueDate: task.dueDate,
      priority: task.priority,
    };
    if (tasklistId) {
      summary.tasklist = {
        id: tasklistId,
        name: tasklist?.name,
      };
    }
    if (projectId) {
      summary.project = {
        id: projectId,
        name: project?.name,
        url: project ? projectUrl(project, baseUrl) : `${baseUrl}/app/projects/${projectId}`,
      };
    }
    const parentTaskId = task.parentTask?.id || task.parentTaskId || undefined;
    if (parentTaskId) summary.parentTaskId = parentTaskId;
    return summary;
  });
}

export function formatProjectList(projects: TeamworkProject[], baseUrl: string): string {
  if (projects.length === 0) return 'No projects found.';
  return projects
    .map((project, index) => {
      const lines = [
        `${index + 1}. ${terminalLink(project.name, projectUrl(project, baseUrl))}`,
      ];
      if (project.status) lines.push(`   Status: ${project.status}`);
      return lines.join('\n');
    })
    .join('\n\n');
}

export function formatTaskDetail(
  task: TeamworkTask,
  baseUrl: string,
  comments?: TeamworkComment[],
  included?: IncludedEntities,
): string {
  const [summary] = summarizeTasks([task], baseUrl, included);
  const lines = [
    terminalLink(task.name, taskUrl(task, baseUrl)),
    `ID: ${task.id}`,
    `Status: ${task.status || 'unknown'}`,
  ];
  if (task.dueDate) lines.push(`Due: ${formatCzechDateTime(task.dueDate)}`);
  if (task.priority) lines.push(`Priority: ${task.priority}`);
  if (summary.project) {
    lines.push(`Project: ${terminalLink(summary.project.name || summary.project.id, summary.project.url)}`);
  }
  if (summary.tasklist?.id) lines.push(`Tasklist: ${summary.tasklist.name || summary.tasklist.id}`);
  if (summary.parentTaskId) lines.push(`Parent task: ${summary.parentTaskId}`);
  if (task.description) lines.push(`Description:\n${stripHtml(task.description)}`);
  if (comments) {
    lines.push(`Comments: ${comments.length}`);
    for (const comment of comments.slice(0, 10)) {
      lines.push(`- ${stripHtml(comment.body || '').slice(0, 240)}`);
    }
  }
  return lines.join('\n');
}

export function formatBootstrap(cache: CacheData): string {
  const name = [cache.currentUser.firstName, cache.currentUser.lastName].filter(Boolean).join(' ');
  return [
    'Teamwork bootstrap complete.',
    `User ID: ${cache.currentUser.id}`,
    name ? `User: ${name}` : undefined,
    cache.currentUser.email ? `Email: ${cache.currentUser.email}` : undefined,
    `Validated: ${cache.validatedAt}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function emitResult(result: CliResult, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (result.message) {
    console.log(result.message);
  } else {
    console.log(JSON.stringify(result.data, null, 2));
  }
}

export function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

export function stripMarkdown(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\\n/g, '\n')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1 $2')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 $2')
    .replace(/\\([\\`*_{}\[\]()#+\-.!|>])/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\\?\.\s+/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}
