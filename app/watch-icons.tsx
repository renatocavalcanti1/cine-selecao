"use client";
import {useState} from 'react';
import {CircleHelp,LoaderCircle,Film} from 'lucide-react';
import type {WatchAvailability,WatchProvider} from '../lib/watch-availability';
import {providerSite} from '../lib/provider-sites';
function ProviderIcon({provider,label}:{provider:WatchProvider;label:string}){
 const [failed,setFailed]=useState(false);
 const name=`${provider.name} · ${label}`;
 return provider.logo&&!failed?<img src={provider.logo} alt={name} width="32" height="32" loading="lazy" onError={()=>setFailed(true)}/>:<span role="img" aria-label={`${name}: logotipo indisponível`}><CircleHelp aria-hidden="true" size={22}/></span>;
}
export default function WatchIcons({availability,loading,linked=false}:{availability?:WatchAvailability;loading:boolean;linked?:boolean}){
 const providers=new Map<number,{provider:WatchProvider;labels:string[]}>();
 for(const group of availability?.groups??[])for(const provider of group.providers){
  const existing=providers.get(provider.id);
  if(existing)existing.labels.push(group.label);else providers.set(provider.id,{provider,labels:[group.label]});
 }
 return <div className="watch-icons" role="group" aria-label="Onde assistir no Brasil">
  {availability?.cinema&&<div className="cinema-badge" aria-label="Data de estreia nos cinemas"><Film aria-hidden="true" size={18}/><time dateTime={availability.cinema.date}>{new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC'}).format(new Date(`${availability.cinema.date}T12:00:00Z`))}</time></div>}
  {[...providers.values()].map(({provider,labels})=>{
   const href=linked?providerSite(provider.name):undefined;
   const icon=<ProviderIcon provider={provider} label={labels.join(', ')}/>;
   return href?<a className="provider-link" key={provider.id} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${provider.name} em nova guia`}>{icon}</a>:<ProviderIcon key={provider.id} provider={provider} label={labels.join(', ')}/>;
  })}
  {!providers.size&&<span role="img" aria-label={loading?'Consultando disponibilidade':availability?.status==='unavailable'?'Consulta indisponível':'Streaming não informado no Brasil'}>{loading?<LoaderCircle aria-hidden="true" size={22}/>:<CircleHelp aria-hidden="true" size={22}/>}</span>}
 </div>;
}
