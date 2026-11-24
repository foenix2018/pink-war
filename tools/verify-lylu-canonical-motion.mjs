import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const base=process.env.PINK_WARS_BASE_URL||'http://127.0.0.1:4173',out='lylu-motion-check';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1000,height:760}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));await page.route('https://fonts.gstatic.com/**',r=>r.abort());
 await page.goto(base+'/planque.html?character=lylu&renderer=webgl&quality=low&debug=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__PINK_HIDEOUT?.snapshot().ready&&__PINK_HIDEOUT.snapshot().civil?.canonical,null,{timeout:180000});
 const snap=()=>page.evaluate(()=>__PINK_HIDEOUT.snapshot());
 const pose=()=>page.evaluate(()=>{const r=__PINK_HIDEOUT.debug.civil.root;let a={};r.traverse(o=>{if(o.isBone)a[o.name]=o.quaternion.toArray();});return a;});
 const idle=await pose();assert.ok((await snap()).civil.visible);
 await page.screenshot({path:out+'/idle.png'});
 await page.keyboard.down('w');await page.waitForFunction(()=>{const c=__PINK_HIDEOUT.snapshot().civil;return c.motion==='walk'&&c.sourceWeight>.12;},null,{timeout:30000});
 const walk=await pose();assert.notDeepEqual(walk.Thigh_L,idle.Thigh_L);assert.notDeepEqual(walk.Shin_L,idle.Shin_L);await page.screenshot({path:out+'/walk.png'});
 await page.keyboard.down('Shift');await page.waitForFunction(()=>__PINK_HIDEOUT.snapshot().civil.motion==='run',null,{timeout:30000});
 const run=await pose();assert.notDeepEqual(run.UpperArm_L,walk.UpperArm_L);await page.screenshot({path:out+'/run.png'});await page.keyboard.up('Shift');await page.keyboard.up('w');
 await page.evaluate(()=>{const d=__PINK_HIDEOUT.debug;const s=d.art.layout.stations.find(x=>x.id==='outfits');d.teleport(s.x,s.z);d.open('outfits');});
 await page.waitForFunction(()=>__PINK_HIDEOUT.snapshot().civil.motion==='action',null,{timeout:30000});const act=await pose();assert.notDeepEqual(act.ForeArm_R,idle.ForeArm_R);await page.screenshot({path:out+'/action.png'});
 for(const frame of [idle,walk,run,act])for(const [name,values] of Object.entries(frame)){assert.ok(values.every(Number.isFinite),name);assert.ok(Math.abs(Math.hypot(...values)-1)<.01,name);}
 assert.deepEqual(errors,[]);console.log('Canonical LYLU motion: idle, walk, sprint, interaction, finite joint quaternions validated');
}finally{await browser.close();}
