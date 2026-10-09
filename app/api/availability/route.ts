import {getWatchAvailability} from '../../../lib/tmdb';
import {catalogBudget} from '../../../lib/request-budget';
export async function GET(request:Request){
 const raw=new URL(request.url).searchParams.get('ids')??'';
 const ids=raw.split(',');
 if(raw.length>160||ids.length>8||ids.some(id=>!/^(movie|tv)-[1-9]\d{0,9}$/.test(id)))return Response.json({error:'Obras inválidas. Máximo de oito por consulta.'},{status:400});
 const budget=catalogBudget();
 if(!budget.allowed)return Response.json({error:'Aguarde antes de consultar novamente.'},{status:429,headers:{'Retry-After':String(budget.retryAfter),'Cache-Control':'no-store'}});
 try{return Response.json({availability:await getWatchAvailability(ids)});}catch{return Response.json({error:'Disponibilidade indisponível.'},{status:503});}
}
