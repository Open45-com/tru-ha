# Until Tomorrow — Harbor gray-box v0.1
Open project.godot in Godot 4. Offshore is the main scene; open harbor/docked.tscn to compare it against the same fixed framing. Each prop is a separate movable Sprite2D. Lighthouse, cabin, puzzle sprites and beam are intentionally absent from the background; those belong to separate workstreams.
- harbor/source/: editable vector blockout sources (original team gray-box artwork; no external artwork).
- harbor/web/: draft WebP background, transparent PNG props, and anchors.json.
- Anchors are in source pixels from the top-left. Subtract an anchor from its 1024 px placement to get the texture's top-left. Reuse one ferry sprite for both scenes.
- This is a fit-test kit, not final painted art. Do not use the reference overlay in game.
