import {chromium,devices} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:4198',dir='m01-aaa-previews';
const server=spawn('python3',['-m','http.server','4198','--bind','127.0.0.1','--directory','dist'],{stdio:'ignore'});
let browser;await fs.mkdir(dir,{recursive:true});
try{
 let live=false;for(let i=0;i<100;i++){try{live=(await fetch(origin+'/vesper-level1-v7.html')).ok;if(live)break;}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(live,'local server');
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-unsafe-webgpu']});
 const result=[];
 for(const spec of [{name:'ghju-mobile-fallback',character:'ghju',force:true},{name:'lylu-mobile-candidate',character:'lylu',force:false}]){
  const page=await browser.newPage({...devices['iPhone 13 landscape'],viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   const url=origin+'/vesper-level1-v7.html?character='+spec.character+'&prologue=done&debug=1&quality=equilibre'+(spec.force?'&renderer=webgl':'');
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
   await page.waitForFunction(()=>typeof window.__PINK_VESPER?.snapshot==='function',null,{timeout:150000});
   const start=page.locator('#start');if(await start.isVisible())await start.click({timeout:15000}).catch(()=>{});
   await page.waitForFunction(()=>window.__PINK_VESPER.snapshot().ready,null,{timeout:90000});
   const initial=await page.evaluate(()=>window.__PINK_VESPER.snapshot());
   assert.equal(initial.characterId,spec.character);assert.ok(['webgpu','webgl'].includes(initial.backend));if(spec.force)assert.equal(initial.backend,'webgl');
   assert.ok(initial.aaa&&initial.extension.art.roomFinish?.rooms>0);
   await page.waitForTimeout(800);
   await page.screenshot({path:dir+'/'+spec.name+'-caserne.png'});
   for(const [name,x,z] of [['quartier',0,36],['archives',6,-74],['serre',28,-85]]){
    await page.evaluate(([x,z])=>{const d=window.__PINK_VESPER.debug;d.god();d.teleport(x,z);},[x,z]);
    await page.waitForTimeout(700);
    await page.screenshot({path:dir+'/'+spec.name+'-'+name+'.png'});
   }
   const snapshot=await page.evaluate(()=>window.__PINK_VESPER.snapshot());
   result.push({name:spec.name,backend:snapshot.backend,actualURL:page.url(),telemetry:snapshot.aaa,art:snapshot.extension.art.roomFinish,errors});
   assert.deepEqual(errors,[],'uncaught browser exceptions');
  }catch(e){await page.screenshot({path:dir+'/'+spec.name+'-failure.png'}).catch(()=>{});result.push({name:spec.name,error:String(e),errors});throw e;}
  finally{await fs.writeFile(dir+'/report.json',JSON.stringify({environment:'Chromium software GPU, emulated mobile; NOT physical iPhone/Safari',result},null,2));await page.close();}
 }
}finally{await browser?.close();server.kill('SIGTERM');}
