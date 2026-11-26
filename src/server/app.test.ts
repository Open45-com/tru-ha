import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp, memoryStore } from './app.ts';
import { baseCourse } from '../sim/courses.ts';
import { solve } from '../sim/bot.ts';

const NOW = Date.parse('2026-12-01T12:00:00Z');
const DAY = '2026-12-01';

function app(user: string | null = 'alpha') {
  return createApp({ store: memoryStore(), user: async () => user, now: () => NOW });
}
const post = (body: unknown) => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('state returns today’s course and an empty board', async () => {
  const r = await app().request('/api/state');
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.day, DAY);
  assert.ok(j.course.hazards.length > 0);
  assert.deepEqual(j.boards.fastest, []);
});

test('a verified finish records a best time and rank', async () => {
  const shared = memoryStore();
  const a = createApp({ store: shared, user: async () => 'alpha', now: () => NOW });
  const log = solve(baseCourse(DAY))!;
  const r = await a.request('/api/run', post({ day: DAY, version: 0, log }));
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.end.type, 'finish');
  assert.equal(j.newBest, true);
  assert.equal(j.rank, 0);
  assert.equal(j.boards.fastest[0].user, 'alpha');
  assert.equal(j.boards.fastest[0].ticks, j.ticks);
});

test('a death does not touch the board', async () => {
  const r = await app().request('/api/run', post({ day: DAY, version: 0, log: [[3600, 1, 8]] }));
  const j = await r.json();
  assert.equal(j.end.type, 'death');
  assert.deepEqual(j.boards.fastest, []);
});

test('rejects bad logs and closed days', async () => {
  assert.equal((await app().request('/api/run', post({ day: DAY, version: 0, log: [[10, 3, 0]] }))).status, 400);
  assert.equal((await app().request('/api/run', post({ day: '2026-11-30', version: 0, log: [[10, 1, 0]] }))).status, 409);
});

test('logged-out finishes are replayed but not ranked', async () => {
  const log = solve(baseCourse(DAY))!;
  const j = await (await app(null).request('/api/run', post({ day: DAY, version: 0, log }))).json();
  assert.equal(j.end.type, 'finish');
  assert.equal(j.rank, null);
  assert.deepEqual(j.boards.fastest, []);
});
