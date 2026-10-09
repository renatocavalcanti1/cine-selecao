"use client";
import {useEffect,useState} from 'react';
import type {WatchAvailability} from '../lib/watch-availability';
const cache=new Map<string,{value:WatchAvailability;expires:number}>();
const pending=new Map<string,Promise<Record<string,WatchAvailability>>>();
const unavailable=():WatchAvailability=>({country:'BR',status:'unavailable',groups:[]});
function cached(ids:string[]){
 const now=Date.now();
 for(const [id,entry] of cache)if(entry.expires<=now)cache.delete(id);
 return Object.fromEntries(ids.flatMap(id=>cache.has(id)?[[id,cache.get(id)!.value]]:[]));
}
function load(ids:string[]){
 const key=ids.join(',');const existing=pending.get(key);if(existing)return existing;
 // A navigation may hide/unmount the subscriber. Finish this public-data request
 // so the next subscriber can reuse it instead of losing availability on return.
 const request=(async()=>{
  const response=await fetch(`/api/availability?ids=${key}`,{signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('Availability unavailable');
  const data=await response.json() as {availability?:Record<string,WatchAvailability>};
  const result=Object.fromEntries(ids.map(id=>[id,data.availability?.[id]??unavailable()]));
  for(const [id,value] of Object.entries(result))if(value.status!=='unavailable'){
   cache.set(id,{value,expires:Date.now()+300000});
   if(cache.size>300)cache.delete(cache.keys().next().value!);
  }
  return result;
 })().finally(()=>pending.delete(key));
 pending.set(key,request);return request;
}
export default function useWatchAvailability(idsText:string,enabled:boolean){
 const [availability,setAvailability]=useState<Record<string,WatchAvailability>>({});
 useEffect(()=>{
  if(!enabled||!idsText)return;
  const ids=[...new Set(idsText.split(','))];let active=true;
  const restored=cached(ids);
  setAvailability(previous=>({...previous,...restored}));
  const missing=ids.filter(id=>!restored[id]);
  void(async()=>{
   for(let offset=0;offset<missing.length&&active;offset+=8){
    const batch=missing.slice(offset,offset+8);let result:Record<string,WatchAvailability>;
    try{result=await load(batch);}catch{result=Object.fromEntries(batch.map(id=>[id,unavailable()]));}
    if(active)setAvailability(previous=>({...previous,...result}));
   }
  })();
  return()=>{active=false;};
 },[idsText,enabled]);
 return availability;
}
