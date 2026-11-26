const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {boards,trace}=require('./boards.cjs');
const file=process.env.HARBOR_STATE || path.join(__dirname,'pilot-state.json');
const db=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{players:{},rounds:[{},{}]};
function save(){fs.writeFileSync(file+'.tmp',JSON.stringify(db));fs.renameSync(file+'.tmp',file);}
function counts(round){
  const entries=Object.values(round);
  return {sent:entries.filter(p=>p.choice==='beacon').length,total:entries.filter(p=>p.choice).length};
}
function view(id,index){
  const round=db.rounds[index], board=boards[index], player=round[id];
  const leaders=Object.entries(round).filter(([,p])=>p.score!==null).map(([uid,p])=>({name:db.players[uid],score:p.score,you:uid===id})).sort((a,b)=>a.score-b.score);
  leaders.forEach((p,i)=>{p.rank=i && leaders[i-1].score===p.score?leaders[i-1].rank:i+1;});
  return {board,player,light:trace(board,player.faces),leaders:leaders.filter((p,i)=>i<5||p.you),meter:counts(round),cabins:db.rounds.filter(r=>r[id]?.choice==='cabin').length};
}
const assets={'/':['index.html','text/html'],'/ui.js':['ui.js','text/javascript'],'/style.css':['style.css','text/css']};
const srv=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(Object.hasOwn(assets,url.pathname)){
    const [name,type]=assets[url.pathname];res.writeHead(200,{'Content-Type':type+'; charset=utf-8'});return res.end(fs.readFileSync(path.join(__dirname,name)));
  }
  if(url.pathname!=='/round'){res.writeHead(404);return res.end();}
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
  const index=Number(url.searchParams.get('id'));
  if(!Number.isInteger(index)||!boards[index]){res.writeHead(400);return res.end('{}');}
  let id=(req.headers.cookie||'').match(/(?:^|; )harbor=([a-f0-9-]{36})(?:;|$)/)?.[1];
  const action=url.searchParams.get('action');
  if(req.method==='POST' && (req.headers['x-pilot']!=='1'||!id||!db.players[id])){res.writeHead(403);return res.end('{}');}
  if(!id||!db.players[id]){
    id=randomUUID();db.players[id]='Keeper '+(Object.keys(db.players).length+1);res.setHeader('Set-Cookie','harbor='+id+'; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800');
  }
  const board=boards[index],round=db.rounds[index];
  if(!round[id]){round[id]={faces:board.mirrors.map(m=>m[2]),moves:0,score:null,choice:null};save();}
  const p=round[id];
  if(req.method==='POST'){
    if(action==='turn' && p.score===null){
      const i=Number(url.searchParams.get('mirror'));
      if(Number.isInteger(i)&&board.mirrors[i]&&Number(url.searchParams.get('at'))===p.moves){
        p.faces[i]^=1;p.moves++;if(trace(board,p.faces).solved)p.score=p.moves;save();
      }
    } else if((action==='beacon'||action==='cabin') && p.score!==null && !p.choice){p.choice=action;save();}
  }
  res.end(JSON.stringify(view(id,index)));
});
srv.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('Harbor pilot: http://127.0.0.1:'+srv.address().port));
