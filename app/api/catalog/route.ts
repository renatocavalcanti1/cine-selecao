import {getCatalog,searchCatalog} from '../../../lib/tmdb';
import {catalogBudget} from '../../../lib/request-budget';
export async function GET(request:Request){
 const url=new URL(request.url);const query=(url.searchParams.get('q')??'').trim();const raw=url.searchParams.get('page')??'1';
 const genre=url.searchParams.get('genre')??'Todos';const type=url.searchParams.get('type')??'Todos';
 if(genre.length>60||!['Todos','Filme','Série'].includes(type))return Response.json({error:'Filtro inválido.'},{status:400});
 if(!/^\d{1,3}$/.test(raw)||Number(raw)<1||Number(raw)>500||query.length>150)return Response.json({error:'Busca ou página inválida.'},{status:400});
 const budget=catalogBudget();
 if(!budget.allowed)return Response.json({error:'Muitas consultas. Aguarde um momento e tente novamente.'},{status:429,headers:{'Retry-After':String(budget.retryAfter),'Cache-Control':'no-store'}});
 try{
  const page=Number(raw);
  if(query)return Response.json(await searchCatalog(query,page));
  const titles=await getCatalog(page,genre,type);return Response.json({titles,hasMore:titles.length>0&&page<500});
 }catch{return Response.json({error:'Não foi possível consultar o catálogo. Tente novamente.'},{status:503});}
}
