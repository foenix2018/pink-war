import { chromium, devices } from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
const server=spawn('python3',['-m','http.server','4197','--bind','127.0.0.1','--directory','dist'],{stdio:'ignore'});
let browser;
const origin='http://127.0.0.1:4197';
try{
 for(let n=0;n<80;n++){try{if((await fetch(origin+'/ennemis.html')).ok)break}catch{}
  await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const [mode,opts] of [['desktop',{viewport:{width:1200,height:900}}],
                             ['iPhone 14',{...devices['iPhone 13'],viewport:{width:390,height:844}}]]) {
  const page=await browser.newPage(opts);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const res=await page.goto(origin+'/ennemis.html?form=probe',{waitUntil:'domcontentloaded',timeout:90000});
  assert.equal(res.status(),200);
  await page.waitForFunction(()=>window.__PINKWAR_ENEMIES?.actor?.userData?.s19V3?.visual,
    null,{timeout:60000});
  const info=await page.evaluate(()=>{
    const actor=window.__PINKWAR_ENEMIES.actor,view=actor.userData.s19V3.visual;
    let origHidden=0,models=0;
    for(const child of actor.children)if(child.isSkinnedMesh)origHidden+=+(!child.visible);
    view.traverse(o=>{if(o.isMesh)models++});
    const names=['LEFT_REAR','LEFT_FRONT','RIGHT_REAR','RIGHT_FRONT'].map(x=>view.getObjectByName('FAN_'+x)?.name);
    const now=12.5;
    actor.userData.animate(now,0,false,{
      awareness:'engaged',rotorDestroyed:[true,false,false,false],
      chargeProgress:.82,aimPitch:.17,limpUntil:0},now);
    const zero=view.getObjectByName('FAN_LEFT_REAR'),running=view.getObjectByName('FAN_RIGHT_FRONT');
    return {names,origHidden,models,zeroScale:zero.scale.x,spin:running.rotation.y,revision:actor.userData.probeRevision,
        visualPosition:view.position.toArray()};
  });
  assert(info.names.every(Boolean),mode+' missing fan');
  assert(info.models>=8&&info.models<=45,mode+' mesh budget='+info.models);
  assert(info.origHidden>0,mode+' original mesh still visible');
  assert(info.zeroScale<.02,mode+' damaged fan should disappear');
  assert(info.spin!==0,mode+' rotor motion should remain active');
  assert(info.revision.includes('Blender V3'),mode+' wrong revision');
  assert.deepEqual(errors,[],mode+' browser errors');
  fs.mkdirSync('e2e-previews',{recursive:true});
  await page.screenshot({path:'e2e-previews/s19-'+mode.toLowerCase().replaceAll(' ','-')+'.png'});
  console.log('S19 V3 E2E '+mode+': '+JSON.stringify(info));
  await page.close();
 }
}finally{await browser?.close();server.kill('SIGTERM')}
