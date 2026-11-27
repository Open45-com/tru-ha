# Wake navigation marks · low-crowned red

Original low-profile painted harbor buoy, waterline-centered (1.60 m tall, 0.70 m maximum width before game scale). The waterline band darkens against the upper shoulder, and four open cage stays guard a small colored lens at exact attach node `light`. A low rounded crown differs from the paired green peak; neither uses mine horns or the mine alarm color. PBR painted metal uses no textures or assets obtained from elsewhere.

Build both through Blender 4.3+: `blender -b -P art/sources/buoy_red/build.py`. Keep these fixed, decorative marks outside the steer lane rather than attaching collision, scoring or hazard behavior. Use restrained reflectance: the actual viewer's generic 17 cd attach lighting is not appropriate for their small colored lenses at game distance. Ask renderer owner for a decorative-only light class with a short fade; retain the glTF glow mesh and node.
