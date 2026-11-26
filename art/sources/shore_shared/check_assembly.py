"""Check real, exported GLB vertices and seam edges, not authoring assumptions. No dependencies."""
from pathlib import Path
from itertools import product
import struct,json
root=Path(__file__).resolve().parents[2]; banks=['shore_cliff','shore_village'];known=[]
def load(path):
 raw=path.read_bytes();sz,=struct.unpack_from('<I',raw,12);g=json.loads(raw[20:20+sz]);binary=raw[28+sz:]
 def acc(i):
  a=g['accessors'][i];b=g['bufferViews'][a['bufferView']];t={'SCALAR':1,'VEC3':3}[a['type']];fmt='<'+{5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']]*t;off=b.get('byteOffset',0)+a.get('byteOffset',0)
  return [struct.unpack_from(fmt,binary,off+j*b.get('byteStride',struct.calcsize(fmt))) for j in range(a['count'])]
 vertices=[];tris=0;edges={z:set() for z in [-20,20]};win=audit=None
 assert not any(k in g for k in ['animations','textures','images','cameras','skins']);assert 'KHR_lights_punctual' not in g.get('extensionsUsed',[])
 for node in g['nodes']:
  assert all(k not in node for k in ['translation','rotation','scale','matrix']),node
 for mesh in g['meshes']:
  for p in mesh['primitives']:
   v=acc(p['attributes']['POSITION']);vertices+=v;idx=[u[0] for u in acc(p['indices'])];tris+=len(idx)//3
   for j in range(0,len(idx),3):
    for a,b in [(idx[j],idx[j+1]),(idx[j+1],idx[j+2]),(idx[j+2],idx[j])]:
     va,vb=v[a],v[b]
     for z in [-20,20]:
      if va[2]==z and vb[2]==z and va!=vb:edges[z].add(tuple(sorted([va[:2],vb[:2]])))
   if g['materials'][p['material']]['name']=='M_WindowGlow':
    win=g['materials'][p['material']];assert all(x>0 for x in win['emissiveFactor']);assert win['extensions']['KHR_materials_emissive_strength']['emissiveStrength']==2
 bounds=[(min(a),max(a)) for a in zip(*vertices)]
 assert bounds[2]==(-20,20) and bounds[0][0]>=-3 and bounds[0][1]==3 and bounds[1][0]<0,bounds
 assert abs(bounds[0][0]+3)<.003,bounds
 assert len(edges[-20])==len(edges[20])==17
 assert (win is not None)==('village' in path.name)
 return edges,vertices,tris,bounds,len(g['meshes']),len(g['materials'])
for k in banks:
 E,V,T,B,M,A=load(root/'models'/(k+'.glb'));known.append((E,V));print(k,':',T,'triangles;',M,'meshes;',A,'materials; XYZ bounds',B)
for (a,(ea,_)),(b,(eb,_)) in product(zip(banks,known),repeat=2):
 for za,zb,m in product([-20,20],[-20,20],[-1,1]):
  trans=lambda e:{tuple(sorted((m*x,y) for x,y in edge)) for edge in e}
  assert trans(ea[za])==trans(eb[zb]),(a,b,za,zb,m)
for _,v in known:
 assert all(x+23>=20 and -x-23<=-20 for x,y,z in v)
print('PASS: all 32 ordered tile/end/mirror cases match the exact same 17 boundary edges; both banks clear the entire open 40 m transit strip. Mirror each complete side on X, not each successive tile.')
