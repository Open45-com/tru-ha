import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import manifest from '../../art/required.json';
export const catalog=manifest.models as Record<string,{file:string,nodes?:string[],materials?:string[]}>;
const sizes:Record<string,number[]>={ferry:[3,4.5,8],searchlight_tower:[4.4,3.5,4.4],rock_s:[4,1.2,4],rock_m:[6.4,2,6.4],rock_l:[9.6,3,9.6],barge:[14,3.5,5],mine:[1,1,1],dock_start:[40,3,8],dock_finish:[40,6,12],shore_cliff:[6,6,40],shore_village:[6,6,40],buoy_red:[1,1.6,1],buoy_green:[1,1.6,1],debris:[2,1,2],lighthouse_far:[5,18,5],patrol_boat:[3,3,7]};
export function makeLoader(){const decoder=new DRACOLoader().setDecoderPath('/decoder/');return new GLTFLoader().setDRACOLoader(decoder).setMeshoptDecoder(MeshoptDecoder);}
export function placeholder(name:string){
 const [x,y,z]=sizes[name]??[3,3,3],g=new T.BoxGeometry(x,y,z);g.translate(0,y*.5,0);
 const edges=new T.EdgesGeometry(g);g.dispose();
 const box=new T.LineSegments(edges,new T.LineBasicMaterial({color:'#ef78cb',fog:false,toneMapped:false}));box.name='PLACEHOLDER: '+name;return box;
}
export function inspect(root:T.Object3D,name:string){
 const spec=catalog[name];const nodes=new Map<string,T.Object3D>(),materialNames=new Set<string>();
 root.traverse(obj=>{if(obj.name)nodes.set(obj.name,obj);if((obj as T.Mesh).isMesh){const ms=(obj as T.Mesh).material;for(const m of Array.isArray(ms)?ms:[ms])materialNames.add(m.name);}});
 return {nodes,missing:[...(spec?.nodes??[]).filter(n=>!nodes.has(n)).map(n=>'node '+n),...(spec?.materials??[]).filter(n=>!materialNames.has(n)).map(n=>'material '+n)]};
}
