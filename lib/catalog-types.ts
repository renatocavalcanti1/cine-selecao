export type CatalogTitle = {
 slug:string; title:string; year:number; type:string; recent:boolean; genres:string[];
 trailer:string; summary:string; synopsis:string; why:string; cast:string[];
 source:string; date:string; channel:string; poster?:string; rating?:number; votes?:number;
 trailerLabel?:string;
 directors?:string[];
 discovery?:'trending'|'season';
 seasonLabel?:string;
 episodeLabel?:string;
 availability?:import('./watch-availability').WatchAvailability;
 castProfiles?:{name:string;role:string;roles?:string[];photo?:string}[];
};
export type TmdbVideo = {key:string;site:string;type:string;official:boolean;name:string;iso_639_1?:string;iso_3166_1?:string;published_at?:string};

// Metadata cannot establish spoken audio/subtitles; labels disclose that limit.
export function selectTrailer(videos:TmdbVideo[]){
 const eligible=videos.filter(v=>v.site==='YouTube'&&v.type==='Trailer'&&v.official&&/^[\w-]{11}$/.test(v.key));
 const rank=(v:TmdbVideo)=>{
  const brazil=v.iso_639_1==='pt'&&v.iso_3166_1==='BR';
  if(brazil&&/dublad[oa]/i.test(v.name))return 0;
  if(brazil&&/legendad[oa]/i.test(v.name))return 1;
  if(brazil)return 2;
  if(v.iso_639_1==='pt')return 3;
  return 4;
 };
 const video=[...eligible].sort((a,b)=>rank(a)-rank(b)||(b.published_at??'').localeCompare(a.published_at??''))[0];
 if(!video)return undefined;
 const brazil=video.iso_639_1==='pt'&&video.iso_3166_1==='BR';
 const label=brazil?(/dublad[oa]/i.test(video.name)?'PT-BR · Dublado (segundo o título do vídeo)':/legendad[oa]/i.test(video.name)?'PT-BR · Legendado (segundo o título do vídeo)':'PT-BR · Áudio e legendas não confirmados'):(video.iso_639_1==='pt'?'Português · Variante não confirmada':`Outro idioma (${video.iso_639_1??'não informado'}) · Sem trailer oficial PT-BR disponível`);
 return {video,label};
}
