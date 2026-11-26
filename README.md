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

## Commands

```sh
npm ci
npm run art:check        # asset delivery, budgets, attach nodes, licenses
npm test                 # sim golden replays and server tests (once they exist)
npm run viewer           # asset viewer in the game's lighting (built in Gate 0)
npm run build            # Devvit client and server bundles (built in Gate 0)
```
