"use client";
import {createContext,useContext,useState,useRef,useEffect,type ReactNode} from 'react';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {Film,Search} from 'lucide-react';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
const initialGenres=['Ação','Animação','Aventura','Comédia','Crime','Documentário','Drama','Família','Fantasia','Ficção científica','Guerra','História','Mistério','Música','Romance','Suspense','Terror','Western'];
type Controls={query:string;setQuery:(value:string)=>void;type:string;setType:(value:string)=>void;genre:string;setGenre:(value:string)=>void;setGenres:(values:string[])=>void;resetVersion:number};
const Context=createContext<Controls|null>(null);
export function useCatalogControls(){const value=useContext(Context);if(!value)throw new Error('CatalogProvider is required');return value;}
export function CatalogProvider({children,pathname='/',navigate=()=>{}}:{children:ReactNode;pathname?:string;navigate?:(href:string)=>void}){
 const [query,setQuery]=useState('');const [type,setType]=useState('Todos');const [genre,setGenre]=useState('Todos');const [genres,setGenres]=useState(initialGenres);
 const [resetVersion,setResetVersion]=useState(0);const resetScroll=useRef(false);
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 useEffect(()=>{if(resetScroll.current&&pathname==='/'){window.scrollTo({top:0,left:0,behavior:'instant'});resetScroll.current=false;}},[pathname,resetVersion]);
 function updateQuery(value:string){setQuery(value);clearTimeout(timer.current);if(pathname!=='/')timer.current=setTimeout(()=>navigate('/'),350);}
 function updateFilter(set:(value:string)=>void,value:string){clearTimeout(timer.current);set(value);if(pathname!=='/')navigate('/');}
 const filters:[string,string,(value:string)=>void,string[]][]=[['Tipo',type,setType,['Todos','Filme','Série']],['Gênero',genre,setGenre,['Todos',...Array.from(new Set([...initialGenres,...genres])).sort()]]];
 return <Context.Provider value={{query,setQuery,type,setType,genre,setGenre,setGenres,resetVersion}}>
  <header className="masthead"><Link href="/" className="brand" onClick={event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;clearTimeout(timer.current);setQuery('');setType('Todos');setGenre('Todos');setGenres(initialGenres);resetScroll.current=true;setResetVersion(version=>version+1);}}><Film/> CINE<span>SELEÇÃO</span></Link><nav aria-label="Seções do catálogo">{[['em-alta','Em alta'],['novas-temporadas','Temporadas'],['lancamentos','Lançamentos'],['vale-assistir','Vale assistir']].map(([id,label])=><Link key={id} href={`/#${id}`}>{label}</Link>)}</nav>
   <form className="filters" role="search" onSubmit={event=>{event.preventDefault();clearTimeout(timer.current);if(pathname!=='/')navigate('/');}}><label className="search"><Search size={20}/><span className="sr-only">Buscar por título</span><input value={query} onChange={event=>updateQuery(event.target.value)} placeholder="Buscar filme ou série"/></label>{filters.map(([label,value,set,options])=><Select key={label} value={value} onValueChange={value=>updateFilter(set,value)}><SelectTrigger className="filter-select" aria-label={label}><span>{label}:</span><SelectValue/></SelectTrigger><SelectContent>{options.map(option=><SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>)}</form>
  </header>{children}
 </Context.Provider>;
}
export default function CatalogShell({children}:{children:ReactNode}){
 const pathname=usePathname();const router=useRouter();
 return <CatalogProvider pathname={pathname??'/'} navigate={href=>router.push(href)}>{children}</CatalogProvider>;
}
