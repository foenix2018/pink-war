import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const dir='planque-proportions-check';mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
 await page.goto('http://127.0.0.1:4173/planque.html?character=lylu&renderer=webgl&quality=low&debug=1');
 await page.waitForFunction(()=>window.__PINK_HIDEOUT?.snapshot().ready,null,{timeout:180000});
 assert.equal(await page.evaluate(()=>__PINK_HIDEOUT.debug.art.layout.proportionsRevision),2);
 const civilHeight=await page.evaluate(async()=>{const T=await import('./vendor/three.webgpu.min.js');const root=__PINK_HIDEOUT.debug.civil.root;root.updateMatrixWorld(true);return new T.Box3().setFromObject(root,true).getSize(new T.Vector3()).y;});
 console.log('Measured civil LYLU standing height (m):',civilHeight);assert.ok(civilHeight>1.60&&civilHeight<2.0,'Civil LYLU must be on human scale');
 const rooms=[['atelier',7.5,3,0],['atelier-proche',6.35,.55,0],['salon',0,2.5,0],['dortoir',-6.1,-6.35,.65],['archives',0,-6.1,0],['bain',8.5,-6.4,0],['recharge',0,9,0]];
 for(const [name,x,z,yaw] of rooms){
  await page.evaluate(({x,z,yaw})=>{const d=__PINK_HIDEOUT.debug;d.teleport(x,z);d.game.player.yaw=yaw;},{x,z,yaw});
  await page.waitForTimeout(500);
  await page.screenshot({path:dir+'/'+name+'.png'});
 }
 assert.deepEqual(errors,[]);
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>__PINK_HIDEOUT.debug.teleport(6.35,.55));await page.waitForTimeout(800);await page.screenshot({path:dir+'/atelier-iphone.png'});
 writeFileSync(dir+'/result.json',JSON.stringify({...await page.evaluate(()=>__PINK_HIDEOUT.snapshot()),civilHeight},null,2));
}finally{await browser.close();}
