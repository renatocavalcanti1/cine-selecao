"use client";
import { useState, useEffect } from "react";
import useWatchAvailability from './use-watch-availability';
import {useCatalogControls} from './catalog-shell';
import CardPreview from "./card-preview";
import CatalogRow from "./catalog-row";


import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { titles as demoTitles } from "./titles";
import type { CatalogTitle } from "../lib/catalog-types";
type CatalogProps={titles?:CatalogTitle[];error?:string;remote?:boolean};
export default function Catalog(props:CatalogProps){
 const {resetVersion}=useCatalogControls();
 return <CatalogContent key={resetVersion} {...props}/>;
}
function CatalogContent({titles = demoTitles, error, remote=false}:CatalogProps){
 const {query,setQuery,type,setType,genre,setGenre,setGenres}=useCatalogControls();
 const [browse,setBrowse]=useState(titles);const [browsePage,setBrowsePage]=useState(1);const [browseMore,setBrowseMore]=useState(true);
 const [search,setSearch]=useState<{query:string;titles:CatalogTitle[];page:number;hasMore:boolean}|null>(null);
 const selectionKey=[query.trim(),genre,type].join('|');const remoteSelection=!!query.trim()||genre!=='Todos'||type!=='Todos';
 const [busy,setBusy]=useState(false);const [requestError,setRequestError]=useState('');


 useEffect(()=>{
  if(!remote)return;
  const lookup=query.trim();setRequestError('');
  if(!remoteSelection){setSearch(null);setBusy(false);return;}
  const controller=new AbortController();setBusy(true);
  const timer=setTimeout(async()=>{try{
   const response=await fetch(`/api/catalog?q=${encodeURIComponent(lookup)}&genre=${encodeURIComponent(genre)}&type=${encodeURIComponent(type)}`,{signal:controller.signal});
   if(!response.ok)throw new Error();const data=await response.json() as {titles:CatalogTitle[];hasMore:boolean};
   if(!controller.signal.aborted)setSearch({query:selectionKey,titles:data.titles,page:1,hasMore:data.hasMore});
  }catch{if(!controller.signal.aborted)setRequestError('A busca está indisponível. Tente novamente.');}
  finally{if(!controller.signal.aborted)setBusy(false);}},350);
  return ()=>{clearTimeout(timer);controller.abort();};
 },[query,genre,type,remote,remoteSelection,selectionKey]);
 const active=remote&&remoteSelection?(search?.query===selectionKey?search.titles:[]):browse;
 const availabilityIds=active.map(t=>t.slug).filter(slug=>/^(movie|tv)-[1-9]\d{0,9}$/.test(slug)).join(',');
 const availability=useWatchAvailability(availabilityIds,remote);
 const hasMore=remote&&(remoteSelection?(search?.query===selectionKey&&search.hasMore):browseMore);
 async function loadMore(){
  const lookup=query.trim();const next=(remoteSelection?search?.page??1:browsePage)+1;setBusy(true);setRequestError('');
  try{const response=await fetch(`/api/catalog?page=${next}&q=${encodeURIComponent(lookup)}&genre=${encodeURIComponent(genre)}&type=${encodeURIComponent(type)}`);if(!response.ok)throw new Error();const data=await response.json() as {titles:CatalogTitle[];hasMore:boolean};
   const merge=(old:CatalogTitle[])=>[...new Map([...old,...data.titles].map(t=>[t.slug,t])).values()] as CatalogTitle[];

   if(remoteSelection)setSearch(old=>old?.query===selectionKey?{...old,titles:merge(old.titles),page:next,hasMore:data.hasMore}:old);
   else{setBrowse(merge);setBrowsePage(next);setBrowseMore(data.hasMore);}
  }catch{setRequestError('Não foi possível carregar mais obras. Tente novamente.');}finally{setBusy(false);}
 }
 const normal=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const filtered=active.filter(t=>(remote||normal(t.title).includes(normal(query.trim())))&&(type==="Todos"||t.type===type)&&(genre==="Todos"||t.genres.includes(genre)));
 const genreNames=Array.from(new Set([...browse,...active].flatMap(t=>t.genres))).sort().join('|');
 useEffect(()=>{setGenres(genreNames?genreNames.split('|'):[]);},[genreNames,setGenres]);
 return <><main className="container"><h1 className="sr-only">Catálogo de obras</h1>{error && <p className="service-error" role="alert">{error} Tente recarregar a página.</p>}{busy && <p role="status">Consultando obras…</p>}{requestError && <p role="alert">{requestError}</p>}<p className="result-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? "título encontrado" : "títulos encontrados"}</p>
 {filtered.length===0 && !busy?<Empty><EmptyHeader><EmptyTitle>Nenhum título encontrado</EmptyTitle></EmptyHeader><button onClick={()=>{setQuery("");setType("Todos");setGenre("Todos")}}>Limpar filtros</button></Empty>:["trending","season","recent","curated"].map(group=>{const records=remote&&query.trim()?(group==="curated"?filtered:[]):filtered.filter(t=>group==="trending"?t.discovery==="trending":group==="season"?t.discovery==="season":!t.discovery&&(group==="recent"?t.recent:!t.recent));return records.length>0&&<section key={group} id={group==="trending"?"em-alta":group==="season"?"novas-temporadas":group==="recent"?"lancamentos":"vale-assistir"}><div className="section-heading"><h2>{group==="trending"?"Em alta":group==="season"?"Novas temporadas":group==="recent"?"Lançamentos":(remote&&query.trim()?"Resultados da busca":"Vale assistir")}</h2><span>{group==="trending"?"TENDÊNCIAS DA SEMANA NO TMDB":group==="season"?"BEM AVALIADAS · ESTREIA NOS ÚLTIMOS 90 DIAS":group==="recent"?"NO RADAR":(remote&&query.trim()?"BUSCA POR TÍTULO · SEM FILTRO DE NOTA":"BEM AVALIADOS NO TMDB")}</span></div><CatalogRow list={group==="curated"} label={group==="trending"?"Em alta":group==="season"?"Novas temporadas":group==="recent"?"Lançamentos":(remote&&query.trim()?"Resultados da busca":"Vale assistir")}>{records.map((t,i)=><CardPreview list={group==="curated"} key={t.slug} slug={t.slug} directors={t.directors} title={t.title} summary={t.summary} date={t.date} seasonLabel={t.seasonLabel} episodeLabel={t.episodeLabel} availability={t.availability??availability[t.slug]} loading={remote&&!t.availability&&!availability[t.slug]}>{t.poster ? <div className="poster-cover"><img src={t.poster} alt={`Capa de ${t.title}`} loading="lazy" /></div> : t.trailer ? <div className="trailer-cover"><iframe src={`https://www.youtube-nocookie.com/embed/${t.trailer}`} title={`Trailer oficial de ${t.title}`} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/></div> : <div className="poster-missing">Capa não disponível</div>}<div className="card-content"><p className="eyebrow">{t.type} / {t.year}<span>{String(i+1).padStart(2,"0")}</span></p><h3>{t.title}</h3>{t.rating !== undefined && <p className="rating">TMDB {t.votes ? `${t.rating.toFixed(1)}/10 · ${t.votes.toLocaleString("pt-BR")} votos` : "Sem avaliações suficientes"}</p>}<div className="card-bottom"><span>{t.genres[0]}</span></div></div></CardPreview>)}</CatalogRow></section>})}{hasMore && <button className="load-more" disabled={busy} onClick={loadMore}>{busy ? "Carregando…" : "Carregar mais obras"}</button>}</main><footer className="container"><span>CINE / SELEÇÃO</span><p>Projeto de portfólio · Seleção por dados do TMDB · Sem vínculo com estúdios ou plataformas.</p><p>Trailers exibidos pelo YouTube. Lançamentos: estreia original nos últimos 180 dias; Novas temporadas: temporada 2 ou posterior com estreia e episódio confirmados nos últimos 90 dias, nota mínima 7,5 e 200 votos no TMDB. Em alta: tendências semanais do TMDB, sem filtro de nota. Datas podem variar por país.</p><section id="credits" className="credits"><h2>Créditos</h2><a href="https://www.themoviedb.org" target="_blank" rel="noreferrer"><img src="/tmdb-logo.svg" alt="TMDB" width="100" height="40" /></a><p>Dados, imagens e avaliações: TMDB. Disponibilidade de streaming: JustWatch via TMDB, para o Brasil.</p><p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p></section></footer></>;
}
