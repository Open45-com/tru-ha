const fs=require('node:fs/promises');
const path=require('node:path');
const {build}=require('esbuild');

async function main(){
  const root=path.resolve(__dirname,'..'),at=(p)=>path.join(root,p);
  await fs.rm(at('dist'),{recursive:true,force:true});
  await fs.mkdir(at('dist/client'),{recursive:true});
  const html=(await fs.readFile(at('pilot/index.html'),'utf8'))
    .replace('<body>','<body data-devvit>')
    .replace('LOCAL PLAYTEST','REDDIT PLAYTEST')
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/,'')
    .replace('Two practice crossings. Each has its own scores and lantern tally.','A new puzzle opens each day at 00:00 UTC.')
    .replaceAll('src="/','src="./').replaceAll('href="/','href="./');
  await fs.writeFile(at('dist/client/index.html'),html);
  await Promise.all(['ui.js','art.js','style.css','art'].map(f=>fs.cp(at('pilot/'+f),at('dist/client/'+f),{recursive:true,filter:p=>!p.endsWith('README.md')})));
  await build({entryPoints:[at('devvit/server.cjs')],outfile:at('dist/server/index.cjs'),bundle:true,platform:'node',target:'node24',format:'cjs'});
}
main().catch(error=>{console.error(error);process.exitCode=1;});
