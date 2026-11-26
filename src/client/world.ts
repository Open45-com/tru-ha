// Three.js world for Wake. Reads sim state; never changes it.
import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { makeWater } from '../viewer/water.ts';
import { placeholder } from '../viewer/models.ts';
import { Q, TUNING, FINISH_Y, hazardStateAt, sinT, cosT, ONE, type Course, type Hazard, type RunState } from '../sim/index.ts';

const rad = T.MathUtils.degToRad;
const ART = './art/';

export const CAMERAS = {
  spec: { label: 'Spec 55° / 40 m', fov: 40, pitch: 55, width: 40 },
  close: { label: 'Close 45° / 28 m', fov: 50, pitch: 45, width: 28 },
} as const;
export type CameraName = keyof typeof CAMERAS;

/** Sim units (0.1 m, y down the course) to Three.js metres (−Z up the course). */
export function toWorld(x: number, y: number, out = new T.Vector3()): T.Vector3 {
  return out.set(x / 10 - 20, 0, y / 10 - 240);
}

type Live = { h: Hazard; obj: T.Object3D; head?: T.Object3D; lens?: T.Object3D; cone?: T.Mesh; spot?: T.SpotLight; led?: T.Mesh };

export class World {
  renderer: T.WebGLRenderer;
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(40, 1, 0.3, 900);
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  water = makeWater();
  loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  models = new Map<string, Promise<T.Object3D | null>>();
  ferry = new T.Group();
  ferryModel: T.Object3D | null = null;
  ferryNodes = new Map<string, T.Object3D>();
  hazards: Live[] = [];
  hazardGroup = new T.Group();
  wake: Wake;
  ring: T.Mesh<T.RingGeometry, T.ShaderMaterial>;
  bulbs: T.Mesh[] = [];
  camName: CameraName = 'spec';
  camTarget = new T.Vector3();
  fogOffset = { value: 0 };
  shake = 0;
  sinkT = -1;
  finishT = -1;
  caughtBy: string | null = null;
  time = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.14;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const s = this.scene;
    s.background = new T.Color('#1b2a44');
    s.fog = new T.FogExp2('#1b2a44', 0.018);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(s, this.camera));
    this.bloom = new UnrealBloomPass(new T.Vector2(256, 512), 0.9, 0.6, 0.75);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    s.add(sky(), new T.HemisphereLight('#b6d5ed', '#33485b', 0.15));
    const moon = new T.DirectionalLight('#8fb4ff', 0.35);
    moon.position.set(-24, 48, -35);
    s.add(moon, this.water.mesh, this.hazardGroup, this.ferry);
    this.water.mesh.position.z = -120;
    loadTex(ART + 'textures/water_normal.png', this.water.uniforms.normalTex, this.water.uniforms.hasNormal);
    loadTex(ART + 'textures/foam_noise.png', this.water.uniforms.foamTex, this.water.uniforms.hasFoam);

    this.wake = new Wake();
    s.add(this.wake.mesh);
    this.ring = detectionRing();
    s.add(this.ring);
    this.buildStatic();
    this.loadFerry();
  }

  // --- assets ---

  model(name: string): Promise<T.Object3D | null> {
    if (!this.models.has(name)) {
      this.models.set(name, this.loader.loadAsync(ART + 'models/' + name + '.glb')
        .then(g => { this.prepare(g.scene); return g.scene; })
        .catch(() => null));
    }
    return this.models.get(name)!;
  }

  /** Same fog treatment as the asset viewer, so models look like their review renders. */
  prepare(root: T.Object3D) {
    root.traverse(o => {
      const m = (o as T.Mesh).material;
      if (!m) return;
      for (const mat of Array.isArray(m) ? m : [m]) {
        if (!('fog' in mat)) continue;
        mat.onBeforeCompile = shader => {
          shader.uniforms.reviewFogOffset = this.fogOffset;
          shader.vertexShader = 'uniform float reviewFogOffset;\n' + shader.vertexShader.replace('#include <fog_vertex>', '#ifdef USE_FOG\n vFogDepth=max(0.0,-mvPosition.z-reviewFogOffset);\n#endif');
        };
        mat.needsUpdate = true;
      }
    });
  }

  async instance(name: string, fallback = name): Promise<T.Object3D> {
    const m = (await this.model(name)) ?? (fallback !== name ? await this.model(fallback) : null);
    return m ? m.clone(true) : placeholder(name);
  }

  async loadFerry() {
    const obj = await this.instance('ferry');
    this.ferryModel = obj;
    this.ferry.add(obj);
    obj.traverse(o => { if (o.name) this.ferryNodes.set(o.name, o); });
    const nav = (node: string, color: string) => {
      const n = this.ferryNodes.get(node);
      if (!n) return;
      const l = new T.PointLight(color, 6, 7, 1.6);
      n.add(l);
    };
    nav('nav_red', '#ff3b30');
    nav('nav_green', '#33e07a');
    nav('mast_light', '#ffe2b0');
  }

  async buildStatic() {
    // Banks: right side at x = +23, left side mirrored at x = −23 (art/sources/shore_shared/README.md).
    const right = ['shore_cliff', 'shore_cliff', 'shore_village', 'shore_cliff', 'shore_cliff', 'shore_cliff', 'shore_village', 'shore_cliff'];
    const left = ['shore_cliff', 'shore_village', 'shore_cliff', 'shore_cliff', 'shore_cliff', 'shore_village', 'shore_cliff', 'shore_cliff'];
    for (let i = 0; i < 8; i++) {
      const r = await this.instance(right[i], 'shore_cliff');
      r.position.set(23, 0, 20 - 40 * i);
      const l = await this.instance(left[i], 'shore_cliff');
      l.position.set(-23, 0, 20 - 40 * i);
      l.scale.set(-1, 1, 1);
      this.scene.add(r, l);
    }
    // Docks
    const start = await this.instance('dock_start');
    start.position.set(0, 0, 4);
    const finish = await this.instance('dock_finish');
    finish.position.set(0, 0, FINISH_Y / 10 - 240 - 12);
    this.scene.add(start, finish);
    // Finish line string lights (the renderer draws the bulbs, ASSET_LIST §4)
    const bulbGeo = new T.SphereGeometry(0.18, 10, 8);
    for (let x = -19; x <= 19; x += 1.9) {
      const b = new T.Mesh(bulbGeo, new T.MeshBasicMaterial({ color: '#3a2a18', toneMapped: false }));
      b.position.set(x, 2.6 + Math.cos(x / 6) * 0.4, FINISH_Y / 10 - 240);
      this.bulbs.push(b);
      this.scene.add(b);
    }
    const far = await this.model('lighthouse_far');
    if (far) { const lh = far.clone(true); lh.position.set(14, 0, -300); this.scene.add(lh); }
  }

  async setCourse(course: Course) {
    for (const l of this.hazards) { this.hazardGroup.remove(l.obj); if (l.cone) this.hazardGroup.remove(l.cone); if (l.spot) this.hazardGroup.remove(l.spot, l.spot.target); }
    this.hazards = [];
    for (const h of course.hazards) {
      const live: Live = { h, obj: new T.Group() };
      if (h.kind === 'rock') {
        const name = 'rock_' + h.size;
        const m = await this.model(name);
        // rock_s / rock_l not delivered yet: scale the approved rock_m so play-testing reads right.
        live.obj = m ? m.clone(true) : await this.instance('rock_m');
        if (!m && live.obj.name.indexOf('PLACEHOLDER') < 0) live.obj.scale.setScalar(TUNING.rockR[h.size] / TUNING.rockR.m);
      } else if (h.kind === 'searchlight') {
        live.obj = await this.instance('searchlight_tower');
        live.obj.traverse(o => { if (o.name === 'head') live.head = o; if (o.name === 'lens') live.lens = o; });
        live.cone = beamCone();
        live.spot = new T.SpotLight('#cfe6ff', 290, 30, rad(13), 0.7, 1.2);
        this.hazardGroup.add(live.cone, live.spot, live.spot.target);
      } else if (h.kind === 'barge') {
        live.obj = await this.instance('barge');
      } else if (h.kind === 'mine') {
        live.obj = await this.instance('mine');
        if (live.obj.name.indexOf('PLACEHOLDER') >= 0) live.obj.scale.setScalar(1);
        const led = new T.Mesh(new T.SphereGeometry(0.16, 10, 8), new T.MeshBasicMaterial({ color: '#ff4d2e', toneMapped: false }));
        led.position.y = 1.05;
        live.obj.add(led);
        live.led = led;
      } else if (h.kind === 'whirlpool') {
        live.obj = placeholder('whirlpool');
      }
      toWorld(h.x, h.y, live.obj.position);
      this.hazardGroup.add(live.obj);
      this.hazards.push(live);
    }
  }

  // --- per frame ---

  resize(w: number, h: number) {
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w / 2, h / 2);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  reset() {
    this.sinkT = -1; this.finishT = -1; this.caughtBy = null; this.shake = 0;
    this.wake.clear();
    for (const b of this.bulbs) (b.material as T.MeshBasicMaterial).color.set('#3a2a18');
    if (this.ferryModel) { this.ferryModel.position.y = 0; this.ferryModel.rotation.set(0, 0, 0); }
  }

  sink(caughtBy: string | null) { this.sinkT = 0; this.caughtBy = caughtBy; this.shake = 0.15; }
  finish() { this.finishT = 0; }

  /** prev/cur are sim states one tick apart; alpha in 0..1 interpolates. */
  update(cur: RunState, prev: { x: number; y: number; heading: number }, alpha: number, dt: number) {
    this.time += dt;
    const x = prev.x + (cur.x - prev.x) * alpha, y = prev.y + (cur.y - prev.y) * alpha;
    const heading = prev.heading + (cur.heading - prev.heading) * alpha;
    const pos = toWorld(x / Q, y / Q);
    this.ferry.position.copy(pos);
    this.ferry.rotation.y = -rad(heading / 10);
    const tickF = cur.tick - 1 + alpha;

    // Sinking / finishing animation
    if (this.sinkT >= 0 && this.ferryModel) {
      this.sinkT += dt;
      const k = Math.min(1, this.sinkT / 0.6);
      this.ferryModel.position.y = -2.2 * k * k;
      this.ferryModel.rotation.z = 0.5 * k;
      this.ferryModel.rotation.x = -0.25 * k;
    }
    if (this.finishT >= 0) {
      this.finishT += dt;
      this.bulbs.forEach((b, i) => { if (this.finishT > i * 0.05) (b.material as T.MeshBasicMaterial).color.set('#ffcf7a').multiplyScalar(3); });
    }

    // Wake from the stern
    const stern = new T.Vector3(0, 0, 4);
    const wo = this.ferryNodes.get('wake_origin');
    if (wo) wo.getWorldPosition(stern); else stern.applyMatrix4(this.ferry.matrixWorld);
    stern.y = 0.04;
    if (this.sinkT < 0) this.wake.push(stern, cur.speed / TUNING.maxSpeed);
    this.wake.update(dt);

    // Hazards
    let nearest: Live | null = null, nd = Infinity;
    for (const l of this.hazards) {
      const st = hazardStateAt(l.h, Math.max(0, Math.floor(tickF)));
      const st2 = hazardStateAt(l.h, Math.max(0, Math.floor(tickF) + 1));
      const f = tickF - Math.floor(tickF);
      if (l.h.kind === 'barge') toWorld(st.x + (st2.x - st.x) * f, st.y, l.obj.position);
      if (l.h.kind === 'searchlight') {
        const a = (st.angle! + (st2.angle! - st.angle!) * f) / 10; // degrees, clockwise from up-course
        if (l.head) {
          if (l.head.userData.restY === undefined) l.head.userData.restY = l.head.rotation.y;
          l.head.rotation.y = l.head.userData.restY - rad(a);
        }
        const src = l.lens ? l.lens.getWorldPosition(new T.Vector3()) : l.obj.position.clone().setY(3.4);
        const dir = new T.Vector3(Math.sin(rad(a)), 0, -Math.cos(rad(a)));
        const len = TUNING.coneLen / 10;
        const dest = src.clone().addScaledVector(dir, len).setY(0);
        l.spot!.position.copy(src);
        l.spot!.target.position.copy(dest);
        const line = dest.clone().sub(src), L = line.length();
        l.cone!.position.copy(src);
        l.cone!.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), line.normalize());
        const r = L * TUNING.coneTan / ONE;
        l.cone!.scale.set(r, L, r);
        const mat = l.cone!.material as T.ShaderMaterial;
        mat.uniforms.t.value = this.time;
        const hot = this.caughtBy === l.h.id ? 1 : cur.litBy === l.h.id ? 0.35 : 0;
        mat.uniforms.alarm.value += (hot - mat.uniforms.alarm.value) * Math.min(1, dt * 10);
        l.spot!.color.set('#cfe6ff').lerp(new T.Color('#ff4d2e'), mat.uniforms.alarm.value);
        const d = l.obj.position.distanceToSquared(pos);
        if (d < nd) { nd = d; nearest = l; }
        (l as any).src = src; (l as any).dest = dest;
      }
      if (l.led) {
        const dist = l.obj.position.distanceTo(pos);
        const rate = dist < 6 ? 8 : dist < 15 ? 3 : 1.2;
        l.led.visible = Math.sin(this.time * rate * Math.PI * 2) > -0.2;
      }
    }
    const u = this.water.uniforms;
    u.t.value = this.time;
    if (nearest) { u.beam.value.copy((nearest as any).src); u.landing.value.copy((nearest as any).dest); }
    u.ferry.value.copy(pos);
    u.hasBoat.value = this.sinkT < 0 ? 1 : 0;
    const navR = this.ferryNodes.get('nav_red'), navG = this.ferryNodes.get('nav_green');
    if (navR && navG) {
      navR.getWorldPosition(u.pools.value[0]); u.tints.value[0].set('#ff3b30').multiplyScalar(0.35);
      navG.getWorldPosition(u.pools.value[1]); u.tints.value[1].set('#33e07a').multiplyScalar(0.35);
    }

    // Detection ring
    this.ring.position.set(pos.x, 0.06, pos.z);
    const fill = cur.meter / TUNING.meterCatch;
    this.ring.material.uniforms.fill.value += (fill - this.ring.material.uniforms.fill.value) * Math.min(1, dt * 20);
    this.ring.visible = this.sinkT < 0;

    this.updateCamera(pos, dt);
    this.composer.render(dt);
  }

  updateCamera(ferry: T.Vector3, dt: number) {
    const c = CAMERAS[this.camName];
    if (this.camera.fov !== c.fov) { this.camera.fov = c.fov; this.camera.updateProjectionMatrix(); }
    const pitch = rad(c.pitch), half = rad(c.fov / 2);
    const depth = c.width / (2 * Math.tan(half) * Math.max(0.3, this.camera.aspect));
    const want = new T.Vector3(ferry.x * 0.55, 0, ferry.z);
    if (this.camTarget.lengthSq() === 0) this.camTarget.copy(want);
    this.camTarget.lerp(want, 1 - Math.exp(-dt * 6));
    const f = new T.Vector3(0, -Math.sin(pitch), -Math.cos(pitch));
    const up = new T.Vector3(0, Math.cos(pitch), -Math.sin(pitch));
    this.camera.position.copy(this.camTarget).addScaledVector(f, -depth).addScaledVector(up, 0.4 * depth * Math.tan(half));
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      this.camera.position.x += (Math.random() - 0.5) * 0.3;
      this.camera.position.y += (Math.random() - 0.5) * 0.3;
    }
    this.camera.lookAt(this.camera.position.clone().add(f));
    this.fogOffset.value = Math.max(0, depth - 12);
  }
}

// --- pieces ---

function sky() {
  return new T.Mesh(new T.SphereGeometry(450, 24, 16), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 p;void main(){vec3 n=normalize(p);float u=smoothstep(0.,.7,n.y);vec3 c=mix(vec3(.011,.023,.058),vec3(.0021,.0034,.008),u);vec2 s=floor(n.xz/(1.+n.y)*640.);float seed=fract(sin(dot(s,vec2(21.3,71.1)))*8743.1);c+=vec3(.46)*step(.9994,seed)*u;gl_FragColor=vec4(c,1.);}`,
  }));
}

function beamCone() {
  return new T.Mesh(new T.ConeGeometry(1, 1, 48, 1, true).translate(0, -0.5, 0), new T.ShaderMaterial({
    blending: T.AdditiveBlending, transparent: true, depthWrite: false, side: T.FrontSide,
    uniforms: { t: { value: 0 }, alarm: { value: 0 } },
    vertexShader: `varying vec3 n,v;varying vec2 tc;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=-p.xyz;tc=uv;gl_Position=projectionMatrix*p;}`,
    fragmentShader: `varying vec3 n,v;varying vec2 tc;uniform float t,alarm;void main(){float f=abs(dot(normalize(n),normalize(v)));float ray=.89+.11*sin(tc.x*75.+sin(tc.y*8.+t*.15));float a=(.05+.33*pow(f,.62))*(.22+.78*tc.y)*smoothstep(0.,.18,tc.y)*ray;vec3 c=mix(vec3(.34,.61,.92),vec3(1.,.30,.18),alarm);gl_FragColor=vec4(c,a*(1.+alarm*.6));}`,
  }));
}

function detectionRing() {
  const m = new T.Mesh(new T.RingGeometry(4.6, 5.1, 64, 1), new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false,
    uniforms: { fill: { value: 0 } },
    vertexShader: 'varying vec2 p;void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 p;uniform float fill;void main(){float a=fract(atan(p.x,p.y)/6.2831853+1.);if(fill<.01)discard;vec3 c=mix(vec3(1.),vec3(1.,.69,.13),smoothstep(.2,.55,fill));c=mix(c,vec3(1.,.30,.18),smoothstep(.6,.9,fill));float on=step(a,fill);gl_FragColor=vec4(c,.15+.75*on);}`,
  }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

function loadTex(path: string, uniform: { value: any }, ready: { value: number }) {
  new T.TextureLoader().loadAsync(path).then(tex => { tex.wrapS = tex.wrapT = T.RepeatWrapping; uniform.value = tex; ready.value = 1; }).catch(() => {});
}

/** Foam ribbon trailing the ferry: widens and fades over ~3 s. */
class Wake {
  max = 180;
  pts: { p: T.Vector3; age: number; power: number }[] = [];
  geo = new T.BufferGeometry();
  mesh: T.Mesh;
  pos: Float32Array;
  alpha: Float32Array;
  constructor() {
    this.pos = new Float32Array(this.max * 2 * 3);
    this.alpha = new Float32Array(this.max * 2);
    this.geo.setAttribute('position', new T.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('a', new T.BufferAttribute(this.alpha, 1));
    const idx: number[] = [];
    for (let i = 0; i < this.max - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    this.geo.setIndex(idx);
    this.mesh = new T.Mesh(this.geo, new T.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false,
      vertexShader: 'attribute float a;varying float va;void main(){va=a;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying float va;void main(){gl_FragColor=vec4(vec3(.62,.86,.9)*va,va);}',
    }));
    this.mesh.frustumCulled = false;
  }
  clear() { this.pts = []; this.geo.setDrawRange(0, 0); }
  push(p: T.Vector3, power: number) {
    const last = this.pts[0];
    if (last && last.p.distanceToSquared(p) < 0.04) return;
    this.pts.unshift({ p: p.clone(), age: 0, power: 0.35 + 0.65 * power });
    if (this.pts.length > this.max) this.pts.pop();
  }
  update(dt: number) {
    for (const q of this.pts) q.age += dt;
    while (this.pts.length && this.pts[this.pts.length - 1].age > 3) this.pts.pop();
    const n = this.pts.length;
    for (let i = 0; i < n; i++) {
      const q = this.pts[i], next = this.pts[Math.min(n - 1, i + 1)], prev = this.pts[Math.max(0, i - 1)];
      const dir = new T.Vector3().subVectors(prev.p, next.p); dir.y = 0;
      if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
      dir.normalize();
      const side = new T.Vector3(-dir.z, 0, dir.x);
      const w = 0.6 + q.age * 1.6;
      const fade = Math.max(0, 1 - q.age / 3) * q.power * 0.55;
      this.pos.set([q.p.x + side.x * w, 0.05, q.p.z + side.z * w], i * 6);
      this.pos.set([q.p.x - side.x * w, 0.05, q.p.z - side.z * w], i * 6 + 3);
      this.alpha[i * 2] = this.alpha[i * 2 + 1] = fade;
    }
    this.geo.attributes.position.needsUpdate = true;
    (this.geo.attributes as any).a.needsUpdate = true;
    this.geo.setDrawRange(0, Math.max(0, (n - 1) * 6));
  }
}

export { sinT, cosT };
