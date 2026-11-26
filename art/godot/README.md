# Until Tomorrow — Harbor gray-box v0.1
Open project.godot in Godot 4. Offshore is the main scene; open harbor/docked.tscn to compare it against the same fixed framing. Each prop is a separate movable Sprite2D. Lighthouse, cabin, puzzle sprites and beam are intentionally absent from the background; those belong to separate workstreams.
- harbor/source/: editable vector blockout sources (original team gray-box artwork; no external artwork).
- harbor/web/: draft WebP background, transparent PNG props, and anchors.json.
- Anchors are in source pixels from the top-left. Subtract an anchor from its 1024 px placement to get the texture's top-left. Reuse one ferry sprite for both scenes.
- This is a fit-test kit, not final painted art. Do not use the reference overlay in game.

## Combined asset handoff
The harbor scenes instance the same lighthouse and cabin resources used by the destination postcards. Open the workspaces under harbor/, puzzle/, and destinations/ for editable sources. The browser pilot is separate: run node pilot/server.cjs from the repo root. The runtime art is copied under pilot/art/ alongside its manifest. When replacing a source export, keep the runtime copy in sync.

## Painted harbor master
Open `harbor/source/harbor-master.ora` in Krita. The master has five editable layers: dusk, distant islands, water, shoreline, and grain. The vector drawing is also in `harbor/source/background.svg`. This is original artwork. No third-party art or fonts are baked into the background. Export to a 1024 × 1024 WebP and update both `harbor/web/background.webp` and `pilot/art/background.webp`. The 186 px waterline and prop/board anchors are unchanged. The OpenRaster master is source only and is not served by the pilot.
