"""Wake / Long Sound packet terminal. Original measured forms; Z-up in Blender.
The Y axis points up-course, exporting to -Z. All pigment is linear vertex colour.
Material-specific batches keep draw calls low; named vertex groups preserve parts."""
import bpy, sys, math,random
from pathlib import Path
from mathutils import Vector
from math import sin,cos,pi
def build(k,sd):
 bpy.ops.wm.read_factory_settings(use_empty=True); bpy.context.preferences.filepaths.save_version=0
 finish=k=='dock_finish'; out=sd.parents[1]; rr=random.Random(841+finish)
 def rgb(s):return tuple((v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4) for v in (int(s[i:i+2],16)/255 for i in (0,2,4)))
 def mix(a,b,t):return tuple(x+(y-x)*t for x,y in zip(a,b))
 wood,cream,iron,slate,stone,teal,red,rope,steel,rust,tar=map(rgb,['7a4b2e','e6dfd0','262c35','56606c','8d8a82','2f7f8f','9c3b2c','c9a46a','6f7b86','8a4a26','262931'])
 D,W,M,G,L='Quayside_PaintWoodStone','Quayside_TidalPolish','Quayside_Hardware','M_WindowGlow','M_LampGlow'
 mats={};batches={}; root=bpy.data.objects.new(k,None); bpy.context.collection.objects.link(root)
 for mat,rough,metal in [(D,.79,.0),(W,.28,.05),(M,.52,.39),(G,.4,0),(L,.4,0)]:
  ma=bpy.data.materials.new(mat);ma.use_nodes=True;ma.use_backface_culling=True;p=ma.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
  if mat in (L,G):
   col=(*rgb('ffb45a'),1);p.inputs['Base Color'].default_value=col;p.inputs['Emission Color'].default_value=col;p.inputs['Emission Strength'].default_value=3.2 if mat==L else 2.05
  else:
   c=ma.node_tree.nodes.new('ShaderNodeVertexColor');c.layer_name='PierPigment';ma.node_tree.links.new(c.outputs[0],p.inputs['Base Color'])
  mats[mat]=ma
 def mesh(n,pts,fs,c,m=D):
  vs,faces,cols,groups=batches.setdefault(m,([],[],[],{}));i=len(vs);vs.extend([tuple(p) for p in pts]);faces.extend([tuple(i+j for j in f) for f in fs]);cols.extend([c]*len(fs) if not isinstance(c,list) else c);groups.setdefault(n,[]).extend(range(i,i+len(pts)))
 def box(n,x,y,z,a,b,h,c,m=D):
  pts=[(x+xx*a/2,y+yy*b/2,z+zz*h/2) for zz in (-1,1) for xx,yy in [(-1,-1),(1,-1),(1,1),(-1,1)]]
  mesh(n,pts,[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],c,m)
 def ext(n,pts,fs,c,m=D):mesh(n,pts,fs,c,m)
 def slab(n,x,y,z,a,b,h,bev,c,m=D):
  # A small crown bevel on substantial timber / granite pieces; three octagonal rings.
  w=a/2;v=b/2;t=min(bev,.35*w,.35*v,h*.54);cut=min(bev*1.65,.6*w,.6*v)
  loop=lambda w,v:[(-w+cut,-v),(w-cut,-v),(w,-v+cut),(w,v-cut),(w-cut,v),(-w+cut,v),(-w,v-cut),(-w,-v+cut)]
  pts=[(x+dx,y+dy,z+dz) for dw,dz in [(0,-h/2),(0,h/2-t),(t,h/2)] for dx,dy in loop(w-dw,v-dw)];fs=[tuple(reversed(range(8))),tuple(range(16,24))]
  fs+=[(s+i,s+(i+1)%8,s+8+(i+1)%8,s+i+8) for s in [0,8] for i in range(8)];mesh(n,pts,fs,c,m)
 def rod(n,a,b,r,c,s=8,m=D,r2=None):
  a,b=Vector(a),Vector(b);d=(b-a).normalized();u=d.cross(Vector((0,0,1)) if abs(d.z)<.90 else Vector((1,0,0))).normalized();v=d.cross(u)
  pts=[p+rad*(u*cos(2*pi*i/s)+v*sin(2*pi*i/s)) for p,rad in [(a,r),(b,r if r2==None else r2)] for i in range(s)]
  fs=[tuple(reversed(range(s))),tuple(range(s,2*s))]+[(i,(i+1)%s,(i+1)%s+s,i+s) for i in range(s)]
  mesh(n,pts,fs,c,m)
 def polyrod(n,pts,r,c,s=6,m=D):
  # Joined segments for a curve in an arbitrary plane; parallel-transport frame.
  P=list(map(Vector,pts));V=[];prev=None
  for j,p in enumerate(P):
   axis=(P[min(len(P)-1,j+1)]-P[max(0,j-1)]).normalized()
   if prev is None: u=axis.cross(Vector((0,0,1)) if abs(axis.z)<.87 else Vector((1,0,0))).normalized()
   else:u=(prev-axis*prev.dot(axis)).normalized()
   v=axis.cross(u);prev=u;V.extend([p+r*(u*cos(i*2*pi/s)+v*sin(i*2*pi/s)) for i in range(s)])
  faces=[tuple(reversed(range(s))),tuple(range(len(V)-s,len(V)))]+[(j*s+i,j*s+(i+1)%s,(j+1)*s+(i+1)%s,(j+1)*s+i) for j in range(len(P)-1) for i in range(s)]
  mesh(n,V,faces,c,m)
 def prof(n,x,y,points,c,m=M,s=8):
  V=[(x+r*cos((i+.5)*2*pi/s),y+r*sin((i+.5)*2*pi/s),z) for z,r in points for i in range(s)]
  F=[tuple(reversed(range(s))),tuple(range(len(V)-s,len(V)))]+[(s*j+i,s*j+(i+1)%s,(j+1)*s+(i+1)%s,(j+1)*s+i) for j in range(len(points)-1) for i in range(s)]
  mesh(n,V,F,c,m)
 def anchor(n,x,y,z):
  o=bpy.data.objects.new(n,None);bpy.context.collection.objects.link(o);o.parent=root;o.location=(x,y,z);o.empty_display_size=.18
 def lamp(x,y,i,sg):
  n='07 Cast-iron shepherd hook '+str(i);z=1.13
  prof(n,x,y,[(z,.31),(z+.12,.31),(z+.23,.23),(z+.53,.20),(z+.61,.145),(z+2.68,.10),(z+2.78,.14),(z+2.84,.11)],mix(iron,steel,.39))
  polyrod(n,[(x,y,z+2.76),(x,y,z+3.15),(x+.13*sg,y,z+3.33),(x+.40*sg,y,z+3.40),(x+.61*sg,y,z+3.32),(x+.72*sg,y,z+3.14),(x+.72*sg,y,z+3.00)],.086,mix(iron,steel,.44),6,M)
  lx=x+.72*sg
  prof(n,lx,y,[(z+2.82,.27),(z+2.88,.30),(z+3.04,.14),(z+3.07,.10)],mix(iron,slate,.66))
  prof(n,lx,y,[(z+2.40,.103),(z+2.45,.187),(z+2.66,.240),(z+2.78,.224),(z+2.82,.19)],cream,L)
  prof(n,lx,y,[(z+2.41,.115),(z+2.46,.20),(z+2.51,.18)],mix(iron,steel,.46))
  for j in (0,1,2,3):
   a=pi/4+pi/2*j;rod(n,(lx+.16*cos(a),y+.16*sin(a),z+2.47),(lx+.23*cos(a),y+.23*sin(a),z+2.81),.025,iron,4,M)
  anchor('lamp_'+str(i),lx,y,z+2.65)
 def boll(x,y):
  n='03 Mooring bitts';slab(n,x,y,1.17,.75,.60,.11,.035,mix(iron,steel,.22),M)
  for dx in [-.19,.19]:prof(n,x+dx,y,[(1.19,.115),(1.35,.115),(1.47,.16),(1.51,.135)],mix(iron,steel,.40),s=6)
 def coil(x,y,sg):
  P=[];n=40
  for i in range(n+1):
   t=i/n;a=4.5*pi*t;r=.15+.32*t;P.append((x+sg*r*1.32*cos(a),y+r*sin(a),1.19+.01*t))
  P.extend([(x+sg*.28,y+.64,1.19),(x+sg*.47,y+.77,1.18)])
  polyrod('04 Flaked hemp warps',P,.045,mix(rope,wood,.31),5)
 def crate(x,y,size,z=1.14):
  a,b,h=size;n='05 Express freight crates';base=mix(wood,rope,.22);slab(n,x,y,z+h/2,a,b,h,.036,base)
  for v in [-1,1]:
   for u in [-1,1]:box(n,x+u*(a/2-.075),y+v*b/2,z+h/2,.12,.065,h*.91,mix(base,rope,.28))
   rod(n,(x-a*.39,y+v*(b/2+.01),z+.12),(x+a*.39,y+v*(b/2+.01),z+h-.12),.063,mix(base,cream,.22),4)
  for dx in [-.28,.28]:
   box(n,x+a*dx,y,z+h+.021,.10,b,.042,mix(slate,iron,.45),M)
 def tire(x,y,z,sign):
  # Hollow flattened tire with sidewall shoulder and a real open eye, seen in elevation.
  n='02 Hanging truck-tire fenders';s=12;R=[(.31,-.07),(.43,-.12),(.55,-.07),(.575,.07),(.47,.17),(.32,.14),(.29,.06)]
  V=[(x+r*cos(2*pi*i/s),y+sign*d,z+r*sin(2*pi*i/s)) for r,d in R for i in range(s)]
  fs=[(j*s+i,j*s+(i+1)%s,((j+1)%len(R))*s+(i+1)%s,((j+1)%len(R))*s+i) for j in range(len(R)) for i in range(s)]
  if sign>0:fs=[f[::-1] for f in fs]
  mesh(n,V,fs,[mix(tar,slate,.16 if j in (2,4) else .065) for j in range(len(R)) for i in range(s)],W)
  for dx in [-.19,.19]:rod(n,(x+dx,y+sign*.065,z+.42),(x+.70*dx,y-sign*.20,1.05),.036,mix(wood,rope,.29),5)
 def roof(n,x0,x1,yc,w,eave,rise,color):
  for sign in [-1,1]:
   y1=yc+sign*w
   V=[(x,y,z+h) for h in [-.11,0] for x,y,z in [(x0,yc,eave+rise),(x1,yc,eave+rise),(x1,y1,eave),(x0,y1,eave)]]
   fs=[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
   if sign<0:fs=[q[::-1] for q in fs]
   mesh(n,V,fs,color)
   rod(n,(x0,y1,eave-.08),(x1,y1,eave-.08),.087,mix(color,steel,.25),6,M)
  rod(n,(x0-.015,yc,eave+rise+.035),(x1+.015,yc,eave+rise+.035),.083,mix(color,steel,.3),6,M)
 def wx(x,y,z,a,h,n='09 Deep sash windows'):
  # Facing -Y = toward the approach camera, light source behind frame. No halo cards.
  box(n,x,y,z,a+.26,.145,h+.23,mix(iron,wood,.35))
  box(n,x,y-.094,z,a,.060,h,cream,G)
  box(n,x,y-.125,z,.074,.070,h+.028,iron)
  box(n,x,y-.126,z+h*.14,a+.026,.065,.061,iron)
  box(n,x,y-.05,z-h*.5-.10,a+.34,.31,.135,mix(stone,cream,.25))
  box(n,x,y-.06,z+h*.5+.10,a+.26,.22,.105,mix(stone,cream,.22))
 if not finish:
  # The approach seam is at Blender +4; all fittings stay inside the registered outline.
  n='01 Packet pier / staggered planking'; woods=[mix(wood,stone,t) for t in [.20,.24,.27,.31,.35,.37,.29,.32]]
  for j in range(18):
   y=-4+(j+.5)*8/18;x=-20
   while x<19.999:
    length=min((3.1+(1.37*j)%3.8 if x==-20 else 4.7+rr.random()*2.1),20-x)
    if length<.45: length=20-x
    box(n,x+length/2,y+(-.0075 if j==0 else .0075 if j==17 else 0),1.015,length-.032,8/18-(.015 if j in (0,17) else .030),.23,rr.choice(woods));x+=length
  for y in [-3.61,-.35,3.40]:box('01 Fascia / oak bearers',0,y,.70,40,.36,.40,mix(wood,iron,.42))
  for x in [-19,-14.5,-9.5,-4.7,.15,5.2,10.1,15.1,19]:
   box('01 Trestle saddle',x,0,.64,.35,7.60,.40,mix(wood,iron,.32))
   for y in [-3.43,3.37]:
    prof('01 Piles and tidal collars',x,y,[(-.47,.28),(-.02,.30),(.30,.32)],mix(wood,iron,.68),W)
    prof('01 Piles and tidal collars',x,y,[(.30,.32),(.85,.30),(.91,.26)],mix(wood,iron,.46),D)
  for x in [-17,-7,7,17]:tire(x,3.83,.43,1)
  for x,y in [(-15,2.97),(-5,3.10),(5,3.10),(15,2.97)]:boll(x,y)
  coil(14.35,1.95,1);coil(-15.14,1.48,-1)
  # Parcel office: sea-green tongue-and-groove box, copper-gabled roof, bored valance,
  # side ticket drawer & canopy, single warm recessed sash. Low center remains empty.
  n='06 Tide office / walls';x=-9.8;y=.14;w=4.05;deep=2.88;floor=1.13;e=4.35
  slab(n,x,y,1.27,w+.28,deep+.22,.30,.057,mix(wood,iron,.37))
  box(n,x,y,(e+1.39)/2,w,deep,e-1.39,mix(teal,iron,.30))
  for by in [-1,1]:
   face=y+by*(deep/2+.012)
   for j in range(13):box(n,x-w/2+.12+j*(w-.24)/12,face,2.79,.050,.06,2.78,mix(teal,iron,.47))
   box(n,x,face,2.06,w+.07,.10,.13,mix(teal,cream,.28));box(n,x,face,4.16,w+.13,.12,.14,mix(wood,cream,.51))
  for sx in [-1,1]:
   for yy in [-1,1]:box(n,x+sx*(w/2-.026),y+yy*(deep/2-.01),2.81,.15,.15,2.92,mix(teal,cream,.35))
   v=[(x+sx*w/2,y-deep/2,e-.02),(x+sx*w/2,y+deep/2,e-.02),(x+sx*w/2,y,e+.89)]
   mesh(n,v,[(0,1,2) if sx>0 else (2,1,0)],mix(teal,cream,.22))
  roof('06 Tide office / cap',x-w/2-.29,x+w/2+.29,y,deep/2+.25,e,.99,mix(red,iron,.39))
  for dx in [-1.71,-.89,0,.89,1.71]:
   for sg in [-1,1]:rod(n,(x+dx,y,e+.99+.025),(x+dx,y+sg*(deep/2+.24),e+.024),.038,mix(rust,slate,.45),5)
  fy=y-deep/2-.07;wx(x-.45,fy,3.00,1.55,1.12,'06 Single ticket sash')
  slab(n,x-.45,fy-.26,2.32,2.03,.69,.135,.044,mix(wood,rope,.37))
  box(n,x+1.22,fy,2.49,.86,.11,2.23,mix(wood,iron,.38))
  for hx in [-.26,0,.26]:box(n,x+1.22+hx,fy-.074,2.45,.035,.035,1.94,mix(wood,rope,.19))
  slab(n,x-.45,fy-.16,3.92,2.27,.47,.13,.08,mix(teal,iron,.23))
  for xx in [-1.34,.43]:rod(n,(x+xx,fy-.34,3.86),(x+xx,fy-.02,3.46),.058,mix(cream,wood,.42),5)
  # Open hand winch on the parcel apron. Trunnions, timber bed, wound drum, crank.
  wx0,wy0=8.44,-1.62;nt='05 Parcel apron / hand winch'
  slab(nt,wx0,wy0,1.27,2.13,1.08,.26,.04,mix(wood,rope,.19))
  for sg in [-1,1]:
   xx=wx0+sg*.64
   rod(nt,(xx,wy0-.41,1.41),(xx,wy0,2.20),.109,mix(iron,steel,.34),5,M)
   rod(nt,(xx,wy0+.41,1.41),(xx,wy0,2.20),.109,mix(iron,steel,.34),5,M)
  rod(nt,(wx0-.92,wy0,2.14),(wx0+.9,wy0,2.14),.09,mix(iron,steel,.5),8,M)
  rod(nt,(wx0-.48,wy0,2.14),(wx0+.48,wy0,2.14),.276,mix(rope,wood,.37),10)
  for sg in [-1,1]:rod(nt,(wx0+sg*.48,wy0,2.14),(wx0+sg*.55,wy0,2.14),.385,mix(slate,iron,.37),10,M)
  rod(nt,(wx0+.89,wy0,2.14),(wx0+.89,wy0-.26,2.48),.056,mix(slate,iron,.34),5,M)
  rod(nt,(wx0+.87,wy0-.26,2.48),(wx0+1.12,wy0-.26,2.48),.059,wood,6)
  for pos,sz,z0 in [((11.8,-1.50),(1.68,1.23,1.14),1.13),((13.36,-1.28),(1.22,1.12,.98),1.13),((11.66,-1.40),(1.14,1.08,.82),2.302),((15.56,-1.94),(1.66,1.29,1.06),1.13)]:crate(*pos,sz,z0)
  for i,(xx,yy,sg) in enumerate([(-17.45,-.5,1),(-7.02,-2.85,-1),(16.90,1.85,-1)],1):lamp(xx,yy,i,sg)
  anchor('spawn',0,9,0)
 else:
  n='01 Granite quay / ashlar'; box(n,0,.15,.28,40.00,11.70,1.54,mix(slate,stone,.28))
  box(n,0,-5.70,-.12,40.00,.31,.57,mix(slate,iron,.58),W)
  for row,(z,h) in enumerate([(.36,.40),(.795,.41)]):
   x=-20;j=0
   while x<19.999:
    length=min((1.07+row*1.47 if j==0 else 2.76+.65*rr.random()),20-x);box(n,x+length/2,-5.74,z,length-.032,.26,h,mix(slate,stone,.30+.22*rr.random()));x+=length;j+=1
  for j in range(19):
   a=40/19;slab(n,-20+(j+.5)*a,-5.48,1.004,a-.025,.98,.25,.062,mix(stone,slate,.12+.26*rr.random()))
  for j in range(4):
   y=-4.98+(j+.5)*10.98/4;x=-20
   while x<19.999:
    a=min((1.43+j*.76 if x==-20 else 4.42+.87*rr.random()),20-x)
    box(n,x+a/2,y,1.066,a-.017,10.98/4-.022,.125,mix(stone,slate,.33+.15*rr.random()));x+=a
  # Sacrificial elm fender piles against the face, glossy 0.32m high tidal sleeves.
  for px in [-13.5,-7.4,0,7.35,14.1]:
   box('02 Elm rubbing piles',px,-5.80,-.09,.42,.40,.82,mix(wood,iron,.60),W)
   slab('02 Elm rubbing piles',px,-5.80,.71,.42,.40,.78,.041,mix(wood,iron,.38))
   box('02 Elm rubbing piles',px,-5.81,.88,.435,.38,.077,mix(iron,steel,.32),M)
  for x in [-16.8,-10.4,-4.2,3.7,10.8,17.4]:tire(x,-5.807,.43,-1)
  for x in [-16.4,-6.2,6.2,16.4]:boll(x,-4.86)
  coil(-15.2,-4.02,1)
  # Tidal yarn warehouse: a long brick loft behind the apron, lower teal bonded
  # annex, double hoist door with projecting king-post loading hood and masonry pilasters.
  n='06 Bonded warehouse';wall=mix(red,stone,.27); trim=mix(stone,cream,.22)
  x=-3.2;y=2.62;w=18.0;dep=5.76;e=6.15;z0=1.13;front=y-dep/2
  box(n,x,y,(z0+e)/2,w,dep,e-z0,wall)
  for sg in [-1,1]:
   xp=x+sg*w/2;v=[(xp,y-dep/2,e-.05),(xp,y+dep/2,e-.05),(xp,y,e+1.92)]
   mesh(n,v,[(0,1,2) if sg>0 else (2,1,0)],wall)
  roof(n,x-w/2-.22,x+w/2+.22,y,dep/2+.23,e+.05,2.03,mix(iron,slate,.50))
  for j in range(11):
   xx=x-w/2+j*w/10
   for sg in [-1,1]:rod(n,(xx,y,e+2.1),(xx,y+sg*(dep/2+.23),e+.08),.046,mix(steel,slate,.69),4,M)
  for xx in [x-w/2+.12,x-5.70,x-2.03,x+2.03,x+5.70,x+w/2-.12]:
   box(n,xx,front-.080,3.55,.35,.26,4.80,mix(wall,iron,.14));box(n,xx,front-.115,1.45,.50,.39,.63,mix(slate,stone,.59));box(n,xx,front-.12,e-.22,.50,.34,.20,trim)
  box(n,x,front-.03,e-.05,w+.1,.32,.21,mix(stone,wood,.24))
  for xx in [x-7.34,x-3.92,x+3.92,x+7.34]:
   for wz in [2.40,4.93]:wx(xx,front-.075,wz,1.48,1.06 if wz<3 else 1.40)
  # Weathered double soldier course beneath the loft, with little relief in
  # oblique light; only the door edges carry rusticated quoin clusters.
  for dx in [-6.76,6.76]:
   box(n,x+dx,front-.055,3.69,4.50,.15,.12,mix(wall,stone,.30))
   box(n,x+dx,front-.07,3.78,4.53,.17,.048,mix(wall,iron,.18))
  for sg in [-1,1]:
   for j in [0,1,2,3,4]:
    box(n,x+sg*1.96,front-.19,1.49+.55*j,.47 if j%2 else .58,.22,.32,mix(wall,stone,.24+.055*(j%2)))
  for dx in [-7.34,-3.92,3.92,7.34]:
   for j in [-2,-1,0,1,2]:
    box(n,x+dx+j*.27,front-.16,5.88-.043*abs(j),.245,.19,.162,mix(wall,stone,.32))
  # Central opening has inset paired diagonal timber leaves, an overhead rail and a hoist hood.
  doorw=3.38;dz=2.87;box(n,x,front-.115,dz,doorw,.23,3.49,mix(wood,iron,.53))
  for j in range(11):
   xx=x-doorw/2+(j+.5)*doorw/11;box(n,xx,front-.25,dz,doorw/11-.023,.06,3.42,mix(wood,iron,.26+.20*rr.random()))
  for sg in [-1,1]:
   for zz in [1.45,3.32,4.31]:box(n,x+sg*.84,front-.30,zz,1.47,.07,.095,mix(iron,steel,.22),M)
   rod(n,(x+sg*1.52,front-.32,4.27),(x+sg*.12,front-.32,1.49),.089,mix(wood,rope,.30),4)
  box(n,x,front-.19,4.79,3.99,.22,.18,mix(iron,steel,.38),M)
  box(n,x,front-.11,5.62,1.94,.16,.85,mix(wood,iron,.40))
  for j in range(4):box(n,x,front-.23,5.32+j*.17,1.74,.10,.077,mix(wood,rope,.16))
  roofwidth=2.52
  # Gable hoist hood broadside, triangular timber pediment and forward beam/hook.
  V=[(x+dx,yy,zz) for yy in [front+.37,front-1.00] for dx,zz in [(-1.26,6.11),(1.26,6.11),(0,7.16)]]
  mesh(n,V,[(2,1,0),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],mix(wood,iron,.32))
  for sg in [-1,1]:
   rod(n,(x,front-1.02,7.18),(x+sg*1.35,front-1.02,6.08),.105,trim,4)
   rod(n,(x+sg*1.06,front-.92,6.10),(x+sg*1.06,front-.17,5.47),.095,mix(wood,rope,.34),4)
  box(n,x,front-.86,6.30,.19,1.70,.20,mix(wood,rope,.28));rod(n,(x,front-1.60,6.29),(x,front-1.60,5.52),.039,mix(steel,iron,.35),6,M)
  polyrod(n,[(x,front-1.60,5.54),(x,front-1.60,5.42),(x+.15,front-1.60,5.39),(x+.19,front-1.60,5.49)],.044,iron,5,M)
  # Small chimney pair and barrel-capped flues are distinct silhouettes against fog.
  for xx in [x-5.95,x-5.05]:
   slab(n,xx,y+.61,7.91,.53,.58,1.45,.04,mix(wall,iron,.23))
   slab(n,xx,y+.61,8.63,.66,.71,.17,.03,trim)
   prof(n,xx,y+.61,[(8.70,.17),(9.04,.19),(9.10,.21)],mix(rust,iron,.44),D)
  xx=9.42;ay=2.96;aw=7.2;ad=4.72;ae=4.19;af=ay-ad/2
  box(n,xx,ay,(ae+z0)/2,aw,ad,ae-z0,mix(teal,iron,.42))
  for j in range(17):box(n,xx-aw/2+.10+j*(aw-.20)/16,af-.016,2.69,.05,.07,3.00,mix(teal,iron,.57))
  for sg in [-1,1]:
   xp=xx+sg*aw/2;V=[(xp,ay-ad/2,ae-.01),(xp,ay+ad/2,ae-.01),(xp,ay,ae+1.14)]
   mesh(n,V,[(0,1,2) if sg>0 else (2,1,0)],mix(teal,iron,.34))
  roof(n,xx-aw/2-.14,xx+aw/2+.23,ay,ad/2+.15,ae+.03,1.21,mix(rust,slate,.40))
  for dx in [-2.16,2.16]:wx(xx+dx,af-.09,2.80,1.12,.89)
  box(n,xx,af-.08,2.38,1.16,.15,2.45,mix(wood,iron,.35));box(n,xx,af-.16,3.66,1.43,.27,.11,trim)
  crate(15.15,1.14,(1.45,1.03,.89));crate(16.69,1.18,(1.36,1.09,1.01))
  for i,(xx,yy,sg) in enumerate([(-17.6,-3.8,1),(-9.8,-3.38,1),(9.8,-3.38,-1),(17.6,-3.8,-1)],1):lamp(xx,yy,i,sg)
  for sg in [-1,1]:
   xx=sg*18.65;yy=-4.94; nn='10 Festoon stays (renderer supplies wire and bulbs)'
   prof(nn,xx,yy,[(1.13,.23),(1.30,.23),(1.38,.165),(5.69,.112),(5.78,.15),(5.86,.105)],mix(wood,slate,.35),D)
   rod(nn,(xx,yy,4.93),(xx-sg*.56,yy,5.56),.064,mix(iron,steel,.49),6,M)
   rod(nn,(xx+sg*.12,yy,5.56),(xx-sg*.69,yy,5.56),.075,mix(iron,steel,.54),6,M)
   anchor('wire_anchor_'+('R' if sg>0 else 'L'),xx-sg*.65,yy,5.56)
  anchor('string_lights',0,-4.94,5.56);anchor('finish_line',0,-12,0)
 for mat,(v,f,cols,groups) in batches.items():
  me=bpy.data.meshes.new(mat+'_components');me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(mat+'_forms',me);bpy.context.collection.objects.link(o);o.parent=root;me.materials.append(mats[mat])
  if mat not in (L,G):
   attr=me.color_attributes.new(name='PierPigment',type='BYTE_COLOR',domain='CORNER')
   for face,c in zip(me.polygons,cols):
    for li in face.loop_indices:attr.data[li].color=(*c,1)
  for name,idx in groups.items():o.vertex_groups.new(name=name).add(idx,1,'REPLACE')
 root['waterline_y']=0.;root['span_metres']=40.;root['ferry_travels']='-Z';root['ship_side']='south / +Z' if finish else 'north / -Z'
 bpy.context.scene.unit_settings.system='METRIC';bpy.ops.wm.save_as_mainfile(filepath=str(sd/(k+'.blend')))
 bpy.ops.export_scene.gltf(filepath=str(out/'models'/(k+'.glb')),export_format='GLB',export_yup=True,export_normals=True,export_texcoords=False,export_materials='EXPORT',export_all_vertex_colors=True,export_animations=False,export_extras=True)
 from pack import pack
 pack(out/'models'/(k+'.glb'))
