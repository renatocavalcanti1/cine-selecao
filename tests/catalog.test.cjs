const {test, afterEach} = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', {url:'http://localhost/'});
for (const key of ['window','document','HTMLElement','Element','Node','MutationObserver','getComputedStyle','Event','MouseEvent']) global[key] = dom.window[key];
Object.defineProperty(global,'navigator',{value:dom.window.navigator,configurable:true});
global.self = dom.window;
global.CustomEvent = dom.window.CustomEvent;
for (const key of Object.getOwnPropertyNames(dom.window)) {
 if ((key.startsWith('HTML') || ['DocumentFragment','CustomEvent'].includes(key)) && !(key in global)) global[key] = dom.window[key];
}
global.IS_REACT_ACT_ENVIRONMENT = true;
global.requestAnimationFrame = callback => setTimeout(callback, 0);
global.cancelAnimationFrame = clearTimeout;
// Browser APIs absent in jsdom; no application behaviour is mocked.
global.ResizeObserver = class {observe(){} unobserve(){} disconnect(){}};
global.IntersectionObserver = class {observe(){} unobserve(){} disconnect(){}};
dom.window.HTMLElement.prototype.scrollIntoView = function(){};
dom.window.HTMLElement.prototype.hasPointerCapture = () => false;
dom.window.HTMLElement.prototype.setPointerCapture = function(){};
dom.window.HTMLElement.prototype.releasePointerCapture = function(){};
require('./load-source.cjs');
const React = require('react');
const {render, screen, cleanup, within, fireEvent, waitFor,act} = require('@testing-library/react');
const userEvent = require('@testing-library/user-event').default;
const {renderToStaticMarkup} = require('react-dom/server');
const Catalog = require('../app/catalog.tsx').default;
const {CatalogProvider}=require('../app/catalog-shell.tsx');
const Home=props=>React.createElement(CatalogProvider,null,React.createElement(Catalog,props));
const detail = require('../app/obra/[slug]/page.tsx');
const {titles} = require('../app/titles.ts');
afterEach(cleanup);
const openHome = () => {render(React.createElement(Home));return userEvent.setup();};
const select = async (user, label, value) => {await user.click(screen.getByRole('combobox',{name:label}));await user.click(await screen.findByRole('option',{name:value,exact:true}));};

test('home separates launches from curated works and exposes detail links', () => {
 openHome();
 const launches = document.getElementById('lancamentos');
 const curated = document.getElementById('vale-assistir');
 assert.ok(within(launches).getByRole('heading',{name:'A Odisseia'}));
 assert.ok(within(curated).getByRole('heading',{name:'Duna: Parte Dois'}));
 assert.ok(within(curated).getByRole('heading',{name:'Ruptura'}));
 assert.equal(screen.getAllByRole('article').length,3);
 for(const title of titles) assert.ok(document.querySelector(`a[href="/obra/${title.slug}"]`));
});
test('search ignores case and accents', async () => {
 const user=openHome();await user.type(screen.getByRole('textbox',{name:'Buscar por título'}),'DÚNA');
 assert.ok(screen.getByRole('heading',{name:'Duna: Parte Dois'}));
 assert.equal(screen.queryByRole('heading',{name:'Ruptura'}),null);
 assert.equal(screen.getAllByRole('article').length,1);
});
test('search tolerates leading and trailing spaces', async () => {
 const user=openHome();await user.type(screen.getByRole('textbox',{name:'Buscar por título'}),'  ruptura  ');
 assert.ok(screen.getByRole('heading',{name:'Ruptura'}));
});
test('type and genre filters combine with search', async () => {
 const user=openHome();await select(user,'Tipo','Série');await select(user,'Gênero','Ficção científica');
 assert.equal(screen.getAllByRole('article').length,1);
 assert.ok(screen.getByRole('heading',{name:'Ruptura'}));
 await user.type(screen.getByRole('textbox',{name:'Buscar por título'}),'duna');
 assert.ok(screen.getByText('Nenhum título encontrado'));
});
test('empty result reset clears search and both filters', async () => {
 const user=openHome();await select(user,'Tipo','Série');await select(user,'Gênero','Aventura');
 await user.type(screen.getByRole('textbox',{name:'Buscar por título'}),'inexistente');
 await user.click(screen.getByRole('button',{name:'Limpar filtros'}));
 assert.equal(screen.getByRole('textbox',{name:'Buscar por título'}).value,'');
 assert.equal(screen.getAllByRole('article').length,3);
});
test('one result uses singular wording in the live result count', async () => {
 const user=openHome();await select(user,'Tipo','Série');
 assert.equal(document.querySelector('[aria-live="polite"]').textContent,'1 título encontrado');
});
test('every detail renders its own cast, synopsis, trailer and navigation', async () => {
 for(const title of titles){
  const tree=await detail.default({params:Promise.resolve({slug:title.slug})});
  const html=renderToStaticMarkup(tree);const document=new JSDOM(html).window.document;
  assert.equal(document.querySelector('h1').textContent,title.title);
  assert.deepEqual([...document.querySelectorAll('.cast li')].map(n=>n.textContent),title.cast);
  assert.ok(document.body.textContent.includes(title.synopsis));
  assert.ok(document.body.textContent.includes(title.why));
  const frame=document.querySelector('iframe');assert.equal(frame.src,`https://www.youtube-nocookie.com/embed/${title.trailer}`);
  assert.ok(frame.title.includes(title.title));assert.equal(frame.getAttribute('referrerpolicy'),'strict-origin-when-cross-origin');
  assert.equal(document.querySelector('.back').getAttribute('href'),'/');
  assert.ok(document.querySelector(`a[href="https://www.youtube.com/watch?v=${title.trailer}"]`));
 }
});
test('unknown detail terminates with the framework 404 signal', async () => {
 await assert.rejects(detail.default({params:Promise.resolve({slug:'does-not-exist'})}),error=>error.digest==='NEXT_HTTP_ERROR_FALLBACK;404');
});
test('detail metadata belongs to the requested record', async () => {
 const data=await detail.generateMetadata({params:Promise.resolve({slug:'ruptura'})});
 assert.equal(data.title,'Ruptura | CINE');assert.equal(data.description,titles.find(t=>t.slug==='ruptura').summary);
});
test('catalog records have unique routes, cast and valid official trailer identifiers', () => {
 assert.equal(new Set(titles.map(t=>t.slug)).size,titles.length);
 for(const t of titles){assert.match(t.slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);assert.match(t.trailer,/^[A-Za-z0-9_-]{11}$/);assert.ok(t.cast.length>0);assert.ok(t.cast.every(a=>a.trim().length>0));assert.equal(new URL(t.source).protocol,'https:');}
});
test('remote search finds an eligible title outside the initial selection',async()=>{
 const original=global.fetch;const taxi={...titles[1],slug:'movie-103',title:'Taxi Driver: Motorista de Táxi'};
 global.fetch=async(url)=>{assert.ok(String(url).startsWith('/api/catalog?q='));return Response.json({titles:[taxi],hasMore:false});};
 try{render(React.createElement(Home,{titles:[],remote:true}));const user=userEvent.setup();await user.type(screen.getByRole('textbox',{name:'Buscar por título'}),'Taxi Driver');assert.ok(await screen.findByRole('heading',{name:taxi.title}));assert.equal(screen.getByRole('link',{name:taxi.title}).getAttribute('href'),'/obra/movie-103');}finally{cleanup();global.fetch=original;}
});
test('cast photo fallback appears after an image load failure',()=>{
 const Photo=require('../app/profile-photo.tsx').default;render(React.createElement(Photo,{src:'https://image.tmdb.org/t/p/w185/photo.jpg',name:'Atriz'}));
 fireEvent.error(screen.getByRole('img',{name:'Foto de Atriz'}));assert.ok(screen.getByRole('img',{name:'Foto de Atriz não disponível'}));
});

test('animation characters never label TMDB voice credits as Brazilian dubbing',()=>{
 const CastSection=require('../lib/cast-section.tsx').default;
 const title={...titles[0],genres:['Animação'],cast:['Voice Actor — Character (voice)'],castProfiles:[{name:'Voice Actor',role:'Character (voice)',photo:'https://image.tmdb.org/t/p/w185/actor.jpg'}]};
 render(React.createElement(CastSection,{title}));
 assert.ok(screen.getByRole('heading',{name:'Personagens e vozes'}));
 assert.ok(screen.getByText('Character',{exact:true}));
 assert.ok(screen.getByText('Voz: Voice Actor',{exact:true}));
 assert.ok(screen.getByText(/versão brasileira não está confirmada/));
 assert.ok(screen.getByRole('img',{name:'Foto de Voice Actor'}));
 assert.ok(screen.getByText('Foto do profissional'));
});
test('animation without character names exposes missing information',()=>{
 const CastSection=require('../lib/cast-section.tsx').default;
 render(React.createElement(CastSection,{title:{...titles[0],genres:['Animação'],cast:['Actor'],castProfiles:[{name:'Actor',role:''}]}}));
 assert.ok(screen.getByText('Personagem não informado'));
 assert.ok(screen.getByText('Créditos ainda não verificados para esta obra.'));
});
test('large animation cast shows three roles and preserves others in collapsed disclosure',()=>{
 const CastSection=require('../lib/cast-section.tsx').default;
 const roles=['Homer (voice)','Moe (voice)','Abraham (voice)',...Array.from({length:300},(_,i)=>`Outro ${i} (voice)`)];
 const {container}=render(React.createElement(CastSection,{title:{...titles[0],genres:['Animação'],cast:['Dan'],castProfiles:[{name:'Dan',role:roles.join(' / '),roles}]}}));
 assert.ok(screen.getByText('Homer / Moe / Abraham',{exact:true}));assert.ok(screen.getByText('Voz: Dan'));
 assert.ok(screen.getByText('Mais 300 personagens'));assert.equal(container.querySelector('details').open,false);
 assert.equal(container.querySelectorAll('.additional-roles li').length,300);
 assert.ok(screen.getByText('Outro 299'));assert.ok(!container.querySelector('strong').textContent.includes('Outro'));
});
test('director names remain concise in previews and all are available in details',()=>{
 const DirectorCredits=require('../app/director-credits.tsx').default;
 const directors=['Primeiro','Segundo','Terceiro','Quarto','Primeiro'];
 const preview=render(React.createElement(DirectorCredits,{directors,compact:true}));
 assert.ok(screen.getByText('Primeiro, Segundo, Terceiro e mais 1'));assert.equal(screen.queryByText('Quarto'),null);preview.unmount();
 const full=render(React.createElement(DirectorCredits,{directors}));assert.ok(screen.getByText('Mais 1 diretores'));assert.ok(screen.getByText('Quarto'));assert.equal(full.container.querySelector('details').open,false);
});
test('reopening a preview after its director request finishes clears the loading state',async()=>{
 const useDirectors=require('../app/use-directors.ts').default;
 const original=global.fetch;let finish;let calls=0;
 global.fetch=()=>{calls++;return new Promise(resolve=>{finish=resolve;});};
 function Probe({enabled}){const value=useDirectors('movie-800044',enabled);return React.createElement('p',null,value.loading?'Loading':value.names?.join(',')??'Idle');}
 try{
  const view=render(React.createElement(Probe,{enabled:true}));await waitFor(()=>assert.equal(calls,1));
  view.rerender(React.createElement(Probe,{enabled:false}));
  await act(async()=>{finish(Response.json({directors:{'movie-800044':['Restored Director']}}));});
  view.rerender(React.createElement(Probe,{enabled:true}));
  assert.ok(await screen.findByText('Restored Director'));assert.equal(screen.queryByText('Loading'),null);assert.equal(calls,1);
 }finally{cleanup();global.fetch=original;}
});

test('catalog displays trending and confirmed new seasons separately from original premieres',()=>{
 render(React.createElement(Home,{titles:[{...titles[0],discovery:'trending'},{...titles[1],discovery:'season',seasonLabel:'Temporada 2 · estreia em 01/10/2026'}]}));
 assert.ok(screen.getByRole('heading',{name:'Em alta',exact:true}));
 assert.ok(screen.getByRole('heading',{name:'Novas temporadas',exact:true}));
 assert.ok(screen.getByText('Temporada 2 · estreia em 01/10/2026'));
 assert.equal(screen.queryByRole('heading',{name:'Lançamentos',exact:true}),null);
});

test('watch availability exposes providers accessibly without visible text',()=>{
 const WhereToWatch=require('../app/where-to-watch.tsx').default;
 const {container}=render(React.createElement(WhereToWatch,{availability:{country:'BR',status:'available',groups:[{label:'Assinatura',providers:[{id:1,name:'Platform',logo:'https://image.tmdb.org/t/p/w92/logo.jpg'}]}]}}));
 assert.ok(screen.getByRole('img',{name:'Platform · Assinatura'}));assert.equal(container.querySelector('.watch-icons').textContent,'');
});
test('unknown streaming never claims cinema exclusivity',()=>{
 const WhereToWatch=require('../app/where-to-watch.tsx').default;
 const {container}=render(React.createElement(WhereToWatch,{availability:{country:'BR',status:'unknown',groups:[],cinema:{date:'2026-10-01',upcoming:false}}}));
 assert.ok(screen.getByRole('img',{name:'Streaming não informado no Brasil'}));assert.equal(screen.queryByLabelText('Data de estreia nos cinemas'),null);assert.equal(screen.queryByText('01/10/2026'),null);assert.equal(screen.queryByText('Somente no cinema'),null);
});
test('remote catalog loads streaming options separately without blocking title rendering',async()=>{
 const original=global.fetch;const title={...titles[1],slug:'tv-95396',availability:undefined};
 global.fetch=async url=>{assert.equal(String(url),'/api/availability?ids=tv-95396');return Response.json({availability:{'tv-95396':{country:'BR',status:'available',groups:[{label:'Assinatura',providers:[{id:350,name:'Apple TV+'}]}]}}});};
 try{render(React.createElement(Home,{titles:[title],remote:true}));assert.ok(screen.getByRole('heading',{name:title.title}));assert.ok(await screen.findByRole('img',{name:'Apple TV+ · Assinatura: logotipo indisponível',hidden:true}));}finally{cleanup();global.fetch=original;}
});

test('remote availability splits many cards into batches and tolerates provider outages',async()=>{
 const original=global.fetch;const cards=Array.from({length:18},(_,i)=>({...titles[1],slug:`movie-${i+1}`,title:`Obra ${i+1}`,availability:undefined}));const batches=[];
 global.fetch=async url=>{const ids=new URL(String(url),'http://localhost').searchParams.get('ids').split(',');batches.push(ids);return new Response('',{status:503});};
 try{render(React.createElement(Home,{titles:cards,remote:true}));await waitFor(()=>assert.equal(screen.getAllByRole('img',{name:'Consulta indisponível',hidden:true}).length,18));assert.deepEqual(batches.map(b=>b.length),[8,8,2]);assert.equal(screen.getAllByRole('article').length,18);}finally{cleanup();global.fetch=original;}
});

test('availability finishing after navigation is restored on return without another request',async()=>{
 const original=global.fetch;let complete;let calls=0;
 const title={...titles[1],slug:'movie-800001',availability:undefined};
 const value={country:'BR',status:'available',groups:[{label:'Assinatura',providers:[{id:8,name:'Netflix',logo:'https://image.tmdb.org/t/p/w92/logo.jpg'}]}],cinema:{date:'2026-10-01',upcoming:false}};
 global.fetch=()=>{calls++;return new Promise(resolve=>{complete=resolve;});};
 try{
  const first=render(React.createElement(Home,{titles:[title],remote:true}));
  await waitFor(()=>assert.equal(calls,1));first.unmount();
  complete(Response.json({availability:{'movie-800001':value}}));
  render(React.createElement(Home,{titles:[title],remote:true}));
  assert.ok(await screen.findByRole('img',{name:'Netflix · Assinatura'}));
  assert.equal(screen.queryByText('01/10/2026'),null);assert.equal(calls,1);
 }finally{cleanup();global.fetch=original;}
});

test('temporary availability failure is retried after returning instead of remaining cached',async()=>{
 const original=global.fetch;let calls=0;
 const title={...titles[1],slug:'movie-800003',availability:undefined};
 global.fetch=async()=>++calls===1?new Response('',{status:503}):Response.json({availability:{'movie-800003':{country:'BR',status:'available',groups:[{label:'Assinatura',providers:[{id:8,name:'Netflix',logo:'https://image.tmdb.org/t/p/w92/logo.jpg'}]}]}}});
 try{
  const first=render(React.createElement(Home,{titles:[title],remote:true}));
  await screen.findByRole('img',{name:'Consulta indisponível'});first.unmount();
  render(React.createElement(Home,{titles:[title],remote:true}));
  assert.ok(await screen.findByRole('img',{name:'Netflix · Assinatura'}));assert.equal(calls,2);
 }finally{cleanup();global.fetch=original;}
});

test('remote genre filter discovers works beyond initial cards and preserves genre during pagination',async()=>{
 const original=global.fetch;const initial={...titles[0],genres:['Terror'],title:'Inicial'};const discovered={...titles[0],title:'Terror descoberto',genres:['Terror']};const second={...discovered,slug:'segundo',title:'Outra descoberta'};const urls=[];
 global.fetch=async url=>{urls.push(String(url));const params=new URL(String(url),'http://localhost').searchParams;assert.equal(params.get('genre'),'Terror');return Response.json({titles:[params.get('page')==='2'?second:discovered],hasMore:params.get('page')!=='2'});};
 try{render(React.createElement(Home,{titles:[initial],remote:true}));const user=userEvent.setup();await select(user,'Gênero','Terror');assert.ok(await screen.findByRole('heading',{name:discovered.title}));await user.click(screen.getByRole('button',{name:'Carregar mais obras'}));assert.ok(await screen.findByRole('heading',{name:second.title}));assert.ok(urls.some(url=>url.includes('page=2')));const grid=screen.getByRole('region',{name:'Lançamentos: deslize para ver mais'});assert.ok(within(grid).getByRole('heading',{name:discovered.title}));assert.ok(within(grid).getByRole('heading',{name:second.title}));assert.equal(screen.queryByRole('region',{name:'Lançamentos: todas as obras'}),null);assert.ok(screen.getByRole('button',{name:'Avançar em Lançamentos'}));}finally{cleanup();global.fetch=original;}
});

test('detail streaming icons link to fixed official sites in a safe new tab',()=>{
 const WhereToWatch=require('../app/where-to-watch.tsx').default;
 const availability={country:'BR',status:'available',groups:[{label:'Assinatura',providers:[{id:8,name:'Netflix',logo:'https://image.tmdb.org/t/p/w92/logo.png'},{id:99999,name:'Unknown provider'}]}]};
 render(React.createElement(WhereToWatch,{availability}));
 const link=screen.getByRole('link',{name:'Abrir Netflix em nova guia'});
 assert.equal(link.getAttribute('href'),'https://www.netflix.com/br/');
 assert.equal(link.getAttribute('target'),'_blank');
 assert.equal(link.getAttribute('rel'),'noopener noreferrer');
 assert.equal(screen.getAllByRole('link').length,1);
 cleanup();
 render(React.createElement(WhereToWatch,{availability,compact:true}));
 assert.equal(screen.queryByRole('link'),null);
});
