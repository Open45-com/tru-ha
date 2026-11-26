const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const {boards,trace}=require('./boards.cjs');
const source=readFileSync(require.resolve('./art.js'),'utf8');
function engine(sprites, size=1024) {
  const images = Object.fromEntries(Object.values(sprites).map(s => [s.file,s]));
  class Image { async decode(){
    const spec=images[this.src.split('/').pop()];
    this.naturalWidth=spec.width; this.naturalHeight=spec.height;
  } }
  return vm.runInNewContext(source+'\nharborArt;',{
    Image,fetch:async()=>({ok:true,json:async()=>({canvasSize:size,sprites})})
  });
}
const sprite=(file,width=64,height=64,anchor=[32,32])=>({file,width,height,anchor});
test('missing or misaligned state pair keeps the gray-box fallback',async()=>{
  const art=engine({mirrorFace:sprite('face.png'),lanternEmpty:sprite('empty.png'),
    lanternCharged:sprite('charged.png',64,60)});
  await art.load();
  assert.equal(art.ready('mirrorFace'),false);
  assert.equal(art.ready('lanternEmpty'),false);
  assert.equal(art.ready('lanternCharged'),false);
});
test('mirror rotation occurs around the exact board center',async()=>{
  const art=engine({mirrorFace:sprite('face.png'),mirrorMount:sprite('mount.png',72,64)});
  await art.load();
  const calls=[];
  const c=new Proxy({}, {get:(_,k)=>(...a)=>calls.push([k,...a])});
  assert(art.draw(c,'mirrorFace',31,48,Math.PI/2));
  assert.deepEqual(calls.slice(0,3),[['save'],['translate',31,48],['rotate',Math.PI/2]]);
  assert.deepEqual(calls[3].slice(2),[-3.125,-3.125,6.25,6.25]);
});
test('both pilot boards have solved and missed beam paths',()=>{
  for(const b of boards){
    let solved=0, missed=0;
    for(let n=0;n<2**b.mirrors.length;n++){
      const faces=b.mirrors.map((_,i)=>(n>>i)&1);
      const result=trace(b,faces);
      if(result.solved){solved++;assert.deepEqual(result.path.at(-1),b.target);}
      else missed++;
    }
    assert(solved&&missed);
  }
});
