import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatProjectList,
  formatTaskDetail,
  formatTaskList,
  duplicateNestedSubtasks,
  markdownLink,
  stripHtml,
  stripMarkdown,
  summarizeTasks,
  taskUrl,
  terminalLink,
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

test('formatTaskList uses requested block format', () => {
  const output = formatTaskList(
    [
      {
        id: 42,
        name: 'Test task',
        description: 'Task body',
        status: 'new',
        dueDate: '2026-05-01T00:00:00Z',
        priority: 'high',
        meta: { webLink: 'https://base.test/app/tasks/42' },
      },
    ],
    'https://base.test',
  );
  assert.match(output, /^Unknown project - Test task\n\nhttps:\/\/base\.test\/app\/tasks\/42\n\nTask body\n\nDeadline:/);
  assert.match(output, /Task body/);
  assert.match(output, /Deadline: 2026-05-01T00:00:00Z \| Priority: high/);
  assert.match(output, /------------------------------------$/);
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
  assert.match(output, /Seek - Test task\n\nhttps:\/\/base\.test\/app\/tasks\/42/);
});

test('formatTaskList can duplicate subtasks under their parent for table-like output', () => {
  const output = formatTaskList(
    [
      { id: 1, name: 'Parent', status: 'new' },
      { id: 2, name: 'Child', status: 'new', parentTaskId: 1 },
    ],
    'https://base.test',
    undefined,
    { duplicateNestedSubtasks: true },
  );
  assert.match(output, /Unknown project - Parent\n\nhttps:\/\/base\.test\/app\/tasks\/1/);
  assert.match(output, /Unknown project - Subtask: Child\n\nhttps:\/\/base\.test\/app\/tasks\/2/);
  assert.match(output, /Unknown project - Child\n\nhttps:\/\/base\.test\/app\/tasks\/2/);
});

test('formatProjectList uses terminal-detected link format', () => {
  const output = formatProjectList(
    [{ id: 3, name: 'Seek', status: 'active', meta: { webLink: 'https://base.test/app/projects/3' } }],
    'https://base.test',
  );
  assert.match(output, /1\. Seek \(https:\/\/base\.test\/app\/projects\/3\)/);
  assert.match(output, /Status: active/);
});

test('formatTaskDetail uses terminal-detected link format', () => {
  const output = formatTaskDetail(
    { id: 42, name: 'Test task', status: 'new', tasklistId: 7 },
    'https://base.test',
    undefined,
    {
      tasklists: { 7: { id: 7, name: 'Sprint', projectId: 3 } },
      projects: { 3: { id: 3, name: 'Seek' } },
    },
  );
  assert.match(output, /^Test task \(https:\/\/base\.test\/app\/tasks\/42\)/);
  assert.match(output, /Project: Seek \(https:\/\/base\.test\/app\/projects\/3\)/);
});

test('markdownLink escapes closing brackets in labels', () => {
  assert.equal(markdownLink('Task ] name', 'https://base.test'), '[Task \\] name](https://base.test)');
});

test('terminalLink keeps raw URL in parentheses for terminal link detection', () => {
  assert.equal(terminalLink('Task', 'https://base.test'), 'Task (https://base.test)');
});

test('duplicateNestedSubtasks appends nested copies after parent tasks', () => {
  assert.deepEqual(
    duplicateNestedSubtasks([
      { id: 1, name: 'Parent', url: 'https://base.test/app/tasks/1' },
      {
        id: 2,
        name: 'Child',
        url: 'https://base.test/app/tasks/2',
        parentTaskId: 1,
      },
    ]).map((task) => task.name),
    ['Parent', 'Subtask: Child', 'Child'],
  );
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
    body: undefined,
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

test('stripMarkdown removes common body styling', () => {
  assert.equal(
    stripMarkdown('**Done** [link](https://example.test) ![img](https://img.test/a.png)\\n1\\. Item'),
    'Done link https://example.test img https://img.test/a.png\nItem',
  );
});
