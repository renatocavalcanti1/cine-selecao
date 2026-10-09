import {getDirectors} from '../../../lib/tmdb';
import {catalogBudget} from '../../../lib/request-budget';
export async function GET(request:Request){
 const params=new URL(request.url).searchParams;const single=params.has('slug');
 const raw=params.get(single?'slug':'ids')??'';const ids=raw.split(',');
 if(raw.length>160||ids.length>8||ids.some(slug=>!/^(movie|tv)-[1-9]\d{0,9}$/.test(slug)))return Response.json({error:'Obra inválida. Máximo de oito por consulta.'},{status:400});
 const budget=catalogBudget();
 if(!budget.allowed)return Response.json({error:'Aguarde antes de consultar novamente.'},{status:429,headers:{'Retry-After':String(budget.retryAfter),'Cache-Control':'no-store'}});
 try{
  const unique=[...new Set(ids)];const results=await Promise.allSettled(unique.map(getDirectors));
  const entries=results.flatMap((result,index)=>result.status==='fulfilled'?[[unique[index],result.value]]:[]);
  if(!entries.length)throw new Error('Direction unavailable');
  return Response.json({directors:single?entries[0][1]:Object.fromEntries(entries)});
 }catch{return Response.json({error:'Consulta de direção indisponível.'},{status:503});}
}
