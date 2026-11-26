"""WAKE • Gate 0 — original 'Tideglass' searchlight. Meter-scale, editable parametric master.
Blender 4.3.2+: blender -b -t 2 -P art/sources/searchlight_tower/build.py
Optional: ... -- --blend  (save full component-editable master).
Positive Blender Y maps to negative glTF Z. Named attachments carry no axis conversion.
"""
import bpy, math, sys, os, json
from pathlib import Path
from mathutils import Vector
from math import sin,cos,pi
ROOT=Path(__file__).resolve().parents[3]
SRC=Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def lin(v):
    return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def srgb(h): 
    if isinstance(h,tuple):return h
    return tuple(lin(int(h[i:i+2],16)/255) for i in (0,2,4))
rock='56606c'; dark='262c35'; fog='1b2a44'; steel='6f7b86'; cream='e6dfd0'; teal='2f7f8f'; yellow='d9a62b'; moss='2f4a38'; tan='c9a46a'; rust='8a4a26'; concrete='8d8a82'; water='0a1424'; cold='cfe6ff'
def shade(h,f): return tuple(min(x*f,1) for x in srgb(h))
def mix(a,b,t): return tuple(x*(1-t)+y*t for x,y in zip(srgb(a),srgb(b)))
def material(name,rough,metal,em=0,color=None):
    m=bpy.data.materials.new(name);m.use_nodes=True
    b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metal
    if em:
        b.inputs['Base Color'].default_value=(*srgb(color),1);b.inputs['Emission Color'].default_value=(*srgb(color),1);b.inputs['Emission Strength'].default_value=em
    else:
        cv=m.node_tree.nodes.new('ShaderNodeVertexColor');cv.layer_name='Tint';m.node_tree.links.new(cv.outputs['Color'],b.inputs['Base Color'])
    return m
mats={'mineral':material('Basalt_Concrete',.86,.02),'wet':material('Tide_Polish',.24,.16),'metal':material('Marine_Enamel_Steel',.37,.28),'lens':material('M_LensGlow',.19,.05,7.2,cold),'cast':material('Porcelain_Enamel_And_Galvanized_Edges',.50,.08)}
def empty(name,parent=None,p=(0,0,0)):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=p;return o
root=empty('searchlight_tower'); head=empty('head',root,(0,0,2.645)); lens=empty('lens',head,(0,.465,.435))
# Mesh batches: a unique mesh for each PBR family / movable assembly, NOT a draw call per bolt.
batches={}; parts=[]; current=''; groups={}
def component(label):
    global current
    current=label
def mesh(v,faces,col,mat='metal',owner=root):
    key=(owner.name,mat); dat=batches.setdefault(key,[[],[],[],{},[]]); n=len(dat[0]);dat[0].extend([tuple(p) for p in v])
    dat[3].setdefault(current,[]).extend(range(n,n+len(v)))
    colors=col if isinstance(col,list) else [col]*len(faces)
    for face,c in zip(faces,colors):
        if len(face)>2: dat[1].append([i+n for i in face]);dat[2].append(srgb(c))
def rings(layers,col,mat='metal',owner=root,cap=True):
    n=len(layers[0]);v=sum(layers,[]);f=[];cs=[]
    for j in range(len(layers)-1):
        for i in range(n):
            a=j*n+i;b=j*n+(i+1)%n
            f.append([a,b,b+n,a+n]);cs.append(col(j,i) if callable(col) else col)
    if cap:
        f.extend([list(range(n))[::-1],list(range(len(v)-n,len(v)))]);cs.extend([col(0,0) if callable(col) else col,col(len(layers)-1,0) if callable(col) else col])
    mesh(v,f,cs,mat,owner)
def prism(x,y,z,w,d,h,col,mat='metal',owner=root,cut=.035,edge=.012):
    cut=min(cut,w*.32,d*.32);edge=min(edge,w*.10,d*.10,h*.32)
    def loop(width,depth,zz):
        a=width/2;b=depth/2;c=min(cut,a*.6,b*.6)
        return [(x+xx,y+yy,zz) for xx,yy in [(-a+c,-b),(a-c,-b),(a,-b+c),(a,b-c),(a-c,b),(-a+c,b),(-a,b-c),(-a,-b+c)]]
    rings([loop(w-2*edge,d-2*edge,z-h/2),loop(w,d,z-h/2+edge),loop(w,d,z+h/2-edge),loop(w-2*edge,d-2*edge,z+h/2)],col,mat,owner)
def pipe(p,q,r,col,n=6,mat='metal',owner=root,r2=None,rot=0):
    p,q=Vector(p),Vector(q);axis=(q-p).normalized();e=Vector((0,0,1)) if abs(axis.z)<.9 else Vector((0,1,0));a=axis.cross(e).normalized();b=axis.cross(a)
    rings([[tuple(o+(a*cos(k*2*pi/n+rot)+b*sin(k*2*pi/n+rot))*rad) for k in range(n)]for o,rad in [(p,r),(q,r if r2 is None else r2)]],col,mat,owner)
def rod(p,q,w,c,owner=root):pipe(p,q,w*.7071,c,4,owner=owner,rot=pi/4)
def angle_stock(p,q,w,t,paint,outer):
    # L-section: broad galvanized cheeks catch downlight while web and return stay gunmetal.
    p,q=Vector(p),Vector(q)
    axis=(q-p).normalized();u=axis.cross(Vector((0,1,0))).normalized();v=axis.cross(u)
    shape=[(-w/2,-w/2),(w/2,-w/2),(w/2,-w/2+t),(-w/2+t,-w/2+t),(-w/2+t,w/2),(-w/2,w/2)]
    faces=[[0,1,7,6],[1,2,8,7],[2,3,9,8],[3,4,10,9],[4,5,11,10],[5,0,6,11],list(range(6))[::-1],list(range(6,12))]
    vertices=[o+x*u+y*v for o in (p,q) for x,y in shape]
    cs=[outer,paint,paint,paint,paint,outer,outer,outer]
    mesh(vertices,faces,cs,'cast')
def profile(axis,origin,coords,col,owner=root,n=16,mat='metal'):
    # (axial offset, radial size). Profiled tooling rings also bevel barrel and stepped collars.
    o=Vector(origin);ax=Vector(axis).normalized();e=Vector((0,0,1)) if abs(ax.z)<.9 else Vector((0,1,0));u=ax.cross(e).normalized();v=ax.cross(u)
    rings([[tuple(o+ax*s+(u*cos(2*pi*i/n)+v*sin(2*pi*i/n))*r) for i in range(n)]for s,r in coords],col,mat,owner)
# Basalt scour: hand-laid broken shelf, oblique seams and two stepped ridgelines instead of round noisy boulder.
component('01 | tide-cut basalt shelf')
outline=[(2.20,0),(1.87,.62),(1.45,1.23),(.83,1.74),(.04,1.68),(-.54,1.92),(-1.22,1.62),(-1.64,1.12),(-2.05,.50),(-2.20,0),(-1.96,-.61),(-1.35,-1.21),(-.85,-1.27),(-.39,-1.79),(.28,-1.69),(.88,-1.72),(1.53,-1.21),(1.76,-.62)]
N=len(outline)
H=[.45,.40,.32,.40,.47,.32,.28,.33,.44,.52,.43,.39,.49,.43,.35,.39,.52,.51]
def layer(scale,zz,dx=0,dy=0,off=None):
    return [(x*scale+dx,y*scale+dy,(zz[i] if isinstance(zz,list) else zz)+(off[i] if off else 0)) for i,(x,y) in enumerate(outline)]
tide=[.15+.042*sin(i*1.05)+.012*cos(i*2) for i in range(N)]
rings([layer(.91,-.38),layer(1,-.055),layer(.985,tide)],lambda j,i:mix(dark,rock,.092+.042*((i*7)%4)+.012*j),'wet')
terraces=[layer(.985,tide),layer(.968,[a+.088 for a in tide],.01,-.004),layer(.887,[v-.075 for v in H],-.025,.035),layer(.893,H,-.03,.045),layer(.75,[v+.072 for v in H],-.07,.065)]
for j in range(4):
    a,b=terraces[j:j+2]; v=a+b;faces=[];cols=[]
    for i in range(N):
        k=(i+1)%N;fs=([i,k,k+N],[i,k+N,i+N]) if i%3 else ([i,k,i+N],[i+N,k,k+N]);faces.extend(fs)
        t=([.30,.39,.45,.53][j])+((i*11)%6-2)*.065
        cols.extend([mix(dark,rock,t),mix(dark,rock,t+.06)])
    mesh(v,faces,cols,'mineral')
top=terraces[-1];v=top+[(0,0,.62)]
mesh(v,[(i,(i+1)%N,N) for i in range(N)],[mix(dark,rock,.65+((i*5)%7)*.045) for i in range(N)],'mineral')
# Discrete fractured ledges share a bedding direction. Their tails plunge back into the shelf;
# avoid little round stacks or cupped "moss hats". Each cap contains a diagonal fracture and
# a fragmentary lichen stain which follows its slanted plane exactly.
def escarp(x,y,z,l,w,h,a,seed):
    pts=[(-.56,-.15),(-.23,-.48),(.33,-.43),(.54,-.17),(.46,.32),(.17,.46),(-.42,.24)]
    dx,dy=cos(a),sin(a)
    def point(xx,yy,hh):return (x+xx*l*dx-yy*w*dy,y+xx*l*dy+yy*w*dx,z+hh)
    def slope(xx,yy):return h*(.52+xx+yy*.38)
    bottom=[point(px*.96,py*.96,-.16) for px,py in pts]
    upper=[point(px+(py*.035),py,slope(px+py*.035,py)) for px,py in pts]
    n=len(pts);v=bottom+upper;f=[];cs=[]
    for i in range(n):
        k=(i+1)%n;f.append([i,k,k+n,i+n]);cs.append(mix(dark,rock,.40+.07*((i+seed)%4)))
    f.extend([[n,n+1,n+2,n+6],[n+6,n+2,n+3,n+4,n+5]])
    cs.extend([mix(dark,rock,.66+.04*(seed%3)),mix(dark,rock,.61+.04*(seed%2))]);mesh(v,f,cs,'mineral')
    # Dark little vein-colonies in two broken streaks on sunward facet. Flush, never floating.
    for u,vv,ll,ww in [(-.09,.03,.38,.12),(.19,-.085,.19,.085)]:
        st=[(-.50,-.16),(-.22,-.45),(.02,-.31),(.19,-.56),(.47,-.27),(.32,.00),(.49,.20),(.18,.32),(-.19,.46),(-.52,.20)]
        vvtx=[]
        for sx,sy in st:
            xx=u+sx*ll;yy=vv+sy*ww;vvtx.append(point(xx,yy,slope(xx,yy)+.004))
        mesh(vvtx,[list(range(10))],mix(moss,dark,.21),'mineral')
component('02 | broken basalt escarpments and lichen')
for seed,(x,y,z,l,w,h,a) in enumerate([(-1.33,.47,.46,1.14,.52,.32,-.96),(-1.48,-.20,.45,.81,.35,.18,-.95),(1.03,.78,.44,.88,.52,.24,-.97),(.52,-1.09,.43,1.39,.54,.28,.19),(-.61,1.16,.42,.83,.37,.18,-.81),(.87,-.81,.43,.69,.22,.20,.17)]):
    escarp(x,y,z,l,w,h,a,seed)
# Concrete octagonal plinth and true diagonal warning-stripe fascia. Raised drip-edge keeps black/yellow legible.
component('03 | octagonal breaker plinth and inlaid safety band')
def octo(R,z):return [(R*cos(pi*i/4+pi/8),R*sin(pi*i/4+pi/8),z)for i in range(8)]
R=1.03
rings([octo(.91,.47),octo(R,.56),octo(R,.747),octo(.99,.792)],concrete,'mineral')
# Tide weathering darkens the concrete sides; keep a broad, pale perimeter top shoulder
# so the constructed ring is visible above the basalt when seen from the stern camera.
rings([octo(1.035,.711),octo(1.042,.739),octo(1.015,.794),octo(.984,.806)],
      lambda j,i:[concrete,mix(concrete,cream,.30),mix(concrete,cream,.60),concrete][j],'mineral',cap=False)
rings([octo(.984,.806),octo(.758,.81)],lambda j,i:mix(concrete,cream,.72 if i%2 else .58),'mineral',cap=False)
# Carry the pad stripe around onto the upward-facing chamfer, not onto the walkable top.
rimA=octo(1.041,.743);rimB=octo(1.016,.796)
for i in range(8):
    a,b=Vector(rimA[i]),Vector(rimA[(i+1)%8]);c,d=Vector(rimB[i]),Vector(rimB[(i+1)%8]);f=Vector((0,0,.002))
    for k in range(3):
        f0=k/3;f1=f0+.15
        mesh([a.lerp(b,f0)+f,a.lerp(b,f1)+f,c.lerp(d,f1+.081)+f,c.lerp(d,f0+.081)+f],[[0,1,2,3]],mix(steel,yellow,.75),'cast')
rings([octo(1.033,.596),octo(1.033,.711)],dark)
pts=octo(1.036,0)
for i in range(8):
    p=Vector(pts[i]);q=Vector(pts[(i+1)%8]);e=q-p
    for k in range(3):
        a=.027+k*.308;b=a+.166
        mesh([p+e*a+Vector((0,0,.600)),p+e*b+Vector((0,0,.600)),p+e*(b+.10)+Vector((0,0,.707)),p+e*(a+.10)+Vector((0,0,.707))],[[0,1,2,3]],yellow)
# Structural bent: four raked steel legs; X-laced faces separated at intersections; shoes, rivet heads and crest.
component('04 | anchor plates and raked steel legs')
def xy(sz,i):return [(sz,sz),(-sz,sz),(-sz,-sz),(sz,-sz)][i%4]
def loc(sz,i,z):return (*xy(sz,i),z)
for i in range(4):
    x,y=xy(.52,i)
    prism(x,y,.822,.31,.31,.065,steel,cut=.044)
    angle_stock((x,y,.84),loc(.354,i,2.492),.158,.061,steel,mix(steel,cream,.62))
    for d in [-1,1]:
        pipe((x+d*.105,y-d*.087,.852),(x+d*.105,y-d*.087,.886),.032,tan,6)
component('05 | angle iron cross-bracing')
for i in range(4):
    for sz,z in [(.51,.918),(.416,1.63),(.325,2.39)]:
        rod(loc(sz,i,z),loc(sz,i+1,z),.061,steel)
    for sz1,z1,sz2,z2 in [(.503,.932,.42,1.615),(.411,1.652,.327,2.372)]:
        rod(loc(sz1,i,z1),loc(sz2,i+1,z2),.063,mix(steel,cream,.16))
        rod(loc(sz1*.96,i+1,z1),loc(sz2*.96,i,z2),.049,steel)
component('06 | service ladder and hand grips')
for x in [-.155,.155]:
    pipe((x,-.597,.81),(x,-.429,2.49),.028,steel,6)
    pipe((x,-.429,2.49),(x,-.35,2.52),.028,steel,6)
for i in range(8):
    z=.966+.204*i;y=-.598+.10*(z-.81)
    pipe((-.155,y,z),(.155,y,z),.021,mix(steel,cream,.24),6)
# Enclosed service cabinet on right face, bracketed on steel, vented door, hinges, small tan lever and conduit elbows.
component('07 | maintenance cabinet and conduit')
prism(.519,.045,1.225,.245,.43,.56,teal,cut=.030,edge=.021)
prism(.653,.045,1.22,.031,.36,.45,mix(steel,teal,.57),cut=.010,edge=.005)
for z in [1.27,1.318,1.366]:
    prism(.678,.045,z,.029,.20,.023,dark,cut=.004,edge=.002)
prism(.687,.151,1.16,.030,.035,.082,tan,cut=.004,edge=.004)
for p,q in [((.59,-.08,.96),(.59,-.08,.885)),((.59,-.08,.885),(.71,-.08,.80))]:
    pipe(p,q,.024,dark,7)
component('08 | bridge deck and slew bearing')
prism(0,0,2.47,.97,.89,.11,steel,cut=.13,edge=.024)
prism(0,0,2.531,.91,.82,.042,mix(steel,cream,.48),mat='cast',cut=.13,edge=.009)
profile((0,0,1),(0,0,2.51),[(0,.31),(.025,.35),(.094,.35),(.108,.29),(.136,.27)],lambda j,i:[dark,steel,dark,mix(dark,steel,.5),steel][j],n=16)
# Twin asymmetric-profile yoke arms with cast trunnion bosses. Local zero = true vertical yaw pivot.
component('09 | swiveling cast yoke')
profile((0,0,1),(0,0,0),[(0,.245),(.035,.28),(.067,.26)],steel,head,n=16)
prism(0,-.025,.084,.96,.32,.103,mix(steel,teal,.51),owner=head,cut=.06)
for side in [-1,1]:
    section=[(-.14,.065),(.112,.065),(.125,.171),(.08,.245),(.138,.46),(.065,.531),(-.067,.531),(-.136,.454),(-.087,.228),(-.164,.147)]
    # Y/Z outline with outward-facing normals on the +X cheek plate.
    x=side*.440; dx=.092
    v=[(x+d,y,z) for d in [-dx/2,dx/2] for y,z in section];n=len(section)
    fs=[list(range(n))[::-1],list(range(n,2*n))]+[[i,(i+1)%n,(i+1)%n+n,i+n]for i in range(n)]
    mesh(v,fs,[mix(steel,cream,.32),mix(steel,cream,.32)]+[mix(steel,teal,.38)]*n,'metal',head)
    profile((side,0,0),(side*.436,-.005,.435),[(0,.130),(.049,.139),(.071,.115),(.083,.108)],steel,head,14)
    pipe((side*.513,-.005,.435),(side*.539,-.005,.435),.070,tan,6,owner=head)
component('10 | ventilated searchlight barrel')
cy=.435
# Eight-sided rear bay expands to broad chamfered snout. 0.8 m main barrel, sculpted rings catch cold rim light.
profile((0,1,0),(0,0,cy),[(-.397,.192),(-.363,.251),(-.310,.278),(-.122,.287),(-.07,.325),(.168,.325),(.273,.367),(.349,.369),(.392,.351)],lambda j,i:[steel,mix(steel,teal,.5),mix(steel,teal,.73),dark,mix(steel,teal,.75),mix(steel,teal,.62),steel,mix(steel,teal,.52),steel][j],head,n=20)
# Tapered porcelain rear end cap and a full-width upper enamel band; pale landmark
# reads during a side-on sweep without relying on the lens or adding emissive faces.
profile((0,1,0),(0,0,cy),[(-.403,.175),(-.396,.219),(-.365,.267),(-.336,.285),(-.309,.282)],
        lambda j,i:[mix(steel,cream,.6),cream,mix(steel,cream,.65),mix(steel,cream,.45),steel][j],head,n=16,mat='cast')
# Cooling fins with machined edge, interrupted by a pair of lengthwise clamping rails.
for j,y in enumerate([-.277,-.201,-.125,-.049,.027]):
    rad=[.294,.314,.330,.346,.351][j]
    profile((0,1,0),(0,y,cy),[(-.013,rad-.018),(-.008,rad),(.009,rad),(.016,rad-.013)],lambda j,i:mix(dark,steel,.53 if j in [0,2] else .90),head,n=10)
for side in [-1,1]:
    pipe((side*.295,-.31,cy+.085),(side*.342,.259,cy+.10),.026,tan,6,owner=head)
# Deep cowl with a raised brow, open at the bottom. Elliptic silhouette and pale rim separate barrel from the dark mechanism.
component('11 | raised visor and nickel rim')
arc=[(i/16)*pi*1.31-pi*.155 for i in range(17)]
def arch(radius,y,extend):return [(radius*cos(t),y+extend*max(0,sin(t)),cy+radius*sin(t)) for t in arc]
loops=[arch(.343,-.322,0),arch(.385,-.281,0),arch(.392,.337,.135),arch(.378,.348,.133),arch(.366,.331,.133),arch(.334,-.309,0)]
v=sum(loops,[]);n=len(arc);fs=[];cs=[]
for j in range(5):
    for i in range(n-1):
        fs.append([j*n+i,j*n+i+1,(j+1)*n+i+1,(j+1)*n+i]);shade=cream if i in [5,6,7,8,9,10,11] else mix(steel,cream,.65)
        cs.append([mix(steel,cream,.48),shade,cream,mix(steel,cream,.63),dark][j])
for i in [0,n-1]:fs.append([j*n+i for j in range(6)][::1 if i==0 else -1]);cs.append(steel)
mesh(v,fs,cs,'cast',head)
# Lens frame & annular sections (non-emissive). Lens own transform is at the dome center-front attachment.
component('12 | lens bezel and fluted glass')
profile((0,1,0),(0,0,cy),[(.349,.355),(.379,.376),(.404,.373),(.421,.351),(.423,.320)],lambda j,i:[dark,steel,mix(steel,cream,.3),tan,dark][j],head,24)
# Make real illuminated optic by building forward-facing nested Fresnel annuli.
# A single bright disc on phones; subtle segmented concentric striae up close.
def annulus(ra,rb,ya,yb,col,owner,mat,n=24):
    v=[(r*cos(2*pi*i/n),y,r*sin(2*pi*i/n)) for r,y in [(ra,ya),(rb,yb)] for i in range(n)]
    mesh(v,[[i,i+n,(i+1)%n+n,(i+1)%n]for i in range(n)],col,mat,owner)
# positive Blender Y is forward. Outer->inner order for forward winding.
for ra,rb,ya,yb,material_id,tint in [(.311,.265,-.039,-.027,'lens',cold),(.265,.256,-.027,-.030,'metal',steel),(.256,.203,-.030,-.016,'lens',cold),(.203,.196,-.016,-.021,'metal',steel),(.196,.129,-.021,-.009,'lens',cold),(.129,.122,-.009,-.012,'metal',steel),(.122,.054,-.012,-.003,'lens',cold)]:
    annulus(ra,rb,ya,yb,tint,lens,material_id)
n=24;vv=[(.054*cos(2*pi*i/n),-.003,.054*sin(2*pi*i/n))for i in range(n)]+[(0,0,0)]
mesh(vv,[[i,n,(i+1)%n]for i in range(n)],cold,'lens',lens)
for i in range(6):
    a=i*pi/3; x=.339*cos(a);z=cy+.339*sin(a)
    pipe((x,.407,z),(x,.428,z),.013,tan,6,owner=head)
# Barrel top cover in the original sea-green enamel, carrying a short cast handle.
component('13 | cowl handle')
for side in [-1,1]:
    rod((side*.107,-.021,.768),(side*.107,-.021,.837),.032,steel,head)
rod((-.107,-.021,.837),(.107,-.021,.837),.035,steel,head)
# Compile into draw-efficient objects with full sub-component vertex groups in .blend.
for (on,mn),(v,f,cs,gr,_) in batches.items():
    ob={'searchlight_tower':root,'head':head,'lens':lens}[on]
    m=bpy.data.meshes.new(on+'_'+mn);m.from_pydata(v,[],f);m.update()
    o=bpy.data.objects.new(m.name,m);bpy.context.collection.objects.link(o);o.parent=ob;m.materials.append(mats[mn])
    if mn!='lens':
        attr=m.color_attributes.new(name='Tint',type='BYTE_COLOR',domain='CORNER'); data=attr.data
        for p,c in zip(m.polygons,cs):
            for l in p.loop_indices:data[l].color=(*c,1)
    for label,idx in gr.items():
        if label:
            vg=o.vertex_groups.new(name=label);vg.add(idx,1,'REPLACE')
if '--blend' in sys.argv:
    bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'searchlight_tower.blend'))
out=ROOT/'art/models/searchlight_tower.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_animations=False,export_cameras=False,export_lights=False,export_texcoords=False,export_tangents=False,export_attributes=False,export_vertex_color='MATERIAL',export_yup=True)
print('Wrote',out)
