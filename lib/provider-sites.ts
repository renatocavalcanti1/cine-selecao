// Fixed destinations: never turn a provider name or API URL into a navigation URL.
export function providerSite(name:string):string|undefined{
 const n=name.toLowerCase();
 if(/amazon|prime video/.test(n))return 'https://www.primevideo.com/';
 if(/apple/.test(n))return 'https://tv.apple.com/br';
 if(/netflix/.test(n))return 'https://www.netflix.com/br/';
 if(/disney/.test(n))return 'https://www.disneyplus.com/';
 if(/hbo|max/.test(n))return 'https://www.hbomax.com/';
 if(/crunchyroll/.test(n))return 'https://www.crunchyroll.com/pt-br';
 if(/globoplay|telecine/.test(n))return 'https://globoplay.globo.com/';
 if(/paramount/.test(n))return 'https://www.paramountplus.com/br/';
 if(/mubi/.test(n))return 'https://mubi.com/pt/br';
 if(/google play/.test(n))return 'https://play.google.com/store/movies';
 if(/youtube/.test(n))return 'https://www.youtube.com/';
 if(/claro/.test(n))return 'https://www.clarotvmais.com.br/';
 if(/pluto/.test(n))return 'https://pluto.tv/';
 if(/looke/.test(n))return 'https://www.looke.com.br/';
 return undefined;
}
