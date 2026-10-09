"use client";
import {Children,useRef,useState,useEffect,type ReactNode} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
export default function CatalogRow({label,children,expanded=false,list=false}:{label:string;children:ReactNode;expanded?:boolean;list?:boolean}){
 if(list)return <ul className="catalog-list" aria-label={`${label}: lista`}>{Children.map(children,child=><li>{child}</li>)}</ul>;
 if(expanded)return <div className="expanded-catalog" role="region" aria-label={`${label}: todas as obras`}>{children}</div>;
 return <HorizontalRow label={label}>{children}</HorizontalRow>;
}
function HorizontalRow({label,children}:{label:string;children:ReactNode}){
 const row=useRef<HTMLDivElement>(null);const [edges,setEdges]=useState({start:true,end:true});
 function update(){const element=row.current;if(element)setEdges({start:element.scrollLeft<=2,end:element.scrollLeft+element.clientWidth>=element.scrollWidth-2});}
 useEffect(()=>{update();const observer=new ResizeObserver(update);if(row.current)observer.observe(row.current);return ()=>observer.disconnect();},[children]);
 function move(direction:number){const element=row.current;if(element)element.scrollBy({left:direction*element.clientWidth*.85,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
 return <div className="catalog-row"><div className="row-controls"><button type="button" aria-label={`Voltar em ${label}`} disabled={edges.start} onClick={()=>move(-1)}><ChevronLeft size={20}/></button><button type="button" aria-label={`Avançar em ${label}`} disabled={edges.end} onClick={()=>move(1)}><ChevronRight size={20}/></button></div><div className="catalog" ref={row} onScroll={update} tabIndex={0} role="region" aria-label={`${label}: deslize para ver mais`} onKeyDown={event=>{if(event.target===event.currentTarget&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();move(event.key==='ArrowRight'?1:-1);}}}>{children}</div></div>;
}
