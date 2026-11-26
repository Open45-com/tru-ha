"""Wake's North Quay ferry, authored parametrically. Blender 4.3+, no dependencies.
blender -b -P art/sources/ferry/build.py
Blender +Y points forward; glTF exports that as -Z. All dimensions in meters.
"""
import math, bpy, bmesh
from mathutils import Vector
from pathlib import Path
from collections import defaultdict
from math import sin, cos, pi
ROOT=Path(__file__).resolve().parents[3]
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
# All source sections build into material batches for mobile. No textures, animation, lights or camera.
M={}
def mat(name,hex,rough=.65,metal=0,glow=0):
    m=bpy.data.materials.new(name);m.use_nodes=True
    srgb=[int(hex[i:i+2],16)/255 for i in (0,2,4)]
    c=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in srgb]+[1]
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=c
    p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    m.diffuse_color=c
    if glow:
        p.inputs['Emission Color'].default_value=c;p.inputs['Emission Strength'].default_value=glow
    M[name]=m;return name
red=mat('M_Hull','b23a30',.60);wine=mat('M_Waterline','5a1d1a',.29)
iv=mat('M_Cabin','e6dfd0',.70);deck=mat('M_Teak','7a4b2e',.65)
tar=mat('M_Coaming','262c35',.46,.12); steel=mat('M_Steel','6f7b86',.40,.48)
amber=mat('M_WindowGlow','ffb45a',.33,.0,2.2);lamp=mat('M_LampGlow','ffb45a',.32,0,3.5)
port=mat('M_PortGlow','ff3b30',.30,0,4);star=mat('M_StarboardGlow','33e07a',.3,0,4)
rope=mat('M_Hemp','c9a46a',.83);gold=mat('M_RingVermilion','d27b36',.58)
V=[]; F=[]; MF=[]
def face(ids,m):F.append(tuple(ids));MF.append(m)
def verts(pts):
    n=len(V);V.extend(tuple(map(float,p)) for p in pts);return list(range(n,len(V)))
def poly(pts,m):face(verts(pts),m)
def loft(rings,mats,top=None,bottom=None):
    ids=[verts(r) for r in rings]
    n=len(ids[0])
    for k in range(len(ids)-1):
        for j in range(n): face([ids[k][j],ids[k][(j+1)%n],ids[k+1][(j+1)%n],ids[k+1][j]],mats[k])
    if bottom:face(reversed(ids[0]),bottom)
    if top:face(ids[-1],top)
def blockpoly(foot,z0,z1,m,top=None):loft([[(x,y,z) for x,y in foot] for z in (z0,z1)],[m],top or m,m)
def rect(x,y,w,l,c):
    X=w/2;Y=l/2;c=min(c,X*.75,Y*.75)
    return [(x+a,y+b) for a,b in [(-X+c,-Y),(X-c,-Y),(X,-Y+c),(X,Y-c),(X-c,Y),(-X+c,Y),(-X,Y-c),(-X,-Y+c)]]
def panel(x,y,z,w,l,h,m,c=.05):blockpoly(rect(x,y,w,l,c),z,z+h,m)
def cyl(a,b,r,m,n=8,r2=None):
    a,b=Vector(a),Vector(b); axis=(b-a).normalized()
    u=axis.cross(Vector((0,0,1)) if abs(axis.z)<.90 else Vector((0,1,0))).normalized();v=axis.cross(u)
    angles=[2*pi*i/n for i in range(n)]
    loft([[p+rad*(u*cos(t)+v*sin(t)) for t in angles] for p,rad in [(a,r),(b,r2 if r2 is not None else r)]],[m],m,m)
def tube(path,r,m,n=6):
    # Connected sweep with continuous joints, no internal cap faces.
    ps=[Vector(p) for p in path];rings=[]
    for i,p in enumerate(ps):
        d=(ps[min(i+1,len(ps)-1)]-ps[max(i-1,0)]).normalized()
        u=d.cross(Vector((0,0,1)) if abs(d.z)<.90 else Vector((0,1,0))).normalized();v=d.cross(u)
        rings.append([p+r*(u*cos(2*pi*j/n)+v*sin(2*pi*j/n)) for j in range(n)])
    loft(rings,[m]*(len(ps)-1),m,m)
def ring(center,u,v,R,r,m,n=14,k=6,stripes=False,oval=1):
    o=Vector(center);u=Vector(u);v=Vector(v);w=u.cross(v).normalized(); ids=[]
    for i in range(n):
        a=2*pi*i/n;e=u*cos(a)+v*sin(a)
        ids.append(verts([o+u*(R*oval*cos(a))+v*(R*sin(a))+r*(e*cos(2*pi*j/k)+w*sin(2*pi*j/k)) for j in range(k)]))
    for i in range(n):
        for j in range(k):face([ids[i][j],ids[(i+1)%n][j],ids[(i+1)%n][(j+1)%k],ids[i][(j+1)%k]],iv if stripes and i%(n//4)==0 else m)
# Sheer and chine follow actual changing cross sections, not a single extruded footprint.
stations=[(-4.00,.88,1.00),(-3.72,1.26,1.00),(-3.08,1.40,.97),(-1.9,1.46,.94),(.05,1.50,.96),(1.55,1.44,1.00),(2.43,1.23,1.10),(3.22,.84,1.24),(3.78,.37,1.40),(4.00,.10,1.49)]
# A narrow bright rub strake under flared gunwale catches moonlight along the sheer.
def hullring(s,zm,ys=1):
    pts=[(w*s,y*ys,zm(h)) for y,w,h in stations]+[(-w*s,y*ys,zm(h)) for y,w,h in reversed(stations)]
    return pts
rings=[hullring(.64,lambda h:-.47,.92),hullring(.86,lambda h:-.26,.97),
       hullring(.944,lambda h:0,.949),hullring(.972,lambda h:.27,.964),
       hullring(.984,lambda h:h-.19,.993),hullring(.994,lambda h:h-.16),
       hullring(1,lambda h:h-.095),hullring(1,lambda h:h)]
loft(rings,[wine,wine,wine,red,iv,red,tar],deck,wine)
# Deck taper fore/aft. Low bulwark with inner face and cream top pinrail, opening at stern.
for side in [-1,1]:
    pts=[(side*w*.982,y,h) for y,w,h in stations]
    rows=[]
    for x,y,h in pts:
        H=.18 if y<2.4 else .21
        rows.append(verts([(x,y,h-.015),(x,y,h+H),(x*.945,y,h+H),(x*.945,y,h-.015)]))
    for k in range(len(rows)-1):
        for j in range(4):face([rows[k][j],rows[k+1][j],rows[k+1][(j+1)%4],rows[k][(j+1)%4]], [red,iv,iv,red][j])
    face(rows[0],red);face(rows[-1],red)
# Bow cap closes the two gunwales above the stem.
# Shell cap follows the last station, not a protruding rectangular bow block.
cap=[(-.098,3.995),(.098,3.995),(.089,4.00),(-.089,4.00)]
blockpoly(cap,1.483,1.70,red,iv)
# Loading ramp, timber turning strips, threshold at the squared stern.
panel(0,-2.86,1.011,1.82,1.92,.035,tar,.10)
for j in range(8):
    y=-3.65+j*.221;blockpoly([(-.855,y-.104),(.855,y-.104),(.855,y+.104),(-.855,y+.104)],1.045,1.061,deck)
for side in [-1,1]:panel(side*.68,-2.88,1.064,.075,1.73,.011,steel,.016)
# Superstructure base and warm-painted boat deck: octagonal ends so cabins read from abeam and astern.
panel(0,.20,.948,2.28,3.72,.18,tar,.23)
panel(0,.20,1.09,2.27,3.69,.16,iv,.23)
# Each facade is a wall with physical cutouts, inner returns, and luminous panes recessed 2cm behind frames.
def facade_loop(foot,z0,z1,wlo,whi,ncounts,rake=False):
    for i,(a,b) in enumerate(zip(foot,foot[1:]+foot[:1])):
        A,B=Vector(a),Vector(b); D=B-A
        inward=Vector((-D.y,D.x)).normalized()
        def p(t,z,dep=0):
            x,y=A+D*t+inward*dep
            if rake: # outward-raked pilothouse windows; pronounced brow at the front corners.
                fac=(z-z0)/(z1-z0)
                x*=.97+.075*fac
                y+=max(0,y-.4)*(.12*fac-.06)
            return (x,y,z)
        def span(t0,t1,z2,z3,material,dep=0):poly([p(t0,z2,dep),p(t1,z2,dep),p(t1,z3,dep),p(t0,z3,dep)],material)
        count=ncounts[i]
        if not count:span(0,1,z0,z1,iv);continue
        span(0,1,z0,wlo,iv);span(0,1,whi,z1,iv)
        step=.90/count;gap=min(.095/D.length,step*.25)
        last=0
        for q in range(count):
            l=.05+q*step+gap/2;r=.05+(q+1)*step-gap/2
            span(last,l,wlo,whi,iv);last=r
            # Dark gasket and amber glazing, four small border returns. Slight reflective sill.
            t=.026/D.length
            span(l,r,wlo,whi,tar,.031)
            span(l+t,r-t,wlo+.035,whi-.035,amber,.020)
            if rake and i in (2,4,6):  # glazing trim creates the horizon highlight without a new material
                span(l+t,r-t,whi-.102,whi-.087,steel,.015)
            for (aa,zz),(bb,ww) in [((l,wlo),(r,wlo)),((r,wlo),(r,whi)),((r,whi),(l,whi)),((l,whi),(l,wlo))]:
                poly([p(aa,zz),p(bb,ww),p(bb,ww,.026),p(aa,zz,.026)],tar)
        span(last,1,wlo,whi,iv)
body=rect(0,.22,2.16,3.55,.18)
facade_loop(body,1.19,2.25,1.52,2.10,[0,0,4,0,3,0,4,0])
# Separate rear bulkhead windows leave room for a real, non-overlapping service door.
for x in (-.07,.62):
    panel(x,-1.560,1.57,.59,.073,.51,tar,.029)
    panel(x,-1.599,1.60,.535,.014,.445,amber,.016)
panel(0,.22,2.23,2.39,3.78,.095,tar,.24)
panel(0,.22,2.31,2.43,3.80,.075,iv,.24)
panel(0,.22,2.384,2.31,3.64,.022,deck,.24)
# Aft service door and brass deadlight, offset clear of the accommodation ladder.
panel(-.73,-1.562,1.12,.46,.053,1.03,tar,.02)
panel(-.73,-1.596,1.16,.385,.036,.95,iv,.016)
cyl((-.73,-1.606,1.88),(-.73,-1.625,1.88),.11,tar,10)
cyl((-.73,-1.627,1.88),(-.73,-1.636,1.88),.083,amber,10)
cyl((-.87,-1.642,1.55),(-.776,-1.642,1.55),.012,steel,5)
# Wheelhouse wraparound front, contrasting broad visor and raised, lightly cambered roof.
wh=rect(0,.91,1.78,1.80,.19)
facade_loop(wh,2.40,3.29,2.62,3.17,[2,0,2,1,3,1,2,0],True)
panel(0,.91,3.275,1.96,1.98,.06,tar,.21)
loft([[(x,y,z) for x,y in rect(0,.91,w,l,c)] for z,w,l,c in [(3.33,2.00,2.01,.21),(3.39,1.97,1.98,.20),(3.45,1.67,1.71,.14)]],[iv,iv],iv,iv)
# Raised rooflight aft of mast. Paired glass leaves in a dark gasket and cream sill.
panel(0,.32,3.445,.79,.40,.041,tar,.052)
for x in (-.18,.18):
    panel(x,.32,3.482,.32,.30,.025,steel,.022)
for x in [-.51,.51]:
    cyl((x,.23,3.445),(0,.645,3.97),.010,steel,5)
# A pair of low, forward-facing foghorns in cream saddles detail the broad bridge roof.
for x,y,d in [(-.28,1.22,1.),(.08,1.24,.81)]:
    cyl((x,y,3.45),(x,y,3.56),.044,steel,6)
    cyl((x,y-.12,3.58),(x,y+.20*d,3.58),.045,iv,8,.09)
    cyl((x,y+.20*d,3.58),(x,y+.21*d,3.58),.071,tar,8)
# Cylinder funnel has an aft rake, elliptical cross-section, raised lip, and open throat.
def stackring(z,rx,ry):
    cy=-.78-(z-2.4)*.135
    return [(rx*cos(i*2*pi/14),cy+ry*sin(i*2*pi/14),z) for i in range(14)]
stack=[(2.397,.51,.44),(2.54,.50,.43),(2.60,.40,.36),(2.72,.39,.35),(3.75,.33,.31),(3.89,.33,.31),(4.15,.32,.30),(4.30,.34,.31),(4.44,.34,.31),(4.50,.32,.30),(4.50,.25,.23),(4.34,.245,.225)]
loft([stackring(*i) for i in stack],[tar,tar,red,red,iv,red,red,tar,tar,tar,tar],tar,tar)
# Catwalk U-rail around aft side of upper deck, interrupted at passenger stair; side rails by foredeck.
for side in [-1,1]:
    rail=[(side*1.115,1.65),(side*1.13,.75),(side*1.13,-.03),(side*1.13,-.84),(side*1.10,-1.36),(side*.92,-1.48)]
    for x,y in rail[:-1]:cyl((x,y,2.395),(x,y,2.91),.023,iv,5)
    for z,r in [(2.90,.030),(2.665,.016)]:tube([(x,y,z) for x,y in rail],r,iv,5)
    # Stern loading deck grab rails, bolted atop plating.
    for y in [-3.49,-2.78,-2.09]:cyl((side*1.17,y,1.06),(side*1.17,y,1.52),.025,iv,5)
    cyl((side*1.17,-3.49,1.52),(side*1.17,-2.09,1.52),.032,iv,6)
# Lifebelts hung on wheelhouse aft outside face of lower cabin amidships, readable cream lashings.
for side in [-1,1]:
    ring((side*1.111,-.86,1.52),(0,1,0),(0,0,1),.218,.045,gold,16,5,True)
    # Tire fenders on short rope hangers with individual tilt (not repeated black dots).
    for y,w,z,tilt in [(-2.55,1.43,.62,.19),(-1.51,1.46,.60,-.13),(.92,1.46,.64,.17)]:
        A=(0,cos(tilt),sin(tilt));B=(0,-sin(tilt),cos(tilt))
        ring((side*(w-.042),y,z),A,B,.22,.074,tar,12,5,oval=.80)
        cyl((side*(w-.018),y-.03,z+.18),(side*(w-.06),y-.09,.99),.018,rope,5)
# Twin aft bollards, foredeck capstan, and anchor locker.
for side in [-1,1]:
    x=side*.96;y=-3.50
    panel(x,y,1.065,.30,.24,.055,tar,.04)
    cyl((x,y,1.12),(x,y,1.31),.079,steel,8);cyl((x,y,1.30),(x,y,1.35),.109,tar,8)
panel(0,2.53,1.19,.78,.56,.13,iv,.08)
panel(0,2.53,1.31,.82,.60,.06,tar,.095)
cyl((0,3.06,1.27),(0,3.06,1.52),.13,steel,10);cyl((0,3.06,1.49),(0,3.06,1.57),.19,tar,10)
# Rope coil, elliptical lay and one trailing end; intentionally offset from vehicle ramp.
for i in range(3):ring((-.57,-2.07,1.081+i*.021),(1,0,0),(0,1,0),.155+i*.009,.028,rope,12,4,oval=1.56)
tube([(-.33,-2.07,1.09),(-.25,-2.22,1.09),(-.33,-2.35,1.09),(-.45,-2.37,1.09)],.024,rope,5)
# Navigation lanterns include dark base, colored lens and eyebrow.
anchors={}
for side,color,name in [(-1,port,'nav_red'),(1,star,'nav_green')]:
    x=side*.941;y=1.38
    panel(x,y,3.374,.206,.319,.071,tar,.04)
    cyl((x,y,3.44),(x,y,3.61),.090,color,8);cyl((x,y,3.60),(x,y,3.63),.106,tar,8)
    anchors[name]=(x,y,3.53)
# Roof mast and yard. The mast head is lower than the funnel to keep the exhaust silhouette dominant.
cyl((0,.70,3.435),(0,.62,4.13),.055,steel,8,.035)
cyl((-.36,.65,3.94),(.36,.65,3.94),.027,iv,6)
cyl((0,.62,4.12),(0,.62,4.23),.068,lamp,7)
cyl((0,.62,4.23),(0,.62,4.26),.078,tar,8)
anchors.update(mast_light=(0,.62,4.19),wake_origin=(0,-4.00,0),smoke_origin=(0,-.78-(4.5-2.4)*.135,4.5))
# Angled accommodation ladder up to aft promenade; open treads, dark profiles and handrails.
for side in [-1,1]:
    x=.58+side*.202
    cyl((x,-2.09,1.08),(x,-1.50,2.41),.040,steel,5)
    cyl((x,-2.11,1.49),(x,-1.50,2.81),.026,iv,5)
    cyl((x,-2.11,1.08),(x,-2.11,1.50),.024,iv,5)
for j in range(6):
    f=(j+.5)/6
    panel(.58,-2.09+.59*f,1.08+1.30*f,.43,.125,.047,iv,.015)
# Finish mesh, recalculate face normals where connected, keep industrial facets flat.
mesh=bpy.data.meshes.new('North_Quay_static_geometry');mesh.from_pydata(V,[],F);mesh.update()
mats=list(M)
for name in mats:mesh.materials.append(M[name])
for p,ma in zip(mesh.polygons,MF):p.material_index=mats.index(ma)
b=bmesh.new();b.from_mesh(mesh);bmesh.ops.recalc_face_normals(b,faces=b.faces);b.to_mesh(mesh);b.free();mesh.update()
boat=bpy.data.objects.new('North_Quay',mesh);bpy.context.collection.objects.link(boat)
for name,pos in anchors.items():
    empty=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(empty);empty.location=pos;empty.parent=boat
out=ROOT/'art/models/ferry.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_yup=True,export_animations=False,export_cameras=False,export_lights=False,export_texcoords=False,export_normals=True)
print('WAKE FERRY:',out,out.stat().st_size)
