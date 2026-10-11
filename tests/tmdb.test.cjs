const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
require('./load-source.cjs');
const {selectTrailer}=require('../lib/catalog-types.ts');
const {tmdbRequest,getCatalog,getTitle,searchCatalog}=require('../lib/tmdb.ts');
const originalFetch=global.fetch;const originalKey=process.env.TMDB_API_KEY;const originalToken=process.env.TMDB_READ_ACCESS_TOKEN;const originalTest=process.env.CINE_E2E;const originalMode=process.env.NODE_ENV;
afterEach(()=>{global.fetch=originalFetch;for(const [k,v]of Object.entries({TMDB_API_KEY:originalKey,TMDB_READ_ACCESS_TOKEN:originalToken,CINE_E2E:originalTest,NODE_ENV:originalMode})){if(v===undefined)delete process.env[k];else process.env[k]=v;}});
const video=(key,name,language='pt',country='BR',extra={})=>({key,name,iso_639_1:language,iso_3166_1:country,site:'YouTube',type:'Trailer',official:true,...extra});
test('official Brazilian dubbed trailer outranks subtitled, English and Portuguese from Portugal',()=>{
 const dubbed=video('dubbed12345','Trailer dublado');
 const choice=selectTrailer([video('english1234','Trailer','en','US'),video('legenda1234','Trailer legendado'),video('portuga1234','Trailer dublado','pt','PT'),dubbed]);
 assert.equal(choice.video.key,dubbed.key);assert.match(choice.label,/PT-BR.*Dublado/);
});
test('Portuguese metadata without audio evidence gets an honest label',()=>{assert.match(selectTrailer([video('portugu1234','Trailer oficial')]).label,/não confirmados/);});
test('unofficial clips and invalid video ids never become the chosen trailer',()=>{
 assert.equal(selectTrailer([video('invalid','Trailer'),video('unoffic1234','Trailer','pt','BR',{official:false}),video('teaser12345','Teaser','pt','BR',{type:'Teaser'})]),undefined);
});
test('foreign fallback discloses unavailable Brazilian official trailer',()=>{assert.match(selectTrailer([video('english1234','Official trailer','en','US')]).label,/Sem trailer oficial PT-BR/);});
test('API reads token only on server and gives token precedence over key',async()=>{
 process.env.TMDB_READ_ACCESS_TOKEN='test-token';process.env.TMDB_API_KEY='test-key';
 global.fetch=async(url,options)=>{assert.equal(url.hostname,'api.themoviedb.org');assert.equal(url.searchParams.get('language'),'pt-BR');assert.equal(url.searchParams.has('api_key'),false);assert.equal(options.headers.Authorization,'Bearer test-token');return Response.json({ok:true});};
 assert.deepEqual(await tmdbRequest('movie/1'),{ok:true});
});
test('key authentication works and HTTP errors do not expose credentials',async()=>{
 delete process.env.TMDB_READ_ACCESS_TOKEN;process.env.TMDB_API_KEY='private-test-key';
 global.fetch=async url=>{assert.equal(url.searchParams.get('api_key'),'private-test-key');return new Response('',{status:401});};
 await assert.rejects(tmdbRequest('movie/1'),e=>e.status===401&&!e.message.includes('private-test-key'));
});
test('discovery requests rating and vote thresholds and a bounded release window',async()=>{
 process.env.TMDB_API_KEY='test-key';delete process.env.CINE_E2E;const calls=[];
 global.fetch=async url=>{calls.push(url);if(url.pathname.includes('/genre/'))return Response.json({genres:[{id:1,name:'Drama'}]});return Response.json({results:[{id:url.pathname.endsWith('/movie')?10:20,title:'Filme',name:'Série',overview:'Sinopse',genre_ids:[1],release_date:'2020-01-01',first_air_date:'2020-01-01',vote_average:8,vote_count:1000}]});};
 const records=await getCatalog();assert.ok(records.length>0);
 const discover=calls.filter(u=>u.pathname.includes('/discover/')&&!u.searchParams.has('air_date.gte'));assert.equal(discover.length,4);
 const rated=discover.filter(u=>u.searchParams.has('vote_average.gte'));assert.equal(rated.length,2);
 assert.ok(rated.every(u=>u.searchParams.get('vote_average.gte')==='7.0'));
 assert.ok(discover.filter(u=>!u.searchParams.has('vote_average.gte')).every(u=>[...u.searchParams.keys()].some(k=>k.endsWith('.gte'))));
});
test('live detail includes aggregate series cast and prioritizes Brazilian video',async()=>{
 process.env.TMDB_API_KEY='test-key';
 global.fetch=async url=>{if(url.pathname.endsWith('/videos'))return Response.json({results:[video('dubbed12345','Trailer dublado')]});assert.equal(url.searchParams.get('append_to_response'),'aggregate_credits');return Response.json({id:10,name:'Uma série',first_air_date:'2020-01-01',genres:[{id:1,name:'Drama'}],aggregate_credits:{cast:[{name:'Atriz',roles:[{character:'Personagem'}],total_episode_count:10}]}});};
 const title=await getTitle('tv-10');assert.deepEqual(title.cast,['Atriz — Personagem']);assert.equal(title.trailer,'dubbed12345');
});
test('TMDB missing detail becomes 404 candidate instead of a generic failure',async()=>{
 process.env.TMDB_API_KEY='test-key';global.fetch=async()=>new Response('',{status:404});assert.equal(await getTitle('movie-123'),undefined);
});
test('catalog pagination forwards the requested page without skipping API records',async()=>{
 process.env.TMDB_API_KEY='test-key';delete process.env.CINE_E2E;
 global.fetch=async url=>{if(url.pathname.includes('/genre/'))return Response.json({genres:[]});assert.equal(url.searchParams.get('page'),'2');return Response.json({results:Array.from({length:20},(_,i)=>({id:i+1,title:'Título',release_date:'2020-01-01',vote_average:8,vote_count:600}))});};
 const result=await getCatalog(2);assert.equal(result.length,40);
});
test('search queries both media types and puts an exact title first',async()=>{
 process.env.TMDB_API_KEY='test-key';
 global.fetch=async url=>{if(url.pathname.includes('/genre/'))return Response.json({genres:[]});assert.equal(url.searchParams.get('query'),'Breaking Bad');const tv=url.pathname.endsWith('/tv');return Response.json({total_pages:1,results:[{id:tv?1396:20,title:tv?undefined:'Outro filme',name:tv?'Breaking Bad':undefined,release_date:'2020-01-01',first_air_date:'2008-01-20',vote_average:9,vote_count:1000}]});};
 const result=await searchCatalog('Breaking Bad');assert.equal(result.titles[0].slug,'tv-1396');assert.equal(result.hasMore,false);
});
test('direction credits use director jobs, deduplicate and rank TV directors by episodes',async()=>{
 const {selectDirectors,getDirectors}=require('../lib/tmdb.ts');
 assert.deepEqual(selectDirectors([{name:'Writer',job:'Writer'},{name:'Director A',job:'Director'},{name:'Director A',job:'Director'},{name:'Director B',job:'Director'}]),['Director A','Director B']);
 assert.deepEqual(selectDirectors([{name:'Guest',jobs:[{job:'Director',episode_count:1}]},{name:'Regular',jobs:[{job:'Director',episode_count:30}]},{name:'Creator',jobs:[{job:'Creator',episode_count:100}]}]),['Regular','Guest']);
 process.env.TMDB_API_KEY='test-key';let called;
 global.fetch=async url=>{called=url.pathname;return Response.json({crew:[{name:'Film Director',job:'Director'}]});};
 assert.deepEqual(await getDirectors('movie-123'),['Film Director']);assert.equal(called,'/3/movie/123/credits');
 await assert.rejects(getDirectors('../secret'));
});

test('series cast prioritizes recurring characters and keeps long role lists out of the summary',async()=>{
 process.env.TMDB_API_KEY='test-key';
 const extras=Array.from({length:300},(_,i)=>({character:`Participação ${i}`,episode_count:1}));
 global.fetch=async url=>{
  if(url.pathname.endsWith('/videos'))return Response.json({results:[]});
  return Response.json({id:456,name:'Os Simpsons',first_air_date:'1989-12-17',genres:[{id:16,name:'Animação'}],aggregate_credits:{cast:[{name:'Dan Castellaneta',roles:[...extras,{character:'Homer Simpson (voice)',episode_count:700},{character:'Moe (voice)',episode_count:200},{character:'Homer Simpson (voice)',episode_count:10},{character:'Abraham Simpson (voice)',episode_count:150}],total_episode_count:750}]}});
 };
 const title=await getTitle('tv-456');
 assert.equal(title.castProfiles[0].role,'Homer Simpson (voice) / Moe (voice) / Abraham Simpson (voice)');
 assert.equal(title.castProfiles[0].roles.length,303);
 assert.ok(!title.cast[0].includes('Participação'));assert.ok(title.castProfiles[0].roles.includes('Participação 299'));
});
test('combined character names are split before limiting the summary',async()=>{
 process.env.TMDB_API_KEY='test-key';
 global.fetch=async url=>url.pathname.endsWith('/videos')?Response.json({results:[]}):Response.json({id:456,name:'Os Simpsons',genres:[{name:'Animação'}],aggregate_credits:{cast:[{name:'Dan',roles:[{character:'Homer / Abe / Barney / Krusty / Willie / Quimby (voice)',episode_count:700}]}]}});
 const title=await getTitle('tv-456');assert.equal(title.castProfiles[0].role,'Homer / Abe / Barney');assert.equal(title.castProfiles[0].roles.length,6);
});

test('director API validates input and does not expose upstream errors or credentials',async()=>{
 const {GET}=require('../app/api/directors/route.ts');
 const original=global.fetch;let calls=0;
 global.fetch=async()=>{calls++;return new Response('',{status:401});};
 try{
  for(const slug of ['../secret','movie-0','tv-1<script>',''])assert.equal((await GET(new Request(`http://localhost/api/directors?slug=${encodeURIComponent(slug)}`))).status,400);
  assert.equal(calls,0);
  const response=await GET(new Request('http://localhost/api/directors?slug=movie-123'));assert.equal(response.status,503);assert.equal((await response.text()).includes('test-key'),false);
 }finally{global.fetch=original;}
});
test('director batches reject oversized input, deduplicate and isolate failures',async()=>{
 const {GET}=require('../app/api/directors/route.ts');process.env.TMDB_API_KEY='test-key';let calls=0;
 global.fetch=async url=>{calls++;return url.pathname.includes('movie/800020')?Response.json({crew:[{name:'Confirmed Director',job:'Director'}]}):new Response('',{status:503});};
 const oversized=Array.from({length:9},(_,i)=>`movie-${800020+i}`).join(',');
 assert.equal((await GET(new Request(`http://localhost/api/directors?ids=${oversized}`))).status,400);assert.equal(calls,0);
 const response=await GET(new Request('http://localhost/api/directors?ids=movie-800020,movie-800020,tv-800021'));
 assert.equal(response.status,200);assert.deepEqual((await response.json()).directors,{'movie-800020':['Confirmed Director']});assert.equal(calls,2);
});

test('cast profiles use TMDB URLs and preserve missing-photo state',async()=>{
 process.env.TMDB_API_KEY='test-key';global.fetch=async url=>url.pathname.endsWith('/videos')?Response.json({results:[]}):Response.json({id:103,title:'Taxi Driver',release_date:'1976-02-08',credits:{cast:[{name:'Ator',character:'Personagem',profile_path:'/actor.jpg',order:0},{name:'Atriz',order:1}]}});
 const title=await getTitle('movie-103');assert.equal(title.castProfiles[0].photo,'https://image.tmdb.org/t/p/w185/actor.jpg');assert.equal(title.castProfiles[1].photo,undefined);
});
test('catalog endpoint rejects invalid pagination before contacting TMDB',async()=>{
 const {GET}=require('../app/api/catalog/route.ts');global.fetch=async()=>{throw new Error('Should not contact TMDB');};const response=await GET(new Request('http://localhost/api/catalog?page=-1'));assert.equal(response.status,400);
});

test('discovery confirms season premieres and excludes specials, future seasons and weak ratings',async()=>{
 process.env.TMDB_API_KEY='test-key';delete process.env.CINE_E2E;
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const today=['year','month','day'].map(type=>parts.find(part=>part.type===type).value).join('-');
 global.fetch=async url=>{
  if(url.pathname.includes('/genre/'))return Response.json({genres:[]});
  if(url.pathname.includes('/trending/'))return Response.json({results:[{id:90,media_type:'movie',title:'Trending',release_date:'2020-01-01'},{id:91,media_type:'person',name:'Person'}]});
  if(url.pathname.endsWith('/discover/tv')&&url.searchParams.has('air_date.gte'))return Response.json({results:[1,2,3,4,5].map(id=>({id,name:'Series',vote_average:id===5?6:8,vote_count:500}))});
  if(url.pathname.includes('/discover/'))return Response.json({results:[]});
  const id=Number(url.pathname.split('/').pop());
  return Response.json({id,name:'Series '+id,first_air_date:'2020-01-01',vote_average:8,vote_count:500,last_episode_to_air:{air_date:today,season_number:id===2?0:2},seasons:[{season_number:2,air_date:id===3?'2099-01-01':id===4?'2020-01-01':today}]});
 };
 const titles=await getCatalog();
 assert.deepEqual(titles.filter(t=>t.discovery==='trending').map(t=>t.slug),['movie-90']);
 assert.deepEqual(titles.filter(t=>t.discovery==='season').map(t=>t.slug),['tv-1']);
 assert.match(titles.find(t=>t.slug==='tv-1').seasonLabel,/Temporada 2/);
 assert.equal(titles.find(t=>t.slug==='tv-1').recent,false);
});
test('request budget recovers after its window without trusting spoofable IP headers',()=>{
 const {createRequestBudget}=require('../lib/request-budget.ts');const budget=createRequestBudget(2,1000);
 assert.equal(budget(1000).allowed,true);assert.equal(budget(1000).allowed,true);
 assert.deepEqual(budget(1000),{allowed:false,retryAfter:1});assert.equal(budget(2000).allowed,true);
});

test('production TMDB cache coalesces requests and prevents caller mutation',async()=>{
 process.env.NODE_ENV='production';process.env.TMDB_API_KEY='cache-test';delete process.env.TMDB_READ_ACCESS_TOKEN;
 let calls=0;global.fetch=async()=>{calls++;return Response.json({title:'Original'});};
 const [first,second]=await Promise.all([tmdbRequest('movie/321'),tmdbRequest('movie/321')]);
 first.title='Modified';assert.equal(second.title,'Original');
 assert.equal((await tmdbRequest('movie/321')).title,'Original');assert.equal(calls,1);
});
test('failed production TMDB requests are not retained in the cache',async()=>{
 process.env.NODE_ENV='production';process.env.TMDB_API_KEY='cache-test';delete process.env.TMDB_READ_ACCESS_TOKEN;
 let calls=0;global.fetch=async()=>++calls===1?new Response('',{status:503}):Response.json({ok:true});
 await assert.rejects(tmdbRequest('movie/322'));assert.deepEqual(await tmdbRequest('movie/322'),{ok:true});assert.equal(calls,2);
});

test('Brazilian availability separates subscription, rental and purchase without copying US providers',()=>{
 const {mapWatchAvailability}=require('../lib/watch-availability.ts');
 const provider={provider_id:1,provider_name:'BR Platform',logo_path:'/platform.jpg'};
 const result=mapWatchAvailability({results:{US:{flatrate:[{provider_id:2,provider_name:'US Only'}]},BR:{link:'https://www.themoviedb.org/movie/1/watch?locale=BR',flatrate:[provider,provider],rent:[provider],buy:[provider],free:[provider],ads:[provider]}}});
 assert.equal(result.country,'BR');assert.equal(result.status,'available');
 assert.deepEqual(result.groups.map(g=>g.label),['Assinatura','Grátis','Grátis com anúncios','Aluguel','Compra']);
 assert.ok(result.groups.every(g=>g.providers.length===1&&g.providers[0].name==='BR Platform'));
 assert.equal(result.groups[0].providers[0].logo,'https://image.tmdb.org/t/p/w92/platform.jpg');
});
test('provider links and logos reject unsafe origins and malformed values',()=>{
 const {mapWatchAvailability}=require('../lib/watch-availability.ts');
 for(const link of ['javascript:alert(1)','https://www.themoviedb.org.evil.test/','https://user:password@www.themoviedb.org/','http://www.themoviedb.org/']){
  const result=mapWatchAvailability({results:{BR:{link,flatrate:[{provider_id:1,provider_name:'Platform',logo_path:'//evil.test/logo.jpg'},{provider_id:-1,provider_name:'Invalid'}]}}});
  assert.equal(result.link,undefined);assert.equal(result.groups[0].providers[0].logo,undefined);assert.equal(result.groups[0].providers.length,1);
 }
});
test('missing availability and outages never assert cinema exclusivity',()=>{
 const {mapWatchAvailability}=require('../lib/watch-availability.ts');
 assert.equal(mapWatchAvailability({results:{US:{}}}).status,'unknown');
 assert.equal(mapWatchAvailability(undefined).status,'unavailable');
 const result=mapWatchAvailability({results:{}},{results:[{iso_3166_1:'US',release_dates:[{type:3,release_date:'2026-10-01T00:00:00Z'}]},{iso_3166_1:'BR',release_dates:[{type:4,release_date:'2026-09-01T00:00:00Z'},{type:3,release_date:'2026-10-20T00:00:00Z'}]}]},new Date('2026-10-08T12:00:00Z'));
 assert.deepEqual(result.cinema,{date:'2026-10-20',upcoming:true});assert.equal(result.status,'unknown');
});
test('malformed provider payload degrades to an unknown state',()=>{
 const {mapWatchAvailability}=require('../lib/watch-availability.ts');
 assert.equal(mapWatchAvailability({results:{BR:{flatrate:'bad'}}},{results:'bad'}).status,'unknown');
});
test('availability API failure preserves title details and exposes a recoverable state',async()=>{
 process.env.TMDB_API_KEY='test-key';global.fetch=async url=>url.pathname.includes('/watch/providers')?new Response('',{status:503}):url.pathname.endsWith('/videos')?Response.json({results:[]}):Response.json({id:103,title:'Taxi Driver',release_date:'1976-02-08',credits:{cast:[]}});
 const title=await getTitle('movie-103');assert.equal(title.title,'Taxi Driver');assert.equal(title.availability.status,'unavailable');
});

test('availability batches enforce input validation and stay within the worker subrequest budget',async()=>{
 const {getWatchAvailability}=require('../lib/tmdb.ts');
 process.env.TMDB_API_KEY='test-key';delete process.env.CINE_E2E;
 let calls=0;global.fetch=async()=>{calls++;return Response.json({results:{BR:{flatrate:[{provider_id:1,provider_name:'Platform'}]}}});};
 const ids=Array.from({length:8},(_,i)=>`movie-${i+1}`);
 const result=await getWatchAvailability(ids);assert.equal(calls,16);assert.equal(Object.keys(result).length,8);
 await assert.rejects(getWatchAvailability([...ids,'movie-9']));await assert.rejects(getWatchAvailability(['../../secret']));assert.equal(calls,16);
 const {GET}=require('../app/api/availability/route.ts');
 for(const ids of ['','movie-0','tv-1,../../secret',Array.from({length:9},(_,i)=>`tv-${i+1}`).join(',')])assert.equal((await GET(new Request(`http://localhost/api/availability?ids=${encodeURIComponent(ids)}`))).status,400);
 assert.equal(calls,16);
});

test('catalog date filters remain ISO when runtime locale falls back to US formatting',async()=>{
 const Original=Intl.DateTimeFormat;const calls=[];process.env.TMDB_API_KEY='test-key';delete process.env.CINE_E2E;
 Intl.DateTimeFormat=function(locale,options){return new Original(locale==='en-CA'?'en-US':locale,options);};
 global.fetch=async url=>{calls.push(url);return Response.json(url.pathname.includes('/genre/')?{genres:[]}:{results:[]});};
 try{await getCatalog();const dates=calls.flatMap(url=>[...url.searchParams].filter(([key])=>key.endsWith('.gte')||key.endsWith('.lte')).filter(([key])=>key.includes('date')).map(([,value])=>value));assert.ok(dates.length>0);assert.ok(dates.every(value=>/^\d{4}-\d{2}-\d{2}$/.test(value)));}finally{Intl.DateTimeFormat=Original;}
});

test('episode dates use confirmed upcoming metadata and fall back to last aired episode',()=>{
 const {episodeLabel}=require('../lib/tmdb.ts');
 assert.equal(episodeLabel({next_episode_to_air:{air_date:'2099-01-02',season_number:3,episode_number:4}}),'Próximo episódio · T3 E4 · 02/01/2099');
 assert.equal(episodeLabel({next_episode_to_air:null,last_episode_to_air:{air_date:'2020-01-02',season_number:2,episode_number:8}}),'Último episódio · T2 E8 · 02/01/2020');
 for(const air_date of ['', 'unknown','2099-02-30'])assert.equal(episodeLabel({next_episode_to_air:{air_date,season_number:3,episode_number:4}}),undefined);
 assert.equal(episodeLabel({}),undefined);
 assert.equal(episodeLabel({next_episode_to_air:{air_date:'2099-01-02',season_number:0,episode_number:1}}),undefined);
});

test('explicit title search keeps lower-rated classics instead of applying discovery thresholds',async()=>{
 process.env.TMDB_API_KEY='test-key';global.fetch=async url=>Response.json(url.pathname.includes('/genre/')?{genres:[{id:27,name:'Terror'}]}:{total_pages:1,results:url.pathname.endsWith('/movie')?[{id:2667,title:'A Bruxa de Blair',release_date:'1999-07-14',genre_ids:[27],vote_average:6.5,vote_count:4000}]:[]});
 const result=await searchCatalog('bruxa de blair');assert.equal(result.titles[0].title,'A Bruxa de Blair');assert.equal(result.titles[0].rating,6.5);
});

test('genre discovery sends the genre to TMDB on every page and keeps quality criteria',async()=>{
 process.env.TMDB_API_KEY='test-key';delete process.env.CINE_E2E;const calls=[];
 global.fetch=async url=>{calls.push(url);if(url.pathname.includes('/genre/'))return Response.json({genres:[{id:27,name:'Terror'}]});return Response.json({results:[]});};
 await getCatalog(2,'Terror','Filme');
 const discover=calls.filter(url=>url.pathname.endsWith('/discover/movie'));assert.equal(discover.length,2);
 assert.ok(discover.every(url=>url.searchParams.get('with_genres')==='27'&&url.searchParams.get('page')==='2'));
 assert.equal(discover.find(url=>url.searchParams.has('vote_average.gte')).searchParams.get('vote_average.gte'),'6.0');
});

test('worker security boundary covers successful, cached and error responses without consuming bodies',async()=>{
 const {withSecurityHeaders}=require('../lib/security-headers.ts');
 for(const status of [200,400,404,429,500]){
  const original=new Response('Body',{status,headers:{'Cache-Control':'public, max-age=300','X-Powered-By':'Framework','Content-Type':'text/plain','Retry-After':'60'}});
  const response=withSecurityHeaders(original,true);
  assert.equal(response.status,status);assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.equal(response.headers.get('x-frame-options'),'DENY');assert.equal(response.headers.get('x-powered-by'),null);
  assert.match(response.headers.get('strict-transport-security'),/max-age=/);assert.match(response.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  assert.equal(response.headers.get('cache-control'),'public, max-age=300');assert.equal(response.headers.get('retry-after'),'60');assert.equal(original.bodyUsed,false);assert.equal(await response.text(),'Body');
 }
});

test('worker security policy agrees with Next configuration and omits HSTS in development',async()=>{
 const {withSecurityHeaders}=require('../lib/security-headers.ts');const originalEnv=process.env.NODE_ENV;
 try{
  process.env.NODE_ENV='production';const config=(await import('../next.config.mjs')).default;const expected=(await config.headers())[0].headers;
  const actual=withSecurityHeaders(new Response('Body'),true);
  for(const {key,value} of expected)assert.equal(actual.headers.get(key),value);
  assert.equal(withSecurityHeaders(new Response('Body'),false).headers.get('strict-transport-security'),null);
 }finally{process.env.NODE_ENV=originalEnv;}
});
