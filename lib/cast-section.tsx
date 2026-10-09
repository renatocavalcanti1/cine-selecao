import Link from 'next/link';
import ProfilePhoto from '../app/profile-photo';
import type { CatalogTitle } from './catalog-types';

export default function CastSection({title}: {title: CatalogTitle}) {
 const animation = title.genres.includes('Animação');
 const profiles = title.castProfiles;
 return <section>
  <h2>{animation ? 'Personagens e vozes' : 'Elenco principal'}</h2>
  {animation && <p className="cast-explanation">Créditos de voz cadastrados no TMDB. A versão brasileira não está confirmada.</p>}
  {title.cast.length === 0 && <p>Elenco não disponível.</p>}
  <ul className="cast">{title.cast.map((actor,index)=>{
   const profile=profiles?.[index];
   const roles=[...new Set((profile?.roles??profile?.role.split(' / ')??[]).flatMap(role=>role.split(/\s+\/\s+/)).map(role=>animation?role.replace(/\s*\(voice\)/gi,'').trim():role.trim()).filter(Boolean))];
   const mainRoles=roles.slice(0,3).join(' / ');
   return <li key={`${actor}-${index}`}>
    {profile && <ProfilePhoto src={profile.photo} name={profile.name}/>}
    <div className="cast-credit">{animation && profile ? <div className="voice-credit"><strong>{mainRoles || 'Personagem não informado'}</strong><span>Voz: {profile.name}</span><small>Foto do profissional</small></div> : <span>{profile?`${profile.name}${mainRoles?` — ${mainRoles}`:''}`:actor}</span>}
    {roles.length>3&&<details className="additional-roles"><summary>Mais {roles.length-3} personagens</summary><ul aria-label={`Outros personagens de ${profile?.name??actor}`}>{roles.slice(3).map(role=><li key={role}>{role}</li>)}</ul></details>}</div>
   </li>;
  })}</ul>
  {animation && <div className="dubbing-note"><h3>Dublagem brasileira</h3><p>Créditos ainda não verificados para esta obra.</p></div>}
  <p className="photo-credit">Fotos e dados do elenco: TMDB. <Link href="/#credits">Créditos e fonte das imagens</Link>.</p>
 </section>;
}
