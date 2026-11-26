// Wake deterministic simulation. Shared by the client (to play) and the server
// (to verify replays). Integer math only, fixed 60 ticks per second.
// Units: 1 sim unit = 0.1 m. Course is 400 wide (x) and 2400 long (y).
// y = 0 is the top of the course (finish side); the ferry travels toward -y.
import { ONE, sinT, cosT, isqrt, hashString } from './trig.ts';

export const TICKS_PER_SECOND = 60;
export const COURSE_W = 400;
export const COURSE_L = 2400;
export const START = { x: 200, y: 2300 };
export const FINISH_Y = 100;
export const MAX_TICKS = 3600;

// Fixed point for ferry position and speed: 1 sim unit = Q.
export const Q = 4096;

export const TUNING = {
  maxSpeed: 2 * Q,        // 12 m/s
  accel: 34,              // ~3 m/s^2
  coast: 14,              // ~1.2 m/s^2
  drift: 1229,            // ~1.8 m/s
  turnRate: 20,           // tenths of a degree per tick (120°/s)
  maxHeading: 400,        // ±40°
  steerStep: 50,          // heading per steer level (8 levels = 40°)
  hullR: 14,              // hitbox circle radius
  hullOffset: 26,         // circle offsets along heading
  rockR: { s: 20, m: 32, l: 48 } as Record<string, number>,
  isletR: 22,
  coneLen: 220,
  coneTan: 3483,          // tan(12°) * ONE
  sweepAmp: 450,          // ±45°
  sweepSpeed: 8,          // tenths of a degree per tick (48°/s)
  meterOn: 3, meterOff: 1, meterDecay: 2, meterCatch: 45,
  bargeHalfW: 70, bargeHalfH: 25, bargeSpeed: 3277, bargeMinX: 70, bargeMaxX: 330,
  mineR: 10,
  whirlPull: 80, whirlCore: 14, whirlForce: 2048,
  placeMinGap: 70, placeMinY: 200, placeMaxY: 2200, placeEdgeGap: 100,
};

export type Input = { engine: 0 | 1; steer: number };
export type InputLog = [ticks: number, engine: 0 | 1, steer: number][];
export type Hazard =
  | { id: string; kind: 'rock'; x: number; y: number; size: 's' | 'm' | 'l' }
  | { id: string; kind: 'searchlight'; x: number; y: number; angle: number }
  | { id: string; kind: 'barge'; x: number; y: number; dir: 1 | -1 }
  | { id: string; kind: 'mine'; x: number; y: number }
  | { id: string; kind: 'whirlpool'; x: number; y: number };
export type Course = { day: string; version: number; seed: number; hazards: Hazard[] };
export type DeathCause = 'bank' | 'rock' | 'caught' | 'barge' | 'mine' | 'whirlpool' | 'timeout';
export type Event =
  | { type: 'finish'; tick: number }
  | { type: 'death'; tick: number; cause: DeathCause; hazardId?: string }
  | { type: 'nearMiss'; tick: number; hazardId: string }
  | { type: 'spotted'; tick: number; hazardId: string };

export type RunState = {
  course: Course;
  tick: number;
  x: number; y: number;     // Q fixed point
  speed: number;            // Q per tick
  heading: number;          // tenths of a degree, 0 = up the course, + = clockwise (toward +x)
  engine: 0 | 1;
  meter: number;            // detection 0..meterCatch
  litBy: string | null;     // searchlight currently on the ferry
  peak: number;             // highest meter during the current exposure
  done: Event | null;
};

export function createRun(course: Course): RunState {
  return { course, tick: 0, x: START.x * Q, y: START.y * Q, speed: TUNING.drift, heading: 0, engine: 0, meter: 0, litBy: null, peak: 0, done: null };
}

// --- hazard motion (pure functions of tick, so render and sim agree) ---

function phaseOf(h: Hazard): number { return hashString(h.id) % 1800; }

export function searchlightAngle(h: Hazard & { angle: number }, tick: number): number {
  const p = (tick * TUNING.sweepSpeed + phaseOf(h)) % 1800;
  const off = p < 900 ? p - 450 : 1350 - p;
  return h.angle + off;
}

export function bargeX(h: Hazard & { dir: 1 | -1 }, tick: number): number { // returns Q fixed point
  const min = TUNING.bargeMinX * Q, span = (TUNING.bargeMaxX - TUNING.bargeMinX) * Q;
  const start = Math.min(Math.max(h.x * Q, min), min + span) - min;
  let p = (h.dir === 1 ? start : 2 * span - start) + tick * TUNING.bargeSpeed;
  p %= 2 * span;
  return min + (p <= span ? p : 2 * span - p);
}

export function hazardStateAt(h: Hazard, tick: number): { x: number; y: number; angle?: number } {
  if (h.kind === 'searchlight') return { x: h.x, y: h.y, angle: searchlightAngle(h, tick) };
  if (h.kind === 'barge') return { x: bargeX(h, tick) / Q, y: h.y };
  return { x: h.x, y: h.y };
}

// --- helpers ---

function hullCircles(s: RunState): [number, number][] {
  const dx = sinT(s.heading), dy = -cosT(s.heading), o = TUNING.hullOffset * Q;
  const out: [number, number][] = [];
  for (const k of [1, 0, -1]) out.push([s.x + Math.trunc((dx * o * k) / ONE), s.y + Math.trunc((dy * o * k) / ONE)]);
  return out; // bow, middle, stern (Q fixed point)
}

function within(ax: number, ay: number, bx: number, by: number, r: number): boolean {
  const dx = ax - bx, dy = ay - by, R = r * Q;
  return dx * dx + dy * dy <= R * R;
}

function inCone(px: number, py: number, h: Hazard & { angle: number }, tick: number): boolean {
  const a = searchlightAngle(h, tick);
  const vx = Math.trunc(px / Q) - h.x, vy = Math.trunc(py / Q) - h.y;
  const dx = sinT(a), dy = -cosT(a);
  const along = vx * dx + vy * dy;           // scaled by ONE
  if (along <= 0 || along > TUNING.coneLen * ONE) return false;
  const across = Math.abs(vx * dy - vy * dx); // scaled by ONE
  return across * ONE <= along * TUNING.coneTan;
}

// --- one tick ---

export function step(s: RunState, input: Input): Event[] {
  if (s.done) return [];
  const T = TUNING, events: Event[] = [];
  s.tick++;
  s.engine = input.engine ? 1 : 0;

  // Throttle
  if (s.engine) s.speed = Math.min(T.maxSpeed, s.speed + T.accel);
  else s.speed = Math.max(T.drift, s.speed - T.coast);

  // Steering toward target heading
  const steer = Math.max(-8, Math.min(8, Math.trunc(input.steer)));
  const target = Math.max(-T.maxHeading, Math.min(T.maxHeading, steer * T.steerStep));
  if (s.heading < target) s.heading = Math.min(target, s.heading + T.turnRate);
  else if (s.heading > target) s.heading = Math.max(target, s.heading - T.turnRate);

  // Move
  s.x += Math.trunc((s.speed * sinT(s.heading)) / ONE);
  s.y -= Math.trunc((s.speed * cosT(s.heading)) / ONE);

  // Whirlpool pull (moves the ferry toward the center)
  for (const h of s.course.hazards) {
    if (h.kind !== 'whirlpool') continue;
    const vx = h.x * Q - s.x, vy = h.y * Q - s.y;
    const d = isqrt(Math.trunc((vx * vx + vy * vy) / Q)); // sqrt in units of sqrt(Q)
    const dist = Math.trunc((d * 64) / Q);                 // back to sim units (sqrt(4096) = 64)
    if (dist > 0 && dist < T.whirlPull) {
      const f = Math.trunc((T.whirlForce * (T.whirlPull - dist)) / T.whirlPull);
      s.x += Math.trunc((vx * f) / (dist * Q));
      s.y += Math.trunc((vy * f) / (dist * Q));
    }
  }

  const hull = hullCircles(s);
  const die = (cause: DeathCause, hazardId?: string): Event[] => {
    s.done = { type: 'death', tick: s.tick, cause, ...(hazardId ? { hazardId } : {}) };
    events.push(s.done);
    return events;
  };

  // Banks
  for (const [cx] of hull) if (cx < T.hullR * Q || cx > (COURSE_W - T.hullR) * Q) return die('bank');

  // Collisions
  for (const h of s.course.hazards) {
    for (const [cx, cy] of hull) {
      if (h.kind === 'rock' && within(cx, cy, h.x * Q, h.y * Q, (T.rockR[h.size] ?? 32) + T.hullR)) return die('rock', h.id);
      if (h.kind === 'searchlight' && within(cx, cy, h.x * Q, h.y * Q, T.isletR + T.hullR)) return die('rock', h.id);
      if (h.kind === 'mine' && within(cx, cy, h.x * Q, h.y * Q, T.mineR + T.hullR)) return die('mine', h.id);
      if (h.kind === 'whirlpool' && within(cx, cy, h.x * Q, h.y * Q, T.whirlCore + T.hullR)) return die('whirlpool', h.id);
      if (h.kind === 'barge') {
        const bx = bargeX(h, s.tick), by = h.y * Q;
        const nx = Math.max(bx - T.bargeHalfW * Q, Math.min(cx, bx + T.bargeHalfW * Q));
        const ny = Math.max(by - T.bargeHalfH * Q, Math.min(cy, by + T.bargeHalfH * Q));
        if (within(cx, cy, nx, ny, T.hullR)) return die('barge', h.id);
      }
    }
  }

  // Searchlights: detection meter
  let lit: string | null = null;
  for (const h of s.course.hazards) {
    if (h.kind !== 'searchlight') continue;
    if (hull.some(([cx, cy]) => inCone(cx, cy, h, s.tick))) { lit = h.id; break; }
  }
  if (lit) {
    if (!s.litBy) events.push({ type: 'spotted', tick: s.tick, hazardId: lit });
    s.meter += s.engine ? T.meterOn : T.meterOff;
    s.litBy = lit;
    s.peak = Math.max(s.peak, s.meter);
    if (s.meter >= T.meterCatch) { s.meter = T.meterCatch; return die('caught', lit); }
  } else {
    if (s.litBy && s.peak >= Math.trunc(T.meterCatch / 2)) events.push({ type: 'nearMiss', tick: s.tick, hazardId: s.litBy });
    if (s.litBy) s.peak = 0;
    s.litBy = null;
    s.meter = Math.max(0, s.meter - T.meterDecay);
  }

  // Finish: bow crosses the line
  if (hull[0][1] <= FINISH_Y * Q) {
    s.done = { type: 'finish', tick: s.tick };
    events.push(s.done);
    return events;
  }
  if (s.tick >= MAX_TICKS) return die('timeout');
  return events;
}

// --- input logs ---

export function appendInput(log: InputLog, input: Input): void {
  const last = log[log.length - 1];
  if (last && last[1] === input.engine && last[2] === input.steer) last[0]++;
  else log.push([1, input.engine, input.steer]);
}

export function validLog(log: unknown): log is InputLog {
  if (!Array.isArray(log) || log.length > 4000) return false;
  let total = 0;
  for (const e of log) {
    if (!Array.isArray(e) || e.length !== 3) return false;
    const [n, en, st] = e;
    if (!Number.isInteger(n) || n < 1 || (en !== 0 && en !== 1) || !Number.isInteger(st) || st < -8 || st > 8) return false;
    total += n;
  }
  return total <= MAX_TICKS;
}

export function replay(course: Course, log: InputLog, maxTicks = MAX_TICKS): { end: Event; ticks: number; path: number[] } {
  const s = createRun(course);
  const path: number[] = [START.x, START.y];
  for (const [n, engine, steer] of log) {
    for (let i = 0; i < n; i++) {
      step(s, { engine, steer });
      if (s.tick % 6 === 0) path.push(Math.trunc(s.x / Q), Math.trunc(s.y / Q));
      if (s.done) return { end: s.done, ticks: s.tick, path };
      if (s.tick >= maxTicks) break;
    }
  }
  // Log ran out before the run ended: treat as abandoned.
  return { end: { type: 'death', tick: s.tick, cause: 'timeout' }, ticks: s.tick, path };
}

// --- placement ---

export function validatePlacement(course: Course, h: Hazard): string | null {
  const T = TUNING;
  if (!Number.isInteger(h.x) || !Number.isInteger(h.y)) return 'Position must be whole units.';
  if (h.y < T.placeMinY || h.y > T.placeMaxY) return 'Too close to a dock.';
  if (Math.abs(h.y - FINISH_Y) < T.placeEdgeGap || Math.abs(h.y - START.y) < T.placeEdgeGap) return 'Too close to the start or finish.';
  const margin = h.kind === 'barge' ? 0 : 30;
  if (h.x < margin || h.x > COURSE_W - margin) return 'Must be in the water.';
  for (const o of course.hazards) {
    const dx = o.x - h.x, dy = o.y - h.y;
    if (o.kind === 'barge' || h.kind === 'barge') { if (Math.abs(dy) < T.placeMinGap) return 'Too close to another hazard.'; continue; }
    if (dx * dx + dy * dy < T.placeMinGap * T.placeMinGap) return 'Too close to another hazard.';
  }
  if (h.kind === 'searchlight' && !Number.isInteger(h.angle)) return 'Angle must be whole tenths of a degree.';
  if (h.kind === 'barge' && h.dir !== 1 && h.dir !== -1) return 'Barge direction must be 1 or -1.';
  return null;
}

export { ONE, sinT, cosT, isqrt, hashString };
