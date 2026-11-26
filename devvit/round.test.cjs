const assert=require('node:assert/strict');
const {test}=require('node:test');
const {boardFor,closedResult,dayKey,newPlayer,shiftDay,takeAction,validDay,view}=require('./round.cjs');
const {makeStore}=require('./store.cjs');

function memoryRedis(){
  const map=new Map(),revisions=new Map();
  const get=async k=>map.get(k);
  return {get,set:async(k,v)=>{map.set(k,v);revisions.set(k,(revisions.get(k)??0)+1);},mGet:ks=>Promise.all(ks.map(get)),async watch(...keys){
    const initial=keys.map(k=>revisions.get(k));
    const writes=[];
    return {multi:async()=>{},discard:async()=>{},unwatch:async()=>{},set:async(k,v)=>writes.push([k,v]),async exec(){
      if(keys.some((k,i)=>revisions.get(k)!==initial[i]))return [];
      for(const [k,v] of writes){map.set(k,v);revisions.set(k,(revisions.get(k)??0)+1);}
      return writes.map(()=>true);
    }};
  }};
}

function solveSteps(day){
  const board=boardFor(day);
  const player=newPlayer(board),steps=[];
  const target=board.size===5?[0,0,0]:[0,0,1,1,0];
  for(let i=0;i<target.length&&player.score===null;i++){
    if(player.faces[i]===target[i])continue;
    takeAction(board,player,'turn',i,steps.length);steps.push(i);
  }
  return steps;
}

test('UTC calendar is canonical at midnight and validates leap days',()=>{
  assert.equal(dayKey(Date.parse('2026-11-26T23:59:59.999Z')),'2026-11-26');
  assert.equal(shiftDay('2026-12-01',-1),'2026-11-30');
  assert(validDay('2028-02-29'));
  assert(!validDay('2026-02-29'));
});

test('empty previous day stays offshore, nonempty tie docks, minority stays offshore',()=>{
  const d='2026-11-25',b={choice:'beacon'},c={choice:'cabin'};
  assert.equal(closedResult(d,{}).docked,false);
  assert.equal(closedResult(d,{a:b,b:c}).docked,true);
  assert.equal(closedResult(d,{a:b,b:c,c}).docked,false);
});

test('ballot is private, one per player, and snapshots do not follow the live tally',async()=>{
  let now=Date.parse('2026-11-26T23:59:30Z');
  const store=makeStore(memoryRedis(),()=>now),d='2026-11-26',tomorrow='2026-11-27';
  assert.deepEqual(await store.act(d,'a','cabin'),{status:'unchanged'});
  assert.deepEqual(await store.act(d,'a','turn',0,88),{status:'unchanged'});
  await assert.rejects(()=>store.freeze(d));
  for(const id of ['a','b']){
    for(const [at,index] of solveSteps(d).entries())assert.equal((await store.act(d,id,'turn',index,at)).status,'ok');
  }
  const race=await Promise.all([store.act(d,'a','cabin'),store.act(d,'a','beacon')]);
  assert.equal(race.filter(x=>x.status==='ok').length,1);
  assert.equal((await store.act(d,'b','beacon')).status,'ok');
  const roster=await store.players(d);
  const guest=view(d,roster,undefined,closedResult('2026-11-25',{}),false);
  assert.equal(guest.player.choice,null);
  assert(guest.leaders.every(l=>!('choice'in l)&&!('id'in l)));
  assert.equal(guest.meter.total,2);
  now=Date.parse('2026-11-27T00:00:00.000Z');
  const snapshot=await store.freeze(d);
  assert.equal(snapshot.docked,true);
  assert.equal((await store.act(d,'b','cabin')).status,'closed');
  for(const [at,index] of solveSteps(tomorrow).entries())assert.equal((await store.act(tomorrow,'b','turn',index,at)).status,'ok');
  assert.equal((await store.act(tomorrow,'b','cabin')).status,'ok');
  assert.deepEqual(await store.freeze(d),snapshot);
  assert.equal(view(tomorrow,await store.players(tomorrow),'b',snapshot,false,await store.history(tomorrow)).cabins,1);
});

test('both daily boards solve through the real rules',()=>{
  for(const day of ['2026-11-26','2026-11-27']){
    const board=boardFor(day),p=newPlayer(board),moves=solveSteps(day);
    moves.forEach((m,i)=>assert(takeAction(board,p,'turn',m,i)));
    assert.equal(p.score,board.size===5?2:4);
  }
});

test('Devvit API rejects archived, stale and guest mutations, while returning a closed-day reveal',async()=>{
  const {createApp}=require('./routes.cjs');
  let now=Date.parse('2026-11-26T23:59:00Z'),user='t2_player';
  const d='2026-11-26',redis=memoryRedis();
  const app=createApp({getContext:()=>({postData:{day:d},userId:user}),redis,now:()=>now});
  const cast=(params)=>app.request('/api/round?'+new URLSearchParams(params),{method:'POST'});
  assert.equal((await cast({day:'2026-11-25',action:'turn',mirror:0,at:0})).status,409);
  for(const [at,mirror] of solveSteps(d).entries())assert.equal((await cast({day:d,action:'turn',mirror,at})).status,200);
  assert.equal((await cast({day:d,action:'beacon'})).status,200);
  user=undefined;
  assert.equal((await cast({day:d,action:'cabin'})).status,401);
  const g=await app.request('/api/round');
  assert.equal(g.headers.get('cache-control'),'private, no-store');
  const live=await g.json();
  assert.equal(live.player.choice,null);
  assert.equal(live.harbor.docked,false);
  now=Date.parse('2026-11-27T00:00:00Z');
  user='t2_player';
  assert.equal((await cast({day:d,action:'cabin'})).status,409);
  const archived=await (await app.request('/api/round')).json();
  assert.equal(archived.closed,true);
  assert.equal(archived.closedDay.docked,true);
  const next=createApp({getContext:()=>({postData:{day:'2026-11-27'},userId:user}),redis,now:()=>now});
  const opening=await(await next.request('/api/round')).json();
  assert.equal(opening.harbor.docked,true);
  assert.equal(opening.meter.total,0);
});


test('an archived post links to the new puzzle only when today’s post exists',async()=>{
  const {createApp}=require('./routes.cjs');
  let now=Date.parse('2026-11-26T23:59:00Z'),day='2026-11-26',id='t3_old1';
  const redis=memoryRedis();
  const app=createApp({getContext:()=>({postData:{day},subredditName:'test'}),redis,now:()=>now,
    reddit:{submitCustomPost:async payload=>{
      assert.equal(payload.postData.day,dayKey(now));
      return {id};
    }}});
  const create=()=>app.request('/internal/menu/post-create',{method:'POST'}).then(r=>r.json());
  const round=()=>app.request('/api/round').then(r=>r.json());
  assert.equal((await create()).navigateTo,'https://www.reddit.com/comments/old1/');
  assert.equal((await round()).todayPostUrl,null);
  now=Date.parse('2026-11-27T00:00:00Z');
  const old=await round();
  assert.equal(old.closed,true);
  assert.equal(old.todayPostUrl,null);
  id='t3_new2';
  assert.equal((await create()).navigateTo,'https://www.reddit.com/comments/new2/');
  const linked=await round();
  assert.equal(linked.todayPostUrl,'https://www.reddit.com/comments/new2/');
  assert.deepEqual(linked.closedDay,old.closedDay);
  assert.deepEqual(linked.leaders,old.leaders);
  assert.deepEqual(linked.meter,old.meter);
  day='2026-11-27';
  assert.equal((await round()).closed,false);
  assert.equal((await round()).todayPostUrl,null);
});
