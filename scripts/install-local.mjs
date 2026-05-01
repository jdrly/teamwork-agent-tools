import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
const target = path.join(codexHome, 'plugins', 'teamwork');

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

console.log(`Installed Teamwork Agent Tools to ${target}`);
