// Direct lighting in linear space. Authored water/foam textures supersede the
// deterministic procedural inspection fallback without manufacturing art files.
import * as T from 'three';
export function makeWater(){
 const uniforms={t:{value:0},beam:{value:new T.Vector3()},landing:{value:new T.Vector3()},pools:{value:Array.from({length:12},()=>new T.Vector3(1e4,0,1e4))},tints:{value:Array.from({length:12},()=>new T.Color(0))},normalTex:{value:null},foamTex:{value:null},hasNormal:{value:0},hasFoam:{value:0},ferry:{value:new T.Vector3(1e4,0,1e4)},hasBoat:{value:0}};
 const mat=new T.ShaderMaterial({uniforms,vertexShader:`
 varying vec3 pos;
 void main(){vec4 P=modelMatrix*vec4(position,1.);pos=P.xyz;gl_Position=projectionMatrix*viewMatrix*P;}
 `,fragmentShader:`
 varying vec3 pos;uniform float t,hasNormal,hasFoam,hasBoat;
 uniform vec3 beam,landing,pools[12],tints[12],ferry;
 uniform sampler2D normalTex,foamTex;
 float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
 void main(){
 vec2 p=pos.xz;float n=noise(p*.19),m=noise(p*.63+vec2(t*.1,0.));
 float bend=noise(p*vec2(.24,.60)+vec2(.03*t,-.11*t));
 float phase=p.y*5.7+p.x*.45+n*6.+bend*3.4+t*1.2;
 float wave=sin(phase),detail=sin(p.y*12.7-p.x*2.2+m*4.+bend*2.5+t*1.9);
 float crossSea=sin(p.x*2.1+p.y*8.4+noise(p*.54)*6.3-.8*t);
 vec2 slope=vec2(.08*sin(p.x*1.4+p.y*.6+t)+.05*wave,.19*wave+.07*detail);
 if(hasNormal>.5){vec2 a=texture2D(normalTex,p*.065+vec2(t*.008,t*.004)).rg;vec2 b=texture2D(normalTex,p*.12+vec2(-t*.005,t*.009)).rg;slope=(a+b-1.)*.48;}
 vec3 N=normalize(vec3(slope.x,1.,slope.y)),V=normalize(cameraPosition-pos);
 vec3 axis=normalize(landing-beam),ray=normalize(pos-beam);float cone=smoothstep(.965,.996,dot(axis,ray));
 vec2 axial=normalize((landing-beam).xz),d=(p-landing.xz);float across=abs(d.x*axial.y-d.y*axial.x),along=dot(d,axial);
 float oval=exp(-across*across/12.-along*along/110.);
 float ridge=pow(max(0.,wave*.5+.5),7.)*smoothstep(-.50,.82,detail*.62+crossSea*.38+m*.55);
 float spark=pow(max(0.,crossSea*.5+.5),10.)*pow(max(0.,detail*.5+.5),4.);
 ridge=ridge*(.42+.58*bend)+spark*.27;
 float deep=noise(p*.085+vec2(0.,t*.014));
 vec3 color=mix(vec3(.0035,.008,.019),vec3(.010,.030,.050),deep*.85+m*.15);
 vec3 H=normalize(V+normalize(vec3(-.45,.65,-.7)));
 color+=vec3(.085,.19,.28)*pow(max(dot(N,H),0.),46.)*(.25+.75*ridge);
 color+=vec3(.038,.095,.14)*ridge*(.38+deep*.68);
 color+=vec3(.19,.37,.55)*(cone*.4+oval*.24)*(0.45+ridge*2.8);
 color+=vec3(.45,.73,.97)*oval*ridge*1.4;
 for(int i=0;i<12;i++){vec2 d=p-pools[i].xz;color+=tints[i]*exp(-dot(d,vec2(d.x,.42*d.y))*.29)*(.08+.62*ridge);}
 float fringe=exp(-abs(length((p-ferry.xz)*vec2(1.,.36))-1.66)*6.)*hasBoat;
 float foam=hasFoam>.5?texture2D(foamTex,p*.24+t*.003).r:noise(p*2.+t*.05);
 color+=vec3(.22,.36,.40)*fringe*smoothstep(.51,.80,foam);
 float fog=1.-exp(-.018*.018*pow(max(-((viewMatrix*vec4(pos,1.)).z),0.),2.));
 color=mix(color,vec3(.01096,.02315,.0578),fog*.81);
 gl_FragColor=vec4(color,1.);
 }`});
 const mesh=new T.Mesh(new T.PlaneGeometry(800,800),mat);mesh.rotation.x=-Math.PI/2;
 return {mesh,uniforms};
}
export async function waterTexture(available:Set<string>,path:string,uniform:any,ready:any){
 try{if(!available.has(path))return false;
 const tex=await new T.TextureLoader().loadAsync(path);tex.wrapS=tex.wrapT=T.RepeatWrapping;uniform.value=tex;ready.value=1;return true;}catch{return false;}
}
