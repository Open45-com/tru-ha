# Until Tomorrow

Every night a ferry waits outside a dark harbor. In this daily Reddit puzzle, you rotate mirrors to steer a beam into a lantern. You earn one light. Hang it outside your cabin and it stays on your private postcard for the week. Send it to the lighthouse and it helps guide the ferry home. At dawn, everyone sees what the subreddit chose.

## How a round works

1. Open today's post. Everyone in the subreddit starts with the same mirror puzzle.
2. Tap a mirror to rotate it and watch the beam change direction. Light the lantern in as few rotations as you can. Your first solve sets your daily leaderboard score.
3. Check the live harbor meter and choose a destination for your lantern. The meter shows the group total. Your personal choice stays off the leaderboard.
4. Come back for the next post. If at least half the players who spent a lantern sent theirs to the lighthouse, the ferry docks. Otherwise it waits offshore. Either way, a fresh puzzle opens.

You can play alone. Other players can join throughout the day. The fun of a crowded post is that someone can beat your move count while someone else's lantern can change tomorrow's harbor.

## Project documents

| Document | Use it for |
| --- | --- |
| [Game plan](GAME_PLAN.md) | A complete example round, the player experience, scoring, the community decision and what carries into tomorrow |
| [Build plan](BUILD_PLAN.md) | Implementation, dated milestones, playtests and the hackathon submission checklist |
| [Asset checklist](GODOT_ASSET_LIST.md) | Harbor art, mirror and lantern pieces, Godot scene composition, exports and mobile checks |

## Play the two-board pilot

Run [Play.cmd](pilot/Play.cmd) on Windows with Node.js installed, then open the local address printed in the terminal. Play First Crossing to learn the mirrors and Shoals for the harder route. Each board awards one lantern per browser profile. Open a separate browser profile on the same computer to try a second keeper. The two sessions share a leaderboard and contribution meter for each crossing.

The pilot saves its state locally. Both boards are available immediately for testing. Reddit accounts, the daily cutoff and the next-day ferry reveal are planned for the Devvit build.

See [Devvit playtest build](devvit/README.md) for the private Reddit setup and UTC ferry behavior.
