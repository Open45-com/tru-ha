const {boardFor,closedResult,dayKey,newPlayer,shiftDay,takeAction}=require('./round.cjs');

// Store one bounded playtest roster per UTC day. Watch both keys so a finalized
// tally cannot race with a ballot. Split the roster before any public scale-up.
const MAX_PLAYERS=180;
function makeStore(redis,now=Date.now){
  const state=(day)=>'harbor:round:'+day;
  const snapshot=(day)=>'harbor:closed:'+day;
  const read=(v)=>JSON.parse(v??'{}');
  async function players(day){ return read(await redis.get(state(day))); }

  async function freeze(day){
    if(day>=dayKey(now()))throw Error('Cannot close an active day');
    for(let attempt=0;attempt<5;attempt++){
      const saved=await redis.get(snapshot(day));
      if(saved)return JSON.parse(saved);
      const tx=await redis.watch(state(day),snapshot(day));
      let finished=false,queued=false;
      try{
        const already=await redis.get(snapshot(day));
        if(already)return JSON.parse(already);
        const result=closedResult(day,await players(day));
        await tx.multi();queued=true;
        await tx.set(snapshot(day),JSON.stringify(result));
        const done=await tx.exec(); finished=true;
        if(done?.length)return result;
      }finally{
        if(!finished)await (queued?tx.discard():tx.unwatch()).catch(()=>{});
      }
    }
    throw Error('Harbor is busy; retry');
  }

  async function act(day,id,action,mirror,at){
    if(!id||day!==dayKey(now()))return {status:'closed'};
    for(let attempt=0;attempt<5;attempt++){
      const tx=await redis.watch(state(day),snapshot(day));
      let finished=false,queued=false;
      try{
        const roster=await players(day);
        if(day!==dayKey(now())||await redis.get(snapshot(day)))return {status:'closed'};
        const existing=Object.hasOwn(roster,id);
        if(!existing&&Object.keys(roster).length>=MAX_PLAYERS)return {status:'full'};
        const board=boardFor(day);
        const player=existing?roster[id]:newPlayer(board);
        if(!takeAction(board,player,action,mirror,at))return {status:'unchanged'};
        roster[id]=player;
        if(day!==dayKey(now()))return {status:'closed'};
        await tx.multi();queued=true;
        await tx.set(state(day),JSON.stringify(roster));
        const done=await tx.exec();finished=true;
        if(done?.length)return {status:'ok'};
      }finally{
        if(!finished)await (queued?tx.discard():tx.unwatch()).catch(()=>{});
      }
    }
    return {status:'busy'};
  }

  async function history(day){
    return (await redis.mGet(Array.from({length:6},(_,i)=>state(shiftDay(day,-i-1))))).map(read);
  }
  return {act,freeze,history,players};
}
module.exports={makeStore};
