const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {build}=require('esbuild');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png','.wasm':'application/wasm'};
async function start(){
 const out=await build({entryPoints:[path.join(root,'src/viewer/main.ts')],bundle:true,platform:'browser',target:'es2022',format:'esm',minify:true,write:false});
 const assets=JSON.parse(fs.readFileSync(path.join(root,'art/required.json')));
 const files=new Map([['/','src/viewer/index.html'],['/style.css','src/viewer/style.css']]);
 for(const spec of [...Object.values(assets.models),...Object.values(assets.textures)])files.set('/'+spec.file,spec.file);
 for(const f of ['draco_decoder.wasm','draco_wasm_wrapper.js','draco_decoder.js'])files.set('/decoder/'+f,'node_modules/three/examples/jsm/libs/draco/gltf/'+f);
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost').pathname;
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return}
  if(url==='/inventory.json'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify([...files].filter(([url,f])=>url.startsWith('/art/')&&fs.existsSync(path.join(root,f))).map(([url])=>url)));return}
  if(url==='/viewer.js'){res.writeHead(200,{'Content-Type':types['.js']}).end(req.method==='HEAD'?undefined:out.outputFiles[0].contents);return}
  const f=files.get(url);
  if(!f||!fs.existsSync(path.join(root,f))){res.writeHead(404).end();return}
  res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});
  if(req.method==='HEAD')res.end();else fs.createReadStream(path.join(root,f)).pipe(res);
 });
 server.on('error',e=>{console.error(e.message);process.exitCode=1});
 server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('Wake review room: http://127.0.0.1:'+server.address().port+'/'));
}
start().catch(e=>{console.error(e);process.exitCode=1});
