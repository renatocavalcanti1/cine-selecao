"use client";
import Link from 'next/link';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="container detail"><h1>Não foi possível carregar a obra</h1><p>O TMDB pode estar indisponível. Tente novamente em alguns instantes.</p><button onClick={reset}>Tentar novamente</button><p><Link href="/">Voltar ao catálogo</Link></p></main>;}
