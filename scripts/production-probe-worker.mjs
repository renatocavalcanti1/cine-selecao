// Used only by the local verification script; never part of the deployed worker.
import worker from '../dist/server/index.js';
import process from 'node:process';
export default {
 async fetch(request,env,ctx){
  if(new URL(request.url).pathname!=='/__local-production-probe')return worker.fetch(request,env,ctx);
  const token=process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  const key=process.env.TMDB_API_KEY?.trim();
  const credential={tokenPresent:!!token,keyPresent:!!key};
  if(!token&&!key)return Response.json({stage:'tmdb',credential,error:'Credencial ausente no runtime.'},{status:503});
  const url=new URL('https://api.themoviedb.org/3/tv/95396');
  url.searchParams.set('language','pt-BR');if(!token)url.searchParams.set('api_key',key);
  try{
   const response=await fetch(url,{headers:token?{Authorization:`Bearer ${token}`}:{},signal:AbortSignal.timeout(12000)});
   await response.arrayBuffer();
   return Response.json({stage:'tmdb',credential,upstreamStatus:response.status},{status:response.ok?200:503});
  }catch{return Response.json({stage:'tmdb',credential,error:'Falha de conexão com TMDB dentro do worker.'},{status:503});}
 }
};
