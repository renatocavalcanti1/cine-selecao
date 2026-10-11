import { test, expect } from '@playwright/test';

test('Temporadas menu reaches the section when no seasons are available',async({page})=>{
 await page.getByRole('banner').getByRole('link',{name:'Temporadas',exact:true}).click();
 await expect(page).toHaveURL(/\/#novas-temporadas$/);
 const section=page.locator('#novas-temporadas');
 await expect(section.getByRole('heading',{name:'Novas temporadas',exact:true})).toBeInViewport();
 await expect(section.getByText('Nenhuma nova temporada confirmada nos títulos carregados.')).toBeVisible();
});
test('streaming icons are centered in details',async({page})=>{
 await page.getByRole('link',{name:'Ruptura',exact:true}).click();
 const group=page.locator('.detail-grid aside .watch-icons');
 await expect(group).toHaveCSS('justify-content','center');
 const container=(await group.boundingBox())!;const icon=(await group.getByRole('img').boundingBox())!;
 expect(icon.x+icon.width/2).toBeCloseTo(container.x+container.width/2,0);
 await expect(page.getByLabel('Data de estreia nos cinemas')).toHaveCount(0);
});
test('brand resets type and genre to Todos from catalog and details',async({page})=>{
 const header=page.getByRole('banner');
 async function selectFilters(){
  await header.getByRole('combobox',{name:'Tipo'}).click();await page.getByRole('option',{name:'Série',exact:true}).click();
  await header.getByRole('combobox',{name:'Gênero'}).click();await page.getByRole('option',{name:'Suspense',exact:true}).click();
 }
 async function reset(){
  await header.locator('.brand').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(header.getByRole('combobox',{name:'Tipo'})).toContainText('Todos');
  await expect(header.getByRole('combobox',{name:'Gênero'})).toContainText('Todos');
  await expect(page.getByRole('article')).toHaveCount(3);
 }
 await selectFilters();await reset();
 await selectFilters();await page.getByRole('link',{name:'Ruptura',exact:true}).click();
 await expect(page).toHaveURL(/\/obra\/ruptura$/);await reset();
});
test('same header persists on details and its search and filters return to catalog',async({page,isMobile})=>{
 const header=page.getByRole('banner');
 const height=(await header.boundingBox())!.height;
 await page.getByRole('link',{name:'Ruptura',exact:true}).click();
 await expect(page).toHaveURL(/\/obra\/ruptura$/);
 await expect(header).toHaveCount(1);
 expect((await header.boundingBox())!.height).toBe(height);
 await expect(header.getByRole('textbox',{name:'Buscar por título'})).toBeVisible();
 await expect(header.getByRole('combobox',{name:'Gênero'})).toBeVisible();
 await header.getByRole('textbox',{name:'Buscar por título'}).fill('Duna');
 await expect(page).toHaveURL(/\/$/);
 await expect(header.getByRole('textbox',{name:'Buscar por título'})).toHaveValue('Duna');
 await expect(page.getByRole('article')).toHaveCount(1);
 await page.getByRole('link',{name:'Duna: Parte Dois',exact:true}).click();
 await expect(page).toHaveURL(/\/obra\/duna-parte-dois$/);
 await header.getByRole('combobox',{name:'Tipo'}).click();await page.getByRole('option',{name:'Série',exact:true}).click();
 await expect(page).toHaveURL(/\/$/);
 await expect(page.getByText('Nenhum título encontrado')).toBeVisible();
 await page.getByRole('button',{name:'Limpar filtros'}).click();
 await header.getByRole('link',{name:'Vale assistir',exact:true}).click();
 await expect(header).toBeInViewport();
});
test('header keeps search and filters visible while scrolling without covering section headings',async({page})=>{
 const header=page.getByRole('banner');
 await expect(header.getByRole('textbox',{name:'Buscar por título'})).toBeVisible();
 await expect(header.getByRole('combobox',{name:'Tipo'})).toBeVisible();
 await expect(header.getByRole('combobox',{name:'Gênero'})).toBeVisible();
 await expect(page.getByText('FILMES / SÉRIES',{exact:true})).toHaveCount(0);
 await header.getByRole('link',{name:'Vale assistir',exact:true}).click();
 await expect.poll(async()=>Math.round((await header.boundingBox())!.y)).toBe(0);
 await expect(header.getByRole('textbox',{name:'Buscar por título'})).toBeInViewport();
 await expect(header.getByRole('combobox',{name:'Gênero'})).toBeInViewport();
 await header.getByRole('combobox',{name:'Tipo'}).click();
 await page.getByRole('option',{name:'Série',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Ruptura',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 await page.screenshot({path:'work/header-'+(page.viewportSize()!.width<600?'mobile':'desktop')+'.png'});
});
test('details omit cinema notice while keeping streaming availability and release metadata',async({page})=>{
 await page.goto('/obra/a-odisseia');
 await expect(page.getByLabel('Data de estreia nos cinemas')).toHaveCount(0);
 await expect(page.getByRole('group',{name:'Onde assistir no Brasil'})).toBeVisible();
 await expect(page.locator('dd').filter({hasText:'17 de julho de 2026'})).toBeVisible();
 await expect(page.getByText('Somente no cinema',{exact:true})).toHaveCount(0);
});
test.beforeEach(async ({page})=>{
 // Third-party availability must not determine catalog regression results.
 await page.route('https://www.youtube-nocookie.com/**',route=>route.fulfill({contentType:'text/html',body:'<html><body>Trailer externo</body></html>'}));
 await page.goto('/');
});
test('search, combined filters and empty-state reset',async ({page})=>{
 await page.getByRole('textbox',{name:'Buscar por título'}).fill(' DÚNA ');
 await expect(page.getByRole('heading',{name:'Duna: Parte Dois'})).toBeVisible();
 await expect(page.getByRole('article')).toHaveCount(1);
 await page.getByRole('combobox',{name:'Tipo'}).click();await page.getByRole('option',{name:'Série',exact:true}).click();
 await expect(page.getByText('Nenhum título encontrado')).toBeVisible();
 await page.getByRole('button',{name:'Limpar filtros'}).click();await expect(page.getByRole('article')).toHaveCount(3);
});
test('detail navigation, cast and return',async ({page,isMobile})=>{
 if(isMobile)await page.getByRole('link',{name:'Ruptura',exact:true}).tap();else await page.getByRole('link',{name:'Ruptura',exact:true}).click();
 await expect(page).toHaveURL(/\/obra\/ruptura$/);await expect(page.getByRole('heading',{name:'Elenco principal'})).toBeVisible();
 await expect(page.getByText('Adam Scott — Mark Scout',{exact:true})).toBeVisible();
 await expect(page.locator('iframe')).toHaveAttribute('src','https://www.youtube-nocookie.com/embed/xEQP4VVuyrY');
 await page.getByRole('link',{name:'Voltar ao catálogo'}).click();await expect(page.getByRole('textbox',{name:'Buscar por título'})).toBeVisible();
});
test('page stays inside the viewport',async ({page})=>{
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);expect(overflow).toBe(false);
});
test('unknown route returns 404',async ({page})=>{
 const response=await page.goto('/obra/does-not-exist');expect(response?.status()).toBe(404);
 await expect(page.getByRole('heading',{name:'Obra não encontrada'})).toBeVisible();
 await expect(page.getByRole('link',{name:'Voltar ao catálogo'})).toHaveAttribute('href','/');
});
test('responses include security headers',async ({request})=>{
 const response=await request.get('/');const headers=response.headers();
 expect(headers['x-content-type-options']).toBe('nosniff');
 expect(headers['x-frame-options']).toBe('DENY');
 expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
 expect(headers['content-security-policy']).toContain('https://www.youtube-nocookie.com');
 expect(headers['x-powered-by']).toBeUndefined();
});
test('catalog endpoint limits excessive requests with retry guidance',async ({request})=>{
 let response=await request.get('/api/catalog');
 for(let i=0;i<65&&response.status()!==429;i++)response=await request.get('/api/catalog');
 expect(response.status()).toBe(429);
 expect(Number(response.headers()['retry-after'])).toBeGreaterThan(0);
 expect(response.headers()['cache-control']).toBe('no-store');
});
test('cards have no action buttons and touch opens preview before navigating',async ({page,isMobile})=>{
 const card=page.getByRole('article').filter({has:page.getByRole('heading',{name:'A Odisseia',exact:true})});
 const link=card.getByRole('link',{name:'A Odisseia',exact:true});const preview=card.getByRole('region',{name:'Sobre A Odisseia'});
 await expect(card.getByRole('button')).toHaveCount(0);await expect(page.getByRole('link',{name:'Ver detalhes'})).toHaveCount(0);
 if(isMobile){
  await link.tap();await expect(page).toHaveURL(/\/$/);await expect(preview).toBeVisible();await expect(card.getByLabel('Data de estreia nos cinemas')).toBeVisible();
  await link.tap();
 }else{
  await card.hover();await expect(card).toHaveCSS('position','fixed');await expect(preview).toBeVisible();
  await page.mouse.move(0,0);await expect(preview).toBeHidden();
  await link.focus();await page.keyboard.press('Enter');await expect(preview).toBeVisible();await expect(page).toHaveURL(/\/$/);
  await page.keyboard.press('Enter');
 }
 await expect(page).toHaveURL(/\/obra\/a-odisseia$/);await expect(page.getByRole('group',{name:'Onde assistir no Brasil'})).toBeVisible();
});
test('curated works are always a list with direct navigation and no expansion',async({page,isMobile})=>{
 const list=page.getByRole('list',{name:'Vale assistir: lista'});
 await expect(list.getByRole('article')).toHaveCount(2);
 await expect(page.getByRole('button',{name:'Avançar em Vale assistir'})).toHaveCount(0);
 const card=list.getByRole('article').filter({has:page.getByRole('heading',{name:'Ruptura',exact:true})});
 if(!isMobile){await card.hover();await expect(card).not.toHaveClass(/expanded-card/);}
 await expect(card.locator('.card-preview')).toHaveCount(0);
 const link=card.getByRole('link',{name:'Ruptura',exact:true});
 if(isMobile)await link.tap();else await link.click();
 await expect(page).toHaveURL(/\/obra\/ruptura$/);
});
test('entering a card from below keeps hover stable across original and expanded bounds',async({page,isMobile})=>{
 test.skip(isMobile,'Mouse hover is desktop only');
 const card=page.getByRole('article').filter({has:page.getByRole('heading',{name:'A Odisseia',exact:true})});
 await card.scrollIntoViewIfNeeded();
 const box=(await card.boundingBox())!;
 const x=box.x+box.width/2;
 await page.mouse.move(x,box.y+box.height+8);
 await page.mouse.move(x,box.y+box.height-2);
 const link=card.getByRole('link',{name:'A Odisseia',exact:true});
 await expect(link).toHaveAttribute('aria-expanded','true');
 for(let step=0;step<8;step++){
  await page.mouse.move(x,box.y+box.height-2-step*5);
  await expect(link).toHaveAttribute('aria-expanded','true');
 }
 await page.mouse.move(0,0);await expect(link).toHaveAttribute('aria-expanded','false');
});

test('expanded card follows its original page position instead of sticking to viewport',async ({page,isMobile})=>{
 test.skip(isMobile,'Floating hover preview is desktop only');
 const card=page.getByRole('article').filter({has:page.getByRole('heading',{name:'A Odisseia',exact:true})});
 const preview=card.getByRole('region',{name:'Sobre A Odisseia'});
 await card.hover();await expect(preview).toBeVisible();
 const top=(await card.boundingBox())!.y;
 await page.evaluate(()=>window.scrollBy({top:40,behavior:'instant'}));
 await expect.poll(async()=>top-(await card.boundingBox())!.y).toBeGreaterThan(35);
 await expect(preview).toBeVisible();
 await expect(card).toHaveCSS('position','fixed');
 await page.getByRole('region',{name:'Lançamentos: deslize para ver mais'}).evaluate(element=>element.dispatchEvent(new Event('scroll')));
 await expect(preview).toBeVisible();
 await page.mouse.move(0,0);await expect(preview).toBeHidden();
});
