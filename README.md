# Wake

**Steer a ferry through a night harbor full of searchlights and traps. Then leave a trap of your own for the next player.**

Wake is a daily Reddit game built on Devvit. Each post is one day's course. A run takes 20–40 seconds, and retrying is instant. When you finish, you place one hazard on the course: a searchlight, a barge or a mine. It only goes live after you beat the course with it in place. From then on, it counts every player it sinks. At midnight UTC the deadliest traps carry over into tomorrow's post as Legends.

> Status: **redesign in progress.** The previous mirror-puzzle prototype ("Until Tomorrow") has been retired. Its code and art are still available in git history before this branch.

## Documents

| Document | For |
| --- | --- |
| [GAME_PLAN.md](GAME_PLAN.md) | Rules, controls, tuning numbers, screens, scoring, social features |
| [BUILD_PLAN.md](BUILD_PLAN.md) | Stack, the deterministic sim, API and Redis contracts, ownership, gates |
| [ASSET_LIST.md](ASSET_LIST.md) | **Art and audio spec**: target look, every model with sizes and attach points, review gate |
| [art/required.json](art/required.json) | Machine-readable asset list checked by `npm run art:check` |

## For agents

1. Read the document for your role in full (the table above), then `BUILD_PLAN.md` §3 to see which files you own.
2. Only touch the files you own. To change a contract, open a PR labeled `contract`.
3. Art is accepted only through the review gate in `ASSET_LIST.md` §7.

## Play it now (Gate 0 build)

```sh
npm ci
npm run dev              # builds, watches src/, serves http://127.0.0.1:5173/
```

| URL | What it does |
| --- | --- |
| `/` | The game: the Gate 0 course with the delivered art, the real sim and a leaderboard (in memory) |
| `/?demo` | The solver bot plays the course on a loop. Use it to watch every hazard without playing well |
| `/?as=second_player` | Play as a different user, so two tabs fill the leaderboard |
| `/?cam=close` | Close camera preset (45° / 28 m). Press **C** or the 🎥 chip to switch presets in game |

On a phone on the same Wi-Fi: run `HOST=0.0.0.0 npm run dev` (PowerShell: `$env:HOST='0.0.0.0'; npm run dev`) and open `http://<your-pc-ip>:5173/`.

**Controls:** hold anywhere = engine, drag left or right = steer, let go = drift. Keyboard: ↑/W/Space = engine, ←/→ or A/D = steer, R or Enter = retry.

**Art in game:** delivered models from `art/models/` load automatically when you reload. Missing ones show as **magenta wireframe boxes** with the right size (barge, mine and docks today). `rock_s` and `rock_l` temporarily use the approved `rock_m` scaled up or down.

## Commands

```sh
npm run art:check        # asset delivery, budgets, attach nodes, licenses
npm test                 # sim, bot and server API tests
npm run viewer           # asset viewer in the game's lighting
npm run build            # dist/client (game), dist/server (Devvit), dist/dev (local server)
npm run playtest         # Devvit playtest (after `npx devvit login`)
```

## Code map

| Path | What |
| --- | --- |
| `src/sim/` | Deterministic sim (`index.ts`), integer trig (`trig.ts`), base course (`courses.ts`), solver bot (`bot.ts`) |
| `src/client/` | Three.js world (`world.ts`), controls (`input.ts`), screens and loop (`main.ts`) |
| `src/server/` | API (`app.ts`), Devvit entry with Redis (`devvit.ts`), local dev server (`dev.ts`) |
| `src/viewer/` | Asset viewer |
