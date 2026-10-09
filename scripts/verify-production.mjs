import {Miniflare,Log,LogLevel,convertV4MiniflareOptions} from 'miniflare';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
if(process.env.CINE_E2E==='1')throw new Error('Desative CINE_E2E para validar produção.');
if(!process.env.TMDB_API_KEY&&!process.env.TMDB_READ_ACCESS_TOKEN)throw new Error('Configure a credencial local para validar produção.');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const bindings={};
for(const name of ['TMDB_API_KEY','TMDB_READ_ACCESS_TOKEN'])if(process.env[name])bindings[name]=process.env[name];
const serverRoot=path.join(root,'dist/server');
const config=JSON.parse(fs.readFileSync(path.join(serverRoot,'wrangler.json'),'utf8'));
const redact=value=>{
 let text=String(value);
 for(const secret of Object.values(bindings))for(const variant of new Set([secret,secret.trim(),encodeURIComponent(secret),encodeURIComponent(secret.trim())]))if(variant)text=text.split(variant).join('[REDACTED]');
 return text.replace(/([?&]api_key=)[^&\s"<>]+/gi,'$1[REDACTED]').replace(/Bearer\s+[\w.-]+/gi,'Bearer [REDACTED]');
};
const diagnostics=[];
class SafeLog extends Log{log(message){diagnostics.push(redact(message).slice(0,4000));}}
const files=fs.readdirSync(serverRoot,{recursive:true}).filter(file=>file.endsWith('.js')).sort((a,b)=>a==='index.js'?-1:b==='index.js'?1:0);
const modules=[{type:'ESModule',path:path.join(root,'scripts/production-probe-worker.mjs')},...files.map(file=>({type:'ESModule',path:path.join(serverRoot,file)}))];
const mf=new Miniflare(convertV4MiniflareOptions({modules,modulesRoot:root,compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,bindings,assets:{directory:path.join(root,'dist/client'),binding:'ASSETS',routerConfig:{has_user_worker:true},run_worker_first:true},log:new SafeLog(LogLevel.DEBUG),cf:false}));
let stage='runtime';
function assertNoCredential(body){
 for(const secret of Object.values(bindings))for(const value of new Set([secret,secret.trim(),encodeURIComponent(secret.trim())]))if(value)assert.ok(!body.includes(value),'Credencial encontrada em uma resposta.');
}
function assertHeaders(response){
 assert.equal(response.headers.get('x-content-type-options'),'nosniff');
 assert.equal(response.headers.get('x-frame-options'),'DENY');
 assert.ok(response.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"));
 assert.ok(response.headers.get('strict-transport-security')?.includes('max-age='));
 assert.equal(response.headers.get('x-powered-by'),null);
}
try{
 await mf.ready;
 stage='tmdb';
 const probe=await mf.dispatchFetch('http://localhost/__local-production-probe');
 const probeText=await probe.text();
 diagnostics.push(`Probe HTTP ${probe.status}, content-type ${probe.headers.get('content-type')}: ${redact(probeText).slice(0,1600)}`);
 let probeData;
 try{probeData=JSON.parse(probeText);}catch{throw new Error('O probe recebeu uma resposta que não é JSON. Confira diagnostics.');}
 console.log(JSON.stringify({diagnostic:probeData}));
 assert.equal(probe.status,200,'Consulta direta ao TMDB dentro do worker falhou.');
 stage='render';
 const response=await mf.dispatchFetch('http://localhost/obra/tv-95396');
 const html=await response.text();
 if(response.status!==200)diagnostics.push(`Resposta HTTP ${response.status}: ${redact(html).slice(0,1200)}`);
 assert.equal(response.status,200,'A renderização da página real falhou.');assert.ok(html.includes('Onde assistir no Brasil'));assert.ok(html.includes('JustWatch via TMDB'));
 assertHeaders(response);assertNoCredential(html);
 stage='home';
 const home=await mf.dispatchFetch('http://localhost/');const homeHtml=await home.text();
 assert.equal(home.status,200,'A página inicial falhou.');assert.ok(homeHtml.includes('Catálogo de obras'));assertHeaders(home);assertNoCredential(homeHtml);
 stage='api';
 const search=await mf.dispatchFetch('http://localhost/api/catalog?q=bruxa%20de%20blair');const searchText=await search.text();
 assert.equal(search.status,200,'A busca real falhou.');assertNoCredential(searchText);
 const searchData=JSON.parse(searchText);assert.ok(searchData.titles.some(title=>title.title==='A Bruxa de Blair'),'A busca não encontrou A Bruxa de Blair.');
 const availability=await mf.dispatchFetch('http://localhost/api/availability?ids=tv-95396');const availabilityText=await availability.text();
 assert.equal(availability.status,200);assertNoCredential(availabilityText);assert.equal(JSON.parse(availabilityText).availability['tv-95396'].country,'BR');
 const directors=await mf.dispatchFetch('http://localhost/api/directors?ids=movie-550');const directorText=await directors.text();assert.equal(directors.status,200);assertNoCredential(directorText);assertHeaders(directors);assert.ok(JSON.parse(directorText).directors['movie-550'].includes('David Fincher'));
 const invalidPaths=['/api/directors?ids=movie-0','/api/directors?ids='+Array.from({length:9},(_,i)=>'movie-'+(i+1)).join(','),'/api/catalog?page=-1','/api/catalog?type=invalid','/api/catalog?q='+ 'a'.repeat(151),'/api/availability?ids=movie-0','/api/availability?ids=..%2Fsecret','/api/availability?ids='+Array.from({length:9},(_,i)=>`movie-${i+1}`).join(',')];
 for(const path of invalidPaths){const invalid=await mf.dispatchFetch(`http://localhost${path}`);assert.equal(invalid.status,400,`Parâmetro inválido não foi rejeitado: ${path}`);assertNoCredential(await invalid.text());}
 stage='404';const missing=await mf.dispatchFetch('http://localhost/obra/does-not-exist');assert.equal(missing.status,404);await missing.text();
 console.log(JSON.stringify({status:'approved',runtime:'production worker',home:200,details:200,search:200,availability:200,directors:200,invalidRequests:invalidPaths.length,notFound:404,securityHeaders:true,credentialNotInResponse:true}));
}catch(error){console.error(JSON.stringify({status:'failed',stage,message:redact(error instanceof Error?error.message:String(error)),exception:redact(error instanceof Error?error.stack??error.name:String(error)).slice(0,4000),diagnostics:diagnostics.slice(-8)}));process.exitCode=1;}
finally{try{await mf.dispose();}catch{process.exitCode=1;}}
