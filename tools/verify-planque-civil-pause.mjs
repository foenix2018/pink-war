import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const base=process.env.PINK_WARS_BASE_URL||'http://127.0.0.1:4173';
const out='planque-civil-pause-check';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1000,height:760}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
 await page.route('https://fonts.gstatic.com/**',r=>r.abort());
 const url=base+'/planque.html?character=lylu&renderer=webgl&quality=low&debug=1';
 const snap=()=>page.evaluate(()=>__PINK_HIDEOUT.snapshot());
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__PINK_HIDEOUT?.snapshot().ready&&__PINK_HIDEOUT.snapshot().civil?.visible,null,{timeout:180000});
 await page.waitForFunction(()=>__PINK_HIDEOUT.snapshot().nanoChambers.lylu.phase==='ready',null,{timeout:120000});
 const initial=await snap();assert.equal(initial.civilMode,true);assert.equal(initial.view,'third');assert.ok(initial.nanoChambers.lylu.visible);
 await page.screenshot({path:out+'/01-civil-third.png'});
 await page.locator('#pause-button').click();await page.waitForFunction(()=>__PINK_HIDEOUT.snapshot().paused);
 const t=(await snap()).simulationTime;
 await page.locator('#pause-view').click();await page.waitForFunction(()=>__PINK_HIDEOUT.snapshot().view==='visit');
 assert.equal((await snap()).civil.visible,false);
 await page.waitForTimeout(350);assert.equal((await snap()).simulationTime,t);
 await page.screenshot({path:out+'/02-pause.png'});
 await page.locator('#resume-button').click();await page.waitForFunction(()=>!__PINK_HIDEOUT.snapshot().paused);
 await page.keyboard.press('v');await page.waitForFunction(()=>__PINK_HIDEOUT.snapshot().view==='third'&&__PINK_HIDEOUT.snapshot().civil.visible);
 const start=(await snap()).position;await page.keyboard.down('w');await page.waitForFunction(z=>__PINK_HIDEOUT.snapshot().position.z<z-.1,start.z,{timeout:30000});await page.keyboard.up('w');
 // Teleport solely for test setup; the production button uses the original navigation.
 await page.evaluate(()=>{const d=__PINK_HIDEOUT.debug,s=d.art.layout.stations.find(x=>x.id==='outfits');d.teleport(s.x,s.z);d.open('outfits');});
 await page.waitForFunction(()=>__PINK_HIDEOUT.snapshot().station==='outfits',null,{timeout:30000});
 const recover=page.locator('[data-nano-chamber-recover]');
 await recover.click();await page.waitForFunction(()=>!__PINK_HIDEOUT.snapshot().civilMode&&__PINK_HIDEOUT.snapshot().nanoChambers.lylu.phase==='equipped',null,{timeout:30000});
 const equipped=await snap();assert.equal(equipped.civil.visible,false);assert.equal(equipped.nanoChambers.lylu.visible,false);
 await page.screenshot({path:out+'/03-equipped.png'});
 await recover.click();await page.waitForFunction(()=>__PINK_HIDEOUT.snapshot().civilMode&&__PINK_HIDEOUT.snapshot().nanoChambers.lylu.phase==='ready',null,{timeout:60000});
 const returned=await snap();assert.ok(returned.civil.visible);assert.ok(returned.nanoChambers.lylu.visible);assert.equal(returned.nano,equipped.nano);assert.equal(returned.armorLevel,equipped.armorLevel);
 await page.screenshot({path:out+'/04-stored.png'});
 await page.locator('#close').click();
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>__PINK_HIDEOUT.snapshot().ready&&__PINK_HIDEOUT.snapshot().civil?.visible,null,{timeout:180000});
 assert.ok((await snap()).civilMode);assert.deepEqual(errors,[]);
 writeFileSync(out+'/result.json',JSON.stringify({initial,equipped,returned,errors},null,2));console.log('Planque civil/armor/pause/browser checks passed');
 // A failed network request must never substitute armor.
 const fail=await browser.newPage({viewport:{width:900,height:700}});
 await fail.route('**/lylu-civil-v4.glb*',r=>r.abort());await fail.goto(url,{waitUntil:'domcontentloaded'});
 await fail.waitForFunction(()=>!document.getElementById('retry').hidden,null,{timeout:180000});
 const failure=await fail.evaluate(()=>__PINK_HIDEOUT.snapshot());assert.equal(failure.ready,false);assert.equal(failure.civilMode,true);assert.equal(failure.heroReady,false);await fail.close();
}finally{await browser.close();}
