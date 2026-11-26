# Wake — Game plan

Every number here is the starting tuning. The engine agent owns tuning changes and records them here.

## 1. The pitch

**Steer a ferry through a night harbor full of searchlights and traps. Then leave a trap of your own for the next player.**

Each Reddit post is one day's course. A run takes 20–40 seconds, and retrying is instant. When you finish, you place one hazard on the course, but it only goes live after you beat the course with it in place. From then on, your hazard counts how many players it sinks. The subreddit builds a harder course all day, and at midnight UTC the deadliest traps move into tomorrow's post.

**Why it's fun:**
- **Running** is a tense stealth race: cut the engine and drift through a searchlight's edge, or gun it across open water.
- **Placing a trap** is a mind game: where will other players go? Their wakes give it away.
- **Coming back** is the hook: "my mine has sunk 37 ferries."

**Why it belongs on Reddit:** every player both plays the level and changes it. The course at 9 p.m. isn't the course from 9 a.m. People argue in the comments about routes and brag about the most-hated trap.

## 2. Moment-to-moment play

### Controls (phone first)

| Input | Effect |
| --- | --- |
| Finger down anywhere | **Engine on.** The ferry speeds up. |
| Finger up | **Engine off.** The ferry slows to a quiet drift. |
| Drag left or right while holding | Steer. Horizontal offset from where the finger first touched sets the target heading: 60 px = full lock. |
| Keyboard | ↑ or W = engine, ←/→ or A/D = steer. |

The engine is the core decision. **A searchlight spots a ferry three times faster when its engine is running.**

### The ferry

| Property | Value |
| --- | --- |
| Size | 8 m × 3 m. Hitbox is 3 circles of radius 1.4 m at −2.6, 0 and +2.6 m along the heading. |
| Top speed | 12 m/s (engine on) |
| Acceleration | 3 m/s² |
| Coasting | slows at 1.2 m/s² down to a 1.8 m/s drift, and never stops |
| Heading | within ±40° of straight up the course, turning at 120°/s toward the target |

### Ways to die (each restarts the run)

| Cause | Rule |
| --- | --- |
| Bank | Any hitbox circle touches x < 0 or x > 40 m. |
| Rock | A hitbox circle overlaps a rock's circle (radius 2.0, 3.2 or 4.8 m). |
| Searchlight | **Detection meter** (0–45). Each tick with any hull circle center inside a cone: +3 if the engine is on, +1 if it's off. Each tick outside all cones: −2. **Caught at 45.** That's 0.25 s in the light with the engine on, or 0.75 s drifting. |
| Barge | Overlaps the barge's box (14 × 5 m). |
| Mine | A hitbox circle comes within 1.0 m of the mine center. |
| Whirlpool | Within 8 m, a pull toward the center of 2.4 m/s². Touching the 1.4 m core kills you. At full throttle you can escape. |

When you are caught, the cone turns red, the alarm plays and the ferry sinks over 0.6 s. Then the **"Sunk by u/name's mine"** card appears, and **one tap restarts**. From death to steering again takes under 1.5 s. This is the most important feel requirement in the game.

**Near miss:** if the cone edge passes within 0.5 m of the hull without catching you, the game slows to 50% for 0.25 s, plays a whoosh and the camera tightens briefly.

### Course

- 40 m wide and 240 m long. You start at the bottom dock and finish when the bow crosses the finish line, 10 m from the top.
- **Base layout** for each day comes from the date seed: 3 rocks and 1 searchlight from a hand-checked template set (12 templates, see BUILD_PLAN), plus yesterday's 3 deadliest player hazards, labeled "Legend".
- Up to **40 live player hazards**. When a 41st goes live, the hazard with the fewest distinct victims is removed (oldest first on ties), and its owner sees "washed away".

### Hazards players can place

| Hazard | Parameters the placer sets | Behavior |
| --- | --- | --- |
| Searchlight | Position, center angle (drag) | Sweeps ±45° around the center angle at 48°/s, back and forth. Cone 22 m long, half-angle 12°. Islet blocks movement (radius 2.2 m). |
| Barge | Position (lane y), starting direction | Moves along x at 4.8 m/s, bouncing between the banks. |
| Mine | Position | Static. Its LED blinks faster when a ferry is within 6 m (visual only). |
| Whirlpool (P1) | Position | Static pull zone. |

Placement rules: y between 20 m and 220 m. Center at least 7 m from every other hazard and 10 m from the start or finish line. Must sit inside the water.

## 3. The loop around a run

1. **Title screen**: the live course drifts behind a glass panel. It shows today's stats (runs, sinks, best time, live traps) and buttons for **Play**, **Leaderboards** and **How to play**, which is 3 animated cards.
2. **Run**: the HUD shows the timer, the detection meter as a ring around the ferry that fills and turns red, and a small course progress bar.
3. **Death**: the "Sunk by u/name's \<hazard\>" card, with that hazard's victim count ticking up live. Tap to retry.
4. **Finish**: your time, your rank and your personal best. The big button is **"Leave your trap"**, and there's a smaller "Run again".
5. **Placement**: a top-down view of the whole course with heatmap wakes from the top 5 runs. Pick a hazard, drag it into place, see a preview of its sweep or path, and confirm. One trap per player per day.
6. **Prove it**: you run the course with your trap pending, which only you can see. Unlimited attempts. When you finish, the trap goes live with a splash and the message "Your mine is live. Victims: 0".
7. **Comeback**: the title screen and finish card always show **your trap's victims today**. The next day's post shows whether your trap became a Legend.

Logged-out players can run the course and see leaderboards. Saving a time or placing a trap asks them to log in.

## 4. Scoring and leaderboards (per day)

| Board | Ranked by | Notes |
| --- | --- | --- |
| **Fastest** | Best finish time (ticks → seconds, 2 decimals) | Server-verified replays only. Shows top 10 plus your rank. |
| **Deadliest** | **Distinct players** your hazard sank | The same player dying 50 times counts once, so friends can't farm kills. Total sinks are shown as a secondary number. |

Legends (yesterday's top 3 traps) show their owner's name and their record from the previous day.

## 5. Social features

| Priority | Feature |
| --- | --- |
| P1 | **Ghost wakes**: the top 5 runs drawn as faint glowing trails, on by default and switchable off. Shows the route the crowd prefers, which is exactly where trap-setters aim. |
| P1 | **Trap report**: at 00:05 UTC the app comments on yesterday's post with the fastest runner, the deadliest trap and the funniest stat (for example, "u/x's mine sank 12 players in its first hour"). |
| P2 | **Live ghosts**: players on the same post right now appear as translucent ferries, sent over Devvit realtime at 5 Hz. |
| P2 | **Patrol boat**: follows a loop through the 4 most-travelled parts of the course, based on finished runs. The more popular a route, the more dangerous it gets. The loop is fixed per course version, so it stays deterministic. |
| P2 | **Community courses**: a "Create a Wake course" menu item lets any user start a post with an empty course that never resets. |
| P2 | **Flair**: "Deadliest Trap" and "Fastest Ferry" flair for the day's winners, if the subreddit allows it. |

## 6. A sample day

At 00:00 UTC the post *"Wake · Night of Dec 3"* opens with 3 rocks, 1 searchlight and 3 Legend traps. u/alpha finishes in 24.80 s and places a barge across the narrow gap. It takes them 4 tries to prove it. By lunch there are 26 traps. The fast route everyone used is now blocked by u/beta's searchlight, and the comments are full of "drift past the left rock, don't gun it". u/alpha comes back to find their barge has sunk 31 players. At midnight it carries over as a Legend, and the trap report comment names them.

## 7. Out of scope for the hackathon

Account progression, cosmetics shop, multiple ferries, weather variants, a level editor beyond hazard placement.
