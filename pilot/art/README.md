# Pilot art handoff

Copy approved web exports and `manifest.json` here. Use lowercase filenames
with letters, numbers, hyphens or underscores. The local pilot falls back to
its drawn placeholders when art is unavailable.

Use a JSON object of this form:

```json
{
  "canvasSize": 1024,
  "sprites": {
    "background": { "file": "harbor.webp", "width": 1024, "height": 1024, "anchor": [0, 0] },
    "pier": { "file": "pier.png", "width": 220, "height": 92, "anchor": [20, 30], "placement": [820, 190] }
  }
}
```

Measurements are pixels. `anchor` is local to each crop, measured from the
top-left pixel boundary. `placement` is the location of that anchor on the
1024 px square. Dimensions and placement in the example are illustrative.

- Scenery keys: `background`, `pier`, `ferryOffshore`, `ferryDocked`, `cargo`.
  Ferry placements may reuse the same file. The pilot uses its existing live
  meter as a preview switch; that is not the final Devvit prior-day reveal.
- Puzzle keys: `emitter`, `mirrorMount`, `mirrorFace`, `lanternEmpty`,
  `lanternCharged`. Omit placement. The pilot applies board positions.
  Use the same pivot for both mirror parts. Match dimensions and anchors across lantern states. Draw the
  unrotated mirror face as `/`; the client rotates it by 90 degrees for `\`.
  Put the emitter's anchor on its right-facing notch, and the lantern anchor
  on the glass center where the beam ends.
- Keep the beam, grid markers, text and touch targets out of exports.
- At 360 px, verify both boards, both diagonals and a lantern state change
  without a position shift. Keep the opaque background in WebP and props
  transparent PNG. Keep editable Godot and layered source files separately.

## Included gray-box exports

- Harbor: Choco, `choco/harbor-graybox` at `5f50558`, under `art/godot/harbor/web`.
- Puzzle: Owwol, Slack delivery “Puzzle gray-box v0.1”, under `puzzle/web`.
- `manifest.json` translates those handoffs without changing any image bytes.
  The docked composition also uses the separate `mooring` prop.
