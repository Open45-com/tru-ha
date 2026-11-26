"""Verify the shipped GLB, without Blender or third-party Python packages."""
import hashlib,json,math,struct
from pathlib import Path
path=Path(__file__).resolve().parents[3]/'art/models/rock_m.glb'
buf=path.read_bytes()
assert struct.unpack_from('<4sII',buf)==(b'glTF',2,len(buf))
jl,kind=struct.unpack_from('<I4s',buf,12);assert kind==b'JSON'
doc=json.loads(buf[20:20+jl]);payload=buf[28+jl:]
assert len(buf)<=120000 and not any(doc.get(k) for k in ('skins','animations','textures','images','cameras','extensions'))
nodes=doc['nodes']; root=nodes[doc['scenes'][doc.get('scene',0)]['nodes'][0]]
assert root['name']=='rock_m' and len(nodes)==4 and len(root['children'])==3
assert not any(k in n for n in nodes for k in ['matrix','translation','rotation','scale','extensions'])
def locs(accessor_id):
    a=doc['accessors'][accessor_id];v=doc['bufferViews'][a['bufferView']]
    assert (a['componentType'],a['type'])==(5126,'VEC3') and not a.get('sparse')
    return [struct.unpack_from('<fff',payload,v.get('byteOffset',0)+a.get('byteOffset',0)+i*v.get('byteStride',12)) for i in range(a['count'])]
points={};tri=0
for child in root['children']:
    n=nodes[child]; primitives=doc['meshes'][n['mesh']]['primitives'];assert len(primitives)==1
    p=primitives[0];assert p.get('mode',4)==4 and set(p['attributes'])=={'POSITION','NORMAL','COLOR_0'}
    m=doc['materials'][p['material']]; key=m['name'];assert key not in points and not m.get('emissiveFactor')
    points[key]=locs(p['attributes']['POSITION'])
    n=doc['accessors'][p['indices']]['count'];assert n%3==0;tri+=n//3
    assert abs(m['pbrMetallicRoughness']['roughnessFactor']-{'Basalt_Dry_Bedding':.84,'Basalt_Tidal_Polish':.25,'Moss_Top_Fissures':.94}[key])<1e-5
allv=sum(points.values(),[]);r=max(math.hypot(x,z) for x,y,z in allv);heights=[y for x,y,z in allv]
lo=min(heights);hi=max(heights);wet=[y for x,y,z in points['Basalt_Tidal_Polish']]
assert 300<=tri<=1300 and abs(r-3.2)<.0001 and abs(hi-2)<.0001 and -.60<lo<-.30
assert .18<max(wet)<.32 and min(wet)==lo and min(y for x,y,z in points['Moss_Top_Fissures'])>.75
assert all(math.isfinite(t) for v in allv for t in v)
print(f'PASS: {r:.4f} m maximum radius; Y {lo:.4f} to {hi:.4f} m; wet material reaches +{max(wet):.4f} m.')
print(f'PASS: {tri} tris, {len(points)} opaque vertex-colored primitives, {len(buf)} bytes; no collision mesh, lights, cameras, textures or animations.')
print('SHA-256:',hashlib.sha256(buf).hexdigest())
