import test from 'node:test';
import assert from 'node:assert/strict';
import { TeamworkClient } from '../dist/rest.js';

const config = {
  baseUrl: 'https://example.teamwork.com',
  bearerToken: 'test-token',
  userAgent: 'teamwork-plugin-test',
  stateDir: '/tmp/teamwork-plugin-test',
};

function mockFetch(assertRequest) {
  const previousFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls += 1;
    assertRequest(String(url), options);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  return () => {
    globalThis.fetch = previousFetch;
    return calls;
  };
}

test('createComment uses task-scoped comments endpoint accepted by Teamwork', async () => {
  const restore = mockFetch((url, options) => {
    assert.equal(url, 'https://example.teamwork.com/tasks/123/comments.json');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    assert.deepEqual(JSON.parse(options.body), {
      comment: {
        body: 'Copied body',
      },
    });
  });

  try {
    await new TeamworkClient(config).createComment({ taskId: 123, body: 'Copied body' });
    assert.equal(restore(), 1);
  } finally {
    restore();
  }
});

test('createComment maps optional content type for v1 comment payload', async () => {
  const restore = mockFetch((_url, options) => {
    assert.deepEqual(JSON.parse(options.body), {
      comment: {
        body: '<p>Copied body</p>',
        'content-type': 'html',
      },
    });
  });

  try {
    await new TeamworkClient(config).createComment({
      taskId: 123,
      body: '<p>Copied body</p>',
      contentType: 'HTML',
    });
    assert.equal(restore(), 1);
  } finally {
    restore();
  }
});

test('createTimelog omits invalid default time field', async () => {
  const restore = mockFetch((url, options) => {
    assert.equal(url, 'https://example.teamwork.com/projects/api/v3/tasks/456/time.json');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), {
      timelog: {
        isBillable: false,
        date: '2026-05-01',
        description: 'Work done',
        hours: 1,
        minutes: 15,
      },
    });
  });

  try {
    await new TeamworkClient(config).createTimelog({
      taskId: 456,
      date: '2026-05-01',
      hours: 1,
      minutes: 15,
      description: 'Work done',
    });
    assert.equal(restore(), 1);
  } finally {
    restore();
  }
});

test('createTimelog keeps explicit time when provided', async () => {
  const restore = mockFetch((_url, options) => {
    assert.deepEqual(JSON.parse(options.body), {
      timelog: {
        isBillable: true,
        date: '2026-05-01',
        hours: 2,
        minutes: 30,
        time: '2026-05-01T09:00:00+02:00',
      },
    });
  });

  try {
    await new TeamworkClient(config).createTimelog({
      taskId: 456,
      date: '2026-05-01',
      time: '2026-05-01T09:00:00+02:00',
      hours: 2,
      minutes: 30,
      billable: true,
    });
    assert.equal(restore(), 1);
  } finally {
    restore();
  }
});
