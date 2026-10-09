const path=require('node:path');
const http=require('node:http');
const {spawn}=require('node:child_process');
process.env.CINE_E2E='1';process.env.CINE_E2E_EXTERNAL_SERVER='1';process.env.NODE_ENV='development';process.env.NEXT_TELEMETRY_DISABLED='1';
const root=path.resolve(__dirname,'..');
const app=require('next')({dev:true,webpack:true,dir:root,hostname:'127.0.0.1',port:5180});
let server;
(async()=>{
 let code=1;
 try{
  await app.prepare();server=http.createServer(app.getRequestHandler());
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(5180,'127.0.0.1',resolve);});
  const runner=spawn(process.execPath,[path.join(root,'node_modules/@playwright/test/cli.js'),'test',...process.argv.slice(2)],{cwd:root,env:process.env,stdio:'inherit'});
  code=await new Promise((resolve,reject)=>{runner.once('error',reject);runner.once('exit',resolve);});
 }catch(error){console.error(error.message);}
 finally{
  if(server){server.closeAllConnections();server.close();}
  await Promise.race([app.close(),new Promise(resolve=>setTimeout(resolve,3000))]);
  if(code===0&&process.argv.length===2&&process.env.CINE_E2E_REMOTE!=='1'){
   const pagination=spawn(process.execPath,[__filename,'tests/e2e/pagination.spec.ts'],{cwd:root,env:{...process.env,CINE_E2E_REMOTE:'1'},stdio:'inherit'});
   code=await new Promise(resolve=>{pagination.once('error',()=>resolve(1));pagination.once('exit',resolve);});
  }
  process.exit(code??1);
 }
})();
