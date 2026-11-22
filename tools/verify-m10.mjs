import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.AUDIT_OUTPUT||'/tmp/pink-wars-m10',base=process.env.PINK_WARS_BASE_URL||'http://127.0.0.1:4176',mode=process.env.M10_VERIFY_MODE||'game';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',...(mode==='gpu'?['--enable-unsafe-webgpu','--enable-dawn-features=allow_unsafe_apis','--enable-features=Vulkan','--use-vulkan=swiftshader','--disable-vulkan-surface']:[])]});
try{

  const results=[];
  for(const mobile of [false,true]){
   const hero=mobile?'lylu':'ghju';
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1100,height:825},isMobile:mobile,hasTouch:mobile,userAgent:mobile?'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1':undefined});
   await context.addInitScript(()=>localStorage.setItem('rosee-settings',JSON.stringify({quality:'low',sound:false,music:false,view:'fps'})));await context.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));const page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.stack);});page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')console.log('CONSOLE',m.text());});
   await page.goto(base+'/niveau10.html?autostart=1&character='+hero+'&quality=low&renderer=webgl&debug=1&resume=0',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__PINK_M10?.snapshot().running,null,{timeout:240000,polling:100});console.log('RUNNING',mobile,JSON.stringify(await page.evaluate(()=>__PINK_M10.snapshot())));await page.waitForFunction(()=>__PINK_M10.snapshot().rig,null,{timeout:120000,polling:100}).catch(async e=>{console.log('RIG FAILURE',JSON.stringify(await page.evaluate(()=>({state:__PINK_M10.snapshot(),status:document.getElementById('status')?.textContent}))));throw e;});await page.evaluate(()=>__PINK_M10.debug.god());const initial=await page.evaluate(()=>__PINK_M10.snapshot());assert.equal(initial.level,'m10-couronne-helix');assert.equal(initial.stageId,'access');assert.ok(initial.art.triangles>20000&&initial.art.triangles<180000);assert.equal(initial.art.reunionHero,hero==='ghju'?'lylu':'ghju');assert.equal(initial.art.secondSphere,hero==='ghju'?'Cara':'Gaby');console.log('GAME READY',mobile);
   if(mobile){await page.locator('[data-m02=jump]').tap();}else await page.keyboard.down('Space');
   await page.waitForFunction(()=>!__PINK_M10.debug.game().player.grounded,null,{timeout:60000,polling:50});
   if(mobile){await page.locator('[data-m02=jump]').tap();}else await page.evaluate(()=>{document.dispatchEvent(new KeyboardEvent('keyup',{code:'Space',bubbles:true}));document.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',bubbles:true}));});
   await page.waitForFunction(()=>__PINK_M10.debug.game().player.airJumps===1,null,{timeout:60000,polling:50});
   console.log('DOUBLE JUMP',mobile,JSON.stringify(await page.evaluate(()=>{const p=__PINK_M10.debug.game().player;return{height:p.elevation,airJumps:p.airJumps,verticalSpeed:p.verticalSpeed};})));
   if(!mobile)await page.keyboard.up('Space');await page.evaluate(()=>{__PINK_M10.debug.teleport(0,78);Object.assign(__PINK_M10.debug.game().player,{airJumps:0,jumpHeld:false,verticalSpeed:0,grounded:true,jetpackArmed:false,jetpackActive:false});});

   if(!mobile){const z=initial.position.z;await page.keyboard.down('KeyW');try{await page.waitForFunction(z=>__PINK_M10.snapshot().position.z<z-.05,z,{timeout:60000,polling:100});}finally{await page.keyboard.up('KeyW');}const after=await page.evaluate(()=>__PINK_M10.snapshot());assert.ok(after.position.z<z);assert.ok(Math.abs(after.position.x)<2);}
   await page.screenshot({path:out+'/'+(mobile?'iphone':'desktop')+'-entry.png',timeout:60000});
   for(const id of ['access','esplanade','security','laboratoires','kessler','archives','confinement','extraction']){
    await page.evaluate(id=>{__PINK_M10.debug.clear();__PINK_M10.debug.use(id);},id);let state=await page.evaluate(()=>__PINK_M10.snapshot());
    if(state.hold){await page.evaluate(()=>__PINK_M10.debug.skip(30));state=await page.evaluate(()=>__PINK_M10.snapshot());}
    assert.ok(state.done.includes(id),id+' completed');console.log('STAGE',mobile,id);
    if(id==='kessler'&&!mobile){await page.evaluate(()=>{__PINK_M10.debug.teleport(0,-48);__PINK_M10.debug.look(0,-.12);});await page.screenshot({path:out+'/desktop-kessler.png',timeout:60000});
     await page.evaluate(()=>{const u=new URL(location.href);u.searchParams.set('resume','1');history.replaceState(null,'',u);});await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__PINK_M10?.snapshot().running&&window.__PINK_M10.snapshot().rig,null,{timeout:240000,polling:100});const resumed=await page.evaluate(()=>__PINK_M10.snapshot());assert.equal(resumed.stageId,'archives');assert.equal(resumed.done.length,5);assert.ok(resumed.opened.includes('archives'));await page.evaluate(()=>__PINK_M10.debug.god());console.log('CHECKPOINT RELOAD VERIFIED',resumed.stageId);}
   }
   const end=await page.evaluate(()=>__PINK_M10.snapshot());assert.ok(end.completed);assert.equal(end.done.length,8);assert.match(await page.locator('#panel-text').textContent(),/archives/i);assert.ok(await page.locator('a[href*="planque"],button[data-hideout]').count()>0||await page.locator('#home').isVisible());
   assert.match(await page.locator('[data-hideout-return]').getAttribute('href'),new RegExp('character='+hero));assert.match(await page.locator('[data-hideout-return]').getAttribute('href'),/from=10/);
   assert.deepEqual(errors,[]);results.push({mobile,initial,end,errors});await context.close();
  }
  writeFileSync(out+'/game-browser.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(r=>({mobile:r.mobile,completed:r.end.completed,source:r.initial.art.source,triangles:r.initial.art.triangles,errors:r.errors}))));
}finally{await browser.close();}
