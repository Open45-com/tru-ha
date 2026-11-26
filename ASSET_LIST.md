# Wake — Asset list and art spec

This file is the contract for every art and audio agent. Read all of it before you make anything. If something here is unclear, ask in Slack before you guess. A guess that looks wrong costs more than a question.

The game itself is described in [GAME_PLAN.md](GAME_PLAN.md). How the code is built is in [BUILD_PLAN.md](BUILD_PLAN.md).

---

## 1. Why the last art failed, and what changes

The previous harbor kit was rejected. Learn from it:

| What went wrong | Rule now |
| --- | --- |
| Flat SVG rectangles and gradients. The ferry export was a 1.2 KB PNG. It looked like a 2010 Flash game. | **Stylized low-poly 3D** rendered live in Three.js. No flat 2D illustration and no pixel art anywhere in the game world. |
| "Make a ferry" left all decisions to the agent. | Every asset below has size, shape, colors, materials, details, attach points and budgets. |
| Art was judged as a flat image on a gray background. | Assets are judged **inside the game's night lighting**, at phone size, next to the other assets. |
| Nothing checked delivery. | `npm run art:check` fails on missing files, wrong budgets, missing attach nodes or missing licenses. A human signs off on every review render. |

## 2. The target look

**One sentence:** a moody, cinematic night harbor in clean stylized low-poly, where **light is the hero**: warm windows, sweeping cold searchlights, glowing wakes on near-black water.

**Quality bar:** a screenshot of any moment should look good enough to be a store feature image for a modern mobile game. If it looks like a prototype, a tutorial or a game jam entry, it is not done.

**The target frame.** Every asset is judged against this shot:

> The camera looks down at about 55°, slightly behind the ferry, which sits in the lower third. The water is deep blue-black with soft rolling ripples. Where light hits it, the ripples catch long glittering highlights. To the right, a searchlight on a rock islet throws a cold blue-white volumetric cone across the water. Where the cone lands, the water is lit in a bright oval and you can see foam and debris. The ferry's cabin windows glow warm orange. Its red and green navigation lights each cast a small colored pool on the water. Behind it, a bright foam wake curls and fades. Ahead, a rust-red barge with teal and yellow containers slides across the channel under one amber deck lamp. On both banks, dark cliffs and a few houses with lit windows fade into blue fog. Bloom softens every light. Nothing is pure black and nothing is flat gray.

**Style rules**

1. **Low-poly but not crude.** Shapes are clean and faceted, with bevels on hard edges and clear silhouettes. A model has enough secondary detail that it reads as a real object, not a primitive: railings, bollards, rivet bands, tires on the dock, rope coils, vents. Each model has a `minTris` in `art/required.json` so that crude block models fail the check.
2. **Flat or gradient shading, no photo textures.** Color comes from materials or one shared color-atlas texture. No noisy photographic textures and no baked lighting.
3. **Exaggerated proportions.** Make ferry cabins a little taller, funnels a little fatter and lamps a little bigger than real life. Things must read at phone size from 25 m away.
4. **Every light source is a real mesh with an emissive material.** Windows, lamps, LEDs and lenses use the named glow materials below. The renderer adds bloom and real lights at those spots. A lamp you can't see glowing is a bug.
5. **Wet base.** Anything sitting in the water has a darker, slightly glossy band at its waterline (0.2–0.4 m tall).
6. **No text, logos or numbers baked into models.** UI is drawn by the client.
7. **No copied games.** Original designs, or CC0 kits you have adapted. Do not imitate the look, characters or levels of a specific existing game.

**Palette.** Use these colors for material base colors. Small variations (±5% lightness) are fine; new hues are not.

| Use | Hex | | Use | Hex |
| --- | --- | --- | --- | --- |
| Night sky top | `#070b16` | | Ferry hull red | `#b23a30` |
| Fog / horizon | `#1b2a44` | | Hull dark band | `#5a1d1a` |
| Deep water | `#0a1424` | | Cabin white | `#e6dfd0` |
| Water lit | `#1f4a6e` | | Deck wood | `#7a4b2e` |
| Foam | `#dff4f5` | | Rope / tan | `#c9a46a` |
| Rock dark | `#262c35` | | Container teal | `#2f7f8f` |
| Rock light | `#56606c` | | Container yellow | `#d9a62b` |
| Moss | `#2f4a38` | | Container red | `#9c3b2c` |
| Steel | `#6f7b86` | | Rust | `#8a4a26` |
| Concrete | `#8d8a82` | | Warm light (windows, lamps) | `#ffb45a` |
| Navigation red | `#ff3b30` | | Searchlight | `#cfe6ff` |
| Navigation green | `#33e07a` | | Alarm | `#ff4d2e` |

**Named materials** (exact names, the renderer finds them by name):

| Name | Used for | Rule |
| --- | --- | --- |
| `M_Hull` | ferry hull | base `#b23a30`, roughness 0.6 |
| `M_Cabin` | ferry cabin | base `#e6dfd0`, roughness 0.7 |
| `M_WindowGlow` | every lit window | emissive `#ffb45a`, emissive strength 2–4 |
| `M_LampGlow` | lamp bulbs, deck lamps | emissive `#ffb45a`, strength 3–6 |
| `M_LensGlow` | searchlight lens | emissive `#cfe6ff`, strength 6–10 |
| `M_LedGlow` | mine LED | emissive `#ff4d2e`, strength 4–8 |

Navigation lights can use their own emissive materials in `#ff3b30` / `#33e07a`.

## 3. Technical rules for all models

- **Format:** binary glTF (`.glb`), one file per entry in `art/models/`. Meshopt or Draco compression is allowed.
- **Units and axes:** 1 unit = 1 meter. +Y is up. **The bow, or front, points to −Z.** The origin is at the waterline, in the center of the footprint, unless noted otherwise.
- **Waterline:** y = 0 is the water surface. The hull continues 0.3–0.6 m below it. The water shader hides it, but it shows during the sinking animation.
- **Attach points:** empty nodes with the exact names listed below. The renderer puts lights, particles and wakes on them. If a node is missing, the check fails.
- **Materials:** standard PBR metallic-roughness. No textures over 1024². A shared 256² color atlas is preferred.
- **Pivots:** parts that move are separate child nodes with their pivot at the rotation point. Examples: the searchlight `head` and the lighthouse `beam_pivot`.
- **No baked lights, cameras or animations** unless the asset spec asks for them.
- **Sources:** put the editable source, such as a `.blend` or generator script, in `art/sources/<name>/`.

### Allowed ways to produce a model (in order of preference)

1. **Adapt a CC0 kit.** For example, kenney.nl and Quaternius publish CC0 low-poly packs that include boats, docks, rocks and props. Check the license on the page, recolor to the palette, add the attach nodes and named materials, and add detail to match the spec. Record the URL in `art/CREDITS.json`.
2. **Blender with a Python script** (`art/sources/<name>/build.py`, run headless), or a hand-built `.blend`.
3. **A Node script using `@gltf-transform/core`** that builds geometry and writes the `.glb`.

**Not allowed:** drawing in-game objects as 2D images, generating them with Three.js primitives in game code, non-CC0 or "free for personal use" assets, AI images used as textures, and anything ripped from an existing game.

## 4. The models

The scale reference is the course: **40 m wide** (sim x 0–400) and **240 m long**. The camera sees about 40 m across, so the ferry is roughly 7% of the screen width.

### P0 — required for the first playable build

**`ferry`, the player's boat.** 8.0 m long, 3.0 m wide, top of the funnel at 4.5 m. A small passenger and car ferry:
- The hull is `M_Hull` red with a 0.3 m `#5a1d1a` dark band at the waterline. The bow is pointed but blunt. The stern is squared off with a short open car deck.
- The two-level `M_Cabin` superstructure sits in the middle and is slightly oversized. The lower deck has 4 windows per side and the wheelhouse on top has 3 front windows, all `M_WindowGlow` and recessed 2 cm.
- One fat funnel behind the wheelhouse, in red with a cream stripe. A short mast on the wheelhouse roof.
- Details: white railings around the upper deck, 2 orange life rings, black tire fenders along the sides, a rope coil and bollards on the stern deck.
- Nodes: `nav_red` (port, left side of the wheelhouse), `nav_green` (starboard), `mast_light` (top of the mast), `wake_origin` (center of the stern at the waterline), `smoke_origin` (top of the funnel).
- It must look like the same boat from any heading between −40° and +40°, because the sim turns it.

**`searchlight_tower`, the main hazard.** Footprint 4.4 m in diameter, with collision radius 2.2 m. Height 3.5 m.
- A small rock islet (rock palette, wet base, a little moss), a concrete pad with a short steel lattice tower and a ladder.
- Child node `head`: the lamp housing, a 0.8 m barrel with cooling fins. It pivots on the vertical axis at the top of the tower, and its lens faces −Z at rest.
- Child node `lens`: the center of the lens face, using `M_LensGlow`. The renderer attaches a spotlight and a volumetric cone here.
- Details: a warning-stripe band on the pad and a small electrical box.

**`barge`, the moving hazard.** 14.0 m long (along X, because it crosses the channel sideways), 5.0 m wide, with container tops at 3.5 m.
- A flat rust-colored hull with a raised bow ramp and a black tire fender strip.
- Six containers stacked 3 long × 2 high, mixing teal, yellow and red. Each one has ribbed sides from simple grooves and door ends.
- One mast at the center carrying `lamp` with `M_LampGlow`.
- Nodes: `lamp`, plus `wake_left` and `wake_right` at the waterline on each short end. The renderer uses whichever side is the trailing side.

**`mine`.** A sphere 1.0 m across with 8 to 10 contact horns. It floats with 60% of the sphere above water, and a chain goes down into the water.
- Dark steel `#3a4048` with rust streaks as vertex color. One red LED on top using `M_LedGlow`, at node `led`. The renderer makes it blink faster as the ferry gets closer.

**`rock_s`, `rock_m`, `rock_l`.** Footprint radius 2.0, 3.2 and 4.8 m. Heights 1.2, 2.0 and 3.0 m.
- Chunky faceted shapes. Not a sphere with noise applied. Each rock has 2–3 strata planes, a flat-ish top and an overhang on one side.
- A darker glossy wet band at the waterline and moss in the cracks on top.
- `rock_l` has a small seabird perch or a crooked post with a rope on it.

**`dock_start`.** A 40 m wide wooden pier across the bottom of the course, 8 m deep.
- Plank deck with visible gaps, pilings under it, bollards, a small ticket booth with one lit window, stacked crates, and 3 iron lamp posts with nodes `lamp_1` to `lamp_3`.
- `spawn` node: the point where the ferry starts, in the center 5 m in front of the pier.

**`dock_finish`.** The harbor quay across the top of the course, 40 m wide and 12 m deep.
- A stone quay wall with tire fenders. Behind it, the front of a two-story warehouse with 8 to 10 lit windows (`M_WindowGlow`) and a big door.
- 4 lamp posts at nodes `lamp_1` to `lamp_4`. A line of string lights at node `string_lights` crosses the berth: the renderer draws the bulbs, and the model only provides the posts and wire anchors.
- `finish_line` node: center of the finish line, 6 m in front of the quay.

**`shore_cliff`.** One segment of riverbank, 6 m wide and 40 m long (along Z). It tiles end to end, and the left bank uses it mirrored.
- Dark layered cliff rising 3–8 m, sloped boulders at the water's edge, and 3–5 low-poly pine trees on top.
- The inner face, the one toward the channel, has to look good. The outer face can be rough.

### P1 — needed for the full game

**`shore_village`.** Same footprint as `shore_cliff`, with the same tiling and mirroring. Two or three narrow harbor houses on a stone embankment, with pitched roofs and 6 to 10 lit windows (`M_WindowGlow`). Add a small jetty with a rowboat.

**`buoy_red`, `buoy_green`.** A navigation buoy 1.6 m tall with a cage top and a light at node `light`. One is red and one is green. Used as decoration along the edges.

**`debris`.** One file containing three child objects: `crate` (0.8 m), `barrel` (0.6 × 0.9 m) and `plank` (2 × 0.25 m). They float in the searchlight zones.

**`lighthouse_far`.** A distant landmark beyond the finish dock, 18 m tall, white with a red stripe. The lamp room uses `M_LampGlow`, and its child node `beam_pivot` rotates slowly. It is seen through fog, so the silhouette matters more than detail.

### P2 — later

**`patrol_boat`.** 7 m long, grey-blue, a fast angular hull. It has a blue/red light bar at nodes `siren_a` and `siren_b`, a bow spotlight at node `spot`, and a `wake_origin` node.

## 5. Textures, UI, fonts

| File | Spec |
| --- | --- |
| `art/textures/water_normal.png` | Seamless 1024² tangent-space normal map of small wind ripples. Must tile without visible seams at 4× repeat. CC0 or generated. |
| `art/textures/foam_noise.png` | Seamless 512² grayscale cellular or Worley noise, used for wake and shoreline foam. |
| `art/textures/app_icon.png` | 1024² app icon: the ferry seen from three-quarter view, cutting through a searchlight cone, on a dark background. Rendered from the game models, not painted. |
| `art/textures/cover.jpg` | 1600 × 900 key art rendered in-engine, matching the target frame in section 2. Used for the Devvit post splash and Devpost. |
| `art/ui/logo.svg` | The word **WAKE** in a heavy rounded sans (Rubik Black or similar OFL), white, with a soft cyan glow and a foam-wave cut through the lower part of the letters. It has to read at 120 px wide. |
| `art/ui/icon_*.svg` | 24 × 24 viewBox, 2 px rounded strokes, single color `currentColor`, in a consistent family with Lucide-like proportions. Hazards: searchlight (cone from a tower), barge (boat with boxes), mine (spiked circle), whirlpool (spiral). HUD: skull, clock, crown, retry. |
| `art/ui/fonts/Rubik-Variable.woff2` | Rubik from Google Fonts (OFL). Include `OFL.txt` next to it. |

UI panels, buttons and HUD layout are code, built by the client agent. The UI style is dark glass: panels `rgba(10,20,36,0.72)` with a 12 px blur and a 1 px `rgba(255,255,255,0.08)` border, 14 px corner radius, and large type with tabular numbers.

## 6. Audio

Format: MP3, 44.1 kHz, normalized to −16 LUFS for loops and −12 LUFS for one-shots. Loops must be seamless. The license must be **CC0**, or original work generated by you (for example with sfxr/jsfxr or a synth). Record it in `CREDITS.json`.

| File | What it should sound like |
| --- | --- |
| `engine_loop` | A low diesel chug, 2 s seamless loop. The client changes its pitch from 0.8 to 1.3 with speed. |
| `engine_cut` | A mechanical clunk followed by the engine winding down, 0.6 s. |
| `caught_alarm` | A short klaxon of two descending tones, 0.8 s. It should feel tense but not shrill. |
| `crash_sink` | A wooden crunch, a big splash, then a few bubbles, 1.2 s. |
| `mine_blast` | A deep underwater thump plus a splash spray, 1.0 s. |
| `finish_bell` | A ship's bell struck twice with a warm tail, 1.5 s. |
| `ui_tap` | A soft wooden tick, 60 ms. |
| `harbor_ambience` | 30 s loop: gentle lapping water, a distant buoy bell, faint wind. |
| `near_miss` | An airy whoosh with a heartbeat thump, 0.5 s. |
| `searchlight_hum` | 3 s loop: an electrical hum. The client sets its volume by distance. |
| `barge_horn` | A low foghorn blast, 1.5 s. |
| `place_trap` | A heavy metallic clunk and a splash, 0.5 s. |
| `music_loop` | P2. 60–90 s of low, pulsing heist-style ambient electronic music. |

## 7. Review gate (how an asset is accepted)

The client agent builds the **asset viewer** first (`npm run viewer`, see BUILD_PLAN). It loads any `.glb` into the game's real night scene, with water, fog, bloom, a searchlight and the ferry for scale.

For each model:

1. Deliver the `.glb` and its source, and add a `CREDITS.json` entry.
2. Run `npm run art:check -- <name>`. It must say `ok` apart from the missing review image.
3. In the viewer, capture `art/review/<name>.<ext>` at **1170 × 2532** (an iPhone screen): the asset in the target-frame camera with the ferry beside it. Also capture a close orbit shot as `art/review/<name>_close.<ext>`. Use JPG (quality 88, viewer default), WebP, or PNG. Existing PNGs do not need conversion.
4. Post both images in Slack and wait for the human's ✅. **Do not open a PR without it.**

A render is rejected if any of these are true:
- you can't tell what the object is at phone size within one second
- it looks like boxes, cylinders or spheres with nothing added
- light sources don't glow
- colors are off the palette
- the waterline sits in the wrong place, so the object floats or sinks
- it looks inconsistent next to the ferry: wrong scale, mismatched detail or different style

## 8. Ownership

| Agent | Owns |
| --- | --- |
| Art agent A ("boats") | `ferry`, `barge`, `patrol_boat`, `buoy_*`, `debris` |
| Art agent B ("world") | `searchlight_tower`, `mine`, `rock_*`, `dock_*`, `shore_*`, `lighthouse_far`, textures |
| Art agent C ("UI and audio") | `logo`, icons, font, all audio, then `app_icon` and `cover` once the scene is assembled |

Build **`ferry` first, then `searchlight_tower`, then `rock_m`**. Together they make the target frame, and once they are approved they set the bar for everything else.

### Brief to paste into each art agent

> You are making assets for **Wake**, a Reddit game. Read `ASSET_LIST.md` completely, then `GAME_PLAN.md` sections 1–2. Your assets are listed under your name in section 8. Match the target frame and style rules in section 2 exactly. Follow the technical rules in section 3, and produce models only by the methods it allows. Deliver files to the exact paths in `art/required.json` with the exact attach-node and material names. Run `npm run art:check` until your entries pass. Then render each asset in the asset viewer and post the review images in Slack. Wait for approval before opening a PR. If any requirement is unclear or impossible, ask instead of improvising. Never replace a 3D model with a 2D drawing or a primitive shape.
