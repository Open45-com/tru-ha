const {Hono}=require('hono');
const {dayKey,shiftDay,validDay,view}=require('./round.cjs');
const {makeStore}=require('./store.cjs');

function createApp({getContext,reddit,redis,now=Date.now}){
const app=new Hono();
const store=makeStore(redis,now);
const noCache={'Cache-Control':'private, no-store'};
const postKey=day=>'harbor:post:'+day;
const postUrl=id=>typeof id==='string'&&/^t3_[a-z0-9]+$/.test(id)
  ? 'https://www.reddit.com/comments/'+id.slice(3)+'/' : null;

app.on(['GET','POST'],'/api/round',async c=>{
  const context=getContext();
  const today=dayKey(now());
  const day=context.postData?.day;
  if(!validDay(day)||day>today)return c.json({error:'Use a dated Until Tomorrow test post.'},400,noCache);
  const closed=day<today;
  const id=context.userId;
  if(c.req.method==='POST'){
    if(!id)return c.json({error:'Sign in to play.'},401,noCache);
    // Reject a tap left open across the cutoff or sent from an archive.
    if(closed||c.req.query('day')!==day)return c.json({error:'This day has closed. Reopen today’s post.'},409,noCache);
    const action=c.req.query('action');
    if(!['turn','cabin','beacon'].includes(action))return c.json({error:'Invalid action.'},400,noCache);
    const result=await store.act(day,id,action,Number(c.req.query('mirror')),Number(c.req.query('at')));
    if(result.status==='closed')return c.json({error:'This day has closed.'},409,noCache);
    if(result.status==='full'||result.status==='busy')return c.json({error:'Playtest is at capacity or busy.'},503,noCache);
  }
  const [roster,previous,history,archived,currentPost]=await Promise.all([
    store.players(day),
    store.freeze(shiftDay(day,-1)),
    id?store.history(day):[],
    closed?store.freeze(day):null,
    closed?redis.get(postKey(today)):null
  ]);
  return c.json({...view(day,roster,id,previous,closed,history,archived),todayPostUrl:postUrl(currentPost)},200,noCache);
});

app.post('/internal/menu/post-create',async c=>{
  const context=getContext();
  const day=dayKey(now());
  if(!context.subredditName)return c.json({showToast:'Open the test subreddit first.'},400);
  // The Devvit menu is moderator-only. Creating a second post for the same
  // date still points to the same Redis round, so no second ballot is possible.
  const post=await reddit.submitCustomPost({title:'Until Tomorrow · '+day,postData:{day}});
  await redis.set(postKey(day),post.id);
  return c.json({navigateTo:postUrl(post.id)});
});

return app;
}
module.exports={createApp};
