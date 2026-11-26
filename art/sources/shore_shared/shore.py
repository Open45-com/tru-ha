"""Original Wake / Long Sound modular foreshore. Blender XYZ = landward+/alongshore/up.
Sketch dimensions in metres. Village and cliff share the same end survey."""
import bpy,math,random,sys,json
from pathlib import Path
from math import sin,cos,pi,exp
from mathutils import Vector
def build(k,sd):
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
 out=sd.parents[1]; village=k=='shore_village'; rng=random.Random(1937+village)
 root=bpy.data.objects.new(k,None);bpy.context.collection.objects.link(root)
 def K(s):
  return tuple(u/12.92 if u<.04045 else ((u+.055)/1.055)**2.4 for u in [int(s[i:i+2],16)/255 for i in (0,2,4)])
 def tint(a,b,t):
  t=max(0,min(1,t));return tuple(x*(1-t)+y*t for x,y in zip(a,b))
 d,h,m,w,c,r,s=map(K,['262c35','56606c','2f4a38','7a4b2e','e6dfd0','5a1d1a','6f7b86']); moss=tint(m,h,.18); tree=tint(m,d,.09); roof=tint(r,d,.35)
 mats={}
 for n,rr in [('Shore_StoneTimber',.81),('Shore_MossPine',.91),('Shore_TidalPolish',.23)]+([('M_WindowGlow',.5)] if village else []):
  ma=bpy.data.materials.new(n);ma.use_nodes=True;p=ma.node_tree.nodes.get('Principled BSDF')
  p.inputs['Roughness'].default_value=rr
  if n=='M_WindowGlow':
   p.inputs['Base Color'].default_value=(*K('ffb45a'),1);p.inputs['Emission Color'].default_value=(*K('ffb45a'),1);p.inputs['Emission Strength'].default_value=2
  else:
   col=ma.node_tree.nodes.new('ShaderNodeVertexColor');col.layer_name='ShorePigment';ma.node_tree.links.new(col.outputs[0],p.inputs['Base Color'])
  mats[n]=ma
 dry,green,wet='Shore_StoneTimber','Shore_MossPine','Shore_TidalPolish'
 batches={}
 def mesh(n,pts,fs,cl,mat=dry):
  vs,faces,colors,groups=batches.setdefault(mat,([],[],[],{}));i=len(vs);vs.extend([tuple(p) for p in pts]);faces.extend([[u+i for u in f] for f in fs]);colors.extend(cl if isinstance(cl,list) else [cl]*len(fs));groups.setdefault(n,[]).extend(range(i,i+len(pts)))
 def box(n,x,y,z,dx,dy,dz,color,mat=dry):
  pts=[(x+i*dx/2,y+j*dy/2,z+l*dz/2) for l in [-1,1] for i,j in [(-1,-1),(1,-1),(1,1),(-1,1)]]
  mesh(n,pts,[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],color,mat)
 def beam(n,a,b,rad,col,nb=7,mat=dry,t=1):
  a,b=Vector(a),Vector(b);axis=(b-a).normalized();u=axis.cross(Vector((0,0,1)) if abs(axis.z)<.9 else Vector((1,0,0))).normalized();v=axis.cross(u)
  pts=[p+rad*scale*(u*cos(i*2*pi/nb)+v*sin(i*2*pi/nb)) for p,scale in [(a,1),(b,t)] for i in range(nb)]
  mesh(n,pts,[[j,(j+1)%nb,(j+1)%nb+nb,j+nb] for j in range(nb)]+[list(range(nb-1,-1,-1)),list(range(nb,nb*2))],col,mat)
 def saturate(v):return min(1,max(0,v))
 def amplit(y):
  a=saturate((20-abs(y))/4);return a*a*(3-2*a)
 def survey(y):
  a=amplit(y); notch=(1.70*exp(-((y+5)/4.1)**4) if village else 0)*a
  wav=a*(.34*sin(.48*y)+.18*cos(.89*y));top=4.32+a*(.45*sin(.24*y+.3)+.65*cos(.37*y-.5)+(.45 if not village else -.35))
  if village:
   b=a*exp(-((y-3)/11)**6);top=top*(1-b)+3.85*b
  section=[(3,-.58),(-2.86+max(-.14,wav*.38)+notch,-.58),(-2.86+max(-.14,wav*.38)+notch,.055),(-2.70+wav*.35+notch,.30+a*.024*sin(y)),(-2.55+wav*.41+notch,.46+a*.06*cos(y)),(-2.32+wav*.8+notch,.92+a*.18*sin(y*.55)),(-2.45+wav*.65+notch,1.08+a*.18*sin(y*.55)),(-2.07+wav*.86+notch,1.34+a*.18*sin(y*.55)),(-1.82+wav+notch*.93,top*.49),(-1.98+wav*.8+notch*.94,top*.53),(-1.56+wav*.6+notch*.82,top*.59),(-1.35+wav*.8+notch*.48,top*.83),(-1.52+wav*.6+notch*.39,top*.86),(-1.14+wav*.7+notch*.26,top*.94),(-.78+wav*.38+notch*.13,top),(1.00+wav*.1,top+.07),(3,top+.04)]
  # Localized thrusts and eroded fault chutes break up the strike, halfway through
  # a bed rather than repeatedly stepping every stratum at the same point.
  force=a*(.46*sin(.93*y)+.33*sin(1.79*y+.83)+.19*sin(2.09*y+.25))
  for ii in range(5,14):
   x,z=section[ii];v=(ii-4)/10;variance=a*(.20*sin(.81*y+v*4)+force*(.28+.11*cos(v*7)))
   section[ii]=(x+(.56 if ii in (7,8,10,11,13) else .20)*variance,z+variance*(.82 if ii>7 else .40))
  return section
  # profile clockwise looking down +Y; sweep outward
 # Equal intervals including identical endcap survey at both ends. Low creases are horizontally led.
 ys=[-20+i*1.25 for i in range(33)]; shades=[.03,.06,.09,.43,.56,.22,.72,.46,.29,.7,.49,.27,.67,.79,.54,.51,.22]
 for y1,y2 in zip(ys,ys[1:]):
  p,q=survey(y1),survey(y2)
  for i in range(len(p)):
   j=(i+1)%len(p);mi=wet if i<3 else green if i in (14,15) else dry
   color=tint(d,h,shades[i]+.11*amplit(y1)*sin(y1*.36+i*.44)) if mi!=green else tint(moss,h,.26+.16*sin(y1*.45+i))
   if i in (6,9,12):color=tint(color,K('8d8a82'),.12+.10*cos(y1*.63+i))
   if mi==green:color=tint(color,K('8d8a82'),.16+.055*sin(y1*.60))
   pts=[(p[i][0],y1,p[i][1]),(q[i][0],y2,q[i][1]),(q[j][0],y2,q[j][1]),(p[j][0],y1,p[j][1])]
   mesh('01 Soundings / continuous strike',pts,[(0,2,1),(0,3,2)],color,mi)
 # Survey is open only through the two mating sections: no hidden coplanar end faces.
 def stone(x,y,z,rx,ry,rz,seed):
  rr=random.Random(seed);n=7;angs=[2*pi*(i+.10*rr.uniform(-1,1))/n for i in range(n)];rad=[rr.uniform(.8,1) for i in range(n)];pts=[]
  for scale,zz in [(0.72,-.42),(1,-.05),(.94,.55),(.67,.94)]:
   for a,rad0 in zip(angs,rad):pts.append((x+rx*(rad0*scale*cos(a)+.07*zz),y+ry*rad0*scale*sin(a),z+rz*(zz+.11*cos(a-.5)+rr.uniform(-.07,.07))))
  faces=[];cols=[]
  for lev in range(3):
   for i in range(n):
    j=(i+1)%n;faces.append((lev*n+i,lev*n+j,(lev+1)*n+j,(lev+1)*n+i));cols.append(tint(d,h,.27+.12*lev+.22*rr.random()))
  faces.append(tuple(range(3*n,4*n)));cols.append(tint(h,m,.18))
  mesh('02 Tumbled foreledge blocks',pts,faces,cols)
 for i,(y,ry) in enumerate([(-17,1.1),(-15.2,.7),(-12,1.7),(-10.5,.9),(-5,1.35),(-3.5,.7),(1.3,1.6),(3,.85),(8.5,1.75),(10,.8),(15.2,1.3),(16.7,.65)]):
  if village and -10<y<-1:continue
  x=survey(y)[6][0]+.25;rx=min(.65,x+2.99)
  stone(x,y,.37,rx,ry,.8+.3*sin(y),131+i)
 # Discontinuous plate groups: overlapping wedge-shaped lithic outcrops interrupt the
 # long bedding. Their crown plan is asymmetrical; some beds pinch out before others.
 for j,(y,span) in enumerate([(-16.2,4.),(-11.4,2.5),(-5.3,3.8),(.8,2.7),(6.9,4.4),(14.75,3.25)]):
  if village and -10<y<1:continue
  base=survey(y);ht=base[14][1];z=ht*(.59 if j%2 else .71)
  # ridge runs along the irregular waterward face; raised broken crown against cliff wall.
  x=base[10][0];coords=[(-.39,-.40),(-.46,-.19),(-.34,.35),(-.07,.5),(.40,.39),(.45,-.32),(.3,-.50)]
  cs=[(x+dx,y+frac*span) for dx,frac in coords];nn=len(cs)
  ring=lambda scale,hh:[(x+(xx-x)*scale, y+(yy-y)*scale, z+hh+(yy-y)*.079+.08*sin(i*1.8+j)) for i,(xx,yy) in enumerate(cs)]
  layers=[ring(.76,-.62),ring(.82,-.23),ring(1,-.085),ring(.92,.06),ring(.82,.20)]
  nam='02b Exfoliated cantilever blades'; 
  for layer,(a,b) in enumerate(zip(layers,layers[1:])):
   # plan is clockwise in XY
   faces=[(i,nn+i,nn+(i+1)%nn,(i+1)%nn) for i in range(nn)]
   mesh(nam,a+b,faces,[tint(tint(d,h,.24+.17*layer+.06*cos(i+j)),K('8d8a82'),.17 if layer==2 else .035) for i in range(nn)])
  mesh(nam,layers[-1],[list(range(nn-1,-1,-1))],tint(h,K('8d8a82'),.22))
 def pine(x,y,height,seed,spread):
  rr=random.Random(seed);z=survey(y)[14][1]-.06
  beam('03 Wind-cut pine / bole',(x,y,z),(x+.11,y+.10,z+height*.88),.11, tint(w,d,.5),7,t=.44)
  for lev,(hz,sz,sc) in enumerate([(.19,.39,1),(.39,.32,.84),(.57,.29,.65),(.73,.27,.43)]):
   nb=9;off=rr.random()*pi;shape=[rr.uniform(.76,1.1) for i in range(nb)];x0=x+.12*hz;y0=y+.13*hz;pts=[]
   for rad,zz in [(.45,.12),(1,0),(.56,.48),(.09,.92)]:
    for j in range(nb):
     a=off+j*2*pi/nb;r1=rad*spread*sc*shape[j];pts.append((x0+r1*cos(a),y0+1.18*r1*sin(a),z+height*(hz+sz*(zz+.12*sin(3*a+.4*lev)*(1-rad*.4)))))
   fs=[list(range(nb-1,-1,-1))];colors=[tint(d,m,.39)]
   for b0 in range(3):
    for j in range(nb):
     jj=(j+1)%nb;fs.append((b0*nb+j,b0*nb+jj,(b0+1)*nb+jj,(b0+1)*nb+j));colors.append(tint(tree,h,.045+.14*b0+.15*(.5+.5*cos(j*2+lev))))
   fs.append(list(range(3*nb,4*nb)));colors.append(tint(tree,h,.19))
   mesh('03 Wind-cut pine / bough fans',pts,fs,colors,green)
 for i,(x,y,hh,width) in enumerate(([(1,-16,2.8,.79),(1.05,16.5,3.9,1)] if village else [(.85,-15,4.1,1.07),(1.78,-12.2,2.6,.76),(.70,-3,3.35,.92),(1.23,8.6,5.2,1.25),(.54,13.2,2.75,.76)])):pine(x,y,hh,72+i,width)
 if village:
  def house(y,ww,depth,ht,wall,ro,kind):
   front=-.40;back=front+depth;z=survey(y)[14][1]+.045;e=z+ht;ridge=e+.70*ww/2;hh=ww/2;label='04 Fishers’ row / '+kind
   box(label,front+depth/2,y,z-.13,depth+.12,ww+.10,.36,tint(d,h,.61))
   # Longhouse with its decorated gable facing inshore across the sound.
   a=[(-hh,z),(hh,z),(hh,e),(0,ridge),(-hh,e)]
   pts=[(x,y+dy,zz) for x in [front,back] for dy,zz in a]
   mesh(label,pts,[tuple(range(4,-1,-1)),tuple(range(5,10))]+[(j,(j+1)%5,(j+1)%5+5,j+5) for j in range(5)],wall)
   for side in [-1,1]:
    A=Vector((0,y,ridge+.08));B=Vector((0,y+side*(hh+.15),e-.03)); 
    coords=[(x,p.y,p.z) for x,p in [(front-.16,A),(back+.10,A),(back+.10,B),(front-.16,B)]]
    if side==-1:coords=coords[::-1]
    # Safely double-skinned roof, ridge rail and subtly raised standing seams.
    mesh(label,coords+[(x,v,q-.095) for x,v,q in coords],[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],ro)
    for j in range(6):
     xx=front-.10+(depth+.12)*j/5;beam(label,(xx,A.y,A.z+.022),(xx,B.y,B.z+.022),.026,tint(ro,s,.20),4)
    beam(label,(front-.18,A.y,A.z),(front-.18,B.y,B.z),.068,tint(w,c,.50),4)
   beam(label,(front-.18,y,ridge+.10),(back+.12,y,ridge+.10),.065,tint(ro,s,.34),6)
   for dy in [-hh+.055,hh-.055]:
    box(label,front-.027,y+dy,z+ht*.48,.065,.10,ht*.95,tint(w,c,.22))
   # Clapboard sill, real front panes, lintels, crossbar and central mullions.
   for j in range(4):
    box(label,front-.015,y,z+.20+j*.23,.036,ww-.15,.035,tint(wall,d,.19))
   for dy in [-hh*.49,hh*.49]:
    wz=z+ht*.56;wy=y+dy;box(label,front-.052,wy,wz,.09,.51,.76,tint(w,d,.49))
    box('05 Lantern-lit casements',front-.11,wy,wz,.032,.376,.58,K('ffb45a'),'M_WindowGlow')
    box(label,front-.138,wy,wz,.038,.031,.62,tint(w,d,.20));box(label,front-.14,wy,wz+.03,.038,.402,.037,tint(w,d,.22))
    box(label,front-.09,wy,wz-.355,.17,.59,.068,tint(w,c,.35))
   box(label,back-.41,y+.30,ridge+.08,.32,.36,.67,tint(w,d,.4));box(label,back-.41,y+.30,ridge+.47,.41,.44,.13,tint(d,h,.56))
   for sg in [-1,1]:
    cy=y+sg*(hh+.035)
    for px in [front+depth*.27,front+depth*.72]:
     if sg==-1 and abs(px-(front+back)/2)<.46:continue
     if sg==-1 and px==front+depth*.27 and kind!='ochre net loft':
      # End-wall windows face the direction of travel as well as the sound. Actual
      # rectangular glass only; no glow cards, point lights or searchlight lookalikes.
      wz=z+ht*.60;box(label,px,cy,wz,.66,.08,.73,tint(w,d,.44))
      box('05 Lantern-lit casements',px,cy-.062,wz,.49,.039,.55,K('ffb45a'),'M_WindowGlow')
      box(label,px,cy-.086,wz,.043,.031,.59,tint(w,d,.04))
      box(label,px,cy-.087,wz+.035,.52,.031,.040,tint(w,d,.04));continue
     box(label,px,cy,z+ht*.57,.40,.047,.62,tint(wall,d,.52))
     for jj in range(3):box(label,px,cy+sg*.032,z+ht*.57+(jj-1)*.17,.44,.04,.048,tint(wall,c,.20))
    box(label,(front+back)/2,cy,z+.18,depth+.02,.072,.075,tint(wall,c,.22))
   if kind=='ochre net loft':
    wz=e+.18
    beam(label,(front-.70,y,wz+.13),(front+.15,y,wz+.13),.078,tint(w,c,.21),4)
    beam(label,(front-.53,y,wz+.10),(front-.07,y,wz-.39),.051,tint(w,c,.18),4)
    beam(label,(front-.64,y,wz+.08),(front-.64,y,wz-.37),.019,K('c9a46a'),5)
   # Moor-side loading door on the end wall facing the smaller lane.
   box(label,(front+back)/2,y-hh-.025,z+.7,.70,.075,1.4,tint(w,d,.27))
  house(-.55,2.22,2.36,1.82,tint(K('b23a30'),w,.42),tint(r,d,.55),'ochre net loft')
  house(3.50,2.83,2.90,2.52,tint(c,w,.29),tint(d,s,.34),'limewashed pilot house')
  house(7.7,2.12,2.35,1.67,tint(K('2f7f8f'),d,.57),tint(w,d,.60),'blue-green cooperage')
  # Split level landing: a narrow wharf parallel to shore, inside its recessed notch.
  lab='06 Pocket wharf / trestle';x=-1.11;yy=-5.65
  for j in range(24):
   py=yy-2.3+j*.20;box(lab,x,py,.87,1.08,.185,.125,tint(w,c,.06+.12*rng.random()))
  for xx in [x-.45,x+.45]:
   box(lab,xx,yy,.72,.115,4.85,.22,tint(w,d,.36))
   for py in [yy-2.10,yy,yy+2.10]:
    beam(lab,(xx,py,-.4),(xx,py,1.13),.092,tint(w,d,.43),8);beam(lab,(xx,py,1.06),(xx,py,1.10),.101,tint(w,c,.25),8)
  for py in [yy-1.3,yy+1.3]:
   beam(lab,(x-.43,py-.71,.13),(x-.43,py+.71,.72),.065,tint(w,d,.35),4)
  # Haul apron and steps: link lower landing to upper fishers' terrace around the notch.
  for j in range(15):
   py=-3.36+j*.24;zz=.89+j*.202;box(lab,-1.68,py,zz,.72,.27,.17,tint(w,c,.18))
  for dx in [-.30,.30]:
   beam(lab,(-1.68+dx,-3.45,.75),(-1.68+dx,.12,3.58),.075,tint(w,d,.35),4)
  for j in range(6):box(lab,-1.90+j*.22,.11,3.76,.207,.64,.11,tint(w,c,.19))
  for py,zz in [(-3.30,.94),(-1.55,2.40),(.05,3.76)]:beam(lab,(-2.01,py,zz),(-2.01,py,zz+.67),.044,tint(w,c,.08),4)
  beam(lab,(-2.01,-3.31,1.62),(-2.01,.09,4.44),.052,tint(w,c,.20),4)
  # Rowboat: flared double-ended working skiff, hollow inside with gunwale and thwarts.
  lab='07 Moored clinker dinghy';cx=-2.17;cy=-5.77
  outline=[(0,-1.53),(.26,-1.25),(.42,-.54),(.43,.35),(.33,.99),(.18,1.34),(0,1.46),(-.18,1.34),(-.33,.99),(-.43,.35),(-.42,-.54),(-.26,-1.25)]
  def rl(scale,z):return [(cx+px*scale,cy+py*(.84+.16*scale),z+.12*(abs(py)/1.53)**2) for px,py in outline]
  loops=[rl(.44,-.10),rl(.73,.07),rl(.97,.28),rl(1,.34),rl(.86,.33),rl(.49,.045)];N=len(outline)
  for j,(a,b) in enumerate(zip(loops,loops[1:])):
   mesh(lab,a+b,[(i,(i+1)%N,N+(i+1)%N,N+i) for i in range(N)], [tint(w,d,.45),tint(K('2f7f8f'),d,.35),tint(w,c,.42),tint(w,c,.48),tint(w,d,.32)][j])
  mesh(lab,loops[-1],[list(range(N))],tint(w,d,.35))
  for yy in [-.72,.02,.64]:box(lab,cx,cy+yy,.242,.58 if yy else .70,.16,.047,tint(w,c,.27))
  beam(lab,(cx+.17,cy-1.2,.42),(x-.45,cy-1.83,.93),.025,K('c9a46a'),5)
 for mat,(v,f,cols,groups) in batches.items():
  me=bpy.data.meshes.new(mat+'_Survey');me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(mat+'_Forms',me);bpy.context.collection.objects.link(o);o.parent=root;me.materials.append(mats[mat])
  if mat!='M_WindowGlow':
   attr=me.color_attributes.new(name='ShorePigment',type='BYTE_COLOR',domain='CORNER')
   for face,col in zip(me.polygons,cols):
    for li in face.loop_indices:attr.data[li].color=(*col,1)
  for n,idx in groups.items():o.vertex_groups.new(name=n).add(idx,1,'REPLACE')
 root['asset']=k;root['length_m']=40.0;root['right_bank_center_x']=23.;root['game_forward']='-Z';root['mates']='shore_cliff / shore_village'
 bpy.context.scene.unit_settings.system='METRIC';bpy.ops.wm.save_as_mainfile(filepath=str(sd/(k+'.blend')))
 (out/'models').mkdir(exist_ok=True);bpy.ops.export_scene.gltf(filepath=str(out/'models'/(k+'.glb')),export_format='GLB',export_yup=True,export_texcoords=False,export_normals=True,export_materials='EXPORT',export_all_vertex_colors=True,export_animations=False)
