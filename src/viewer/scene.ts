import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {makeWater,waterTexture} from './water';
export const W=1170,H=2532, BOAT=new T.Vector3(0,0,12), TOWER=new T.Vector3(12,0,-10), ROCK=new T.Vector3(-10,0,-20);
const rad=T.MathUtils.degToRad;
export function sceneRig(canvas:HTMLCanvasElement,available:Set<string>){
 const scene=new T.Scene();scene.background=new T.Color('#1b2a44');scene.fog=new T.FogExp2('#1b2a44',.018);
 const camera=new T.PerspectiveCamera(40,W/H,.15,800);
 const renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.14;
 const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
 const bloom=new UnrealBloomPass(new T.Vector2(400,800),.9,.6,.75);composer.addPass(bloom);composer.addPass(new OutputPass());
 const orbit=new OrbitControls(camera,canvas);orbit.enablePan=false;orbit.enabled=false;orbit.minDistance=2;orbit.maxDistance=180;orbit.maxPolarAngle=Math.PI*.485;
 const sky=new T.Mesh(new T.SphereGeometry(450,24,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 p;void main(){vec3 n=normalize(p);float u=smoothstep(0.,.7,n.y);vec3 c=mix(vec3(.011,.023,.058),vec3(.0021,.0034,.008),u);vec2 s=floor(n.xz/(1.+n.y)*640.);float seed=fract(sin(dot(s,vec2(21.3,71.1)))*8743.1);c+=vec3(.46)*step(.9994,seed)*u;gl_FragColor=vec4(c,1.);}`}));
 scene.add(sky,new T.HemisphereLight('#b6d5ed','#33485b',.15));
 const moon=new T.DirectionalLight('#8fb4ff',.35);moon.position.set(-24,48,-35);scene.add(moon);
 const water=makeWater();scene.add(water.mesh);
 const textures=Promise.all([waterTexture(available,'/art/textures/water_normal.png',water.uniforms.normalTex,water.uniforms.hasNormal),waterTexture(available,'/art/textures/foam_noise.png',water.uniforms.foamTex,water.uniforms.hasFoam)]);
 const spot=new T.SpotLight('#cfe6ff',290,55,rad(13),.7,1.2);scene.add(spot,spot.target);
 const fogOffset={value:0}; // The phone lens stands far back to fit 40 m. Fog starts at the stage, not behind the player.
 function reviewFog(material:T.Material){
  if(!('fog' in material))return;
  material.onBeforeCompile=shader=>{shader.uniforms.reviewFogOffset=fogOffset;shader.vertexShader='uniform float reviewFogOffset;\n'+shader.vertexShader.replace('#include <fog_vertex>','#ifdef USE_FOG\n vFogDepth=max(0.0,-mvPosition.z-reviewFogOffset);\n#endif');};material.needsUpdate=true;
 }
 const beam=new T.Mesh(new T.ConeGeometry(1,1,48,1,true).translate(0,-.5,0),new T.ShaderMaterial({
 blending:T.AdditiveBlending,transparent:true,depthWrite:false,side:T.FrontSide,uniforms:{t:{value:0}},
 vertexShader:`varying vec3 n,v;varying vec2 tc;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=-p.xyz;tc=uv;gl_Position=projectionMatrix*p;}`,
 fragmentShader:`varying vec3 n,v;varying vec2 tc;uniform float t;void main(){float f=abs(dot(normalize(n),normalize(v)));float ray=.89+.11*sin(tc.x*75.+sin(tc.y*8.+t*.15));float a=(.05+.33*pow(f,.62))*(.22+.78*tc.y)*smoothstep(0.,.18,tc.y)*ray;gl_FragColor=vec4(.34,.61,.92,a);}`}));
 scene.add(beam);
 const rigSrc=TOWER.clone().add(new T.Vector3(0,3.45,0)),tmp=new T.Vector3(),down=new T.Vector3(0,-1,0);
 function lightAt(t:number,head?:T.Object3D,lens?:T.Object3D){
  const angle=1.31+.29*Math.sin(t*.22);
  if(head){if(head.userData.restY===undefined)head.userData.restY=head.rotation.y;head.rotation.y=head.userData.restY+angle;head.updateWorldMatrix(true,true);}
  const src=lens?lens.getWorldPosition(new T.Vector3()):rigSrc;
  const dir=head?new T.Vector3(0,0,-1).applyQuaternion(head.getWorldQuaternion(new T.Quaternion())):new T.Vector3(-Math.sin(angle),0,-Math.cos(angle));
  dir.y=0;if(dir.lengthSq()<1e-5)dir.set(-1,0,0);dir.normalize();
  const dest=src.clone().addScaledVector(dir,19);dest.y=0;
  spot.position.copy(src);spot.target.position.copy(dest);
  const line=tmp.copy(dest).sub(src),len=line.length();
  beam.position.copy(src);beam.quaternion.setFromUnitVectors(down,line.normalize());beam.scale.set(len*Math.tan(rad(13)),len,len*Math.tan(rad(13)));beam.material.uniforms.t.value=t;
  water.uniforms.t.value=t;water.uniforms.beam.value.copy(src);water.uniforms.landing.value.copy(dest);
 }
 function phone(){
  orbit.enabled=false;const pitch=rad(55),depth=40/(2*Math.tan(rad(20))*W/H),f=new T.Vector3(0,-Math.sin(pitch),-Math.cos(pitch)),u=new T.Vector3(0,Math.cos(pitch),-Math.sin(pitch));
  camera.position.copy(BOAT).addScaledVector(f,-depth).addScaledVector(u,.4*depth*Math.tan(rad(20)));
  camera.lookAt(camera.position.clone().add(f));camera.updateMatrixWorld();fogOffset.value=depth-12;
 }
 function close(subject:T.Object3D){
  orbit.enabled=true;const bounds=new T.Box3().setFromObject(subject),c=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());
  if(!Number.isFinite(c.y)){subject.getWorldPosition(c);size.set(5,5,5);}
  const r=Math.max(size.length()*.48,1);const distance=r/Math.sin(Math.atan(Math.tan(rad(20))*W/H))*1.13;
  orbit.target.copy(c);camera.position.copy(c).addScaledVector(new T.Vector3(.8,.52,1.2).normalize(),distance);orbit.update();fogOffset.value=Math.max(0,distance-12);
 }
 function size(w:number,h:number){renderer.setPixelRatio(1);renderer.setSize(w,h,false);composer.setSize(w,h);}
 function render(){camera.updateMatrixWorld();composer.render();}
 phone();return {scene,camera,renderer,water,textures,reviewFog,lightAt,phone,close,render,size,orbit};
}
