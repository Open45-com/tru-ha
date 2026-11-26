"""WAKE / Low-tide folio: a wave-cut basalt strike reef. Blender 4.3+ (meters).
Authoring uses explicit survey polylines / fault partitions. No textures or CC assets.
With Blender: blender -b -t 2 -P art/sources/rock_m/build.py
"""
import bpy,math,random,json
from pathlib import Path
from math import sin,cos,pi
S=Path(__file__).resolve().parent
R=S.parents[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version=0
def K(h):
    s=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    return [(x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4) for x in s]
def mix(a,b,t):return tuple(a[i]*(1-t)+b[i]*t for i in range(3))
D=K('262c35'); H=K('56606c'); M=K('2f4a38')
root=bpy.data.objects.new('rock_m',None);bpy.context.collection.objects.link(root)
def material(n,r,metal):
    m=bpy.data.materials.new(n);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Roughness'].default_value=r;p.inputs['Metallic'].default_value=metal
    cv=m.node_tree.nodes.new('ShaderNodeVertexColor');cv.layer_name='BedTint'
    m.node_tree.links.new(cv.outputs['Color'],p.inputs['Base Color'])
    return m
mats={'dry':material('Basalt_Dry_Bedding',.84,.015),'wet':material('Basalt_Tidal_Polish',.25,.10),'green':material('Moss_Top_Fissures',.94,.0)}
batches={}; vgroups={}
def add(key,name,vs,fs,cs):
    vv,ff,cc=batches.setdefault(key,([],[],[]));ix=len(vv)
    vv.extend(vs);ff.extend([[i+ix for i in f] for f in fs]);cc.extend(cs)
    vgroups.setdefault((key,name),[]).extend(range(ix,len(vv)))
def poly(p): # normalize to outward winding
    a=sum(x*p[(i+1)%len(p)][1]-p[(i+1)%len(p)][0]*y for i,(x,y) in enumerate(p))
    return p if a>0 else list(reversed(p))
def center(p):return [sum(x)/len(p) for x in zip(*p)]
def ring(p,sc,z,dx=0,dy=0,ir=0,idx=0):
    cx,cy=center(p)
    return [(cx+(x-cx)*sc+dx,cy+(y-cy)*sc+dy,(z(x,y) if callable(z) else z)+ir*(sin(i*2.31+idx)+.29*cos(i*1.1+idx))) for i,(x,y) in enumerate(p)]
def sides(name,loops,keys,shades):
    n=len(loops[0])
    for j,(a,b) in enumerate(zip(loops,loops[1:])):
        f=[]; cols=[]
        for i in range(n):
            k=(i+1)%n;t=shades[j]+.065*sin(i*1.88+.72*j)+.035*cos(i*2+j)
            f.extend([[i,k,n+k],[i,n+k,n+i]]);cols.extend([mix(D,H,t),mix(D,H,t+.04*sin(i+1))])
        add(keys[j],name,a+b,f,cols)
def cap(name,lp,key,shade):
    # offset shallow crest (untessellated noise is avoided)
    x,y,z=center(lp);n=len(lp);v=lp+[(x-.05,y+.10,z+.045)]
    add(key,name,v,[[i,(i+1)%n,n] for i in range(n)],[mix(D,H,shade+.065*sin(i*1.33)) for i in range(n)])
shore=poly([(-3.04,.12),(-2.94,-.57),(-2.57,-1.11),(-2.48,-1.44),(-1.55,-1.62),(-.96,-1.88),(-.42,-1.81),(.25,-2.02),(.81,-1.82),(1.44,-1.78),(1.82,-1.33),(2.52,-1.36),(2.75,-.85),(2.61,-.30),(3.12,-.03),(2.95,.64),(2.40,1.28),(1.63,1.31),(1.16,1.74),(.26,1.94),(-.60,1.76),(-1.22,1.95),(-1.68,1.52),(-2.39,1.40),(-2.83,.91)])
bed=lambda x,y:.61-.061*x+.065*y
wet=[ring(shore,.81,-.46,-.12,.07,.025),ring(shore,.95,-.10,-.02,.0,.03),ring(shore,1,lambda x,y:.16+.025*sin(x*1.5+y),0,0,.018),ring(shore,.98,lambda x,y:.22+.035*sin(x+y),0,0,.02)]
sides('01. Wave-carved toe / tide polish',wet,['wet']*3,[.03,.085,.13])
bottom=wet[0];add('wet','01. Underside',bottom,[list(reversed(range(len(bottom))))],[D])
belt=[wet[-1],ring(shore,.945,lambda x,y:bed(x,y)-.17,-.03,.05,.065),ring(shore,.965,bed,-.005,.036,.06),ring(shore,.88,lambda x,y:bed(x,y)+.11,-.08,.045,.055)]
sides('02. Lower bedding and split lip',belt,['dry']*3,[.34,.52,.66]);cap('02. Exposed tidal bench',belt[-1],'dry',.65)
# Polygonal plates (all oblique to flow): central slab over west side, step-down tail SE,
# two minor calved pieces. Their concave joint margins are exposed between elevations.
def slab(name,p,zlow,zhi,jut,tilt,seed):
    p=poly(p);cx,cy=center(p);sx,sy=tilt
    h=lambda x,y:zhi+sx*(x-cx)+sy*(y-cy)
    jx,jy=jut
    layers=[ring(p,.85,zlow-.14,jx*.1,jy*.1,.047,seed),
            ring(p,.83,lambda x,y:h(x,y)-.46,jx*.13,jy*.13,.053,seed),
            ring(p,.98,lambda x,y:h(x,y)-.30,jx,jy,.057,seed+1),
            ring(p,1,lambda x,y:h(x,y)-.15,jx,jy,.035,seed+1),
            ring(p,.88,h,jx-.035,jy-.01,.025,seed+2)]
    sides(name,layers,['dry']*4,[.42,.23,.58,.86]);cap(name+' / cap',layers[-1],'dry',.91)
    return h
keel=slab('03. Main upthrust / outboard overhang',
 [(-2.70,-.56),(-2.35,-1.15),(-1.45,-1.22),(-.99,-1.03),(-.48,-1.12),(.18,-.71),(.47,-.51),(.14,-.15),(.29,.01),(-.10,.48),(-.70,.65),(-1.23,1.17),(-1.84,1.25),(-2.24,.78),(-2.57,.60)],.58,1.79,(-.26,.03),(-.075,.085),2)
slab('04. Fallen dipped plate',
 [(-.67,.76),(-.05,.58),(.41,.11),(.36,-.05),(.62,-.33),(1.06,-.35),(1.25,-.05),(1.81,.31),(2.12,.85),(1.95,1.21),(1.36,1.16),(.98,1.51),(.30,1.59),(-.48,1.49),(-.96,1.61),(-1.30,1.34)],.54,1.32,(.10,.09),(-.24,.06),3)
slab('05. Smaller windward shelf',
 [(-.22,-1.47),(.53,-1.70),(1.20,-1.53),(1.45,-1.16),(1.91,-1.18),(2.29,-.82),(2.16,-.42),(1.82,-.15),(1.56,-.07),(1.29,-.32),(.86,-.53),(.45,-.55)],.32,.90,(.18,-.07),(-.13,.12),4)
# Surface chisel seam in the crown. Broken v-shaped stroke + discontinuous moss on the
# inner (damp) side. Subtle, coherent geological detail rather than scattered vegetation.
# Conform directly to the triangular crown surface using face evaluation.
def topz(x,y):
    vv,ff,cc=batches['dry']; best=None
    for f in ff:
        if len(f)!=3:continue
        a,b,c=[vv[i] for i in f]
        x1,y1,z1=a; x2,y2,z2=b; x3,y3,z3=c
        det=(y2-y3)*(x1-x3)+(x3-x2)*(y1-y3)
        if abs(det)<1e-9:continue
        u=((y2-y3)*(x-x3)+(x3-x2)*(y-y3))/det
        v=((y3-y1)*(x-x3)+(x1-x3)*(y-y3))/det
        if min(u,v,1-u-v)<-.000001:continue
        z=u*z1+v*z2+(1-u-v)*z3
        if best is None or z>best:best=z
    return best
def seam(path,widths,name,green=False):
    vs=[];fs=[];cs=[]
    for i,(x,y) in enumerate(path):
        aa=path[max(i-1,0)];bb=path[min(i+1,len(path)-1)];dx=bb[0]-aa[0];dy=bb[1]-aa[1];mag=math.hypot(dx,dy)
        for s in [-1,0,1]:
            w=widths[i]*s
            X=x-dy/mag*w;Y=y+dx/mag*w
            z=topz(X,Y)
            vs.append((X,Y,(z or 0)+(.017 if green else .010)+(.016 if s==0 and green else 0)))
    for i in range(len(path)-1):
        for j in (0,1):
            a=i*3+j;fs.extend([[a,a+3,a+4],[a,a+4,a+1]])
            c=mix(D,M,(.68 if j else .83)) if green else mix(D,H,.09 if j else .29);cs.extend([c,c])
    add('green' if green else 'dry',name,vs,fs,cs)
seam([(-2.58,-.42),(-2.19,-.37),(-1.91,-.17),(-1.65,-.20),(-1.32,.01),(-.88,.04),(-.62,.24)], [.006,.045,.035,.055,.060,.028,.002],'06. Incised joint')
seam([(-2.27,-.39),(-2.16,-.31),(-1.94,-.12),(-1.70,-.13),(-1.52,-.04)], [.004,.089,.074,.065,.004],'07. Moss in protected joint',True)
seam([(-1.38,.01),(-1.28,.065),(-1.12,.077),(-.96,.08)], [.002,.042,.033,.002],'07. Moss in protected joint',True)
seam([(-.06,1.27),(.13,1.14),(.34,1.13),(.64,.99),(.76,.95)], [.003,.046,.055,.037,.002],'08. Minor fissure moss',True)
# Normalize the authored envelope (not an extra collision mesh) to the known sim radius.
allv=[v for vs,_,_ in batches.values() for v in vs]
sxy=3.2/max(math.hypot(x,y) for x,y,z in allv)
sz=2/max(z for x,y,z in allv)
A=math.radians(-22)
for key,(vs,fs,cs) in batches.items():
    vv=[((x*cos(A)-y*sin(A))*sxy,(x*sin(A)+y*cos(A))*sxy,z*sz) for x,y,z in vs]
    m=bpy.data.meshes.new('Reef_'+key);m.from_pydata(vv,[],fs);m.update()
    o=bpy.data.objects.new(m.name,m);bpy.context.collection.objects.link(o);o.parent=root;m.materials.append(mats[key])
    attr=m.color_attributes.new(name='BedTint',type='BYTE_COLOR',domain='CORNER')
    for f,c in zip(m.polygons,cs):
        for k in f.loop_indices:attr.data[k].color=(*c,1)
    for (k,n),ix in vgroups.items():
        if k==key:o.vertex_groups.new(name=n).add(ix,1,'REPLACE')
bpy.ops.wm.save_as_mainfile(filepath=str(S/'rock_m.blend'))
bpy.ops.export_scene.gltf(filepath=str(R/'art/models/rock_m.glb'),export_format='GLB',export_cameras=False,export_lights=False,export_animations=False,export_texcoords=False,export_attributes=False,export_vertex_color='MATERIAL',export_yup=True)
