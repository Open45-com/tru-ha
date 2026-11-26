const {serve}=require('@hono/node-server');
const {context,createServer,getServerPort,reddit,redis}=require('@devvit/web/server');
const {createApp}=require('./routes.cjs');

const app=createApp({getContext:()=>context,reddit,redis});
serve({fetch:app.fetch,createServer,port:getServerPort()});
