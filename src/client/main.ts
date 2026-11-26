// Wake Gate 0 client: one course, run / die / retry / finish.
import { createRun, step, appendInput, TICKS_PER_SECOND, type RunState, type InputLog, type Event, type Hazard } from '../sim/index.ts';
import { World, CAMERAS, type CameraName } from './world.ts';
import { Controls } from './input.ts';
import { getState, submitRun, type State, type Board } from './api.ts';
import { solve } from '../sim/bot.ts';

const params = new URLSearchParams(location.search);
// ?demo plays the solver's route so agents can watch the whole course. Demo runs are never submitted.
const demo = params.has('demo');
let demoInputs: { engine: 0 | 1; steer: number }[] = [];

const $ = (id: string) => document.getElementById(id)!;
const canvas = $('scene') as HTMLCanvasElement;
const world = new World(canvas);
const controls = new Controls($('touch'));

type Mode = 'title' | 'run' | 'dead' | 'finish';
let mode: Mode = 'title';
let state: State;
let run: RunState;
let prev = { x: 0, y: 0, heading: 0 };
let log: InputLog = [];
let acc = 0;
let slowUntil = 0;
let deadAt = 0;
let localBest: number | null = null;

const fmt = (ticks: number) => (ticks / TICKS_PER_SECOND).toFixed(2);

function show(id: string | null) {
  for (const el of document.querySelectorAll<HTMLElement>('.card')) el.hidden = el.id !== id;
}

function newRun() {
  run = createRun(state.course);
  prev = { x: run.x, y: run.y, heading: run.heading };
  log = [];
  acc = 0;
  world.reset();
  controls.reset();
}

function start() {
  newRun();
  mode = 'run';
  controls.enabled = true;
  show(null);
  $('hud').hidden = false;
}

const CAUSE: Record<string, string> = {
  caught: 'Caught in the searchlight',
  rock: 'Ran aground',
  bank: 'Hit the bank',
  barge: 'Rammed by a barge',
  mine: 'Hit a mine',
  whirlpool: 'Pulled into a whirlpool',
  timeout: 'Out of time',
};

function hazardName(id?: string): string {
  if (!id) return '';
  const h = state.course.hazards.find((x: Hazard) => x.id === id);
  if (!h) return '';
  return id.startsWith('base-') ? `The harbor's ${h.kind}` : `u/${(h as any).owner ?? 'someone'}'s ${h.kind}`;
}

function onEvent(e: Event) {
  if (e.type === 'nearMiss') {
    slowUntil = performance.now() + 250;
    flash('Near miss');
  }
  if (e.type === 'death') {
    mode = 'dead';
    deadAt = performance.now();
    controls.enabled = false;
    world.sink(e.cause === 'caught' ? e.hazardId ?? null : null);
    navigator.vibrate?.(20);
    $('dead-title').textContent = CAUSE[e.cause] ?? 'Sunk';
    $('dead-by').textContent = hazardName(e.hazardId);
    $('dead-time').textContent = `${fmt(e.tick)} s · ${Math.round(((2300 - run.y / 4096) / 2200) * 100)}% of the way`;
    setTimeout(() => { if (mode === 'dead') show('dead'); }, 450);
    if (!demo) submitRun(state.day, state.course.version, log);
    if (demo) setTimeout(() => { if (mode === 'dead') start(); }, 1800);
  }
  if (e.type === 'finish') {
    mode = 'finish';
    controls.enabled = false;
    world.finish();
    const t = e.tick;
    const pb = localBest === null || t < localBest;
    if (pb) localBest = t;
    $('fin-time').textContent = fmt(t);
    $('fin-best').textContent = pb ? 'New personal best' : `Best ${fmt(localBest!)}`;
    $('fin-rank').textContent = '';
    renderBoard(state.boards.fastest);
    setTimeout(() => { if (mode === 'finish') show('finish'); }, 900);
    if (demo) { setTimeout(() => { if (mode === 'finish') start(); }, 3000); return; }
    submitRun(state.day, state.course.version, log).then(r => {
      if (!r) { $('fin-rank').textContent = state.offline ? 'Offline: time not saved' : 'Could not save this run'; return; }
      state.boards.fastest = r.boards.fastest;
      if (r.best !== null) localBest = Math.min(localBest ?? r.best, r.best);
      $('fin-rank').textContent = r.rank !== null ? `Rank #${r.rank + 1} today` : 'Log in to save your time';
      renderBoard(r.boards.fastest);
    });
  }
}

function renderBoard(b: Board) {
  const el = $('board');
  el.innerHTML = '';
  b.slice(0, 5).forEach((r, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${i + 1}</span><span></span><span>${fmt(r.ticks)}</span>`;
    li.children[1].textContent = 'u/' + r.user;
    el.appendChild(li);
  });
  el.hidden = b.length === 0;
}

let toastTimer = 0;
function flash(text: string) {
  const t = $('toast');
  t.textContent = text;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.remove('on'), 700);
}

// --- loop ---

let last = performance.now();
function frame(now: number) {
  let dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (now < slowUntil) dt *= 0.5;
  if (mode === 'run') {
    acc += dt;
    const tick = 1 / TICKS_PER_SECOND;
    while (acc >= tick && mode === 'run') {
      prev = { x: run.x, y: run.y, heading: run.heading };
      const input = demo ? demoInputs[run.tick] ?? { engine: 0, steer: 0 } : controls.sample();
      appendInput(log, input);
      for (const e of step(run, input)) onEvent(e);
      acc -= tick;
    }
    $('timer').textContent = fmt(run.tick);
  }
  const alpha = mode === 'run' ? acc * TICKS_PER_SECOND : 1;
  world.update(run, prev, alpha, dt);
  requestAnimationFrame(frame);
}

function resize() {
  const r = canvas.getBoundingClientRect();
  world.resize(Math.round(r.width), Math.round(r.height));
}

// --- wiring ---

$('play').addEventListener('click', start);
$('retry').addEventListener('click', start);
$('again').addEventListener('click', start);
$('dead').addEventListener('pointerdown', () => { if (performance.now() - deadAt > 500) start(); });
addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === 'r') && mode !== 'run') start();
  if (e.key === 'c') cycleCamera();
});
$('cam').addEventListener('click', cycleCamera);
function cycleCamera() {
  const names = Object.keys(CAMERAS) as CameraName[];
  world.camName = names[(names.indexOf(world.camName) + 1) % names.length];
  $('cam').textContent = '🎥 ' + CAMERAS[world.camName].label;
  try { localStorage.setItem('wake.cam', world.camName); } catch {}
}
new ResizeObserver(resize).observe(canvas);

(async () => {
  try { const c = localStorage.getItem('wake.cam') as CameraName | null; if (c && c in CAMERAS) world.camName = c; } catch {}
  const q = params.get('cam') as CameraName | null;
  if (q && q in CAMERAS) world.camName = q;
  $('cam').textContent = '🎥 ' + CAMERAS[world.camName].label;
  state = await getState();
  if (state.me.best !== null) localBest = state.me.best;
  $('title-best').textContent = state.boards.fastest[0] ? `Today's best: ${fmt(state.boards.fastest[0].ticks)} s by u/${state.boards.fastest[0].user}` : 'No one has crossed tonight. Be first.';
  newRun();
  await world.setCourse(state.course);
  resize();
  $('loading').hidden = true;
  show('title');
  requestAnimationFrame(frame);
  if (demo) {
    const route = solve(state.course) ?? [];
    demoInputs = route.flatMap(([n, engine, steer]) => Array.from({ length: n }, () => ({ engine, steer })));
    start();
  }
})();
