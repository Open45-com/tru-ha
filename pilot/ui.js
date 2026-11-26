const el=id=>document.getElementById(id);
const inReddit=document.body.hasAttribute('data-devvit');
let boardId=0, state, pending=false, confirmChoice='', requestSerial=0;
async function load(action='', mirror=-1){
  if(action && pending)return;
  if(action)pending=true;
  const serial=++requestSerial,requested=boardId;
  try{
    const url=(inReddit?'/api/round':'/round')+'?'+new URLSearchParams({id:boardId,action,mirror,at:state?.player.moves??0,day:state?.day??''});
    const response=await fetch(url,action?{method:'POST',headers:{'X-Pilot':'1'}}:{});
    if(!response.ok){
      if(inReddit){
        const err=await response.json().catch(()=>({}));
        el('status').textContent=err.error??'Could not load the round. Retrying…';
        return;
      }
      throw Error('Request failed');
    }
    const next=await response.json();
    if(requested===boardId && serial===requestSerial){state=next;render();}
  }catch{el('status').textContent='Connection lost. Reconnecting to the local harbor…';}
  finally{if(action)pending=false;}
}
function geometry(){
  const step=78/state.board.size;
  return (x,y)=>[11+(x+.5)*step,18+(y+.5)*step];
}
function draw(){
  const cv=document.querySelector('canvas'),size=Math.max(1,Math.round(cv.clientWidth*devicePixelRatio));
  cv.width=cv.height=size;
  const c=cv.getContext('2d');c.scale(size/100,size/100);
  const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  const poly=(pts,color)=>{c.fillStyle=color;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
  if(!harborArt.draw(c,'background',0,0)){
  const sky=c.createLinearGradient(0,0,0,100);sky.addColorStop(0,'#97b4b0');sky.addColorStop(.19,'#708e96');sky.addColorStop(.2,'#315869');sky.addColorStop(1,'#152e40');rect(0,0,100,100,sky);
  c.fillStyle='#f8dfae';c.beginPath();c.arc(74,8,3,0,2*Math.PI);c.fill();
  poly([[0,14],[9,10],[18,12],[24,9],[38,16],[52,13],[68,18],[100,16],[100,21],[0,21]],'#42656a');
  rect(0,17,22,2,'#3e493f');rect(4,11,5,6,'#f6e4bf');rect(5,7,3,5,'#d2e1ce');rect(5,7,3,1.4,'#f8cf85');poly([[4,7],[6.5,4.7],[9,7]],'#405152');
  for(let i=0;i<30;i++)rect((i*37)%100,23+((i*29)%75),2+(i%5),.22,'#416471');
  }
  if(!harborArt.draw(c,'pier')){
    rect(80,18,20,1,'#9d876c');rect(84,19,1,3,'#5d5e57');rect(94,19,1,3,'#5d5e57');
  }
  const {sent,total}=state.meter, docked=state.harbor?state.harbor.docked:Boolean(total&&2*sent>=total), ship=docked?79:50;
  if(!harborArt.draw(c,docked?'ferryDocked':'ferryOffshore')){
    poly([[ship-5,18],[ship+5,18],[ship+3,20],[ship-3,20]],'#253948');rect(ship-2,16.5,4,1.6,'#ead9b7');
  }
  if(docked){harborArt.draw(c,'mooring');harborArt.draw(c,'cargo');}
  const pt=geometry(),b=state.board;
  for(let y=0;y<b.size;y++)for(let x=0;x<b.size;x++){const [px,py]=pt(x,y);rect(px-.25,py-.25,.5,.5,'#87a3a6');}
  const dest=pt(...b.target);
  if(!harborArt.draw(c,state.light.solved?'lanternCharged':'lanternEmpty',...dest)){
    rect(dest[0]-2.2,dest[1]-2.8,4.4,5.6,state.light.solved?'#ffdd83':'#b0c2b7');
    rect(dest[0]-1.1,dest[1]-3.8,2.2,1.2,'#c7a879');
  }
  harborArt.draw(c,'emitter',...pt(...b.start));
  b.mirrors.forEach(([x,y],i)=>{
    const pos=pt(x,y);
    harborArt.draw(c,'mirrorMount',...pos);
    harborArt.draw(c,'mirrorFace',...pos,state.player.faces[i]?Math.PI/2:0);
  });
  c.beginPath();state.light.path.map(([x,y])=>pt(x,y)).forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
  c.strokeStyle='#e7bc7450';c.lineWidth=2.2;c.stroke();c.strokeStyle='#ffdf9a';c.lineWidth=.65;c.stroke();
}
function render(){
  const {board,player,leaders,meter,cabins}=state,pt=geometry();
  el('title').textContent=board.name;draw();
  const layer=el('mirrors');
  layer.classList.toggle('art-ready',harborArt.ready('mirrorFace'));
  if(layer.dataset.board!==String(boardId)){
    layer.replaceChildren();layer.dataset.board=boardId;
    board.mirrors.forEach(([x,y],i)=>{
      const button=document.createElement('button'),[px,py]=pt(x,y);
      button.style.left=px+'%';button.style.top=py+'%';
      button.onclick=()=>load('turn',i);layer.append(button);
    });
  }
  [...layer.children].forEach((btn,i)=>{
    btn.textContent=player.faces[i]?'\\':'/';btn.disabled=player.score!==null||Boolean(state.closed||state.guest);
    btn.setAttribute('aria-label','Rotate mirror '+(i+1)+', '+(player.faces[i]?'backslash':'forward slash'));
  });
  el('status').textContent=player.score===null?player.moves+' turns · Lantern unlit':player.score+' turns · Lantern charged';
  if(state.guest)el('status').textContent='Sign in to Reddit to play.';
  if(state.closed)el('status').textContent='Archived round · '+state.day;
  const d=el('decision');
  const stamp=[boardId,player.score,player.choice,confirmChoice,cabins,state.day,state.closed,state.guest].join(':');
  if(d.dataset.stamp!==stamp){
    d.dataset.stamp=stamp;d.replaceChildren();
    const btn=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=fn;d.append(b);};
    if(player.choice)d.textContent=(player.choice==='beacon'?'Your lantern is at the lighthouse.':'Your lantern is at your cabin.')+' Cabin lights: '+cabins+'.';
    else if(player.score!==null&&!state.closed&&!state.guest){
      if(confirmChoice){
        const privateCabin=confirmChoice==='cabin';
        const preview=document.createElement('img');
        preview.className='destination-preview';
        preview.alt=privateCabin?'Preview: a glowing lantern outside your cabin':'Preview: the harbor lighthouse beacon lit';
        preview.width=360;preview.height=360;
        preview.onerror=()=>preview.remove();
        preview.src=privateCabin?'./art/02_keep_at_cabin.webp':'./art/04_send_to_lighthouse.webp';
        d.append(preview);
        d.append(confirmChoice==='beacon'?'Give this light to the harbor? Your cabin will stay as it is.':'Keep this light at home? It will count toward the cabin side of the tally.');
        d.append(document.createElement('br'));btn('Confirm',()=>load(confirmChoice));
        btn('Go back',()=>{confirmChoice='';render();});
      }else{
        btn('Hang at my cabin',()=>{confirmChoice='cabin';render();});
        btn('Light the beacon',()=>{confirmChoice='beacon';render();});
      }
    }
  }
  el('count').textContent=meter.sent+' of '+meter.total+' sent their light · '+(!meter.total?'Awaiting the first choice':meter.sent*2>=meter.total?'On course to dock':'Ferry waiting offshore');
  if(state.harbor){
    const {day,docked,sent,total}=state.harbor;
    el('count').textContent='Today’s votes: '+meter.sent+' of '+meter.total+' sent their light.';
    let reveal=el('harbor-reveal');
    if(!reveal){
      reveal=document.createElement('p');reveal.id='harbor-reveal';
      el('count').before(reveal);
    }
    reveal.textContent='Closed '+day+': '+(docked?'ferry docked':'ferry stayed offshore')+
      ' · '+sent+' of '+total+' sent their light.';
    if(state.closedDay)el('count').textContent='This round closed with '+state.closedDay.sent+' of '+state.closedDay.total+' lights sent.';
  }
  el('meter').value=meter.total?meter.sent/meter.total:0;
  el('scores').replaceChildren(...leaders.map(p=>{const li=document.createElement('li');li.textContent='#'+p.rank+'   '+p.name+(p.you?' (you)':'')+' — '+p.score+' turns';return li;}));
  if(!leaders.length)el('scores').textContent='The first completed crossing takes the lead.';
}
document.querySelectorAll('[data-board]').forEach(b=>b.onclick=()=>{
  if(pending)return;
  boardId=Number(b.dataset.board);confirmChoice='';
  document.querySelectorAll('nav button').forEach(v=>v.setAttribute('aria-pressed',String(v===b)));
  el('mirrors').replaceChildren();delete el('mirrors').dataset.board;el('decision').replaceChildren();delete el('decision').dataset.stamp;
  load();
});
window.addEventListener('resize',()=>{if(state)draw();});
harborArt.load().then(()=>{if(state)render();}).catch(()=>{});
load();setInterval(()=>{if(!pending&&!document.hidden)load();},3000);
