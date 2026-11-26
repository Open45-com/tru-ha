const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
test('viewer builds and serves its local review entry point, inventory and decoder', {timeout:30000}, async t=>{
 const child=spawn(process.execPath,[path.join(__dirname,'viewer.cjs')],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
 t.after(()=>child.kill());
 const base=await new Promise((resolve,reject)=>{
  let out='';
  child.stdout.on('data',d=>{out+=d;const m=out.match(/http:\/\/127\.0\.0\.1:\d+\//);if(m)resolve(m[0]);});
  child.once('error',reject);child.once('exit',c=>reject(Error('viewer exited: '+c)));
 });
 assert.match(await(await fetch(base)).text(),/Night review room/);
 assert.equal((await fetch(base+'viewer.js',{method:'HEAD'})).status,200);
 const inventory=await(await fetch(base+'inventory.json')).json();assert(Array.isArray(inventory));
 assert(inventory.every(item=>item.startsWith('/art/')));
 assert.equal((await fetch(base+'decoder/draco_decoder.wasm',{method:'HEAD'})).status,200);
 assert.equal((await fetch(base+'package-lock.json')).status,404);
});
