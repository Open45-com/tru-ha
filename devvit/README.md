# Until Tomorrow · Reddit playtest

This branch packages the existing Canvas/DOM pilot as a Devvit Web custom post.
The Godot project remains the editable art source; the same checked-in
WebP/PNG exports are copied into the Devvit client at build time.

## Build and verify

From the repository root, with Node.js 24:

```sh
npm ci
npm test
npm run build
```

The tests exercise both layouts, mirror/lantern anchor checks, UTC rollover,
the empty-day and tie rules, simultaneous ballot attempts, private player
state, and the Devvit HTTP routes against a test Redis store. They do not
replace a test on Reddit.

## Private Reddit playtest

1. In your own terminal, authenticate with the official Devvit CLI using
   `npx devvit login`. Approve in Reddit; never paste tokens into chat.
2. Use the Reddit Developer Portal's playtest app you own or can develop.
   If it uses a different registered slug, update `name` in `devvit.json`
   before uploading. Confirm the app and private test subreddit first.
3. Follow the official [Devvit playtest guide](https://developers.reddit.com/docs/guides/tools/playtest)
   to upload and playtest. Do not run `devvit publish` for a private test.
4. As moderator in the test subreddit, choose **Create today's Until
   Tomorrow playtest** from the subreddit menu. Share the direct post link
   with testers who have access to that subreddit.
5. Record the device, post URL, board, both choice previews, one confirmation,
   initial load, and whether the previous-day reveal remains stable as
   today's tally changes. The two boards alternate daily at 00:00 UTC.

## Scope and follow-ups

- A post is bound to its creation day. Same-day posts share a round per app
  installation; previous dates are read-only.
- The live meter is separate from the closed tally that drives the ferry.
  A nonempty tie docks. No votes means offshore. Ballots are atomic,
  one per signed-in player per day, and do not leak to the public leaderboard.
- The roster is a bounded staging store (180 active players per day). Before
  broad rollout, move to per-player records and explicit data retention,
  wire scheduled post creation, and run the actual Reddit phone test.
