import test from 'node:test';
import assert from 'node:assert/strict';
import { createRun, step, replay, appendInput, validLog, validatePlacement, sinT, cosT, isqrt, START, type Course, type InputLog } from './index.ts';
import { baseCourse } from './courses.ts';
import { solve } from './bot.ts';

const empty: Course = { day: '2026-12-01', version: 0, seed: 1, hazards: [] };

test('integer trig matches expected landmarks', () => {
  assert.equal(sinT(0), 0);
  assert.equal(sinT(900), 16384);
  assert.equal(sinT(1800), 0);
  assert.equal(sinT(2700), -16384);
  assert.equal(cosT(0), 16384);
  assert.equal(sinT(-900), -16384);
  assert.equal(isqrt(1_000_000), 1000);
});

test('full throttle straight up an empty course finishes', () => {
  const r = replay(empty, [[3600, 1, 0]]);
  assert.equal(r.end.type, 'finish');
  assert.ok(r.ticks > 60 * 15 && r.ticks < 60 * 25, `ticks ${r.ticks}`);
});

test('steering hard right hits the bank', () => {
  const r = replay(empty, [[3600, 1, 8]]);
  assert.deepEqual([r.end.type, r.end.type === 'death' && r.end.cause], ['death', 'bank']);
});

test('drifting is slower than throttle', () => {
  // After 10 s, the throttling ferry has gone several times further.
  const fast = replay(empty, [[600, 1, 0]]), slow = replay(empty, [[600, 0, 0]]);
  const progress = (r: { path: number[] }) => START.y - r.path[r.path.length - 1];
  assert.ok(progress(fast) > progress(slow) * 3, `${progress(fast)} vs ${progress(slow)}`);
});

test('a searchlight pointed at the lane catches a throttling ferry', () => {
  const c: Course = { ...empty, hazards: [{ id: 'L', kind: 'searchlight', x: 380, y: 1500, angle: 2700 }] };
  const r = replay(c, [[3600, 1, 0]]);
  assert.equal(r.end.type, 'death');
  assert.equal(r.end.type === 'death' && r.end.cause, 'caught');
  assert.equal(r.end.type === 'death' && r.end.hazardId, 'L');
});

test('replay equals stepping by hand and is deterministic', () => {
  const course = baseCourse('2026-12-01');
  const log: InputLog = [];
  const s = createRun(course);
  for (let i = 0; i < 900 && !s.done; i++) {
    const input = { engine: (i % 90 < 60 ? 1 : 0) as 0 | 1, steer: ((i >> 5) % 5) - 2 };
    appendInput(log, input);
    step(s, input);
  }
  const a = replay(course, log), b = replay(course, log);
  assert.deepEqual(a, b);
  assert.equal(a.ticks, s.tick);
  assert.deepEqual(a.end, s.done ?? a.end);
});

test('the Gate 0 base course is solvable by the bot', () => {
  const course = baseCourse('2026-12-01');
  const log = solve(course);
  assert.ok(log, 'bot found no route');
  const r = replay(course, log!);
  assert.equal(r.end.type, 'finish');
});

test('validLog rejects junk', () => {
  assert.equal(validLog([[10, 1, 0]]), true);
  assert.equal(validLog([[10, 2, 0]]), false);
  assert.equal(validLog([[10, 1, 9]]), false);
  assert.equal(validLog([[99999, 1, 0]]), false);
  assert.equal(validLog('x'), false);
});

test('placement rules', () => {
  const course = baseCourse('2026-12-01');
  assert.equal(validatePlacement(course, { id: 'p', kind: 'mine', x: 200, y: START.y }), 'Too close to a dock.');
  assert.equal(validatePlacement(course, { id: 'p', kind: 'mine', x: 110, y: 1960 }), 'Too close to another hazard.');
  assert.equal(validatePlacement(course, { id: 'p', kind: 'mine', x: 300, y: 1100 }), null);
});
