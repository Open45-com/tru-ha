# Wake / Gate 0 review room

This is an offline-capable local art inspection tool, not a playable build. No
submission, Devvit login or Reddit installation is needed. From the Wake repo:

    npm ci
    npm run viewer

Open http://127.0.0.1:4173/ . To serve on another local port set PORT before launch.
The server binds to loopback and serves the in-memory JS bundle plus allowlisted
project assets; it does not modify art files. Restart after changing viewer source.

**Inspect a model:** put the self-contained GLB at its manifest path under
`art/models/` and refresh, or select its name under **Review subject**, then
**Load a GLB…**. Uploaded files stay in that slot as you switch subjects, until
you refresh; load the ferry and tower first for a combined review. Embedded
textures, Meshopt and Draco GLBs are supported; decoders are served locally.
The inspector reports missing attach nodes or named materials. No scaling or
recentering is performed: +Y up, −Z forward, ground plane y=0, units in meters.
No substitute boat or tower geometry is generated. Missing or invalid assets
are labeled magenta inspection cages, not final art; incomplete loaded GLBs
are labeled CHECK CONTRACT. The reference rig supplies the searchlight when
the tower is absent. Missing water textures enable the procedural preview.

**Capture:** choose **Phone frame** for 40° vertical FOV, 55° pitch, 40 m
width at the ferry plane, and the ferry waterline at 70% of frame height.
Choose **Freeze light** to hold the sweep. **Save review PNG** exports a real
1170 × 2532 rendering. Choose **Close orbit**, drag to orbit and scroll to
zoom, then export a second PNG. Put accepted candidate frames in
`art/review/<name>.png` and `<name>_close.png` only for their corresponding
delivered model. Keep placeholder calibration frames separate. To reproduce a
fixed light phase, open e.g. http://127.0.0.1:4173/?asset=searchlight_tower&time=2 .
Tool controls are excluded from exports; diagnostic labels are preserved.
A model loading here does not replace `npm run art:check -- <name>` or human signoff.

Lighting follows BUILD_PLAN §5: hemisphere + cool moon, exponential stage fog,
actual attached lamps (nearest 12), sweeping spot, additive cone, rippled water
highlight, bloom and ACES. Imported head/lens drive the beam; recognized lamp
nodes light the model and water. Animated gameplay effects, audio, input,
simulation, live deployment and final art are explicitly outside this viewer.
