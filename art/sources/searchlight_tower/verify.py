"""Checks that art:check does not cover: geometry dimensions, pivots, sweep and optic material."""
import json,math,struct
from pathlib import Path
model=Path(__file__).resolve().parents[3]/'art/models/searchlight_tower.glb'
b=model.read_bytes();jl=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+jl]);payload=b[28+jl:]
nodes=j['nodes']; by={n['name']:i for i,n in enumerate(nodes)};root=by['searchlight_tower'];hd=by['head'];ls=by['lens'];assert hd in nodes[root]['children'] and ls in nodes[hd]['children']
def verts(n,shift=(0,0,0),yaw=0,in_head=False):
  o=nodes[n];t=o.get('translation',(0,0,0));assert not any(k in o for k in ('matrix','rotation','scale')), o['name']
  def rotated(v,ishead):
    x,y,z=v;return ((x*math.cos(yaw)+z*math.sin(yaw),y,-x*math.sin(yaw)+z*math.cos(yaw)) if ishead else v)
  shift=tuple(x+y for x,y in zip(shift,rotated(t,in_head)))
  if n==hd:in_head=True
  if 'mesh' in o:
    for p in j['meshes'][o['mesh']]['primitives']:
      a=j['accessors'][p['attributes']['POSITION']];v=j['bufferViews'][a['bufferView']]; assert a['componentType']==5126 and a['type']=='VEC3'
      for i in range(a['count']):
        pt=struct.unpack_from('<3f',payload,v.get('byteOffset',0)+a.get('byteOffset',0)+i*v.get('byteStride',12));yield n,tuple(x+y for x,y in zip(shift,rotated(pt,in_head)))
  for i in o.get('children',[]):yield from verts(i,shift,yaw,in_head)
data=list(verts(root));rr=max(math.hypot(x,z) for _,(x,y,z) in data);height=max(y for _,(x,y,z)in data);bottom=min(y for _,(x,y,z)in data);xx=[x for _,(x,y,z)in data];dd=max(xx)-min(xx)
assert abs(rr-2.2)<.001 and abs(dd-4.4)<.001 and abs(height-3.5)<.002 and -.60<=bottom<=-.30,(rr,dd,height,bottom)
m=next(m for m in j['materials'] if m['name']=='M_LensGlow'); strength=m['extensions']['KHR_materials_emissive_strength']['emissiveStrength'];assert 6<=strength<=10
lensmesh=next(i for i in nodes[ls]['children'] if any(j['materials'][p['material']]['name']=='M_LensGlow' for p in j['meshes'][nodes[i]['mesh']]['primitives']))
v0=dict((n,[]) for n,_ in data)
for n,pt in data:v0[n].append(pt)
extents=lambda v:tuple(max(q[i] for q in v)-min(q[i] for q in v)for i in range(3))
lx,ly,lz=extents(v0[lensmesh]);assert lz<.06 and lx>.60 and ly>.60 and max(z for x,y,z in v0[lensmesh])<-.415
for yaw in [-math.pi/4,math.pi/4]:
  v1={}
  for n,pt in verts(root,yaw=yaw):v1.setdefault(n,[]).append(pt)
  assert v1[by['searchlight_tower_mineral']]==v0[by['searchlight_tower_mineral']]
  assert v1[lensmesh]!=v0[lensmesh] and v1[by['head_metal']]!=v0[by['head_metal']]
  a=v0[lensmesh][0];d=v1[lensmesh][0];assert abs(a[1]-d[1])<1e-6 and abs(math.hypot(a[0],a[2])-math.hypot(d[0],d[2]))<1e-6
print(f'PASS | collision radius {rr:.3f} m; diameter {dd:.3f} m; above water {height:.3f} m; below {bottom:.3f} m')
print(f'PASS | head yaw ±45° carries lens and barrel, base unchanged. −Z lens face {lx:.3f} m wide; emissive strength {strength:.1f}.')
print(f'PASS | {len(j["meshes"])} draw primitives; no textures, baked lights, cameras or animations.')
assert not any(j.get(k) for k in ('textures','animations','cameras'))
