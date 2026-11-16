import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.PINK_WARS_BASE_URL||'http://127.0.0.1:4176',out=process.env.AUDIT_OUTPUT||'/tmp/pink-wars-wallpapers';mkdirSync(out,{recursive:true});
const fixture=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#02040b}</style><script type="module">
import {createMissionLoading} from '/mission-loading.js';import {decorateShade,portraitFocusFor} from '/mission-briefing.js';
let loading=null;window.qa={cover(mission,characterId){document.querySelectorAll('.pw-briefing').forEach(n=>n.remove());loading=createMissionLoading({mission,characterId});loading.set(.48,'Chargement du secteur');return portraitFocusFor(mission,characterId);},fail(){loading.fail('Erreur de rendu · réessayez');},shade(characterId){document.querySelectorAll('.pw-briefing').forEach(n=>n.remove());const shade=document.createElement('section');shade.id='shade';shade.innerHTML='<div class="panel"><h1>Chapitre 3</h1><p id="panel-text">Briefing</p><div class="chars"><a href="#">GHJU</a><a href="#">LYLU</a></div><button id="start" disabled>Commencer</button><p id="status">Chargement du secteur 03 de Vesper…</p></div>';document.body.append(shade);decorateShade(shade,{mission:3,characterId});},state(){const root=document.querySelector('.pw-briefing'),s=getComputedStyle(root),r=root.getBoundingClientRect();return {size:s.backgroundSize,position:s.backgroundPosition,image:s.backgroundImage,rect:{x:r.x,y:r.y,w:r.width,h:r.height},portrait:matchMedia('(orientation:portrait)').matches};}};
</script>`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const results=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 await context.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));await context.route('https://fonts.gstatic.com/**',r=>r.abort());
 await context.addInitScript(()=>localStorage.setItem('rosee-settings','{"music":false}'));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/qa-wallpaper*',r=>r.fulfill({contentType:'text/html',body:fixture}));
 await page.goto(base+'/qa-wallpaper');await page.waitForFunction(()=>window.qa);
 for(let mission=1;mission<=20;mission++)for(const hero of ['ghju','lylu']){
  const focus=await page.evaluate(({mission,hero})=>qa.cover(mission,hero),{mission,hero});
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.pw-briefing')).backgroundSize==='cover');
  const state=await page.evaluate(()=>qa.state());assert.deepEqual(state.rect,{x:0,y:0,w:390,h:844});assert.equal(state.position,focus+'% 50%');assert.match(state.image,new RegExp('chapter-'+String(mission).padStart(2,'0')));
  assert.equal(await page.locator('.pwb-back').isVisible(),false);assert.equal(await page.locator('.pw-load-error').isVisible(),false);
  assert.ok(await page.locator('.pwb-gauge').evaluate(n=>n.getBoundingClientRect().width<=1));
  if(mission<=7){await page.evaluate(async()=>{const root=document.querySelector('.pw-briefing'),url=getComputedStyle(root).backgroundImage.match(/url\("?([^"\)]+)/)[1],image=new Image();image.src=url;await image.decode();});await page.screenshot({path:out+'/chapter-'+mission+'-'+hero+'-portrait.png'});}
  results.push({mission,hero,focus,portrait:true,artOnly:true});
 }
 await page.evaluate(()=>qa.fail());assert.equal(await page.locator('.pw-load-error').isVisible(),true);assert.equal(await page.locator('.pwb-back').isVisible(),true);
 await page.evaluate(()=>qa.shade('ghju'));assert.equal(await page.locator('#start').isVisible(),false);assert.equal(await page.locator('.chars').isVisible(),false);assert.equal(await page.locator('#status').isVisible(),false);
 await page.screenshot({path:out+'/chapter-3-actual-shade.png'});
 await page.evaluate(()=>{document.querySelector('#status').textContent='Impossible de lancer le secteur';document.querySelector('#start').disabled=false;});await page.waitForFunction(()=>document.querySelector('#shade').classList.contains('pwb-error'));assert.equal(await page.locator('#start').isVisible(),true);
 await page.evaluate(()=>{document.querySelector('#shade').classList.remove('pwb-error');document.querySelector('#shade').classList.add('lost');});assert.equal(await page.locator('#start').isVisible(),true);
 await page.setViewportSize({width:1280,height:720});await page.evaluate(()=>qa.cover(3,'lylu'));await page.waitForFunction(()=>qa.state().size==='cover'&&qa.state().position==='50% 50%');await page.screenshot({path:out+'/chapter-3-landscape.png'});
 await page.goto(base+'/qa-wallpaper?manual=1');await page.waitForFunction(()=>window.qa);await page.evaluate(()=>qa.shade('ghju'));assert.equal(await page.locator('#start').isVisible(),true,'manual diagnostic entry stays accessible');
 await page.setViewportSize({width:390,height:844});
 await page.route('**/foret.js?*',r=>r.fulfill({contentType:'text/javascript',body:'export function boot(){window.__QA_FOREST_BOOT=true;return new Promise(resolve=>window.__QA_FOREST_FINISH=resolve);}'}));
 await page.goto(base+'/foret.html');await page.waitForFunction(()=>window.__QA_FOREST_BOOT);assert.equal(await page.locator('#go').isVisible(),false);assert.equal(await page.locator('.pwb-back').isVisible(),false);
 await page.evaluate(()=>window.__QA_FOREST_FINISH());await page.waitForFunction(()=>document.body.classList.contains('m07-playing'));assert.equal(await page.locator('#start').count(),0);assert.equal(await page.locator('#pw-mission-loading').isVisible(),false);
 await page.goto(base+'/');
 for(const mode of ['arena','training']){
  await page.evaluate(async mode=>{const {beginScenarioLoading}=await import('/scenario-loading.js');beginScenarioLoading(mode);await document.querySelector('#loading-screen>img').decode();},mode);
  assert.equal(await page.locator('#loading-screen>img').evaluate(n=>getComputedStyle(n).objectFit),'cover');assert.ok(await page.locator('#loading-screen .loading-copy').evaluate(n=>n.getBoundingClientRect().width<=1));await page.screenshot({path:out+'/'+mode+'-portrait.png'});
 }
 assert.deepEqual(errors,[]);writeFileSync(out+'/results.json',JSON.stringify({covers:results,errors,recovery:true,manual:true,landscape:true,forestEntry:true,arena:true,training:true},null,2));console.log(JSON.stringify({covers:results.length,errors,recovery:true,manual:true,landscape:true,forestEntry:true,arena:true,training:true}));await context.close();
}finally{await browser.close();}
