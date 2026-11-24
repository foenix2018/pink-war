import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const dir='planque-fitness-check';mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{const page=await browser.newPage({viewport:{width:1100,height:825}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));await page.route('https://fonts.gstatic.com/**',r=>r.abort());
await page.goto('http://127.0.0.1:4173/planque.html?character=lylu&renderer=webgl&quality=low&debug=1');await page.waitForFunction(()=>window.__PINK_HIDEOUT?.snapshot().ready,null,{timeout:180000});
const clips=await page.evaluate(()=>__PINK_HIDEOUT.snapshot().civil.clips);for(const n of ['civil_walkLeft','civil_walkRight','civil_runLeft','civil_runRight','fitnessSquat','fitnessCurl','fitnessRow'])assert.ok(clips.includes(n),n);
for(const [name,x,z] of [['civil_walkLeft',6.35,7.65],['civil_walkRight',6.35,7.65],['fitnessSquat',6.85,5.4],['fitnessCurl',8.75,7.65],['fitnessRow',7.1,9.1]]){await page.evaluate(({name,x,z})=>{const d=__PINK_HIDEOUT.debug;d.teleport(x,z);d.look(-Math.PI/2);d.civil.samplePreview(name,.5);},{name,x,z});await page.waitForTimeout(100);await page.evaluate(()=>__PINK_HIDEOUT.debug.captureFrame());assert.equal(await page.evaluate(()=>__PINK_HIDEOUT.snapshot().civil.clip),name);await page.screenshot({path:dir+'/'+name+'.png',timeout:120000});}
assert.deepEqual(errors,[]);}finally{await browser.close();}
