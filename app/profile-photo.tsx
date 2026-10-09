"use client";
import {useState} from 'react';
export default function ProfilePhoto({src,name}:{src?:string;name:string}){
 const [failed,setFailed]=useState(false);
 return src&&!failed?<img className="cast-photo" src={src} alt={`Foto de ${name}`} loading="lazy" onError={()=>setFailed(true)}/>:<span className="cast-photo missing-photo" role="img" aria-label={`Foto de ${name} não disponível`}>Sem foto</span>;
}
