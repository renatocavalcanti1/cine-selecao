"use client";
import {Children,useEffect,useId,useRef,useState,type ReactNode,type CSSProperties} from 'react';
import WhereToWatch from './where-to-watch';
import WatchIcons from './watch-icons';
import DirectorCredits from './director-credits';
import useDirectors from './use-directors';
import Link from 'next/link';
import type {WatchAvailability} from '../lib/watch-availability';
export default function CardPreview({slug,title,summary,date,seasonLabel,episodeLabel,availability,loading,children,list=false,directors}:{slug:string;title:string;summary:string;date:string;seasonLabel?:string;episodeLabel?:string;availability?:WatchAvailability;loading:boolean;children:ReactNode;list?:boolean;directors?:string[]}){
 const [open,setOpen]=useState(false);const [floating,setFloating]=useState<{style:CSSProperties;height:number}|null>(null);const id=useId();
 const [cover,content]=Children.toArray(children);
 const [visible,setVisible]=useState(false);
 const direction=useDirectors(slug,open||list&&visible,directors);

 const pointer=useRef('mouse');
 const slot=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!list||!slot.current)return;
  const observer=new IntersectionObserver(entries=>setVisible(entries.some(entry=>entry.isIntersecting)),{rootMargin:'200px'});
  observer.observe(slot.current);return()=>observer.disconnect();
 },[list]);
 const offset=useRef({top:0,left:0});
 const floatingOpen=open&&!!floating;
 useEffect(()=>{
  if(!floatingOpen)return;
  const reposition=()=>{
   const anchor=slot.current?.getBoundingClientRect();if(!anchor)return;
   setFloating(current=>current?{...current,style:{...current.style,top:anchor.top+offset.current.top,left:anchor.left+offset.current.left}}:current);
  };
  window.addEventListener('scroll',reposition,true);
  window.addEventListener('resize',reposition);
  return ()=>{window.removeEventListener('scroll',reposition,true);window.removeEventListener('resize',reposition);};
 },[floatingOpen]);
 if(list)return <div ref={slot} className="card-slot"><article className="movie-card"><Link className="card-action" href={`/obra/${slug}`} aria-label={title}><div className="card-media">{cover}</div>{content}<div className="list-directors"><DirectorCredits directors={direction.names} compact loading={direction.loading} failed={direction.failed}/></div><div className="list-availability"><WatchIcons availability={availability?{...availability,cinema:undefined}:undefined} loading={loading}/></div></Link></article></div>;
 function expand(element:HTMLElement){

  if(floatingOpen)return;
  const rect=element.getBoundingClientRect();const width=Math.min(310,window.innerWidth-24);
  const left=Math.max(12,Math.min(rect.left-(width-rect.width)/2,window.innerWidth-width-12));
  const headerBottom=document.querySelector('.masthead')?.getBoundingClientRect().bottom??0;
  const availableHeight=Math.max(120,window.innerHeight-headerBottom-24);
  const top=Math.max(headerBottom+12,Math.min(rect.top,window.innerHeight-Math.min(560,availableHeight)-12));
  const anchor=slot.current?.getBoundingClientRect()??rect;
  offset.current={top:top-anchor.top,left:left-anchor.left};
  setFloating({height:rect.height,style:{position:'fixed',width,left,top,maxHeight:`calc(100dvh - ${headerBottom+24}px)`}});setOpen(true);
 }
 return <div ref={slot} className="card-slot" style={open&&floating?{height:floating.height}:undefined}
  onPointerEnter={event=>{const card=event.currentTarget.querySelector('article');if(card&&event.pointerType==='mouse'&&window.matchMedia('(hover: hover)').matches)expand(card);}}
  onPointerLeave={event=>{if(event.pointerType==='mouse')setOpen(false);}}
 ><article className={`movie-card${open?' expanded-card':''}`} style={open?floating?.style:undefined}
  onPointerDown={event=>{pointer.current=event.pointerType;}}
  onKeyDown={event=>{if(event.key==='Escape'){setOpen(false);event.stopPropagation();}}}>
  <Link className="card-action" href={`/obra/${slug}`} aria-label={title} aria-expanded={open} aria-controls={id} aria-describedby={`${id}-hint`} onClick={event=>{
   if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const touch=pointer.current==='touch'||window.matchMedia('(hover: none)').matches;
   if((touch||event.detail===0)&&!open){event.preventDefault();setFloating(null);setOpen(true);}
  }}>
  <span id={`${id}-hint`} className="sr-only">No celular ou teclado, ative uma vez para expandir e novamente para abrir os detalhes.</span>
  <div className="card-media">{cover}
  </div>{content}
  <div className="card-preview" id={id} role="region" aria-label={`Sobre ${title}`} hidden={!open}>
   <p className="preview-synopsis">{summary}</p><DirectorCredits directors={direction.names} compact loading={direction.loading} failed={direction.failed}/>
   {seasonLabel&&<p className="season-label">{seasonLabel}</p>}
   {episodeLabel&&<p className="episode-label">{episodeLabel}</p>}
   <WhereToWatch availability={availability} loading={loading} compact/>
  </div>
  </Link>
 </article></div>;
}
