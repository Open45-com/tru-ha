# Wake · North Quay ferry

An original compact, twin-deck harbor ferry. The loading ramp, forward-raked wheelhouse glazing, cream funnel band and warm cabin windows give it a readable profile at game distance. At close range the open funnel, stays, horn bells, deadlight, fenders, loading rails, rope and access ladder reward inspection. No AI image textures, external meshes or runtime primitives are used.

## Rebuild
From the repository root:

```sh
blender -b -P art/sources/ferry/build.py
npm run art:check -- ferry
```

Created with Blender 4.3.2; the script writes directly to `art/models/ferry.glb`. Modify the parametric hull sections, facade window layout and hardware in the script. All glTF geometry is a single static mesh, batched into 12 opaque material groups. There are no baked lights or textures.

## Placement

The origin is the waterline amidships. The bow is local −Z. The hull is 3.00 m wide and the bow-to-ramp length is 8.00 m. The hull draft is 0.47 m and the funnel reaches 4.50 m above the waterline. All five attach points are local to the hull node. The wheelhouse port light is on −X, starboard on +X; the centered stern `wake_origin` is at (0, 0, +4).

Warm windows use `M_WindowGlow`; each navigation lens and the mast lamp is emissive geometry. Attach scene lights to the supplied nodes, not the centers of the geometry bounds. For the art review, use the game viewer and capture the specified 1170 × 2532 target view plus the close orbit shot. Do not count a studio proof as the acceptance render.
