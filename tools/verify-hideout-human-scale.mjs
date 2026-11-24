import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdirSync,writeFileSync} from 'node:fs';
const out='human-scale-check';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));await page.route('https://fonts.gstatic.com/**',r=>r.abort());
await page.goto('http://127.0.0.1:4173/planque.html?character=lylu&renderer=webgl&quality=low&debug=1',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__PINK_HIDEOUT?.snapshot().ready&&__PINK_HIDEOUT.snapshot().heroReady,null,{timeout:180000});
const shots=[
 {id:'atelier',camera:[7.35,1.85,3.4],target:[7.35,1.15,-1.2],hero:[6.6,.15],yaw:0},
 {id:'dortoir',camera:[-7.7,1.95,-5.65],target:[-7.7,.85,-8.5],hero:[-7.65,-6.7],yaw:0},
 {id:'salon',camera:[0,1.9,3.0],target:[0,.85,.8],hero:[.1,2.25],yaw:0},
 {id:'sanitaires',camera:[8.1,1.9,-6.25],target:[8.65,.95,-10.25],hero:[8.4,-8.3],yaw:0},
 {id:'archives',camera:[0,1.9,-5.6],target:[0,1,-8],hero:[-1.3,-6.25],yaw:0},
 {id:'recharge',camera:[0,2.15,10.9],target:[0,1.35,7.1],hero:[.2,9.1],yaw:0}
];
await page.evaluate(()=>{const d=__PINK_HIDEOUT.debug;d.renderer.setAnimationLoop(null);d.art.setInterior(true);document.querySelectorAll('body > :not(canvas)').forEach(e=>{if(!e.contains(d.renderer.domElement))e.style.visibility='hidden';});});
const results=[];
for(const shot of shots){
 const snap=await page.evaluate(async shot=>{const d=__PINK_HIDEOUT.debug,c=d.camera,hero=d.civil;hero.root.visible=true;hero.root.position.set(shot.hero[0],0,shot.hero[1]);hero.root.rotation.y=shot.yaw;c.position.set(...shot.camera);c.lookAt(...shot.target);c.fov=72;c.updateProjectionMatrix();await d.art.renderExterior(d.renderer,c,1);if(d.renderer.renderAsync)await d.renderer.renderAsync(d.scene,c);else d.renderer.render(d.scene,c);return {id:shot.id,position:c.position.toArray(),hero:hero.root.position.toArray(),layout:d.art.layout.version};},shot);
 await page.screenshot({path:out+'/'+shot.id+'.png'});results.push(snap);
}
assert.deepEqual(errors,[]);writeFileSync(out+'/result.json',JSON.stringify({results,errors,snapshot:await page.evaluate(()=>__PINK_HIDEOUT.snapshot())},null,2));
}finally{await browser.close();}
