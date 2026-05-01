import type { CacheData, CliResult, TeamworkComment, TeamworkProject, TeamworkTask } from './types.js';

export function taskUrl(task: Pick<TeamworkTask, 'id' | 'meta'>, baseUrl: string): string {
  return task.meta?.webLink || `${baseUrl}/app/tasks/${task.id}`;
}

export function projectUrl(project: Pick<TeamworkProject, 'id' | 'meta'>, baseUrl: string): string {
  return project.meta?.webLink || `${baseUrl}/app/projects/${project.id}`;
}

export function formatTaskList(tasks: TeamworkTask[], baseUrl: string): string {
  if (tasks.length === 0) return 'No tasks found.';
  return tasks
    .map((task, index) => {
      const lines = [
        `${index + 1}. ${task.name}`,
        `   ${taskUrl(task, baseUrl)}`,
        `   Status: ${task.status || 'unknown'}`,
      ];
      if (task.dueDate) lines.push(`   Due: ${task.dueDate}`);
      if (task.priority) lines.push(`   Priority: ${task.priority}`);
      if (task.tasklist?.id) lines.push(`   Tasklist: ${task.tasklist.id}`);
      if (task.parentTask?.id) lines.push(`   Parent task: ${task.parentTask.id}`);
      return lines.join('\n');
    })
    .join('\n\n');
}

export function formatProjectList(projects: TeamworkProject[], baseUrl: string): string {
  if (projects.length === 0) return 'No projects found.';
  return projects
    .map((project, index) => {
      const lines = [
        `${index + 1}. ${project.name}`,
        `   ${projectUrl(project, baseUrl)}`,
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
): string {
  const lines = [
    task.name,
    taskUrl(task, baseUrl),
    `ID: ${task.id}`,
    `Status: ${task.status || 'unknown'}`,
  ];
  if (task.dueDate) lines.push(`Due: ${task.dueDate}`);
  if (task.priority) lines.push(`Priority: ${task.priority}`);
  if (task.tasklist?.id) lines.push(`Tasklist: ${task.tasklist.id}`);
  if (task.parentTask?.id) lines.push(`Parent task: ${task.parentTask.id}`);
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

