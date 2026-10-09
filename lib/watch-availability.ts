export type WatchProvider={id:number;name:string;logo?:string};
export type WatchAvailability={country:'BR';status:'available'|'unknown'|'unavailable';groups:{label:string;providers:WatchProvider[]}[];link?:string;cinema?:{date:string;upcoming:boolean}};
export type ProviderResponse={results?:Record<string,{link?:string;flatrate?:unknown[];rent?:unknown[];buy?:unknown[];free?:unknown[];ads?:unknown[]}>};
export type ReleaseResponse={results?:{iso_3166_1:string;release_dates:{type:number;release_date:string}[]}[]};
export function mapWatchAvailability(data:ProviderResponse|undefined,releases:ReleaseResponse|undefined,now=new Date()):WatchAvailability{
 const region=data?.results?.BR;
 const categories=[['flatrate','Assinatura'],['free','Grátis'],['ads','Grátis com anúncios'],['rent','Aluguel'],['buy','Compra']] as const;
 const groups=categories.flatMap(([key,label])=>{
  const providers=(Array.isArray(region?.[key])?region[key]:[]).flatMap(raw=>{
   if(!raw||typeof raw!=='object')return [];const p=raw as Record<string,unknown>;
   if(!Number.isSafeInteger(p.provider_id)||Number(p.provider_id)<1||typeof p.provider_name!=='string'||!p.provider_name.trim())return [];
   return [{id:Number(p.provider_id),name:p.provider_name.trim(),logo:typeof p.logo_path==='string'&&/^\/[\w.-]+$/.test(p.logo_path)?`https://image.tmdb.org/t/p/w92${p.logo_path}`:undefined}];
  });
  return providers.length?[{label,providers:[...new Map(providers.map(p=>[p.id,p])).values()]}]:[];
 });
 let link:string|undefined;
 try{const url=new URL(region?.link??'');if(url.protocol==='https:'&&url.hostname==='www.themoviedb.org'&&!url.username&&!url.password)link=url.href;}catch{}
 const today=now.toISOString().slice(0,10);
 const releaseRegion=(Array.isArray(releases?.results)?releases.results:[]).find(r=>r?.iso_3166_1==='BR');
 const dates=(Array.isArray(releaseRegion?.release_dates)?releaseRegion.release_dates:[]).filter(r=>r&&[2,3].includes(r.type)&&typeof r.release_date==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(r.release_date)&&Number.isFinite(Date.parse(r.release_date))).map(r=>r.release_date.slice(0,10)).sort();
 const past=dates.filter(d=>d<=today);const date=past.at(-1)??dates[0];
 return {country:'BR',status:data?groups.length?'available':'unknown':'unavailable',groups,link,cinema:date?{date,upcoming:date>today}:undefined};
}
