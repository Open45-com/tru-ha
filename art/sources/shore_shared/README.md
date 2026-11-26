# Long Sound shore kit
Two independent original assets for Wake, generated with GPT-6.2 Astra / Blender 4.3.2. No third-party meshes, images, textures, animation, new lights or audio. The boats, tower and hazard rocks in review screenshots are existing review stand-ins, not part of these model packages.

**Placement:** glTF metres, Y up, water Y=0, course forward −Z. The untransformed tile has its exposed coast on its negative-X face. Model bounds X −3…+3, Z −20…+20. Assemble a right side in Three.js by placing the roots at (23, 0, z0−40i). Assemble the entire left side at (−23, 0, z0−40i) with root scale (−1, 1, 1). Use engine-supported mirrored normals/winding when applying a negative transform. No rotation, vertical offsets, per-tile nudging or random planar scaling. Each side can choose any order independently. This ornamentation is outside the open transit strip −20 < X < 20, including jetty piles, mooring rope, rowboat, and pine boughs. Do not place the banks at ±20: that would move geometry into the channel. No collision mesh. Do not rotate an individual bank 180° if its neighbors are not flipped. Rock crest (excluding trees and buildings): 3.68–5.71 m on the cliff and 3.19–4.80 m on the village; conifer tips and roofs extend above that.

**Seams:** 17-edge cross section is identical at both ends of both models in the exported glTF. Boundary edges are left open so adjacent segments share a visible continuous outer skin without coplanar endcaps. Continue the bank beyond the camera/view limits; hide terminal ends behind dock/level transitions rather than exposing the cut plane. Extend with new authored terminal modules if the end will be visible in gameplay. The surrounding water has no baked mesh or reflection cards.

**Design:** the cliff tile is the quiet repeat; broken ledges, wet gloss below 0.30 m, 12 angular foreledge blocks and five wind-cut pines. The landmark is a separate tile: a net loft, taller limewashed pilot house and blue-green cooperage; eight small glazed casements on the harbor and approach sides (warm #ffb45a, emission strength 2). A recessed stepped landing and hollow clinker dinghy sit below the house row. Detail is intentionally subordinate to the moving searchlight. Start with a ratio of at least three quiet stretches per village, staggered between sides. Windows are material emission, not dynamic lights.

**Editable files and regeneration:** the two .blend masters contain meter-scale meshes grouped by material, with labeled editable vertex groups for terrain survey, lithic blocks, individual houses, trees, jetty and boat. Source colors are assigned per face; the mesh has no UV texture dependency. Keep both wrapper directories beside `shore_shared/`. From the repo root:
```
blender -b -t 2 -P art/sources/shore_cliff/build.py
blender -b -t 2 -P art/sources/shore_village/build.py
python art/sources/shore_shared/check_assembly.py
npm run art:check -- shore_cliff
npm run art:check -- shore_village
```
No dependencies on another artist's Blender project, add-on or random seed. Credits entries: **merge** the delivered asset’s key from its own source folder’s `credits.merge.json` (or the two top-level keys of the joint `shore_shared/credits.merge.json` when integrating both) into existing `art/CREDITS.json`; do not replace other contributors’ keys. The review snapshots and reproducible QA patch are described in `art/review/shore_assembly/README.md`.
