// Base course layouts. Gate 0 has one hand-made layout; Gate 1 adds the
// 12 day templates and the solvability bot (BUILD_PLAN §6).
import type { Course, Hazard } from './index.ts';
import { hashString } from './trig.ts';

const GATE0: Hazard[] = [
  { id: 'base-rock-1', kind: 'rock', x: 110, y: 1950, size: 'm' },
  { id: 'base-light-1', kind: 'searchlight', x: 340, y: 1700, angle: 2700 },
  { id: 'base-rock-2', kind: 'rock', x: 270, y: 1420, size: 'l' },
  { id: 'base-mine-1', kind: 'mine', x: 130, y: 1300 },
  { id: 'base-mine-2', kind: 'mine', x: 200, y: 1180 },
  { id: 'base-barge-1', kind: 'barge', x: 120, y: 980, dir: 1 },
  { id: 'base-light-2', kind: 'searchlight', x: 60, y: 720, angle: 900 },
  { id: 'base-rock-3', kind: 'rock', x: 250, y: 520, size: 's' },
  { id: 'base-rock-4', kind: 'rock', x: 340, y: 390, size: 'm' },
  { id: 'base-mine-3', kind: 'mine', x: 160, y: 300 },
];

export function baseCourse(day: string): Course {
  return { day, version: 0, seed: hashString('wake:' + day), hazards: GATE0.map(h => ({ ...h })) };
}

export function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
