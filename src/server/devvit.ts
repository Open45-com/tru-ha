// Devvit server entry. Bundled to dist/server/index.cjs by tools/build.cjs.
import { serve } from '@hono/node-server';
import { context, createServer, getServerPort, reddit, redis } from '@devvit/web/server';
import { createApp, type Store } from './app.ts';

const k = (day: string, part: string) => `wake:${day}:${part}`;

const store: Store = {
  async best(day, user) { return (await redis.zScore(k(day, 'best'), user)) ?? null; },
  async submit(day, user, ticks) {
    const cur = await redis.zScore(k(day, 'best'), user);
    if (cur !== undefined && cur !== null && cur <= ticks) return false;
    await redis.zAdd(k(day, 'best'), { member: user, score: ticks });
    return true;
  },
  async rank(day, user) { return (await redis.zRank(k(day, 'best'), user)) ?? null; },
  async top(day, n) { return (await redis.zRange(k(day, 'best'), 0, n - 1)).map(r => ({ user: r.member, ticks: r.score })); },
  async incr(day, field) { await redis.hIncrBy(k(day, 'stats'), field, 1); },
  async stats(day) {
    const raw = (await redis.hGetAll(k(day, 'stats'))) ?? {};
    return Object.fromEntries(Object.entries(raw).map(([f, v]) => [f, Number(v)]));
  },
  async rateLimit(key, ms) {
    const full = 'wake:rl:' + key, now = Date.now();
    const last = Number((await redis.get(full)) ?? 0);
    if (now - last < ms) return false;
    await redis.set(full, String(now));
    await redis.expire(full, Math.ceil(ms / 1000) + 1);
    return true;
  },
};

const app = createApp({
  store,
  user: async () => { try { return (await reddit.getCurrentUsername()) ?? null; } catch { return null; } },
  createPost: async day => {
    if (!context.subredditName) throw new Error('Open the test subreddit first.');
    const post = await reddit.submitCustomPost({ title: `Wake · Night of ${day}`, postData: { day } });
    return `https://www.reddit.com/r/${context.subredditName}/comments/${post.id.replace(/^t3_/, '')}`;
  },
});

serve({ fetch: app.fetch, createServer, port: getServerPort() });
