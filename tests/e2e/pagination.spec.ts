import {test,expect} from '@playwright/test';
import {titles} from '../../app/titles';
test.skip(process.env.CINE_E2E_REMOTE!=='1','Requires the isolated remote-pagination fixture server');
test.beforeEach(async({page})=>{await page.route('**/api/directors?**',route=>{const ids=new URL(route.request().url()).searchParams.get('ids')!.split(',');return route.fulfill({json:{directors:Object.fromEntries(ids.map(id=>[id,['Diretor da lista']]))}});});});
test('expanded cards load director names only when opened and reuse the result',async({page,isMobile})=>{
 let calls=0;
 await page.route('https://www.youtube-nocookie.com/**',route=>route.fulfill({contentType:'text/html',body:'Trailer'}));
 await page.route('https://image.tmdb.org/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"/>'}));
 await page.route('**/api/availability?**',route=>route.fulfill({json:{availability:{}}}));
 await page.route('**/api/catalog?**',route=>route.fulfill({json:{titles:[{...titles[0],slug:'movie-800004',title:'Obra com diretor',trailer:'',poster:'https://image.tmdb.org/t/p/w500/test.jpg'}],hasMore:false}}));
 await page.route('**/api/directors?**',route=>{calls++;const ids=new URL(route.request().url()).searchParams.get('ids')!.split(',');return route.fulfill({json:{directors:Object.fromEntries(ids.map(id=>[id,['Diretor principal','Codiretora']]))}});});
 await page.goto('/');await page.getByRole('button',{name:'Carregar mais obras'}).click();
 const card=page.getByRole('article').filter({has:page.getByRole('heading',{name:'Obra com diretor',exact:true})});
 expect(calls).toBe(0);
 if(isMobile)await card.getByRole('link').tap();else await card.hover();
 await expect(card.getByText('Diretor principal, Codiretora',{exact:false})).toBeVisible();
 expect(calls).toBe(1);
 await card.getByRole('link').focus();await page.keyboard.press('Escape');
 if(isMobile)await card.getByRole('link').tap();else{await page.mouse.move(0,0);await card.hover();}
 await expect(card.getByText('Diretor principal, Codiretora',{exact:false})).toBeVisible();expect(calls).toBe(1);
});
test('brand restores initial catalog, pagination, search, filters and scroll',async({page})=>{
 const pages:number[]=[];
 await page.route('https://www.youtube-nocookie.com/**',route=>route.fulfill({contentType:'text/html',body:'Trailer'}));
 await page.route('**/api/availability?**',route=>route.fulfill({json:{availability:{}}}));
 await page.route('**/api/catalog?**',route=>{
  const params=new URL(route.request().url()).searchParams;
  const number=Number(params.get('page')??1);pages.push(number);
  return route.fulfill({json:{titles:[{...titles[1],slug:'movie-800010',title:'Obra extra'}],hasMore:false}});
 });
 await page.goto('/');await page.getByRole('button',{name:'Carregar mais obras'}).click();
 await expect(page.getByRole('heading',{name:'Obra extra'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Carregar mais obras'})).toHaveCount(0);
 await page.evaluate(()=>window.scrollTo({top:500,behavior:'instant'}));
 await page.locator('.brand').click();
 await expect(page.getByRole('article')).toHaveCount(3);
 await expect(page.getByRole('heading',{name:'Obra extra'})).toHaveCount(0);
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
 await page.getByRole('button',{name:'Carregar mais obras'}).click();
 expect(pages).toEqual([2,2]);
 await page.getByRole('textbox',{name:'Buscar por título'}).fill('Duna');
 await page.locator('.brand').click();
 await expect(page.getByRole('textbox',{name:'Buscar por título'})).toHaveValue('');
 await expect(page.getByRole('article')).toHaveCount(3);
});
test('cinema, date and streaming logos survive return from details and browser back',async({page,isMobile})=>{
 let availabilityCalls=0;
 await page.route('https://www.youtube-nocookie.com/**',route=>route.fulfill({contentType:'text/html',body:'Trailer'}));
 await page.route('https://image.tmdb.org/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="red"/></svg>'}));
 await page.route('**/api/catalog?**',route=>route.fulfill({json:{titles:[{...titles[1],slug:'movie-800002',title:'Obra com cinema e streaming'}],hasMore:false}}));
 await page.route('**/api/availability?**',route=>{
  availabilityCalls++;
  return route.fulfill({json:{availability:{'movie-800002':{country:'BR',status:'available',groups:[{label:'Assinatura',providers:[{id:8,name:'Netflix',logo:'https://image.tmdb.org/t/p/w92/test.jpg'}]}],cinema:{date:'2026-10-01',upcoming:false}}}}});
 });
 await page.goto('/');await page.getByRole('button',{name:'Carregar mais obras'}).click();
 const row=page.getByRole('article').filter({has:page.getByRole('heading',{name:'Obra com cinema e streaming',exact:true})});
 async function check(){
  await expect(row.getByRole('img',{name:'Netflix · Assinatura',exact:true})).toBeVisible();
  await expect(row.getByLabel('Data de estreia nos cinemas')).toHaveCount(0);
  await expect(row.getByText('01/10/2026',{exact:true})).toHaveCount(0);
 }
 await check();
 await expect(row.getByText('Diretor da lista',{exact:false})).toBeVisible();
 for(const browserBack of [false,true]){
  const link=page.getByRole('link',{name:titles[1].title,exact:true});
  if(isMobile)await link.tap();else await link.click();
  await expect(page).toHaveURL(/\/obra\/duna-parte-dois$/);
  if(browserBack)await page.goBack();else await page.getByRole('link',{name:'Voltar ao catálogo'}).click();
  await expect(page).toHaveURL(/\/$/);
  if(await row.count()===0)await page.getByRole('button',{name:'Carregar mais obras'}).click();
  await check();
 }
 expect(availabilityCalls).toBe(1);
});
test('load more automatically switches only curated works to a list and deduplicates repeated loads',async({page,isMobile})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://www.youtube-nocookie.com/**',route=>route.fulfill({contentType:'text/html',body:'<html>Trailer fixture</html>'}));
 await page.route('https://image.tmdb.org/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="3000"><rect width="2000" height="3000" fill="#24313b"/></svg>'}));
 await page.route('**/api/availability?**',route=>{
  const ids=new URL(route.request().url()).searchParams.get('ids')!.split(',');
  return route.fulfill({json:{availability:Object.fromEntries(ids.map(id=>[id,{country:'BR',status:'available',groups:[{label:'Assinatura',providers:[{id:8,name:'Netflix',logo:'https://image.tmdb.org/t/p/w92/netflix.jpg'}]},{label:'Aluguel',providers:[{id:8,name:'Netflix',logo:'https://image.tmdb.org/t/p/w92/netflix.jpg'}]}]}]))}});
 });
 await page.route('**/api/catalog?**',route=>{
  const pageNumber=Number(new URL(route.request().url()).searchParams.get('page')??1);
  const extra=Array.from({length:10},(_,index)=>({...titles[1],slug:`movie-${pageNumber*100+index}`,title:`Obra ${pageNumber}-${index}`,trailer:'',poster:'https://image.tmdb.org/t/p/w500/test.jpg',recent:false}));
  return route.fulfill({json:{titles:[titles[1],...extra],hasMore:pageNumber<3}});
 });
 await page.goto('/');await expect(page.getByRole('article')).toHaveCount(3);
 const scale=await page.evaluate(()=>window.visualViewport?.scale??1);
 await page.getByRole('button',{name:'Carregar mais obras'}).click();
 const grid=page.getByRole('list',{name:'Vale assistir: lista'});
 await expect(grid).toHaveCSS('display','grid');await expect(page.locator('#vale-assistir .row-controls')).toHaveCount(0);
 await expect(page.getByRole('region',{name:'Lançamentos: deslize para ver mais'})).toHaveCSS('display','flex');
 await expect(page.locator('#lancamentos .row-controls')).toHaveCount(1);
 await expect(page.locator('#lancamentos .expanded-catalog')).toHaveCount(0);
 await expect(page.getByRole('article')).toHaveCount(13);
 expect(await page.evaluate(()=>window.visualViewport?.scale??1)).toBe(scale);
 for(const card of await grid.getByRole('article').all()){
  const box=(await card.boundingBox())!;
  expect(box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(box.height).toBeLessThan(650);
 }
 await expect(page.getByRole('heading',{name:titles[1].title,exact:true})).toHaveCount(1);
 const first=grid.getByRole('article').first();const last=grid.getByRole('article').last();
 expect((await last.boundingBox())!.y).toBeGreaterThan((await first.boundingBox())!.y);
 expect(await grid.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
 if(!isMobile){await first.hover();await expect(first).toHaveCSS('position','relative');await expect(first).toHaveCSS('transform','none');await expect(first).not.toHaveClass(/expanded-card/);await page.mouse.move(0,0);}
 await expect(grid.locator('.card-preview')).toHaveCount(0);
 const icons=grid.getByRole('link',{name:'Obra 2-0',exact:true}).getByRole('group',{name:'Onde assistir no Brasil'});
 await expect(icons.getByRole('img',{name:'Netflix · Assinatura, Aluguel',exact:true})).toBeVisible();
 await expect(icons.getByRole('img')).toHaveCount(1);
 expect(await icons.innerText()).toBe('');
 await expect(icons.locator('img')).toHaveCSS('width','32px');
 await page.getByRole('button',{name:'Carregar mais obras'}).click();
 await expect(page.getByRole('article')).toHaveCount(23);
 await expect(page.getByRole('region',{name:'Lançamentos: deslize para ver mais'})).toHaveCSS('display','flex');
 await expect(page.getByRole('list',{name:'Vale assistir: lista'})).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Carregar mais obras'})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)).toBe(false);
 expect(errors).toEqual([]);
 await expect(page.getByRole('button',{name:'Lista',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Cartões',exact:true})).toHaveCount(0);
 await expect(grid.getByRole('article')).toHaveCount(22);
 const detailLink=grid.getByRole('link',{name:titles[1].title,exact:true});
 if(isMobile)await detailLink.tap();else await detailLink.click();
 await expect(page).toHaveURL(new RegExp('/obra/'+titles[1].slug+'$'));
 await page.screenshot({path:`work/pagination-${isMobile?'mobile':'desktop'}.png`,fullPage:true});
});
