// Solvability bot: beam search over inputs. Used by tests now and by the
// server (Gate 1) to reject courses nobody could finish.
import { createRun, step, appendInput, Q, type Course, type InputLog, type RunState } from './index.ts';

const CHOICES: [0 | 1, number][] = [];
for (const e of [1, 0] as const) for (const s of [0, -4, 4, -8, 8]) CHOICES.push([e, s]);

type Node = { s: RunState; log: InputLog; score: number };

function clone(n: Node): Node {
  return { s: { ...n.s }, log: n.log.map(e => [...e] as [number, 0 | 1, number]), score: n.score };
}

export function solve(course: Course, { width = 160, hold = 8, maxDecisions = 500 } = {}): InputLog | null {
  let beam: Node[] = [{ s: createRun(course), log: [], score: 0 }];
  const seen = new Set<string>();
  for (let d = 0; d < maxDecisions && beam.length; d++) {
    const next: Node[] = [];
    for (const node of beam) {
      for (const [engine, steer] of CHOICES) {
        const n = clone(node);
        for (let i = 0; i < hold && !n.s.done; i++) { appendInput(n.log, { engine, steer }); step(n.s, { engine, steer }); }
        if (n.s.done?.type === 'finish') return n.log;
        if (n.s.done) continue;
        // Moving hazards make time part of the state, so bucket by tick too.
        const key = `${Math.trunc(n.s.x / Q / 6)},${Math.trunc(n.s.y / Q / 6)},${n.s.heading},${Math.trunc(n.s.meter / 8)},${Math.trunc(n.s.tick / 24)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        n.score = -n.s.y / Q - n.s.meter * 3 - n.s.tick * 0.05;
        next.push(n);
      }
    }
    next.sort((a, b) => b.score - a.score);
    // Keep diversity: every node shares the same tick, so slow (waiting) nodes
    // would always lose to fast ones. Cap each lane x speed group instead.
    const keep: Node[] = [], lanes = new Map<number, number>();
    for (const n of next) {
      const lane = Math.trunc(n.s.y / Q / 20) * 100 + Math.trunc(n.s.x / Q / 25);
      const c = lanes.get(lane) ?? 0;
      if (c >= 6) continue;
      lanes.set(lane, c + 1);
      keep.push(n);
      if (keep.length >= width) break;
    }
    beam = keep;
  }
  return null;
}
