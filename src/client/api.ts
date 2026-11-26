import type { Course, Event, InputLog } from '../sim/index.ts';
import { baseCourse, dayKey } from '../sim/courses.ts';

export type Board = { user: string; ticks: number }[];
export type State = {
  day: string;
  course: Course;
  me: { username: string | null; best: number | null; rank: number | null };
  boards: { fastest: Board };
  stats: Record<string, number>;
  offline?: boolean;
};
export type RunResult = { end: Event; ticks: number; best: number | null; rank: number | null; newBest: boolean; boards: { fastest: Board } };

export async function getState(): Promise<State> {
  try {
    const r = await fetch('/api/state', { cache: 'no-store' });
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } catch {
    // No server (opened as a static page): play the base course locally.
    const day = dayKey(Date.now());
    return { day, course: baseCourse(day), me: { username: null, best: null, rank: null }, boards: { fastest: [] }, stats: {}, offline: true };
  }
}

export async function submitRun(day: string, version: number, log: InputLog): Promise<RunResult | null> {
  try {
    const r = await fetch('/api/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ day, version, log }) });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}
