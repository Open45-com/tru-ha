# Until Tomorrow | Lantern destinations

Copy `destinations/` to the shared Godot project at `art/godot/`. Keep these dependencies alongside it: Choco's `harbor/web/background.webp` and Owwol's `puzzle/web/lantern_charged.png`. Do not create a second playable lantern sprite. The PNG is 78 × 96 and its hanging anchor is [39, 9] from top-left, distinct from the puzzle target anchor.

- `lighthouse.tscn` and `cabin.tscn` are reusable anchored props, with independently toggleable glow and window light. `choice_empty_cabin.tscn`, `choice_cabin.tscn`, `choice_lighthouse.tscn`, and `postcard_week_fit.tscn` are editable 360 × 360 compositions.
- `source/` contains editable original vector art for the four destination layers. `web/` includes transparent PNGs, four compressed WebP proofs, and `anchors.json` for dimensions, pivots, the 1024 px harbor placement, and cabin hook order. The WebPs are reference art, not player-state snapshots. Draw the stateful cabin in the private view only. `previews/phone-contact-sheet.png` shows all four framings.
- At native cabin size, use the seven hook coordinates in the manifest. Render the shared charged lantern 22 px wide for the close-up (22/78 scale). Reveal center first, then alternate left and right. The first light turns on the window; the full-week proof verifies all seven stay separate at 360 px. The lighthouse preview places the same lantern beside the lamp room so its outline doesn't disappear in the beacon.
- For a 5-of-11 live tally, choosing cabin previews 5 of 12 and lighthouse previews 6 of 12. Neither preview applies the number or docks the ferry. Keep tally, beam, text, confirmation, and next-day resolution in the web client. These files do not change gameplay.

Art provenance: in-project original destination vectors by Chikoritaa; shared dusk backdrop by Choco and lantern by Owwol. No external imagery or fonts in the runtime exports. The contact sheet uses DejaVu Sans only for out-of-game review labels.
