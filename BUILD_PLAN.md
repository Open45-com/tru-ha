# Until Tomorrow

Draft build plan, November 26, 2026. Assumes a small team starting from an empty project. Target submission December 7 IST.

## A round in one minute

The Reddit post opens on a dark harbor. Tap a mirror and the beam moves immediately. Guide the beam into a lantern, see your move count, then choose where to hang the light. A cabin light stays on your personal postcard for the week. A lighthouse light helps bring the ferry into port. Tomorrow's harbor reflects the collective outcome. Both outcomes lead to a fresh playable puzzle.

Use the result screen for the daily leaderboard and beacon tally. Show the live tally when choosing too. An optional trip to the post's comments lets people discuss the decision or compare solves.

## Rules to implement

- Give everyone in a subreddit the same board and starting orientations for the day. Every tap rotates a mirror one step. Show the beam path immediately, using shape and brightness as well as color. Detect beam loops.
- Rank fewest rotations on the first completed ranked attempt. Persist the in-progress attempt across reloads. On the server, validate the moves against the day's board and freeze the first accepted solve. Share ranks on ties. Show the leaders and the player's own rank.
- Award one lantern per signed-in account per day. A player may commit it once. Display the cost before confirmation. Keep the individual's choice off the leaderboard. Treat the cabin as a private postcard.
- The live meter shows contributions and total committed choices. At close the ferry docks if at least one player committed and at least half contributed. A tie docks the ferry. With no choices, the ferry waits and a new board opens. Before close say “on course” or “short by one” as appropriate.
- Keep a practice replay available on old posts and for visitors. Replay never changes scores, lanterns, or island history. Link old posts to the current challenge.

## Technology and assets

Start from the Devvit Web React starter. Use TypeScript for the grid simulator, React buttons for mirror input and accessibility, Canvas for the light path, and CSS for simple motion. Store daily state and player records in Devvit Redis. Commit the ballot and counts atomically. Serve snapshots to the live meter and reconcile after reconnect. Freeze each day's result at 00:00 UTC and make scheduled rollover safe to retry. Use a stable day key so opening an old post cannot start a second round.

Paint one layered harbor in Krita. Use ImageGen optionally for an original art-direction reference. Maintain a fixed camera and anchors. Keep the editable master and a record of sources and rights. Export a compressed WebP background and cropped transparent props. Draw text, controls and beam geometry at runtime.

| Art delivery | Contents | Acceptance check |
| --- | --- | --- |
| Two phone-sized keyframes | Same harbor with ferry offshore and docked, plus a cabin lantern close-up | A viewer can identify the consequence with captions hidden |
| Reusable scene | Sea and shore, pier, lighthouse, cabin, ferry and crate props | Dock the ferry or unload cargo without repainting the background |
| Playable pieces | Mirror mount and face, beam source, empty and charged lantern, lighthouse glow | Mirror direction stays readable under a thumb and with motion reduced |
| Final capture | Cover, gameplay stills and optional sub-minute video from the build | Show a real move, real choice and clearly labeled prior-day reveal |

Aim for 1–2 MB of initial scene art as an internal budget. Measure on a real phone. Cut background texture or extra animations before sacrificing beam contrast or touch-target size.

## Delivery calendar

| Dates (2026) | Deliverable and exit condition |
| --- | --- |
| Nov 26–27 | Gray-box one round in a Reddit test post. Produce the two keyframes. Give five people the phone with no coaching. Target four who can finish and explain both lantern choices. |
| Nov 28–30 | Integrate approved art. Finish first-solve scoring, the private choice, persistent cabin and live aggregate. With two accounts, verify shared ranks, tally updates, refresh recovery and duplicate tap handling. |
| Dec 1–3 | Author three opening boards. Use an offline solver to check solvability, par and trivial shortcuts. Prepare enough validated layouts for every day through judging, with a tested fallback. Make yesterday's outcome visible. Test empty days, ties, late submissions, replay isolation and duplicate rollover. |
| Dec 4–6 | Observe a real overnight rollover on Reddit. Check mobile touch, loading, logged-out practice, and old demo links. Invite initial testers back without revealing the result and record whether they want to see the ferry. Fix the most common confusion. |
| Dec 7 | Upload the final build. Complete Devpost, verify all links from a second account and submit. Keep the app free and accessible through judging. |

If behind, cut additional scene art, audio and custom transitions first. Preserve the daily puzzle, private choice, cabin payoff, working meter, leaderboard and next-day result.

## Submission

Submit an English description, Devvit listing URL, test subreddit URL and direct playable post URL. Include a detailed root README explaining play and testing. Use a public test subreddit under 200 members. Upload and playtest the app. Broad app publication is unnecessary. If recording a video, aim for 45–50 seconds. Show the beam, the two destinations for the lantern, the live result screen, and an actual archived next-day outcome. The official deadline is Dec 8 at 6 p.m. Pacific, Dec 9 at 7:30 a.m. IST.

## Review and remaining uncertainty

Claude Opus 5.5 agreed with the stack, external art pipeline, early Reddit deployment and three authored pilot days. Its review prompted server-side score validation, solver-checked par, isolated replay and a mobile art budget. Opus preferred a low-turnout fallback. This draft keeps the public half-of-committed rule for every nonempty round so the promise to the player stays consistent. The core untested assumption is whether hanging a lantern at home feels valuable enough to make the choice interesting.

References: [Official rules](https://redditgameofday2026.devpost.com/rules), [event brief](https://redditgameofday2026.devpost.com/), [Devvit quickstart](https://developers.reddit.com/docs/quickstart), [Redis](https://developers.reddit.com/docs/capabilities/server/redis), [Scheduler](https://developers.reddit.com/docs/capabilities/server/scheduler), [Godot web exports](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html).
