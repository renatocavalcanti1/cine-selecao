// Apply at the worker boundary, including responses served from framework caches.
export function withSecurityHeaders(response:Response,production:boolean){
 const headers=new Headers(response.headers);
 headers.set('X-Content-Type-Options','nosniff');
 headers.set('X-Frame-Options','DENY');
 headers.set('Referrer-Policy','strict-origin-when-cross-origin');
 headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 headers.set('Content-Security-Policy',"object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; frame-src https://www.youtube-nocookie.com; img-src 'self' data: https://image.tmdb.org");
 if(production)headers.set('Strict-Transport-Security','max-age=15552000');
 headers.delete('X-Powered-By');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
