"""Original Wake navigation buoys. Rebuild both with blender -b -P art/sources/buoy_red/build.py.
Native axes: Blender Z up; glTF exports +Y up. Waterline z=0, top exactly z=1.6 m.
"""
from pathlib import Path
from math import sin,cos,pi
from mathutils import Vector
import bpy
ROOT=Path(__file__).resolve().parents[3]
N=10
def c_lin(h):
    c=tuple(int(h[i:i+2],16)/255 for i in (0,2,4))
    return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c)
def mat(name,h,r,metal=0,emissive=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
    c=(*c_lin(h),1);m.diffuse_color=c;p.inputs['Base Color'].default_value=c;p.inputs['Roughness'].default_value=r;p.inputs['Metallic'].default_value=metal
    if emissive:p.inputs['Emission Color'].default_value=c;p.inputs['Emission Strength'].default_value=emissive
    return m
def generate(green):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    variant='green' if green else 'red'
    M=[mat('Paint_'+variant,'3c5b46' if green else 'a74437',.56,.03),
       mat('Wet_'+variant,'243b32' if green else '5a1d1a',.29,.10),
       mat('Edge_'+variant,'4c6d51' if green else 'b23a30',.43,.05),
       mat('M_BuoyMetal','6f7b86',.45,.15),
       mat('M_Collar','8d8a82',.50,.05),
       mat('M_Signal_'+variant,'33e07a' if green else 'ff3b30',.37,.10,1.08)]
    V=[];F=[];A=[]
    def face(a,m):F.append(a);A.append(m)
    def loft(rings,ms,cap=None):
        ids=[]
        for r in rings:ids.append(list(range(len(V),len(V)+len(r))));V.extend(r)
        n=len(ids[0])
        for k in range(len(ids)-1):
            for j in range(n):face((ids[k][j],ids[k][(j+1)%n],ids[k+1][(j+1)%n],ids[k+1][j]),ms[k] if not isinstance(ms[k],tuple) else ms[k][j])
        if cap!=None:face(tuple(reversed(ids[0])),cap);face(tuple(ids[-1]),cap)
    def shell(profile,ms,n=N,off=0,cap=None):
        loft([[(r*cos(2*pi*j/n+off),r*sin(2*pi*j/n+off),z) for j in range(n)] for z,r in profile],ms,cap)
    def square_staff(a,b,w,m):
        a,b=Vector(a),Vector(b);d=(b-a).normalized();u=d.cross(Vector((0,1,0))).normalized()*w/2;v=d.cross(u).normalized()*w/2
        loft([[tuple(p+quad) for quad in [u+v,-u+v,-u-v,u-v]] for p in (a,b)],[m],m)
    # Concave flared shoulders feed into a narrow square lantern-cage pedestal, with a wet float and seam facets.
    off=pi/N
    facets=(0,0,2,0,0,0,2,0,0,0)
    if green:
        shell([(-.24,.15),(-.16,.28),(-.04,.335),(.09,.345),(.15,.335),(.27,.27),(.57,.194),(.65,.16),(.83,.155),(.88,.122)], [1,1,1,1,2,facets,0,0,2],off=off,cap=3)
    else:
        shell([(-.24,.16),(-.16,.29),(-.04,.341),(.09,.35),(.17,.344),(.26,.306),(.49,.27),(.59,.22),(.67,.158),(.88,.141)], [1,1,1,1,2,facets,0,0,2],off=off,cap=3)
    # Two narrow ribs built into the silhouette, an upper collar, and a vented lamp base.
    shell([(.70,.153),(.73,.184),(.77,.184),(.79,.153)],[2,4,2],n=8)
    cageOff=pi/4
    shell([(.84,.126),(.875,.202),(.906,.202),(.93,.164)],[3,2,3],n=8)
    for j in range(4):
        a=cageOff+j*pi/2
        square_staff((.175*cos(a),.175*sin(a),.915),(.137*cos(a),.137*sin(a),1.43),.044,3)
    # Raised maintenance rail segments protect the vertical cage. Do not add a second glowing band.
    for j in (0,2):
        a=cageOff+j*pi/2;b=a+pi/2
        square_staff((.160*cos(a),.160*sin(a),1.15),(.160*cos(b),.160*sin(b),1.15),.026,3)
    shell([(.92,.084),(1.01,.084),(1.024,.096)],[3,4],n=8)
    shell([(1.023,.077),(1.052,.088),(1.137,.088),(1.162,.071)],[5,5,5],n=8,cap=3)
    shell([(1.162,.074),(1.193,.095),(1.221,.082)],[3,4],n=8,cap=3)
    # The peaked and low-crowned caps carry shape information even when color is unreadable.
    top=[(1.389,.133),(1.426,.189),(1.459,.177),(1.590,.038),(1.60,.014)] if green else [(1.389,.134),(1.427,.187),(1.48,.191),(1.563,.129),(1.60,.066)]
    shell(top,[3,2,0,2],n=10,cap=3)
    mesh=bpy.data.meshes.new('Buoy_'+variant+'_geometry');mesh.from_pydata(V,[],F);mesh.update()
    for m in M:mesh.materials.append(m)
    for f,a in zip(mesh.polygons,A):f.material_index=a
    obj=bpy.data.objects.new('Navigation_'+variant,mesh);bpy.context.collection.objects.link(obj)
    light=bpy.data.objects.new('light',None);bpy.context.collection.objects.link(light);light.parent=obj;light.location=(0,0,1.10)
    out=ROOT/f'art/models/buoy_{variant}.glb'
    bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_yup=True,export_lights=False,export_cameras=False,export_animations=False,export_texcoords=False,export_normals=True)
    print(out,out.stat().st_size)
if __name__=='__main__':
    generate(False);generate(True)
