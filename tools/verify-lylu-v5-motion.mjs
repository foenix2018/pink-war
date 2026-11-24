import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const out='lylu-v5-check';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1000,height:760}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));await page.route('https://fonts.gstatic.com/**',r=>r.abort());
 await page.goto('http://127.0.0.1:4173/planque.html?character=lylu&renderer=webgl&quality=low&debug=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__PINK_HIDEOUT?.snapshot().ready&&__PINK_HIDEOUT.snapshot().civil?.clips?.length===30,null,{timeout:180000});
 const snap=()=>page.evaluate(()=>__PINK_HIDEOUT.snapshot());
 const pose=()=>page.evaluate(()=>{const r=__PINK_HIDEOUT.debug.civil.root;let a={};r.traverse(o=>{if(o.isBone)a[o.name]=o.quaternion.toArray();});return a;});
 const idle=await pose();await page.screenshot({path:out+'/idle.png'});
 await page.keyboard.down('w');await page.waitForFunction(()=>__PINK_HIDEOUT.snapshot().civil.motion==='walk',null,{timeout:30000});await page.keyboard.up('w');
 const walk=await pose();await page.screenshot({path:out+'/walk.png'});
 // Reset to the actual spawn before sprint, so the test cannot run into furniture.
 await page.evaluate(()=>__PINK_HIDEOUT.debug.teleport(0,4.6));
 await page.keyboard.down('ShiftLeft');await page.keyboard.down('w');await page.waitForFunction(()=>__PINK_HIDEOUT.snapshot().civil.motion==='run',null,{timeout:30000});
 const run=await pose();await page.screenshot({path:out+'/run.png'});await page.keyboard.up('w');await page.keyboard.up('ShiftLeft');
 await page.evaluate(()=>{const d=__PINK_HIDEOUT.debug,s=d.art.layout.stations.find(x=>x.id==='outfits');d.teleport(s.x,s.z);d.open('outfits');});
 await page.waitForFunction(()=>__PINK_HIDEOUT.snapshot().civil.motion==='action',null,{timeout:30000});
 const action=await pose();await page.screenshot({path:out+'/action.png'});
 for(const f of [idle,walk,run,action])for(const q of Object.values(f)){assert.ok(q.every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...q)-1)<.01);}
 assert.notDeepEqual(walk.Thigh_L,idle.Thigh_L);assert.notDeepEqual(run.UpperArm_L,walk.UpperArm_L);
 assert.deepEqual(errors,[]);writeFileSync(out+'/result.json',JSON.stringify({snapshot:await snap(),idle,walk,run,action,errors},null,2));
 console.log('V5 idle/walk/run/interaction validated');
}finally{await browser.close();}
