export default {
 distDir:process.env.CINE_E2E === '1' ? '.next-e2e' : '.next',agentRules:false,poweredByHeader:false,
 async headers(){return [{source:'/:path*',headers:[
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'X-Frame-Options',value:'DENY'},
  {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
  {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
  {key:'Content-Security-Policy',value:"object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; frame-src https://www.youtube-nocookie.com; img-src 'self' data: https://image.tmdb.org"},
  ...(process.env.NODE_ENV==='production'?[{key:'Strict-Transport-Security',value:'max-age=15552000'}]:[])
 ]}];}
};
