const assert = require('node:assert/strict');
require('../tests/load-source.cjs');
const {getCatalog,getTitle,searchCatalog,getWatchAvailability}=require('../lib/tmdb.ts');
async function main(){
 if(process.env.CINE_E2E==='1')throw new Error('A validação real não aceita o modo de fixtures.');
 const catalog=await getCatalog();assert.ok(catalog.length>0,'Catálogo real vazio');
 assert.equal(new Set(catalog.map(t=>t.slug)).size,catalog.length,'Rotas duplicadas');
 const samples=[];
 for(const type of ['Filme','Série'])for(const recent of [true,false]){
  const sample=catalog.find(t=>t.type===type&&t.recent===recent);
  assert.ok(sample,`Grupo ausente: ${type}, ${recent?'lançamento':'bem avaliado'}`);samples.push(sample);
 }
 for(const title of catalog.filter(t=>!t.recent&&t.discovery!=='trending')){
  assert.ok(title.rating>=(title.discovery==='season'?7.5:title.genres.includes('Terror')?6.0:7.0),'Nota abaixo do critério');
  assert.ok(title.votes>=(title.type==='Filme'?500:200),'Votos abaixo do critério');
 }
 const details=await Promise.all(samples.map(t=>getTitle(t.slug)));
 const summary=details.map((title,index)=>{
  assert.ok(title,'Detalhes ausentes');assert.equal(title.slug,samples[index].slug);
  assert.ok(title.title.trim());assert.ok(title.synopsis.trim());
  assert.ok(title.cast.length>0,`Elenco ausente para ${title.title}`);
  assert.ok(title.poster&&new URL(title.poster).hostname==='image.tmdb.org',`Capa ausente para ${title.title}`);
  if(title.trailer){assert.match(title.trailer,/^[\w-]{11}$/);assert.ok(title.trailerLabel,'Idioma do trailer ausente');}
  return {title:title.title,type:title.type,recent:title.recent,cast:title.cast.length,poster:!!title.poster,trailer:!!title.trailer,language:title.trailerLabel??'Sem trailer'};
 });
 const classicChecks=[];
 for(const [query,slug]of [['Taxi Driver','movie-103'],['Breaking Bad','tv-1396']]){
  const result=await searchCatalog(query);assert.ok(result.titles.some(t=>t.slug===slug),`${query} não encontrado`);
  const title=await getTitle(slug);assert.ok(title?.castProfiles?.some(c=>c.photo),`Fotos ausentes para ${query}`);
  classicChecks.push({query,found:true,castPhotos:title.castProfiles.filter(c=>c.photo).length});
 }
 const secondPage=await getCatalog(2);const added=secondPage.filter(t=>!catalog.some(old=>old.slug===t.slug)).length;
 assert.ok(added>0,'Paginação não trouxe novas obras');
 const trending=catalog.filter(t=>t.discovery==='trending');assert.ok(trending.length>0,'Tendências reais ausentes');
 const seasons=catalog.filter(t=>t.discovery==='season');
 assert.ok(seasons.every(t=>t.type==='Série'&&t.rating>=7.5&&t.votes>=200&&t.seasonLabel),'Temporada sem confirmação');
 const checked=catalog.slice(0,16);
 for(let i=0;i<checked.length;i+=8){const values=await getWatchAvailability(checked.slice(i,i+8).map(t=>t.slug));for(const title of checked.slice(i,i+8))title.availability=values[title.slug];}
 const available=checked.filter(t=>t.availability?.status==='available');
 assert.ok(available.length>0,'Nenhuma disponibilidade real encontrada');
 for(const title of checked){assert.equal(title.availability?.country,'BR');if(title.availability.link)assert.equal(new URL(title.availability.link).hostname,'www.themoviedb.org');}
 console.log(JSON.stringify({availability:'approved',country:'BR',checked:checked.length,available:available.length,unavailable:checked.filter(t=>t.availability?.status==='unavailable').length,samples:available.slice(0,3).map(t=>({title:t.title,options:t.availability.groups.map(g=>({type:g.label,providers:g.providers.map(p=>p.name)}))}))},null,2));
 console.log(JSON.stringify({status:'approved',source:'API real TMDB',catalog:catalog.length,trending:trending.length,newSeasons:seasons.map(t=>({title:t.title,season:t.seasonLabel})),validatedDetails:summary,classicChecks,nextPageNewTitles:added},null,2));
}
main().catch(error=>{console.error(JSON.stringify({status:'failed',message:error instanceof assert.AssertionError?error.message:'Não foi possível concluir a validação real. Confira a conexão e a credencial local.',httpStatus:error.status??null}));process.exitCode=1;});
