# Wake — Build plan

How the game is built, who owns what, and the contracts that let agents work in parallel without breaking each other. Design is in [GAME_PLAN.md](GAME_PLAN.md) and art in [ASSET_LIST.md](ASSET_LIST.md).

Deadline: **Dec 8, 6 p.m. Pacific (Dec 9, 7:30 a.m. IST).** Ship gates are listed below. There are no day-by-day dates, because the gates are what matter.

## 1. Stack

| Layer | Choice |
| --- | --- |
| Platform | Devvit Web (`@devvit/web`), custom post, `height: tall` |
| Client | TypeScript + **Three.js** (WebGL2), postprocessing with bloom. HTML/CSS overlay for UI. Bundled with esbuild. |
| Server | Hono on Devvit's Node server, Devvit Redis, scheduler, Reddit API (comments, posts) |
| Shared | `src/sim/`: deterministic simulation in plain TypeScript, imported by **both** client and server |
| Tests | `node --test` (via `tsx`), with golden replay files |

## 2. The one rule: the sim is deterministic

The server never trusts a time or a death sent by the client. The client sends its **inputs**, and the server **replays** them through the same sim. That gives us cheat-proof leaderboards, the "prove your trap" check, kill attribution, ghost wakes and replays, all from the same input list.

The sim therefore must:
- run at a fixed **60 ticks per second**, independent of frame rate
- use **integer math only**. Positions are in 1/10 m units (the course is 400 × 2400). Speeds and accelerations are in sub-units per tick, stored as integers scaled ×256.
- **never call** `Math.sin`, `Math.cos`, `Math.atan2`, `Math.sqrt` or `Math.random`. Use the precomputed integer sine table in `src/sim/trig.ts` (1° steps, values ×16384) and an integer square root. Randomness comes from a seeded `mulberry32`.
- have no dependence on time, the DOM or Three.js. The renderer only **reads** sim state and interpolates between ticks.

**Golden test:** `src/sim/__golden__/*.json` holds courses plus input logs and their expected results. CI replays them, and any difference fails.

## 3. Repository layout and ownership

```
src/sim/        shared deterministic sim            → Code agent 1 (engine)
src/client/     Three.js renderer, input, UI, audio → Code agent 2 (client)
src/viewer/     asset viewer for art review         → Code agent 2 (first task)
src/server/     Devvit routes, Redis, replay check  → Code agent 3 (server)
art/            models, textures, ui, audio         → Art agents A, B, C (ASSET_LIST §8)
tools/          build and check scripts             → whoever needs it; keep small
```

Only touch files you own. Change shared contracts (section 4) only through a PR labeled `contract` that every affected owner approves.

## 4. Contracts (freeze these first)

### Sim API (`src/sim/index.ts`)

```ts
export type Input = { engine: 0 | 1; steer: number };   // steer: integer -8..8
export type InputLog = [ticks: number, engine: 0|1, steer: number][]; // run-length encoded
export type Hazard =
  | { id: string; kind: 'rock'; x: number; y: number; size: 's'|'m'|'l' }
  | { id: string; kind: 'searchlight'; x: number; y: number; angle: number }   // degrees, 0 = facing -y
  | { id: string; kind: 'barge'; x: number; y: number; dir: 1 | -1 }
  | { id: string; kind: 'mine'; x: number; y: number }
  | { id: string; kind: 'whirlpool'; x: number; y: number };
export type Course = { day: string; version: number; seed: number; hazards: Hazard[]; patrol?: number[][] };
export type Event =
  | { type: 'finish'; tick: number }
  | { type: 'death'; tick: number; cause: 'bank'|'rock'|'caught'|'barge'|'mine'|'whirlpool'; hazardId?: string }
  | { type: 'nearMiss'; tick: number; hazardId: string };

export function createRun(course: Course): RunState;
export function step(state: RunState, input: Input): Event[];   // advances exactly one tick
export function replay(course: Course, log: InputLog, maxTicks = 3600): { end: Event; ticks: number; path: number[] }; // path: x,y every 6 ticks
export function validatePlacement(course: Course, h: Hazard): string | null; // null = OK, otherwise a reason
export function hazardStateAt(h: Hazard, tick: number): { x: number; y: number; angle?: number }; // for rendering
```

Coordinates use sim units (1/10 m), with x in 0..400 and y in 0..2400. y = 0 is the top, at the finish. The renderer maps sim (x, y) to Three.js (x/10 − 20, 0, y/10 − 240), so −Z is up the course.

### HTTP API (Hono on the Devvit server)

| Route | Request | Response |
| --- | --- | --- |
| `GET /api/state` | — | `{ day, course, me: { username?, best?, rank?, trap?: {hazard, victims, status: 'pending'|'live'|'washed'} }, boards: { fastest[], deadliest[] }, ghosts: InputLog[] (top 5), stats: { runs, sinks, traps } }` |
| `POST /api/run` | `{ day, version, log }` | Server replays against that version. `{ end, ticks, newBest, rank }`. A death counts its victim for `hazardId`. |
| `POST /api/trap` | `{ day, version, hazard }` | Calls `validatePlacement`. Stores the trap as pending. Returns `{ proofVersion }`: the course with the pending trap added. |
| `POST /api/trap/prove` | `{ day, proofVersion, log }` | Replays the run. If it finished, the trap goes live (the cap rule applies). Returns `{ status }`. |
| `POST /api/trap/cancel` | `{ day }` | Removes the pending trap. |
| `POST /internal/scheduler/daily` | cron `0 0 * * *` | Freezes yesterday, builds today's course (template plus Legends) and submits today's post. |
| `POST /internal/scheduler/report` | cron `5 0 * * *` | Posts the trap report comment on yesterday's post. |
| `POST /internal/menu/post-create` | moderator menu | Creates today's post manually, for testing. |

Rate limit: 1 run submission per user per 2 s, and only for runs of at least 3 s of ticks.

### Redis keys (per installation)

```
wake:{day}:course            JSON Course (live hazards), version incremented on every change
wake:{day}:course:v{n}       frozen snapshot per version (TTL 3 days) so late replays validate
wake:{day}:best              ZSET user -> best ticks (lower is better)
wake:{day}:victims:{hazId}   SET of user ids sunk by that hazard
wake:{day}:sinks             HASH hazId -> total sinks
wake:{day}:trap:{user}       JSON {hazard, status, proofVersion}
wake:{day}:ghosts            JSON top-5 InputLogs (refreshed when `best` changes)
wake:{day}:stats             HASH runs, sinks, traps
wake:post:{day}              post id
```

Updating the course uses optimistic concurrency: watch `course`, append, increment the version and write the snapshot, retrying up to 3 times.

### Asset manifest

The client loads models by name from `art/models/<name>.glb` and finds attach nodes and glow materials by the names in `art/required.json`. If a model is not delivered yet, the client shows a **clearly marked placeholder**: a magenta wireframe box with the asset name. It never shows a fake final asset.

## 5. Rendering spec (Code agent 2)

The art direction is the target frame in ASSET_LIST §2. The renderer has to deliver it:

- **Camera:** perspective, 40° FOV, pitched 55° down. It follows the ferry with damping, keeping the ferry at 70% of screen height. Visible width about 40 m. It shakes for 150 ms at 0.15 m on death.
- **Sky and fog:** gradient sky dome from `#070b16` to `#1b2a44` with sparse stars. `FogExp2` color `#1b2a44`, density 0.018.
- **Lights:** hemisphere light at 0.15 intensity, plus a cool moon directional light (`#8fb4ff`, 0.35, no shadows). A real `PointLight` at each lamp node (with a cap of 12 active point lights, nearest first) and a `SpotLight` per searchlight.
- **Searchlight cone:** an additive cone mesh with a fresnel and distance fade (shader), plus a bright oval on the water where the cone lands. When a ferry is caught, it lerps to `#ff4d2e` over 150 ms.
- **Water:** a custom shader plane. Base `#0a1424`, tinted toward `#1f4a6e` by nearby lights. Two scrolling samples of `water_normal`. Specular highlights from moon and spot lights (long glitter streaks). Foam from `foam_noise` near hulls and banks.
- **Wake:** a ribbon trail from `wake_origin`, 3 s long, getting wider and fading over its length, plus foam particles. Ghost wakes use the same ribbon at 25% opacity in cyan.
- **Post-processing:** `UnrealBloomPass` (strength 0.9, radius 0.6, threshold 0.75), ACES tone mapping, a subtle vignette and slight film grain.
- **Detection ring:** a ring decal around the ferry on the water. It fills clockwise and goes white → amber → red as the meter rises.
- **Performance budget:** 60 fps on a mid-range phone from 2022. Pixel ratio capped at 2. Under 80 draw calls (instance rocks and debris). Under 150k triangles visible. Initial download under 6 MB gzipped. Lower pixel ratio and bloom on its own if frame time stays over 20 ms for 2 s.
- **Juice:** slow motion on near misses (time scale 0.5 for 0.25 s, only in the renderer, since the sim keeps its tick rate), a splash and debris on death, the dock string lights turning on one by one at the finish, and a haptic tap (`navigator.vibrate(20)`) on death where supported.

## 6. Work plan by gate

Each gate ends with a **human playtest on a real phone** before the next gate starts.

### Gate 0 — Does it feel good? (blocks everything else)
- Agent 1: sim with ferry physics, bank, rock and searchlight, plus `replay` and golden tests.
- Agent 2: Three.js scene with placeholders, input, camera, water shader v1, searchlight cone, death and instant retry. Plus the **asset viewer** (`npm run viewer`) for the art agents.
- Agent 3: Devvit scaffold, `GET /api/state` with a fixed course, menu post creation, and a deploy to the private test subreddit.
- Art: `ferry`, `searchlight_tower`, `rock_m` through the review gate.
- **Pass:** 5 people get a phone with no instructions. At least 3 retry without being asked, and they can say what the engine button does.

### Gate 1 — The core loop works on Reddit
- Agent 1: barge, mine, `validatePlacement`, near-miss events, the 12 base templates and a solvability bot (a greedy search over inputs that must finish every template).
- Agent 2: all screens from GAME_PLAN §3, placement UI with sweep and path previews, HUD, audio, haptics.
- Agent 3: run submission and replay check, the trap flow (pending → prove → live), the 40-trap cap, both leaderboards, distinct-victim counts, the daily scheduler with Legends.
- Art: all P0 assets.
- **Pass:** two accounts on one post. A trap placed by A kills B, and A's victim count goes up. A real midnight rollover creates the next post with Legends.

### Gate 2 — Social and polish
- Ghost wakes, the trap report comment, whirlpool, P1 art, the full rendering spec in §5, performance work.
- **Pass:** testers come back the next day without a reminder and check their trap.

### Gate 3 — Stretch (only if Gate 2 passed early)
- Live ghosts (realtime), patrol boat, community course posts, flair.

### Ship
- `app_icon`, `cover`, and a 45-second video showing a run, a death by a named trap, placing and proving a trap, and the leaderboards.
- Root README explains play and testing. Devpost submission with: an English description, the Devvit app listing URL, a public test subreddit under 200 members, and the direct post URL. Check every link from a second account. Keep the app free and installed through judging.

## 7. Definition of done for any PR

- `npm test` and `npm run art:check` pass.
- For gameplay changes: a phone screenshot or short clip in the PR.
- For sim changes: the golden replays are updated on purpose, with the reason in the PR description.
- No new dependency without a note in the PR. No assets outside `art/`.
