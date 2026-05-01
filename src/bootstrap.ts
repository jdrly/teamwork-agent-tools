import { readCache, writeCache } from './config.js';
import { TeamworkClient } from './rest.js';
import type { CacheData, TeamworkConfig } from './types.js';

export async function bootstrap(config: TeamworkConfig, client: TeamworkClient): Promise<CacheData> {
  const response = await client.me();
  const person = response.person;
  const cache: CacheData = {
    version: 1,
    baseUrl: config.baseUrl,
    currentUser: {
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
    },
    validatedAt: new Date().toISOString(),
  };
  await writeCache(config, cache);
  return cache;
}

export async function getCurrentUserId(
  config: TeamworkConfig,
  client: TeamworkClient,
): Promise<number> {
  const cache = await readCache(config);
  if (cache?.baseUrl === config.baseUrl && cache.currentUser.id) {
    return cache.currentUser.id;
  }
  const fresh = await bootstrap(config, client);
  return fresh.currentUser.id;
}

