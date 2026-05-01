import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import type { CacheData, TeamworkConfig } from './types.js';

const DEFAULT_USER_AGENT = 'Codex-Teamwork-Plugin/0.1';

export function loadConfig(): TeamworkConfig {
  const baseUrl = stripTrailingSlash(requiredEnv('TEAMWORK_URL'));
  const apiToken = process.env.TEAMWORK_API_TOKEN;
  const bearerToken = process.env.TEAMWORK_BEARER_TOKEN;
  const userAgent = process.env.TEAMWORK_USER_AGENT || DEFAULT_USER_AGENT;
  const stateDir =
    process.env.TEAMWORK_CODEX_STATE_DIR ||
    path.join(homedir(), '.codex', 'state', 'teamwork');

  if (!apiToken && !bearerToken) {
    throw new Error('Missing TEAMWORK_API_TOKEN or TEAMWORK_BEARER_TOKEN');
  }

  return { baseUrl, apiToken, bearerToken, userAgent, stateDir };
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function cachePath(config: TeamworkConfig): string {
  return path.join(config.stateDir, 'cache.json');
}

export async function readCache(config: TeamworkConfig): Promise<CacheData | null> {
  try {
    const raw = await readFile(cachePath(config), 'utf8');
    return JSON.parse(raw) as CacheData;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function writeCache(config: TeamworkConfig, cache: CacheData): Promise<void> {
  await mkdir(config.stateDir, { recursive: true, mode: 0o700 });
  await writeFile(cachePath(config), `${JSON.stringify(cache, null, 2)}\n`, {
    mode: 0o600,
  });
}

export async function clearCache(config: TeamworkConfig): Promise<void> {
  await rm(cachePath(config), { force: true });
}

