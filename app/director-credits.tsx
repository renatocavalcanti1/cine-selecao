export default function DirectorCredits({directors,compact=false,loading=false,failed=false}:{directors?:string[];compact?:boolean;loading?:boolean;failed?:boolean}){
 const names=[...new Set(directors??[])];
 return <div className="director-credits">{compact?<p><strong>Direção: </strong>{loading?'Consultando…':failed?'Consulta indisponível.':names.length?`${names.slice(0,3).join(', ')}${names.length>3?` e mais ${names.length-3}`:''}`:'Não informada.'}</p>:<><p>{names.length?names.slice(0,3).join(', '):'Direção não informada.'}</p>{names.length>3&&<details className="additional-roles"><summary>Mais {names.length-3} diretores</summary><ul aria-label="Outros diretores">{names.slice(3).map(name=><li key={name}>{name}</li>)}</ul></details>}</>}</div>;
}
