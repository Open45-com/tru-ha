/* Optional art pack; the pilot remains playable if any export is missing. */
const harborArt = (() => {
  const size = 1024;
  const sprites = Object.create(null);
  const ready = (name) => Boolean(sprites[name]);
  const validPair = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
  const known = ['background', 'pier', 'ferryOffshore', 'ferryDocked', 'cargo', 'emitter',
    'mirrorMount', 'mirrorFace', 'lanternEmpty', 'lanternCharged'];
  async function load() {
    const response = await fetch('/art/manifest.json');
    if (!response.ok) return;
    const data = await response.json();
    if (data.canvasSize !== size || !data.sprites) return;
    await Promise.all(known.map(async (name) => {
      const spec = data.sprites[name];
      if (!spec || typeof spec.file !== 'string' ||
          !/^[a-z0-9][a-z0-9_-]*\.(?:png|webp)$/.test(spec.file)) return;
      const {width, height, anchor, placement} = spec;
      if (!Number.isInteger(width) || width < 1 || width > size ||
          !Number.isInteger(height) || height < 1 || height > size ||
          !validPair(anchor) || anchor[0] < 0 || anchor[1] < 0 ||
          anchor[0] > width || anchor[1] > height ||
          (placement !== undefined && !validPair(placement))) return;
      const img = new Image();
      img.src = '/art/' + spec.file;
      try { await img.decode(); } catch { return; }
      if (img.naturalWidth === width && img.naturalHeight === height) sprites[name] = {...spec, img};
    }));
    for (const [a,b] of [['mirrorMount','mirrorFace'], ['lanternEmpty','lanternCharged']]) {
      if (!ready(a) || !ready(b) ||
          (a === 'lanternEmpty' && (sprites[a].width !== sprites[b].width ||
            sprites[a].height !== sprites[b].height)) ||
          sprites[a].anchor.some((n,i) => n !== sprites[b].anchor[i])) {
        delete sprites[a]; delete sprites[b];
      }
    }
  }
  function draw(c,name,x,y,angle=0) {
    const s = sprites[name];
    if (!s) return false;
    if (x === undefined || y === undefined) {
      if (!s.placement) return false;
      [x,y] = s.placement.map(v => v * 100 / size);
    }
    c.save();
    c.translate(x,y);
    c.rotate(angle);
    const unit=100/size;
    c.drawImage(s.img, -s.anchor[0]*unit, -s.anchor[1]*unit, s.width*unit, s.height*unit);
    c.restore();
    return true;
  }
  return {load, draw, ready};
})();
