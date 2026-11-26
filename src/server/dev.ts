// Local dev server: serves dist/client and the same API with an in-memory store.
// The player name comes from ?as=<name> on the page URL (forwarded as a header),
// so two browser tabs can act as two players.
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { createApp, memoryStore } from './app.ts';

const store = memoryStore();
const root = new Hono();
root.use('/api/*', async (c, next) => {
  const name = c.req.header('x-wake-user') ?? new URL(c.req.header('referer') ?? 'http://x/').searchParams.get('as');
  const api = createApp({ store, user: async () => name || 'local_tester' });
  return api.fetch(c.req.raw);
});
root.use('/*', serveStatic({ root: './dist/client' }));
const port = Number(process.env.PORT || 5173);
serve({ fetch: root.fetch, port, hostname: process.env.HOST || '127.0.0.1' }, () => {
  console.log(`\n  Wake dev server: http://127.0.0.1:${port}/`);
  console.log(`  Second player:   http://127.0.0.1:${port}/?as=second_player`);
  console.log(`  Phone on the same Wi-Fi: run with HOST=0.0.0.0 (see README)\n`);
});
