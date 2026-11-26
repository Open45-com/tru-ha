# Until Tomorrow — Godot asset checklist

Build one island harbor for **First Crossing** and **Shoals**. Both boards use the same scenery, puzzle pieces and lantern choice. The third introductory board and later daily layouts are expansion work and reuse this kit. The greenhouse and longer island storyline are future ideas outside this inventory. See the [game plan](GAME_PLAN.md#hackathon-edition) and [pilot overview](README.md#play-the-two-board-pilot).

Paint the layered master in Krita, compose the fixed-camera shots in Godot, and export reusable art for the web client. The current pilot draws placeholder scenery on a square Canvas with mirror buttons on top. Use its board geometry to test the exports. The next-day reveal belongs to the planned Devvit build. See the [build plan](BUILD_PLAN.md#technology-and-assets) and [pilot renderer](pilot/ui.js).

## Production inventory

| Done | Asset | What to make and how it will be used |
| --- | --- | --- |
| [ ] | Harbor background ×1 | Paint the night sky, sea and shore as one phone-sized composition. Leave a quiet area behind the puzzle so a thin beam and both mirror diagonals read clearly. Export as compressed WebP. |
| [ ] | Pier ×1 | One transparent pier with a clear berth. Mark offshore and docked ferry positions in the Godot scene. Check that the hull sits at the waterline in both. |
| [ ] | Ferry ×1 | One side-view silhouette readable against open water and beside the pier. Use the same hull in both positions. Add a short mooring line to the docked composition so the ferry reads as tied up. Keep cargo separate. |
| [ ] | Cargo crate ×1 | One transparent crate that can be repeated on the pier for the docked reveal. Its appearance on shore gives a second visual cue that the ferry arrived. |
| [ ] | Lighthouse and beacon ×1 set | One tower with a dark lamp room and one aligned transparent glow overlay. Use the tower as the public-choice destination. Keep the glow visually distinct from the puzzle beam. |
| [ ] | Cabin and postcard ×1 set | One cabin with a visible window, a warm window-light overlay and room to hang the earned lantern outside. Compose the private close-up from the same art. Try seven hanging positions for a full week. Check the first light is easy to spot and all seven fit. Keep this player's display in the private view. |
| [ ] | Mirror ×1 set | One stationary mount and one rotatable face, both cropped around a common center. Give the face a clear reflective edge. Check every orientation used by the simulator at phone size. |
| [ ] | Beam source ×1 | One pier-mounted emitter with a visible notch facing right. Place it at each board's left entry row so the first segment leaves the notch and can be traced out over the water. |
| [ ] | Lantern ×1 set | Show the dock lantern as empty glass with a visible frame. On a solve, fill the same glass with a bright core. Align both states to the board's target cell. Reuse the lit lantern in the destination previews and at each occupied cabin position. |

## Fit checks for the two playable boards

Use the coordinates in the [pilot board definitions](pilot/boards.cjs). Coordinates below are zero-based, measured from the top left. Mounts, faces, emitter and target are placed per layout. Keep these pieces out of the background painting.

| Board | Grid and mirror instances | Beam enters | Lantern cell |
| --- | --- | --- | --- |
| First Crossing | 5 × 5, three mirrors | From the left on row 3 | (4, 1) |
| Shoals | 6 × 6, five mirrors | From the left on row 4 | (5, 3) |

On the denser Shoals layout, tap a mirror on a phone. Its face should visibly switch between the two diagonals, the beam should turn at its center, and the other mirrors should remain readable. Check a missed beam running out to sea and a solved beam ending inside the lit glass. Keep both the touch targets and beam geometry in the web client.

## First exports for the phone test

1. **Playable gray-box kit.** Export the emitter, mirror mount and face, and both lantern states first. Test one tap and one solve over the harbor blockout before polishing the scenery.
2. **Ferry waits.** Compose the first phone keyframe with the ferry offshore, visible water between hull and berth, and the pier empty.
3. **Ferry docks.** Export a second keyframe from the identical camera with the ferry at the berth and cargo on the pier. Hide captions and show both frames at phone size. A tester should be able to point out what happened.
4. **Choice previews.** Frame two crops from the kit. For “Hang it at my cabin,” show one lantern outside the window and the glass glowing warmly behind it. Compare against the empty postcard. For “Send it to the lighthouse,” show the lantern light joining the beacon. Preview each destination before confirmation and apply the persistent change after confirmation.

Check the timing against the [example round](GAME_PLAN.md#one-evening-at-the-harbor). At 5 lighthouse lights from 11 choices, keeping the lantern gives 5 of 12 and sending it gives 6 of 12. Today's meter shows that forecast alongside the choice. Use the ferry-and-cargo keyframe for the **closed prior day** in the next post or an archived round. A nonempty tie docks the ferry. An empty day uses the offshore keyframe. Keep the new puzzle playable over either result.

## Brief for the art agents

**Start together.** The harbor lead creates the shared Godot art project and a rough square harbor frame. As a production default, use a 1024 × 1024 reference canvas and review it at 360 px wide. Share the frame, palette swatches, lighting direction, and a placement guide showing the waterline, berth, buildings and playable area. The puzzle artist can test silhouettes on the pilot boards while the lead prepares the frame.

| Assignment | Owned files inside the art project | Return |
| --- | --- | --- |
| Harbor and assembly | Project settings, main scene and `harbor/` | Shared reference, sky/shore/sea background, pier, ferry, mooring line and crate. Instance the other agents' scenes and produce offshore and docked proofs from the same camera. |
| Puzzle pieces | `puzzle/` | Emitter, mirror mount and face, empty and charged lantern. Show both diagonal faces and both lantern states at phone size. Share the charged lantern scene and its hanging point with the destinations artist. |
| Lantern destinations | `destinations/` | Lighthouse and separate beacon glow, cabin and window-light overlay, and both choice previews. Instance the puzzle artist's lantern in the postcard. Show the first light clearly and check a full week's arrangement. |

**Copy this into each assignment** and include the relevant table row:

> Read GAME_PLAN.md and GODOT_ASSET_LIST.md. Create the art in your assigned folder and match the shared harbor frame. Use editable Godot 2D scenes for each reusable piece. Native 2D shapes are fine for props. For painted textures, include the layered source. Export the opaque background as WebP and individual props as transparent PNGs. For each export, give its pixel dimensions and the anchor measured in pixels from its top-left corner. Keep the mirror mount and face on the same pivot and give empty and charged lanterns identical bounds. Leave the beam, grid, text and controls to the web client. Return the editable sources, exports and a phone-size preview against the shared background. The harbor lead owns the main scene and project settings.

## Runtime handoff

- Deliver the editable Godot scene, layered art master, compressed background, and cropped transparent props. Record the art sources and rights. Supply the reference canvas size, sprite pivots and anchor positions so the web layout reproduces the approved shots.
- Use the two harbor keyframes as visual references. Ship the shared background and movable props once. Aim for **1–2 MB of initial scene art** and measure the actual load on a phone.
- Draw the beam path, grid feedback, move count, live tally, leaderboard, confirmation and replay controls in the web client. Test the mirror and charged lantern as stills with color removed and motion disabled.
- Capture the cover and gameplay stills from the working build after integration. Include a real move, the lantern choice, and a clearly labeled prior-day reveal. Audio, custom transitions and the optional 45–50 second video can wait.
