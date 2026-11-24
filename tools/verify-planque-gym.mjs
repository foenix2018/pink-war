import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const dir='planque-gym-check';mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1100,height:825},deviceScaleFactor:1}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));
 await page.route('https://fonts.gstatic.com/**',r=>r.abort());
 await page.goto('http://127.0.0.1:4173/planque.html?character=lylu&renderer=webgl&quality=low&debug=1');
 await page.waitForFunction(()=>window.__PINK_HIDEOUT?.snapshot().ready,null,{timeout:180000});
 assert.equal(await page.evaluate(()=>__PINK_HIDEOUT.debug.art.layout.gymRevision),1);
 const shots=[['entree',3.75,5.35,-1.9],['gym-entree',3.75,7.65,-Math.PI/2],['gym-interieur',6.35,7.65,-Math.PI/2],['gym-rack',7.0,7.45,-.5],['gym-rameur',6.1,8.55,-2.5],['atelier',6.0,1.55,-.3]];
 for(const [name,x,z,yaw] of shots){
  const position=await page.evaluate(({x,z,yaw})=>{const d=__PINK_HIDEOUT.debug;d.teleport(x,z);d.look(yaw);return {x:d.game.player.x,z:d.game.player.z};},{x,z,yaw});
  assert.ok(Math.hypot(position.x-x,position.z-z)<.01,name+' blocked');
  console.log('Capture',name);await page.evaluate(()=>__PINK_HIDEOUT.debug.captureFrame());await page.screenshot({path:dir+'/'+name+'.png',timeout:120000,animations:'disabled'});
 }
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{const d=__PINK_HIDEOUT.debug;d.teleport(3.75,7.65);d.look(-Math.PI/2);});
 await page.waitForTimeout(250);await page.evaluate(()=>__PINK_HIDEOUT.debug.captureFrame());await page.screenshot({path:dir+'/gym-iphone.png',timeout:120000,animations:'disabled'});
 assert.deepEqual(errors,[]);
 writeFileSync(dir+'/result.json',JSON.stringify(await page.evaluate(()=>__PINK_HIDEOUT.snapshot()),null,2));
}finally{await browser.close();}
