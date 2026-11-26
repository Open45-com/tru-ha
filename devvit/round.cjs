const {boards,trace}=require('../pilot/boards.cjs');

const DAY_MS=86400000;
const DAY=/^\d{4}-\d{2}-\d{2}$/;
const dayKey=(ms)=>new Date(ms).toISOString().slice(0,10);
const dateMs=(day)=>Date.parse(day+'T00:00:00.000Z');
const validDay=(value)=>typeof value==='string'&&DAY.test(value)&&Number.isFinite(dateMs(value))&&dayKey(dateMs(value))===value;
const shiftDay=(day,n)=>dayKey(dateMs(day)+n*DAY_MS);
const boardFor=(day)=>boards[Math.floor(dateMs(day)/DAY_MS)%boards.length];
const newPlayer=(board)=>({faces:board.mirrors.map(m=>m[2]),moves:0,score:null,choice:null});
const counts=(players)=>{
  const choices=Object.values(players).map(p=>p.choice).filter(Boolean);
  return {sent:choices.filter(x=>x==='beacon').length,total:choices.length};
};
const closedResult=(day,players)=>{
  const tally=counts(players);
  return {day,...tally,docked:tally.total>0&&2*tally.sent>=tally.total};
};

function takeAction(board,player,action,mirror,at){
  if(action==='turn'){
    if(player.score!==null||player.moves!==at||!Number.isSafeInteger(mirror)||!board.mirrors[mirror])return false;
    player.faces[mirror]^=1;
    player.moves++;
    if(trace(board,player.faces).solved)player.score=player.moves;
    return true;
  }
  if((action==='beacon'||action==='cabin')&&player.score!==null&&!player.choice){
    player.choice=action;
    return true;
  }
  return false;
}

function view(day,players,id,prior,closed,history=[],closedDay=null){
  const board=boardFor(day),player=Object.hasOwn(players,id)?players[id]:newPlayer(board);
  const leaders=Object.entries(players).flatMap(([uid,p],i)=>
    p.score===null?[]:[{name:'Keeper '+(i+1),score:p.score,you:uid===id}]
  ).sort((a,b)=>a.score-b.score);
  leaders.forEach((p,i)=>{p.rank=i&&leaders[i-1].score===p.score?leaders[i-1].rank:i+1;});
  return {day,board,player,light:trace(board,player.faces),meter:counts(players),
    harbor:prior,closedDay,closed,guest:!id,
    leaders:leaders.filter((p,i)=>i<5||p.you),
    cabins:Number(player.choice==='cabin')+history.filter(ps=>Object.hasOwn(ps,id)&&ps[id].choice==='cabin').length};
}

module.exports={boardFor,closedResult,dayKey,newPlayer,shiftDay,takeAction,validDay,view};
