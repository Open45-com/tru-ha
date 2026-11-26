#!/usr/bin/env node
// Builds Wake.
//   node tools/build.cjs        dist/client (game), dist/server (Devvit), dist/dev (local server)
//   node tools/build.cjs --dev  build, then watch the client and run the local dev server
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '..');
const at = (...p) => path.join(root, ...p);
const dev = process.argv.includes('--dev');

function copyStatic() {
  const out = at('dist/client');
  fs.mkdirSync(out, { recursive: true });
  for (const f of ['index.html', 'style.css']) fs.copyFileSync(at('src/client', f), path.join(out, f));
  // Only delivered runtime art; sources and review renders stay out of the bundle.
  for (const dir of ['models', 'textures', 'ui']) {
    const src = at('art', dir);
    if (!fs.existsSync(src)) continue;
    fs.cpSync(src, path.join(out, 'art', dir), { recursive: true, filter: p => !p.endsWith('.gitkeep') });
  }
}

const client = {
  entryPoints: [at('src/client/main.ts')], outfile: at('dist/client/game.js'),
  bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: !dev, sourcemap: dev, logLevel: 'info',
};
const server = (entry, outfile) => ({
  entryPoints: [at(entry)], outfile: at(outfile), bundle: true, platform: 'node', target: 'node22', format: 'cjs', logLevel: 'warning',
});

async function main() {
  fs.rmSync(at('dist'), { recursive: true, force: true });
  copyStatic();
  await Promise.all([
    esbuild.build(client),
    esbuild.build(server('src/server/devvit.ts', 'dist/server/index.cjs')),
    esbuild.build(server('src/server/dev.ts', 'dist/dev/server.cjs')),
  ]);
  if (!dev) return;
  const ctx = await esbuild.context({ ...client, plugins: [{ name: 'static', setup(b) { b.onEnd(() => copyStatic()); } }] });
  await ctx.watch();
  const child = spawn(process.execPath, [at('dist/dev/server.cjs')], { cwd: root, stdio: 'inherit' });
  process.on('SIGINT', () => { child.kill(); process.exit(0); });
}
main().catch(e => { console.error(e); process.exitCode = 1; });
