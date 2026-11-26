"""Wake harbor flotsam. Blender 4.3+: blender -b -P art/sources/debris/build.py."""
from pathlib import Path
from math import sin,cos,pi
import bpy
ROOT=Path(__file__).resolve().parents[3]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def m(name,h,r=.72,metal=0):
    out=bpy.data.materials.new(name);out.use_nodes=True;p=out.node_tree.nodes.get('Principled BSDF')
    q=[int(h[i:i+2],16)/255 for i in (0,2,4)];c=tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in q)+(1,)
    out.diffuse_color=c;p.inputs['Base Color'].default_value=c;p.inputs['Roughness'].default_value=r;p.inputs['Metallic'].default_value=metal;return out
materials=[m('M_WetTeak','503322',.36),m('M_SaltWood','7a4b2e',.52),m('M_GrainLight','90816d',.63),m('M_TarnishedHoop','454950',.40,.4),m('M_IronHead','6f7b86',.37,.64)]
root=bpy.data.objects.new('Harbor_flotsam',None);bpy.context.collection.objects.link(root)
class Piece:
 def __init__(self):self.v=[];self.f=[];self.mat=[]
 def face(self,ids,mat):self.f.append(tuple(ids));self.mat.append(mat)
 def loft(self,rings,m,cap=None,facets=None):
    ids=[]
    for r in rings:ids.append(tuple(range(len(self.v),len(self.v)+len(r))));self.v.extend(r)
    n=len(ids[0])
    for k in range(len(ids)-1):
     for j in range(n):
      m1=m[k] if facets is None else facets(k,j)
      self.face((ids[k][j],ids[k][(j+1)%n],ids[k+1][(j+1)%n],ids[k+1][j]),m1)
    if cap is not None:self.face(reversed(ids[0]),cap);self.face(ids[-1],cap)
 def board(self,foot,bottom,top,mo,side=None):
    self.loft([[(x,y,z) for x,y in foot]for z in (bottom,top)],[mo if side is None else side],mo)
 def box(self,x,y,w,l,bottom,top,mo):
    self.board([(x-w/2,y-l/2),(x+w/2,y-l/2),(x+w/2,y+l/2),(x-w/2,y+l/2)],bottom,top,mo)
 def make(self,name,pos,yaw):
    me=bpy.data.meshes.new(name+'_geometry');me.from_pydata(self.v,[],self.f)
    for m in materials:me.materials.append(m)
    for p,i in zip(me.polygons,self.mat):p.material_index=i
    ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);ob.parent=root;ob.location=pos;ob.rotation_euler[2]=yaw
crate=Piece();crate.box(0,0,.76,.76,-.56,.17,0)
for j,shade in enumerate((1,1,2,1,1)):
 x=(j-2)*.152
 crate.board([(x-.073,-.40),(x+.073,-.40),(x+.073,.40),(x-.073,.40)],.17,.218+(.006 if j%2 else 0),shade,0)
for y in (-.30,.30):
 crate.box(0,y,.78,.086,.219,.262,1)
 for x in (-.31,.31):crate.box(x,y,.020,.020,.262,.266,4)
for side in (-1,1):
 x=.395*side
 crate.box(x,-.302,.036,.080,-.33,.23,1);crate.box(x,.302,.036,.080,-.34,.23,1)
crate.make('crate',(-.73,.20,0),.14)
barrel=Piece();n=14;stave=[1,0,1,1,2,1,0,1,1,0,1,2,1,0]
# +X is the long axis; uneven staves and two raised dark bands interrupt the silhouette.
profile=[(-.45,.239),(-.411,.254),(-.287,.272),(-.211,.300),(0,.302),(.211,.300),(.287,.272),(.411,.254),(.45,.239)]
def br(x,r): return [(x,r*cos(j*2*pi/n),-.146+r*sin(j*2*pi/n)) for j in range(n)]
barrel.loft([br(x,r) for x,r in profile],[1]*(len(profile)-1),0,lambda k,j:stave[j])
for s in (-1,1):
 hs=sorted([(s*.269,.277),(s*.239,.299),(s*.208,.306),(s*.196,.299)])
 barrel.loft([br(x,r)for x,r in hs],[3,3,3])
 # recessed inset face plus flat shoulder; lid only visible in orbit.
 barrel.loft([br(s*.451,.234),br(s*.466,.225),br(s*.460,.198)],[0,1])
 end=br(s*.460,.198);count=len(barrel.v);barrel.v.extend(end)
 indices=tuple(range(count,count+n))
 barrel.face(indices if s>0 else reversed(indices),1)
barrel.make('barrel',(.54,.29,0),-0.47)
plank=Piece();foot=[(-.99,-.102),(-.94,-.128),(.99,-.127),(.948,-.038),(1,.012),(.93,.064),(.952,.113),(-.87,.124)]
plank.board(foot,-.065,.033,1,0)
for y,col in [(-.077,0),(-.019,2),(.054,0),(.085,0)]:
 # slender colored grain strips pull the rowboat timber silhouette out of water; no texture, no emission.
 plank.board([(-.884,y),(.88,y+.008),(.69,y+.015),(-.73,y+.009)],.03316,.034,col)
for x in (-.87,.84):plank.box(x,.038,.024,.022,.034,.037,3)
plank.make('plank',(0,-.58,0),-.19)
out=ROOT/'art/models/debris.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_yup=True,export_lights=False,export_cameras=False,export_animations=False,export_texcoords=False,export_normals=True)
print(out,out.stat().st_size)
