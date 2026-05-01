export interface TeamworkConfig {
  baseUrl: string;
  apiToken?: string;
  bearerToken?: string;
  userAgent: string;
  stateDir: string;
}

export interface TeamworkRef {
  id: number;
  type?: string;
  meta?: Record<string, unknown>;
}

export interface TeamworkPerson {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  [key: string]: unknown;
}

export interface TeamworkTask {
  id: number;
  name: string;
  description?: string | null;
  descriptionContentType?: string | null;
  priority?: string | null;
  progress?: number;
  startDate?: string | null;
  dueDate?: string | null;
  estimateMinutes?: number;
  status?: string;
  assignees?: TeamworkRef[] | null;
  tags?: unknown[] | null;
  tasklist?: TeamworkRef | null;
  parentTask?: TeamworkRef | null;
  createdAt?: string;
  updatedAt?: string;
  meta?: {
    webLink?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface TeamworkProject {
  id: number;
  name: string;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
  meta?: {
    webLink?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface TeamworkComment {
  id: number;
  body?: string;
  contentType?: string;
  commentLink?: string;
  dateCreated?: string;
  createdAt?: string;
  object?: TeamworkRef;
  [key: string]: unknown;
}

export interface PageMeta {
  page?: {
    pageOffset?: number;
    pageSize?: number;
    count?: number;
    hasMore?: boolean;
  };
  [key: string]: unknown;
}

export interface CacheData {
  version: 1;
  baseUrl: string;
  currentUser: {
    id: number;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  validatedAt: string;
}

export interface CliResult {
  ok: boolean;
  type: string;
  message?: string;
  data?: unknown;
}

