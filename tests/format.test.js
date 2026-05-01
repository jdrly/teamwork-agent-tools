import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatProjectList,
  formatTaskDetail,
  formatTaskList,
  markdownLink,
  stripHtml,
  summarizeTasks,
  taskUrl,
} from '../dist/format.js';

test('taskUrl prefers Teamwork webLink metadata', () => {
  assert.equal(
    taskUrl({ id: 1, meta: { webLink: 'https://example.test/task/1' } }, 'https://base.test'),
    'https://example.test/task/1',
  );
});

test('taskUrl falls back to app task URL', () => {
  assert.equal(taskUrl({ id: 42 }, 'https://base.test'), 'https://base.test/app/tasks/42');
});

test('formatTaskList uses markdown links', () => {
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
  assert.match(output, /1\. \[Test task\]\(https:\/\/base\.test\/app\/tasks\/42\)/);
  assert.match(output, /Status: new/);
});

test('formatTaskList joins tasklist and project includes', () => {
  const output = formatTaskList(
    [
      {
        id: 42,
        name: 'Test task',
        status: 'new',
        tasklist: { id: 7, type: 'tasklists' },
      },
    ],
    'https://base.test',
    {
      tasklists: {
        7: { id: 7, name: 'Sprint', projectId: 3 },
      },
      projects: {
        3: { id: 3, name: 'Seek', meta: { webLink: 'https://base.test/app/projects/3' } },
      },
    },
  );
  assert.match(output, /Project: \[Seek\]\(https:\/\/base\.test\/app\/projects\/3\)/);
  assert.match(output, /Tasklist: Sprint/);
});

test('formatProjectList uses markdown links', () => {
  const output = formatProjectList(
    [{ id: 3, name: 'Seek', status: 'active', meta: { webLink: 'https://base.test/app/projects/3' } }],
    'https://base.test',
  );
  assert.match(output, /1\. \[Seek\]\(https:\/\/base\.test\/app\/projects\/3\)/);
  assert.match(output, /Status: active/);
});

test('formatTaskDetail uses markdown links', () => {
  const output = formatTaskDetail(
    { id: 42, name: 'Test task', status: 'new', tasklistId: 7 },
    'https://base.test',
    undefined,
    {
      tasklists: { 7: { id: 7, name: 'Sprint', projectId: 3 } },
      projects: { 3: { id: 3, name: 'Seek' } },
    },
  );
  assert.match(output, /^\[Test task\]\(https:\/\/base\.test\/app\/tasks\/42\)/);
  assert.match(output, /Project: \[Seek\]\(https:\/\/base\.test\/app\/projects\/3\)/);
});

test('markdownLink escapes closing brackets in labels', () => {
  assert.equal(markdownLink('Task ] name', 'https://base.test'), '[Task \\] name](https://base.test)');
});

test('summarizeTasks returns compact list data', () => {
  const [summary] = summarizeTasks(
    [{ id: 42, name: 'Test task', status: 'new', tasklistId: 7 }],
    'https://base.test',
    {
      tasklists: { 7: { id: 7, name: 'Sprint', projectId: 3 } },
      projects: { 3: { id: 3, name: 'Seek' } },
    },
  );
  assert.deepEqual(summary, {
    id: 42,
    name: 'Test task',
    url: 'https://base.test/app/tasks/42',
    status: 'new',
    dueDate: undefined,
    priority: undefined,
    tasklist: { id: 7, name: 'Sprint' },
    project: { id: 3, name: 'Seek', url: 'https://base.test/app/projects/3' },
  });
});

test('stripHtml handles simple Teamwork rich text', () => {
  assert.equal(stripHtml('<p>Hello&nbsp;<strong>world</strong></p>'), 'Hello world');
});
