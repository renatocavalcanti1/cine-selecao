// Server data layer: never import this module from a client component.
import {titles as demoTitles} from '../app/titles';
import {selectTrailer, type CatalogTitle, type TmdbVideo} from './catalog-types';
import {createRequestBudget} from './request-budget';
import {mapWatchAvailability,type ProviderResponse,type ReleaseResponse} from './watch-availability';
const upstreamBudget=createRequestBudget(600);
const responseCache=new Map<string,{expires:number;result:Promise<unknown>}>();
type Media='movie'|'tv';
type RecordData={id:number;title?:string;name?:string;overview?:string;release_date?:string;first_air_date?:string;poster_path?:string;genre_ids?:number[];genres?:{id:number;name:string}[];vote_average?:number;vote_count?:number;adult?:boolean};
type Credit={name:string;character?:string;roles?:{character:string;episode_count?:number}[];order?:number;total_episode_count?:number;profile_path?:string};
type Crew={name:string;job?:string;jobs?:{job:string;episode_count?:number}[]};
export function selectDirectors(crew:Crew[]=[]){
 return [...new Set(crew.filter(person=>person.job==='Director'||person.jobs?.some(job=>job.job==='Director')).sort((a,b)=>(b.jobs?.filter(job=>job.job==='Director').reduce((sum,job)=>sum+(job.episode_count??0),0)??0)-(a.jobs?.filter(job=>job.job==='Director').reduce((sum,job)=>sum+(job.episode_count??0),0)??0)).map(person=>person.name?.trim()).filter(Boolean))];
}
export async function getDirectors(slug:string){
 const match=/^(movie|tv)-([1-9]\d{0,9})$/.exec(slug);if(!match)throw new Error('Obra inválida');
 const credits=await tmdbRequest<{crew?:Crew[]}>(`${match[1]}/${match[2]}/${match[1]==='movie'?'credits':'aggregate_credits'}`);
 return selectDirectors(credits.crew);
}
type Episode={air_date:string;season_number:number;episode_number?:number};
type SeriesData=RecordData&{last_episode_to_air?:Episode;next_episode_to_air?:Episode;seasons?:{season_number:number;air_date?:string}[]};
export function episodeLabel(detail:SeriesData){
 const today=dateBounds().today;
 const next=detail.next_episode_to_air;
 const last=detail.last_episode_to_air;
 const valid=(episode:Episode|undefined)=>!!episode&&episode.season_number>0&&Number.isInteger(episode.episode_number)&&(episode.episode_number??0)>0&&/^\d{4}-\d{2}-\d{2}$/.test(episode.air_date)&&Number.isFinite(Date.parse(episode.air_date))&&new Date(episode.air_date).toISOString().slice(0,10)===episode.air_date;
 const upcoming=valid(next)&&next!.air_date>=today;
 const episode=upcoming?next:valid(last)&&last!.air_date<=today?last:undefined;
 if(!episode)return undefined;
 const date=new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(`${episode.air_date}T12:00:00Z`));
 return `${upcoming?'Próximo episódio':'Último episódio'} · T${episode.season_number} E${episode.episode_number} · ${date}`;
}
function recentSeasonLabel(detail:SeriesData){
 const {today}=dateBounds();const since=new Date(`${today}T12:00:00Z`);since.setUTCDate(since.getUTCDate()-90);
 const cutoff=since.toISOString().slice(0,10);const episode=detail.last_episode_to_air;
 if(detail.adult||(detail.vote_average??0)<7.5||(detail.vote_count??0)<200||!episode||episode.season_number<2||episode.air_date<cutoff||episode.air_date>today)return undefined;
 const premiere=detail.seasons?.find(s=>s.season_number===episode.season_number)?.air_date;
 if(!premiere||premiere<cutoff||premiere>today)return undefined;
 return `Temporada ${episode.season_number} · estreia em ${new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(`${premiere}T12:00:00Z`))}`;
}
export class TmdbError extends Error{constructor(public status:number){super(status===401||status===403?'A credencial do TMDB não foi aceita.':status===404?'Obra não encontrada.':'Não foi possível consultar o TMDB agora.');}}
export async function tmdbRequest<T>(path:string,params:Record<string,string>={}):Promise<T>{
 const token=process.env.TMDB_READ_ACCESS_TOKEN?.trim();const key=process.env.TMDB_API_KEY?.trim();
 if(!token&&!key)throw new Error('Configure a credencial do TMDB em .env.local.');
 const url=new URL(`https://api.themoviedb.org/3/${path}`);
 for(const [k,v]of Object.entries({language:'pt-BR',...params}))url.searchParams.set(k,v);
 if(!token)url.searchParams.set('api_key',key!);
 const cacheKey=`${token??''}:${url.href}`;
 const production=process.env.NODE_ENV==='production';
 if(production){
  const cached=responseCache.get(cacheKey);
  if(cached&&cached.expires>Date.now())return structuredClone(await cached.result) as T;
  if(!upstreamBudget().allowed)throw new TmdbError(429);
 }
 const run=async()=>{
 let response:Response;
 try{response=await fetch(url,{headers:token?{Authorization:`Bearer ${token}`}:{},signal:AbortSignal.timeout(12000),next:{revalidate:3600}});}catch{throw new TmdbError(503);}
 if(!response.ok)throw new TmdbError(response.status);
 try{return await response.json() as T;}catch{throw new TmdbError(502);}
 };
 const result=run();
 if(production){
  if(responseCache.size>=300)responseCache.delete(responseCache.keys().next().value!);
  responseCache.set(cacheKey,{expires:Date.now()+3_600_000,result});
 }
 try{return structuredClone(await result);}catch(e){if(production)responseCache.delete(cacheKey);throw e;}
}
function dateBounds(now=new Date()){
 // Assemble ISO explicitly: locale formatting can differ between Node and workerd.
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const part=(type:string)=>parts.find(p=>p.type===type)!.value;
 const today=`${part('year')}-${part('month')}-${part('day')}`;
 const start=new Date(`${today}T12:00:00Z`);start.setUTCDate(start.getUTCDate()-180);
 const cutoff=start.toISOString().slice(0,10);const previous=new Date(start);previous.setUTCDate(previous.getUTCDate()-1);
 return {today,cutoff,previous:previous.toISOString().slice(0,10)};
}
function mapRecord(r:RecordData,media:Media,recent:boolean,genres:Map<number,string>):CatalogTitle{
 const date=(media==='movie'?r.release_date:r.first_air_date)??'';
 const rating=r.vote_average??0;const votes=r.vote_count??0;
 return {slug:`${media}-${r.id}`,title:r.title??r.name??'Título não informado',year:Number(date.slice(0,4))||0,type:media==='movie'?'Filme':'Série',recent,
 genres:r.genres?.map(g=>g.name)??(r.genre_ids??[]).map(id=>genres.get(id)).filter((g):g is string=>!!g),
 trailer:'',summary:r.overview?.slice(0,160)||'Sinopse não disponível em português.',synopsis:r.overview||'Sinopse não disponível em português.',
 why:recent?'Lançamento dos últimos 180 dias. A inclusão nesta seção não é uma avaliação de qualidade.':`Selecionado por avaliação do público no TMDB: ${rating.toFixed(1)}/10, com ${votes.toLocaleString('pt-BR')} votos. Esse é um critério de descoberta, não uma garantia de qualidade.`,
 cast:[],source:`https://www.themoviedb.org/${media}/${r.id}`,date:date?new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`)):'Não informado',channel:'',
 poster:r.poster_path&&/^\/[\w.-]+$/.test(r.poster_path)?`https://image.tmdb.org/t/p/w500${r.poster_path}`:undefined,rating,votes};
}
export async function getCatalog(page=1,genre='Todos',type='Todos'):Promise<CatalogTitle[]>{
 if(process.env.CINE_E2E==='1')return demoTitles.map(testAvailability);
 const {today,cutoff,previous}=dateBounds();
 const genres=await Promise.all((['movie','tv'] as Media[]).map(m=>tmdbRequest<{genres:{id:number;name:string}[]}>(`genre/${m}/list`)));
 const maps=genres.map(g=>new Map(g.genres.map(v=>[v.id,v.name])));
 const batches=await Promise.all((['movie','tv'] as Media[]).flatMap((media,i)=>(genre==='Todos'&&[...maps[i].values()].includes('Terror')?[true,false,false]:[true,false]).map(async (recent,batchIndex)=>{
  if(type!=='Todos'&&type!==(media==='movie'?'Filme':'Série'))return [];
  const selectedGenre=batchIndex===2?'Terror':genre;
  const genreId=[...maps[i]].find(([,name])=>name===selectedGenre)?.[0];
  if(genre!=='Todos'&&!genreId)return [];
  const prefix=media==='movie'?'primary_release_date':'first_air_date';
  const params:Record<string,string>={page:String(page),include_adult:'false',sort_by:recent?'popularity.desc':'vote_average.desc',[`${prefix}.lte`]:recent?today:previous};
  if(genreId)params.with_genres=String(genreId);
  if(recent)params[`${prefix}.gte`]=cutoff;else{params['vote_average.gte']=selectedGenre==='Terror'?'6.0':'7.0';params['vote_count.gte']=media==='movie'?'500':'200';}
  const data=await tmdbRequest<{results:RecordData[]}>(`discover/${media}`,params);
  return data.results.filter(r=>!r.adult).map(r=>mapRecord(r,media,recent,maps[i]));
 })));
 const extras=(await getDiscovery(page,maps)).filter(t=>(genre==='Todos'||t.genres.includes(genre))&&(type==='Todos'||t.type===type));
 return [...new Map([...batches.flat(),...extras].map(t=>[t.slug,t])).values()];
}
function testAvailability(title:CatalogTitle):CatalogTitle{
 if(title.slug==='ruptura')return {...title,availability:{country:'BR',status:'available',groups:[{label:'Assinatura',providers:[{id:350,name:'Apple TV+'}]}],link:'https://www.themoviedb.org/tv/95396/watch?locale=BR'}};
 return {...title,availability:{country:'BR',status:'unknown',groups:[],cinema:title.slug==='a-odisseia'?{date:'2026-07-17',upcoming:false}:undefined}};
}
async function watchAvailability(title:CatalogTitle){
 const match=/^(movie|tv)-(\d+)$/.exec(title.slug);
 if(!match)return title.availability;
 const [providers,releases]=await Promise.allSettled([
  tmdbRequest<ProviderResponse>(`${match[1]}/${match[2]}/watch/providers`),
  match[1]==='movie'?tmdbRequest<ReleaseResponse>(`movie/${match[2]}/release_dates`):Promise.resolve(undefined)
 ]);
 return mapWatchAvailability(providers.status==='fulfilled'?providers.value:undefined,releases.status==='fulfilled'?releases.value:undefined);
}
export async function getWatchAvailability(slugs:string[]){
 if(slugs.length>8||slugs.some(slug=>!/^(movie|tv)-[1-9]\d{0,9}$/.test(slug)))throw new Error('Lote inválido.');
 // At most 16 external subrequests per invocation, including cinema dates.
 const entries=await Promise.all([...new Set(slugs)].map(async slug=>{
  if(process.env.CINE_E2E==='1')return [slug,testAvailability({...demoTitles[0],slug:slug==='tv-95396'?'ruptura':slug}).availability] as const;
  return [slug,await watchAvailability({slug} as CatalogTitle)] as const;
 }));
 return Object.fromEntries(entries);
}
async function getDiscovery(page:number,maps:Map<number,string>[]){
 const {today,cutoff}=dateBounds();
 const since=new Date(`${today}T12:00:00Z`);since.setUTCDate(since.getUTCDate()-90);
 const seasonCutoff=since.toISOString().slice(0,10);
 const [trendingResult,seriesResult]=await Promise.allSettled([
  tmdbRequest<{results:(RecordData&{media_type?:string})[]}>('trending/all/week',{page:String(page)}),
  tmdbRequest<{results:RecordData[]}>('discover/tv',{page:String(page),include_adult:'false',sort_by:'popularity.desc','vote_average.gte':'7.5','vote_count.gte':'200','air_date.gte':seasonCutoff,'air_date.lte':today})
 ]);
 const trending=trendingResult.status==='fulfilled'?trendingResult.value.results.filter(r=>!r.adult&&(r.media_type==='movie'||r.media_type==='tv')).map(r=>{
  const media=r.media_type as Media;const date=(media==='movie'?r.release_date:r.first_air_date)??'';
  return {...mapRecord(r,media,date>=cutoff&&date<=today,maps[media==='movie'?0:1]),discovery:'trending' as const};
 }):[];
 const candidates=seriesResult.status==='fulfilled'?seriesResult.value.results.filter(r=>!r.adult&&(r.vote_average??0)>=7.5&&(r.vote_count??0)>=200).slice(0,20):[];
 const verified=await Promise.allSettled(candidates.map(async r=>{
  const detail=await tmdbRequest<SeriesData>(`tv/${r.id}`);
  // Only claim a new season when its premiere date is confirmed, not a rerun or announcement.
  const seasonLabel=recentSeasonLabel(detail);if(!seasonLabel)return undefined;
  return {...mapRecord(detail,'tv',false,maps[1]),discovery:'season' as const,seasonLabel,episodeLabel:episodeLabel(detail)};
 }));
 return [...trending,...verified.flatMap(r=>r.status==='fulfilled'&&r.value?[r.value]:[])];
}
export async function searchCatalog(query:string,page=1):Promise<{titles:CatalogTitle[];hasMore:boolean}>{
 const {today,cutoff}=dateBounds();
 const groups=await Promise.all((['movie','tv'] as Media[]).map(async media=>{
  const [data,genreData]=await Promise.all([
   tmdbRequest<{results:RecordData[];total_pages:number}>(`search/${media}`,{query:query.trim(),page:String(page),include_adult:'false'}),
   tmdbRequest<{genres:{id:number;name:string}[]}>(`genre/${media}/list`)
  ]);
  const genres=new Map(genreData.genres.map(g=>[g.id,g.name]));
  const records=data.results.filter(r=>{
   const date=(media==='movie'?r.release_date:r.first_air_date)??'';
   if(r.adult||!date||date>today)return false;
   return true; // Explicit title searches must not hide works below the discovery threshold.
  }).map(r=>mapRecord(r,media,((media==='movie'?r.release_date:r.first_air_date)??'')>=cutoff,genres));
  return {records,hasMore:page<data.total_pages};
 }));
 const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const lookup=normalize(query.trim());
 const relevance=(t:CatalogTitle)=>normalize(t.title)===lookup?0:normalize(t.title).includes(lookup)?1:2;
 return {titles:groups.flatMap(g=>g.records).sort((a,b)=>relevance(a)-relevance(b)),hasMore:groups.some(g=>g.hasMore)};
}
export async function getTitle(slug:string):Promise<CatalogTitle|undefined>{
 const match=/^(movie|tv)-([1-9]\d{0,9})$/.exec(slug);
 if(!match){const demo=demoTitles.find(t=>t.slug===slug);return demo&&process.env.CINE_E2E==='1'?testAvailability(demo):demo;}
 const media=match[1] as Media;let record:SeriesData&{credits?:{cast:Credit[];crew?:Crew[]};aggregate_credits?:{cast:Credit[];crew?:Crew[]}};
 try{record=await tmdbRequest(`${media}/${match[2]}`,{append_to_response:media==='movie'?'credits':'aggregate_credits'});}catch(e){if(e instanceof TmdbError&&e.status===404)return undefined;throw e;}
 if(record.adult)return undefined;
 const {cutoff,today}=dateBounds();const date=(media==='movie'?record.release_date:record.first_air_date)??'';
 const title=mapRecord(record,media,!!date&&date>=cutoff&&date<=today,new Map());
 if(media==='tv'){title.seasonLabel=recentSeasonLabel(record);title.episodeLabel=episodeLabel(record);}
 const cast=media==='movie'?record.credits?.cast:record.aggregate_credits?.cast;
 title.directors=selectDirectors((media==='movie'?record.credits:record.aggregate_credits)?.crew);
 title.castProfiles=[...(cast??[])].sort((a,b)=>media==='movie'?(a.order??999)-(b.order??999):(b.total_episode_count??0)-(a.total_episode_count??0)).slice(0,12).map(c=>{
  const roles=[...new Set((c.character?[c.character]:[...(c.roles??[])].sort((a,b)=>(b.episode_count??0)-(a.episode_count??0)).map(r=>r.character)).flatMap(role=>role.split(/\s+\/\s+/)).map(role=>role.trim()).filter(Boolean))];
  return {name:c.name,role:roles.slice(0,3).join(' / '),roles,photo:c.profile_path&&/^\/[\w.-]+$/.test(c.profile_path)?`https://image.tmdb.org/t/p/w185${c.profile_path}`:undefined};
 });
 title.cast=title.castProfiles.map(c=>c.role?`${c.name} — ${c.role}`:c.name);
 title.availability=await watchAvailability(title);
 try{
  const localized=await tmdbRequest<{results:TmdbVideo[]}>(`${media}/${match[2]}/videos`);
  const brazil=selectTrailer(localized.results);
  const videos=brazil?.video.iso_639_1==='pt'&&brazil.video.iso_3166_1==='BR'?localized.results:[...localized.results,...(await tmdbRequest<{results:TmdbVideo[]}>(`${media}/${match[2]}/videos`,{language:''})).results];
  const chosen=selectTrailer(videos);if(chosen){title.trailer=chosen.video.key;title.trailerLabel=chosen.label;title.channel='YouTube · Oficial segundo o TMDB';}
 }catch{title.trailerLabel='Consulta de trailers indisponível no momento.';}
 return title;
}
