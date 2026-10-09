import Catalog from './catalog';
import {getCatalog} from '../lib/tmdb';
export default async function Home(){
 try{return <Catalog titles={await getCatalog()} remote={process.env.CINE_E2E !== "1"||process.env.CINE_E2E_REMOTE === "1"}/>;}catch{return <Catalog titles={[]} error="O catálogo do TMDB está indisponível. Verifique a conexão e a configuração da credencial no servidor."/>;}
}
