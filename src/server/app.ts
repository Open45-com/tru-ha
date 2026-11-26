// HTTP API (BUILD_PLAN §4). Platform-agnostic: Devvit and the local dev server
// both call createApp with their own store and user lookup.
import { Hono } from 'hono';
import { replay, validLog, type Course } from '../sim/index.ts';
import { baseCourse, dayKey } from '../sim/courses.ts';

export type Store = {
  best(day: string, user: string): Promise<number | null>;
  submit(day: string, user: string, ticks: number): Promise<boolean>; // true if new best
  rank(day: string, user: string): Promise<number | null>;
  top(day: string, n: number): Promise<{ user: string; ticks: number }[]>;
  incr(day: string, field: string): Promise<void>;
  stats(day: string): Promise<Record<string, number>>;
  rateLimit(key: string, ms: number): Promise<boolean>; // true if allowed
};

export type Deps = {
  store: Store;
  user: () => Promise<string | null>;
  now?: () => number;
  createPost?: (day: string) => Promise<string>; // returns URL
};

const noCache = { 'Cache-Control': 'private, no-store' };

export function createApp({ store, user, now = Date.now, createPost }: Deps) {
  const app = new Hono();
  const course = (day: string): Course => baseCourse(day);

  app.get('/api/state', async c => {
    const day = dayKey(now());
    const me = await user();
    const [best, rank, fastest, stats] = await Promise.all([
      me ? store.best(day, me) : null,
      me ? store.rank(day, me) : null,
      store.top(day, 10),
      store.stats(day),
    ]);
    return c.json({ day, course: course(day), me: { username: me, best, rank }, boards: { fastest }, stats }, 200, noCache);
  });

  app.post('/api/run', async c => {
    const body = await c.req.json().catch(() => null) as { day?: string; version?: number; log?: unknown } | null;
    const today = dayKey(now());
    if (!body || body.day !== today) return c.json({ error: 'This course has closed. Reload for tonight’s course.' }, 409, noCache);
    if (!validLog(body.log)) return c.json({ error: 'Invalid run.' }, 400, noCache);
    const me = await user();
    if (me && !(await store.rateLimit(`run:${me}`, 1500))) return c.json({ error: 'Slow down.' }, 429, noCache);
    const r = replay(course(today), body.log);
    await store.incr(today, 'runs');
    if (r.end.type === 'death') await store.incr(today, 'sinks');
    let newBest = false;
    if (r.end.type === 'finish') {
      await store.incr(today, 'finishes');
      if (me) newBest = await store.submit(today, me, r.ticks);
    }
    const [best, rank, fastest] = await Promise.all([
      me ? store.best(today, me) : null,
      me ? store.rank(today, me) : null,
      store.top(today, 10),
    ]);
    return c.json({ end: r.end, ticks: r.ticks, best, rank, newBest, boards: { fastest } }, 200, noCache);
  });

  app.post('/internal/menu/post-create', async c => {
    if (!createPost) return c.json({ showToast: 'Post creation is not available here.' }, 400);
    const url = await createPost(dayKey(now()));
    return c.json({ navigateTo: url });
  });

  return app;
}

/** In-memory store for local dev and tests. */
export function memoryStore(): Store {
  const best = new Map<string, Map<string, number>>();
  const stats = new Map<string, Record<string, number>>();
  const limits = new Map<string, number>();
  const day = (d: string) => { if (!best.has(d)) best.set(d, new Map()); return best.get(d)!; };
  const sorted = (d: string) => [...day(d)].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
  return {
    async best(d, u) { return day(d).get(u) ?? null; },
    async submit(d, u, t) { const cur = day(d).get(u); if (cur !== undefined && cur <= t) return false; day(d).set(u, t); return true; },
    async rank(d, u) { const i = sorted(d).findIndex(([n]) => n === u); return i < 0 ? null : i; },
    async top(d, n) { return sorted(d).slice(0, n).map(([user, ticks]) => ({ user, ticks })); },
    async incr(d, f) { const s = stats.get(d) ?? {}; s[f] = (s[f] ?? 0) + 1; stats.set(d, s); },
    async stats(d) { return stats.get(d) ?? {}; },
    async rateLimit(k, ms) { const t = Date.now(), last = limits.get(k) ?? 0; if (t - last < ms) return false; limits.set(k, t); return true; },
  };
}
