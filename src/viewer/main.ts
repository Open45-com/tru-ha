import * as T from 'three';
import {sceneRig,W,H,BOAT,TOWER,ROCK} from './scene';
import {catalog,inspect,makeLoader,placeholder} from './models';
import {overlay,Tag} from './plate';
const $=<E extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as E;
const cv=$<HTMLCanvasElement>('view'),ov=$<HTMLCanvasElement>('overlay');
async function run(){
 const available=new Set<string>(await (await fetch('/inventory.json')).json());
 const rig=sceneRig(cv,available),loader=makeLoader();let textureNote='WATER / INSPECTION FALLBACK';
 rig.textures.then(([n,f])=>{textureNote=n&&f?'WATER / AUTHORED TEXTURES':n?'WATER / NORMAL MAP · FALLBACK FOAM':'WATER / PROCEDURAL PREVIEW';});
 const selector=$<HTMLSelectElement>('asset');
 for(const name of Object.keys(catalog))selector.add(new Option(name,name));
 const initial=new URLSearchParams(location.search).get('asset')??'ferry';
 selector.value=Object.hasOwn(catalog,initial)?initial:'ferry';
 type Slot={name:string;kind:string;object:T.Object3D;nodes:Map<string,T.Object3D>;missing:string[];local:boolean;error?:string};
 const overrides=new Map<string,File>();
 const pinnedTime=new URLSearchParams(location.search).get('time');
 let slots:Slot[]=[],serial=0,paused=pinnedTime!==null,clock=Number(pinnedTime)||0,close=false,focusName=selector.value,ready=false;
 $('motion').textContent=paused?'Resume light':'Freeze light';
 const group=new T.Group();rig.scene.add(group);
 const lamps=Array.from({length:12},()=>{const l=new T.PointLight(0xffffff,0,12,2);rig.scene.add(l);return l;});
 const pending=new Map<string,Promise<T.Object3D>>();
 async function authored(name:string){
  if(!pending.has(name))pending.set(name,(async()=>{const url='/'+catalog[name].file;if(!available.has(url))throw Error('Missing file');const res=await fetch(url);if(res.status===404)throw Error('Missing file');if(!res.ok)throw Error('HTTP '+res.status);return (await loader.parseAsync(await res.arrayBuffer(),'/art/models/')).scene;})());
  return (await pending.get(name)!).clone(true);
 }
 async function load(){
  const token=++serial;ready=false;$('capture').setAttribute('disabled','');focusName=selector.value;
  const chosen=focusName;
  const names=Array.from(new Set(['ferry','searchlight_tower',chosen==='ferry'||chosen==='searchlight_tower'?'rock_m':chosen]));
  const list=await Promise.all(names.map(async name=>{
   const file=overrides.get(name),local=Boolean(file);let object:T.Object3D;let kind='LOADED',error='';
   try{object=local?(await loader.parseAsync(await file!.arrayBuffer(),'/art/models/')).scene:await authored(name);}
   catch(e){error=String((e as Error).message);kind=error==='Missing file'?'PLACEHOLDER':'LOAD ERROR / PLACEHOLDER';object=placeholder(name);}
   const {nodes,missing}=inspect(object,name);if(kind==='LOADED'&&missing.length)kind='CHECK CONTRACT';
   object.traverse(o=>{if((o as T.Mesh).isMesh){const a=(o as T.Mesh).material;for(const m of Array.isArray(a)?a:[a])rig.reviewFog(m);}});
   object.position.copy(name==='ferry'?BOAT:name==='searchlight_tower'?TOWER:ROCK);return {name,object,kind,nodes,missing,local,error};
  }));
  if(token!==serial)return;
  for(const s of slots){group.remove(s.object);if(s.kind.includes('PLACEHOLDER')){const m=s.object as T.LineSegments;m.geometry.dispose();(m.material as T.Material).dispose();}}
  slots=list;group.add(...slots.map(s=>s.object));group.updateMatrixWorld(true);
  $('report').textContent=slots.map(s=>s.name+' · '+s.kind+(s.local?' · local GLB':'')+(s.kind==='LOADED'&&catalog[s.name].nodes?.length?'\nAttach: '+catalog[s.name].nodes!.join(', '):'')+(s.kind==='CHECK CONTRACT'?'\nMissing '+s.missing.join(', '):s.error&&s.error!=='Missing file'?'\n'+s.error:'')).join('\n');
  if(close)rig.close(subject().object);ready=true;$('capture').removeAttribute('disabled');draw();
 }
 function subject(){return slots.find(s=>s.name===focusName)??slots[0];}
 function switchCam(toClose:boolean){if(!ready)return;close=toClose;if(close)rig.close(subject().object);else rig.phone();$('close').setAttribute('aria-pressed',String(close));$('phone').setAttribute('aria-pressed',String(!close));$('hint').textContent=close?'Drag to orbit · scroll to zoom · click Close orbit to reset.':'40° field of view · 55° down · waterline at 0 m.';draw();}
 function points(){
  const active:{p:T.Vector3;c:T.Color}[]=[];
  for(const s of slots)for(const [name,n] of s.nodes){if(!/^(lamp(_\d+)?|mast_light|nav_red|nav_green|led|light|siren_a|siren_b)$/.test(name))continue;
   const col=name==='nav_green'||s.name==='buoy_green'?'#33e07a':name==='nav_red'||name==='led'||s.name==='buoy_red'?'#ff3b30':'#ffb45a';active.push({p:n.getWorldPosition(new T.Vector3()),c:new T.Color(col)});}
  active.sort((a,b)=>a.p.distanceToSquared(rig.camera.position)-b.p.distanceToSquared(rig.camera.position));lamps.forEach((l,i)=>{const v=active[i];l.visible=Boolean(v);const u=rig.water.uniforms;if(v){l.position.copy(v.p);l.color.copy(v.c);l.intensity=17;u.pools.value[i].copy(v.p);u.tints.value[i].copy(v.c);}else u.tints.value[i].set(0);});
 }
 const labels=():Tag[]=>slots.filter(s=>!close||s===subject()).map(s=>{const b=new T.Box3().setFromObject(s.object),p=b.getCenter(new T.Vector3());p.y=b.max.y;return {name:s.name,point:p,kind:s.kind,subject:s===subject()};});
 function draw(){if(!slots.length)return;const tower=slots.find(s=>s.name==='searchlight_tower');rig.lightAt(clock,tower?.nodes.get('head'),tower?.nodes.get('lens'));points();
 const boat=slots.find(s=>s.name==='ferry');rig.water.uniforms.hasBoat.value=boat?.nodes.has('wake_origin')?1:0;rig.water.uniforms.ferry.value.copy(BOAT);
 rig.render();overlay(ov,rig.camera,labels(),close,textureNote);}
 let pw=1,ph=1;function resize(){const r=$('plate').getBoundingClientRect(),ratio=Math.min(devicePixelRatio,2);pw=Math.max(1,Math.round(r.width*ratio));ph=Math.max(1,Math.round(pw*H/W));rig.size(pw,ph);ov.width=pw;ov.height=ph;draw();}
 new ResizeObserver(resize).observe($('plate'));
 async function capture(){if(!ready)return;rig.size(W,H);ov.width=W;ov.height=H;draw();
 const out=document.createElement('canvas');out.width=W;out.height=H;const ctx=out.getContext('2d')!;ctx.drawImage(cv,0,0);ctx.drawImage(ov,0,0);
 resize();const blob=await new Promise<Blob>((r,j)=>out.toBlob(b=>b?r(b):j(Error('PNG export failed')),'image/png'));
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=focusName+(close?'_close':'')+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),10000);}
 $('phone').onclick=()=>switchCam(false);$('close').onclick=()=>switchCam(true);
 $('motion').onclick=()=>{paused=!paused;$('motion').textContent=paused?'Resume light':'Freeze light';};
 $('capture').onclick=()=>capture().catch(e=>{$('report').textContent=String(e);});
 selector.onchange=()=>{$<HTMLInputElement>('file').value='';void load();};
 $<HTMLInputElement>('file').onchange=e=>{const file=(e.target as HTMLInputElement).files?.[0];if(file){overrides.set(selector.value,file);void load();}};
 await load();resize();
 let prev=performance.now();function frame(now:number){const dt=Math.min((now-prev)/1000,.1);prev=now;if(!paused)clock+=dt;if(ready&&(!document.hidden))draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
}
run().catch(e=>{$('report').textContent='Viewer unavailable: '+e.message;$('capture').setAttribute('disabled','');console.error(e);});
