import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.AUDIT_OUTPUT||'/tmp/pink-wars-nano',base=process.env.PINK_WARS_BASE_URL||'http://127.0.0.1:4176';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
 await context.addInitScript(()=>localStorage.setItem('rosee-settings','{"quality":"low","sound":false,"music":false}'));await context.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));await context.route('https://fonts.gstatic.com/**',r=>r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.stack);});
 await page.goto(base+'/level2-test.html?character=ghju&renderer=webgl&quality=low&debug=1&mission=1',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__PINK_M02?.snapshot().running,null,{timeout:180000});console.log('M02 READY');
 const initial=await page.evaluate(()=>__PINK_M02.snapshot().nano);assert.ok(initial.plans.length>=3);const matrix=initial.plans.find(p=>p.blueprints.includes('matrice')),shield=initial.plans.find(p=>p.blueprints.includes('capaciteur'));
 for(const plan of [matrix,shield]){await page.evaluate(p=>{__PINK_M02.debug.game.invulnerable=1e9;__PINK_M02.debug.teleport(p.x,p.z);Object.assign(__PINK_M02.debug.game.player,{elevation:p.y,grounded:true,verticalSpeed:0});__PINK_M02.debug.game.step(1/60,{});},plan);console.log('M02 PLAN',JSON.stringify(await page.evaluate(async p=>{const g=__PINK_M02.debug.game,{segmentBox}=await import('/game-logic.js');return{plan:p,player:g.player,state:g.state,discovered:g.nano.profile.discovered,blocked:g.obstacles.filter(b=>segmentBox({x:g.player.x,y:g.player.elevation+1.3,z:g.player.z},{x:p.x,y:p.y+.4,z:p.z},b)!==null).map(b=>({kind:b.kind,x:b.x,z:b.z,y:b.y,height:b.height}))};},plan)));await page.waitForFunction(ids=>ids.every(id=>__PINK_M02.snapshot().nano.discovered.includes(id)),plan.blueprints,{timeout:45000});}
 await page.evaluate(()=>{const g=__PINK_M02.debug.game;for(let i=0;i<15;i++){g.wave=6;g.toSpawn++;g.spawnEnemy();const e=g.enemies.at(-1);Object.assign(e,{x:g.player.x,z:g.player.z,elevation:g.player.elevation});g.damageEnemy(e,1e6,{x:e.x,y:e.elevation+1,z:e.z});}});
 await page.waitForFunction(()=>__PINK_M02.snapshot().nano.balance>=150,null,{timeout:45000});const earned=await page.evaluate(()=>__PINK_M02.snapshot().nano.balance);console.log('M02 RECOVERED',earned);
 await page.locator('.pw-hud-companion').tap();await page.locator('[data-gear-tab=nano]').tap();await page.locator('[data-nano-recipe=shield]').tap();assert.equal(await page.evaluate(()=>__PINK_M02.snapshot().armor.shieldCapacity),70);
 await page.screenshot({path:out+'/m02-iphone-atelier.png',timeout:30000});await page.locator('.pw-hud-gear-close').tap();
 const saved=await page.evaluate(()=>__PINK_M02.snapshot().nano);assert.equal(saved.balance,earned-100);
 await page.goto(base+'/niveau3.html?character=ghju&renderer=webgl&quality=low&debug=1',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__PINK_M03?.snapshot().running,null,{timeout:180000});await page.evaluate(()=>__PINK_M03.debug.god());
 const next=await page.evaluate(()=>__PINK_M03.snapshot().nano);assert.equal(next.balance,saved.balance);assert.equal(next.upgrades.shield,1);assert.ok(next.discovered.includes('capaciteur'));console.log('M03 CARRIED',next.balance,next.plans.map(p=>p.id));
 const plan=next.plans.find(p=>p.blueprints.includes('stabilisateur'));assert.ok(plan);
 await page.evaluate(p=>{__PINK_M03.debug.teleport(p.x,p.z+3);__PINK_M03.debug.look(0,-.34);},plan);await page.screenshot({path:out+'/m03-iphone-plan.png',timeout:30000});
 await page.evaluate(p=>__PINK_M03.debug.teleport(p.x,p.z),plan);await page.waitForFunction(()=>__PINK_M03.snapshot().nano.discovered.includes('stabilisateur'),null,{timeout:45000});
 await page.locator('.pw-hud-companion').tap();await page.locator('[data-gear-tab=nano]').tap();await page.screenshot({path:out+'/m03-iphone-atelier.png',timeout:30000});
 assert.deepEqual(errors,[]);const result={m02:{plans:initial.plans,earned,balance:saved.balance,shieldCapacity:70},m03:{balance:next.balance,shieldUpgrade:1,discoveredStabilizer:true},errors};writeFileSync(out+'/actual-levels.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
