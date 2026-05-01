import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTaskList, stripHtml, taskUrl } from '../dist/format.js';

test('taskUrl prefers Teamwork webLink metadata', () => {
  assert.equal(
    taskUrl({ id: 1, meta: { webLink: 'https://example.test/task/1' } }, 'https://base.test'),
    'https://example.test/task/1',
  );
});

test('taskUrl falls back to app task URL', () => {
  assert.equal(taskUrl({ id: 42 }, 'https://base.test'), 'https://base.test/app/tasks/42');
});

test('formatTaskList uses terminal-safe name plus URL format', () => {
  const output = formatTaskList(
    [
      {
        id: 42,
        name: 'Test task',
        status: 'new',
        meta: { webLink: 'https://base.test/app/tasks/42' },
      },
    ],
    'https://base.test',
  );
  assert.match(output, /1\. Test task/);
  assert.match(output, /https:\/\/base\.test\/app\/tasks\/42/);
  assert.match(output, /Status: new/);
});

test('stripHtml handles simple Teamwork rich text', () => {
  assert.equal(stripHtml('<p>Hello&nbsp;<strong>world</strong></p>'), 'Hello world');
});

