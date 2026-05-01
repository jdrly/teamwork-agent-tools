import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = '/Users/jd/.codex/plugins/teamwork';

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });

const entries = [
  '.codex-plugin',
  'dist',
  'skills',
  'README.md',
  'LICENSE',
  'package.json',
];

for (const entry of entries) {
  await cp(path.join(repoRoot, entry), path.join(target, entry), {
    recursive: true,
    force: true,
  });
}

console.log(`Installed Teamwork Codex plugin to ${target}`);
