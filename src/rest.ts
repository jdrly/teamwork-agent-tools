import type {
  PageMeta,
  TeamworkComment,
  TeamworkConfig,
  IncludedEntities,
  TeamworkPerson,
  TeamworkProject,
  TeamworkTask,
} from './types.js';

export interface ListTasksOptions {
  responsiblePartyIds?: number[];
  projectId?: number;
  tasklistId?: number;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
  getSubTasks?: boolean;
  nestSubTasks?: boolean;
  includeCompletedTasks?: boolean;
  include?: string[];
}

export interface ListProjectsOptions {
  searchTerm?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateTaskInput {
  tasklistId: number;
  name: string;
  description?: string;
  dueDate?: string;
  startDate?: string;
  priority?: string;
  assigneeIds?: number[];
  tagIds?: number[];
}

export interface CreateSubtaskInput extends Omit<CreateTaskInput, 'tasklistId'> {
  taskId: number;
}

export interface CreateCommentInput {
  taskId: number;
  body: string;
  contentType?: string;
  notify?: boolean;
}

export interface CreateTimelogInput {
  taskId?: number;
  projectId?: number;
  date: string;
  time?: string;
  hours: number;
  minutes: number;
  description?: string;
  billable?: boolean;
}

export class TeamworkClient {
  constructor(private readonly config: TeamworkConfig) {}

  async me(): Promise<{ person: TeamworkPerson }> {
    return this.request('GET', '/projects/api/v3/me.json');
  }

  async listTasks(options: ListTasksOptions = {}): Promise<{
    tasks: TeamworkTask[];
    meta?: PageMeta;
    included?: IncludedEntities;
  }> {
    const query = new URLSearchParams();
    appendNumberList(query, 'responsiblePartyIds', options.responsiblePartyIds);
    appendNumber(query, 'projectId', options.projectId);
    appendNumber(query, 'tasklistId', options.tasklistId);
    appendString(query, 'searchTerm', options.searchTerm);
    appendNumber(query, 'page', options.page);
    appendNumber(query, 'pageSize', options.pageSize);
    appendBoolean(query, 'getSubTasks', options.getSubTasks);
    appendBoolean(query, 'nestSubTasks', options.nestSubTasks);
    appendBoolean(query, 'includeCompletedTasks', options.includeCompletedTasks);
    appendStringList(query, 'include', options.include);
    return this.request('GET', `/projects/api/v3/tasks.json?${query.toString()}`);
  }

  async getTask(id: number, options: { include?: string[] } = {}): Promise<{
    task: TeamworkTask;
    included?: IncludedEntities;
    meta?: PageMeta;
  }> {
    const query = new URLSearchParams();
    appendStringList(query, 'include', options.include);
    const suffix = query.size ? `?${query.toString()}` : '';
    return this.request('GET', `/projects/api/v3/tasks/${id}.json${suffix}`);
  }

  async listTaskComments(taskId: number): Promise<{
    comments: TeamworkComment[];
    meta?: PageMeta;
    included?: unknown;
  }> {
    return this.request('GET', `/projects/api/v3/tasks/${taskId}/comments.json`);
  }

  async listProjects(options: ListProjectsOptions = {}): Promise<{
    projects: TeamworkProject[];
    meta?: PageMeta;
    included?: unknown;
  }> {
    const query = new URLSearchParams();
    appendString(query, 'searchTerm', options.searchTerm);
    appendNumber(query, 'page', options.page);
    appendNumber(query, 'pageSize', options.pageSize);
    return this.request('GET', `/projects/api/v3/projects.json?${query.toString()}`);
  }

  async getProject(id: number): Promise<{ project: TeamworkProject; included?: unknown; meta?: PageMeta }> {
    return this.request('GET', `/projects/api/v3/projects/${id}.json`);
  }

  async createTask(input: CreateTaskInput): Promise<unknown> {
    return this.request('POST', `/projects/api/v3/tasklists/${input.tasklistId}/tasks.json`, {
      task: taskPayload(input),
    });
  }

  async createSubtask(input: CreateSubtaskInput): Promise<unknown> {
    return this.request('POST', `/projects/api/v3/tasks/${input.taskId}/subtasks.json`, {
      task: taskPayload(input),
    });
  }

  async createComment(input: CreateCommentInput): Promise<unknown> {
    return this.request('POST', '/projects/api/v3/comments.json', {
      comment: {
        body: input.body,
        contentType: input.contentType || 'TEXT',
        notify: input.notify ?? false,
        object: {
          id: input.taskId,
          type: 'tasks',
        },
      },
    });
  }

  async completeTask(id: number): Promise<unknown> {
    return this.request('PUT', `/projects/api/v3/tasks/${id}.json`, {
      task: {
        status: 'completed',
        progress: 100,
      },
    });
  }

  async createTimelog(input: CreateTimelogInput): Promise<unknown> {
    if (!input.taskId && !input.projectId) {
      throw new Error('Provide taskId or projectId');
    }
    if (input.taskId && input.projectId) {
      throw new Error('Provide only one of taskId or projectId');
    }

    const target = input.taskId
      ? `/projects/api/v3/tasks/${input.taskId}/time.json`
      : `/projects/api/v3/projects/${input.projectId}/time.json`;

    return this.request('POST', target, {
      timelog: {
        billable: input.billable ?? false,
        date: input.date,
        description: input.description,
        hours: input.hours,
        minutes: input.minutes,
        time: input.time || '09:00',
      },
    });
  }

  private async request<T>(method: string, apiPath: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.config.baseUrl}${apiPath}`, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: this.authorizationHeader(),
        'Content-Type': 'application/json',
        'User-Agent': this.config.userAgent,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    const parsed = text ? parseJson(text) : null;

    if (!response.ok) {
      throw new TeamworkApiError(response.status, response.statusText, parsed);
    }

    return parsed as T;
  }

  private authorizationHeader(): string {
    if (this.config.apiToken) {
      const encoded = Buffer.from(this.config.apiToken).toString('base64');
      return `Basic ${encoded}`;
    }
    return `Bearer ${this.config.bearerToken}`;
  }
}

export class TeamworkApiError extends Error {
  constructor(
    readonly status: number,
    readonly statusText: string,
    readonly responseBody: unknown,
  ) {
    super(`Teamwork API ${status} ${statusText}: ${summarizeErrorBody(responseBody)}`);
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function summarizeErrorBody(body: unknown): string {
  if (typeof body === 'string') return body.slice(0, 500);
  if (body && typeof body === 'object') return JSON.stringify(body).slice(0, 500);
  return 'empty response';
}

function taskPayload(input: Omit<CreateTaskInput, 'tasklistId'>): Record<string, unknown> {
  const task: Record<string, unknown> = {
    name: input.name,
  };
  if (input.description !== undefined) task.description = input.description;
  if (input.dueDate !== undefined) task.dueDate = input.dueDate;
  if (input.startDate !== undefined) task.startDate = input.startDate;
  if (input.priority !== undefined) task.priority = input.priority;
  if (input.assigneeIds?.length) {
    task.assignees = input.assigneeIds.map((id) => ({ id, type: 'users' }));
  }
  if (input.tagIds?.length) {
    task.tags = input.tagIds.map((id) => ({ id, type: 'tags' }));
  }
  return task;
}

function appendString(query: URLSearchParams, name: string, value: string | undefined): void {
  if (value !== undefined && value !== '') query.set(name, value);
}

function appendStringList(query: URLSearchParams, name: string, values: string[] | undefined): void {
  if (values?.length) query.set(name, values.join(','));
}

function appendNumber(query: URLSearchParams, name: string, value: number | undefined): void {
  if (value !== undefined) query.set(name, String(value));
}

function appendBoolean(query: URLSearchParams, name: string, value: boolean | undefined): void {
  if (value !== undefined) query.set(name, String(value));
}

function appendNumberList(query: URLSearchParams, name: string, values: number[] | undefined): void {
  if (values?.length) query.set(name, values.join(','));
}
