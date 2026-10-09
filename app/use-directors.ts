"use client";
import {useEffect,useState} from 'react';
const cache=new Map<string,{names:string[];expires:number}>();
const pending=new Map<string,Promise<string[]>>();
const queue=new Map<string,{resolve:(names:string[])=>void;reject:(reason:Error)=>void}>();
let timer:ReturnType<typeof setTimeout>|undefined;
function schedule(){if(timer===undefined)timer=setTimeout(flush,50);}
function flush(){
 timer=undefined;const batch=[...queue.entries()].slice(0,8);for(const [slug] of batch)queue.delete(slug);
 if(queue.size)schedule();
 void(async()=>{
  try{
   const response=await fetch(`/api/directors?ids=${batch.map(([slug])=>slug).join(',')}`,{signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw new Error('Direction unavailable');
   const data=await response.json() as {directors:Record<string,string[]>};
   for(const [slug,subscriber] of batch){
    const names=data.directors?.[slug];if(!Array.isArray(names)){subscriber.reject(new Error('Direction unavailable'));continue;}
    const result=names.filter(name=>typeof name==='string'&&!!name.trim());
    cache.set(slug,{names:result,expires:Date.now()+300000});if(cache.size>300)cache.delete(cache.keys().next().value!);subscriber.resolve(result);
   }
  }catch{for(const [,subscriber] of batch)subscriber.reject(new Error('Direction unavailable'));}
 })();
}
export default function useDirectors(slug:string,enabled:boolean,provided?:string[]){
 const [names,setNames]=useState<string[]|undefined>(provided);
 const [loading,setLoading]=useState(false);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  if(!enabled||provided!==undefined||!/^(movie|tv)-[1-9]\d{0,9}$/.test(slug))return;
  let active=true;const saved=cache.get(slug);
  if(saved&&saved.expires>Date.now()){setNames(saved.names);setLoading(false);setFailed(false);return;}
  setLoading(true);setFailed(false);
  let request=pending.get(slug);
  if(!request){request=new Promise<string[]>((resolve,reject)=>{queue.set(slug,{resolve,reject});schedule();}).finally(()=>pending.delete(slug));pending.set(slug,request);}
  void request.then(result=>{if(active)setNames(result);}).catch(()=>{if(active){setNames([]);setFailed(true);}}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[slug,enabled,provided]);
 return {names:provided??names,loading:provided===undefined&&loading,failed:provided===undefined&&failed};
}
