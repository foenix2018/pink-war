import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.AUDIT_OUTPUT||'/tmp/pink-wars-m09',base=process.env.PINK_WARS_BASE_URL||'http://127.0.0.1:4176',mode=process.env.M09_VERIFY_MODE||'game';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',...(mode==='gpu'?['--enable-unsafe-webgpu','--enable-dawn-features=allow_unsafe_apis','--enable-features=Vulkan','--use-vulkan=swiftshader','--disable-vulkan-surface']:[])]});
try{
 if(mode==='gpu'){
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/m09-gpu-verify',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><canvas></canvas>'}));await page.goto(base+'/m09-gpu-verify');
  const result=await page.evaluate(async()=>{
   const T=await import('/vendor/three.webgpu.min.js'),{createM09Art}=await import('/m09-art.js');
   const renderer=new T.WebGPURenderer({canvas:document.querySelector('canvas'),antialias:true});await renderer.init();renderer.setSize(960,640);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
   const scene=new T.Scene(),art=createM09Art(T,scene,{webgpu:true});await art.ready;const camera=new T.PerspectiveCamera(42,1.5,.1,2500);camera.position.set(150,220,330);camera.lookAt(0,16,-25);camera.updateMatrixWorld();
   const target=new T.RenderTarget(960,640);target.texture.colorSpace=T.SRGBColorSpace;
   async function capture(t){art.update(t,.05,camera);renderer.setRenderTarget(target);await renderer.renderAsync(scene,camera);const bytes=await renderer.readRenderTargetPixelsAsync(target,0,0,960,640);const canvas=document.createElement('canvas');canvas.width=960;canvas.height=640;canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(bytes),960,640),0,0);let hash=2166136261,nonzero=0;for(let i=0;i<bytes.length;i+=7){hash=Math.imul(hash^bytes[i],16777619);if(bytes[i]>10)nonzero++;}return{png:canvas.toDataURL(),hash:hash>>>0,nonzero};}
   const overview=await capture(3);renderer.info.reset();renderer.info.autoReset=false;await capture(3);const draws=renderer.info.render.drawCalls;renderer.info.autoReset=true;
   camera.position.set(12,57,-47);camera.lookAt(-8,63,-102);camera.updateMatrixWorld();const core=await capture(4);
   camera.position.set(66,15,82);camera.lookAt(11,3,35);camera.updateMatrixWorld();const waterBefore=await capture(4),waterAfter=await capture(9);
   const shaderMaterials=[];art.root.traverse(o=>{if(o.isMesh&&o.material?.isNodeMaterial&&o.material.positionNode)shaderMaterials.push(o.name);});
   return{native:renderer.backend.isWebGPUBackend,stats:art.stats(),draws,shaderMaterials,overview,core,waterBefore,waterAfter};
  });
  assert.ok(result.native);assert.ok(result.overview.nonzero>1000);assert.ok(result.draws<210);assert.ok(result.shaderMaterials.length>=8);assert.equal(result.stats.waterfalls,4);assert.equal(result.stats.patrolDrones,5);assert.notEqual(result.waterBefore.hash,result.waterAfter.hash);assert.deepEqual(errors,[]);
  for(const name of ['overview','core','waterBefore','waterAfter']){writeFileSync(out+'/webgpu-'+name+'.png',Buffer.from(result[name].png.split(',')[1],'base64'));delete result[name].png;}result.errors=errors;writeFileSync(out+'/webgpu.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }else{
  const results=[];
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1100,height:825},isMobile:mobile,hasTouch:mobile,userAgent:mobile?'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1':undefined});
   await context.addInitScript(()=>localStorage.setItem('rosee-settings',JSON.stringify({quality:'low',sound:false,music:false,view:'fps'})));await context.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));const page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.stack);});page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')console.log('CONSOLE',m.text());});
   await page.goto(base+'/niveau9.html?autostart=1&character=ghju&quality=low&renderer=webgl&debug=1&resume=0',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__PINK_M09?.snapshot().running,null,{timeout:240000,polling:100});console.log('RUNNING',mobile,JSON.stringify(await page.evaluate(()=>__PINK_M09.snapshot())));await page.waitForFunction(()=>__PINK_M09.snapshot().rig,null,{timeout:120000,polling:100}).catch(async e=>{console.log('RIG FAILURE',JSON.stringify(await page.evaluate(()=>({state:__PINK_M09.snapshot(),status:document.getElementById('status')?.textContent}))));throw e;});await page.evaluate(()=>__PINK_M09.debug.god());const initial=await page.evaluate(()=>__PINK_M09.snapshot());assert.equal(initial.level,'m09-jardins-suspendus');assert.equal(initial.stageId,'access');assert.ok(initial.art.triangles<800000);assert.equal(initial.art.reunionHero,'lylu');console.log('GAME READY',mobile);
   if(!mobile){const z=initial.position.z;await page.keyboard.down('KeyW');try{await page.waitForFunction(z=>__PINK_M09.snapshot().position.z<z-.05,z,{timeout:60000,polling:100});}finally{await page.keyboard.up('KeyW');}const after=await page.evaluate(()=>__PINK_M09.snapshot());assert.ok(after.position.z<z);assert.ok(after.position.x< -100);}
   await page.screenshot({path:out+'/'+(mobile?'iphone':'desktop')+'-entry.png',timeout:60000});
   for(const id of ['access','research','pavilion','bridge','meeting','core','control','liberation','extraction']){
    await page.evaluate(id=>{__PINK_M09.debug.clear();__PINK_M09.debug.use(id);},id);let state=await page.evaluate(()=>__PINK_M09.snapshot());
    if(state.hold){await page.evaluate(()=>__PINK_M09.debug.skip(30));state=await page.evaluate(()=>__PINK_M09.snapshot());}
    assert.ok(state.done.includes(id),id+' completed');console.log('STAGE',mobile,id);
    if(id==='core'&&!mobile){await page.evaluate(()=>{__PINK_M09.debug.teleport(0,-63);__PINK_M09.debug.look(0,-.12);});await page.screenshot({path:out+'/desktop-core.png',timeout:60000});}
   }
   const end=await page.evaluate(()=>__PINK_M09.snapshot());assert.ok(end.completed);assert.equal(end.done.length,9);assert.match(await page.locator('#panel-text').textContent(),/JANUS/);assert.ok(await page.locator('a[href*="planque"],button[data-hideout]').count()>0||await page.locator('#home').isVisible());
   assert.deepEqual(errors,[]);results.push({mobile,initial,end,errors});await context.close();
  }
  writeFileSync(out+'/game-browser.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(r=>({mobile:r.mobile,completed:r.end.completed,source:r.initial.art.source,triangles:r.initial.art.triangles,errors:r.errors}))));
 }
}finally{await browser.close();}
