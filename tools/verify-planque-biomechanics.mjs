import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium,devices} from 'playwright';
const dir='planque-biomechanics-check';mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const rows=[];
try{
 for(const [device,options] of [['desktop',{viewport:{width:1200,height:900}}],['iphone',{...devices['iPhone 13'],viewport:{width:844,height:390},deviceScaleFactor:1}]]){
  const page=await browser.newPage(options),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));await page.route('https://fonts.gstatic.com/**',r=>r.abort());
  await page.goto('http://127.0.0.1:4173/planque.html?character=lylu&renderer=webgl&quality=low&debug=1');
  await page.waitForFunction(()=>window.__PINK_HIDEOUT?.snapshot().ready,null,{timeout:180000});
  // Inspect the complete unarmed gait from front/side, not just a single lateral pose.
  if(device==='desktop'){
   await page.evaluate(()=>{const d=__PINK_HIDEOUT.debug;d.teleport(6.35,7.65);d.look(-Math.PI/2);});
   for(const clip of ['civil_idle','civil_walk','civil_run','civil_walkBack','civil_walkLeft','civil_walkRight']){
    for(const phase of [0,.25,.50,.75]){
     await page.evaluate(({clip,phase})=>__PINK_HIDEOUT.debug.civil.samplePreview(clip,phase),{clip,phase});
     await page.evaluate(()=>__PINK_HIDEOUT.debug.captureFrame());
     const p=await page.evaluate(()=>{const v=__PINK_HIDEOUT.debug.civil.fitnessPose();return Object.fromEntries(['leftWristPoint','rightWristPoint','pelvis','leftFoot','rightFoot'].map(k=>[k,v[k].toArray()]));});
     assert.ok(Object.values(p).flat().every(Number.isFinite));
     await page.screenshot({path:dir+'/'+device+'-'+clip+'-'+Math.round(phase*100)+'.png',timeout:120000});
    }
   }
   await page.evaluate(()=>__PINK_HIDEOUT.debug.civil.playPreview(null));
  }
  for(const [id,clip,x,z,stat] of [['squat','fitnessSquat',6.85,5.4,'strength'],['dumbbells','fitnessCurl',8.75,7.65,'dexterity'],['rower','fitnessRow',7.1,9.1,'endurance']]){
   await page.evaluate(({id,x,z})=>{const d=__PINK_HIDEOUT.debug;d.teleport(x,z);if(!d.startTraining(id))throw Error('Cannot start '+id);},{id,x,z});
   let initial=null;const frames=[];
   for(const phase of [0,.20,.42,.55,.78,.98]){
    await page.evaluate(({clip,phase})=>__PINK_HIDEOUT.debug.civil.samplePreview(clip,phase),{clip,phase});
    await page.evaluate(()=>__PINK_HIDEOUT.debug.captureFrame());
    const frame=await page.evaluate(()=>{const s=__PINK_HIDEOUT.snapshot(),p=__PINK_HIDEOUT.debug.civil.fitnessPose();return{training:s.training,clip:s.civil.clip,props:s.fitnessProps,pose:Object.fromEntries(['left','right','pelvis','leftFoot','rightFoot'].map(k=>[k,p[k].toArray()]))};});
    assert.equal(frame.training.id,id);assert.equal(frame.clip,clip);assert.ok(Object.values(frame.pose).flat().every(Number.isFinite));
    await page.screenshot({path:dir+'/'+device+'-'+id+'-'+Math.round(phase*100)+'.png',timeout:120000});
    if(!initial)initial=frame;const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
    if(id!=='dumbbells'){for(const foot of ['leftFoot','rightFoot'])assert.ok(dist(frame.pose[foot],initial.pose[foot])<.12,device+' '+id+' foot drift '+foot);}
    if(id==='dumbbells'){assert.equal(frame.props.dumbbells,2);assert.ok(dist(frame.props.dumbbellPositions[0],frame.pose.left)<.015);assert.ok(dist(frame.props.dumbbellPositions[1],frame.pose.right)<.015);}
    else {const center=frame.pose.left.map((v,i)=>(v+frame.pose.right[i])/2);assert.ok(dist(center,frame.props[id==='rower'?'handle':'bar'])<.015);}
    if(id==='rower')assert.ok(frame.props.seat[0]>=6.22&&frame.props.seat[0]<=7.65);
    frames.push({phase,...frame});
   }
   rows.push({device,id,frames});writeFileSync(dir+'/measurements.json',JSON.stringify(rows,null,2));
   await page.evaluate(()=>__PINK_HIDEOUT.debug.advanceTraining(60));
   assert.equal(await page.evaluate(stat=>__PINK_HIDEOUT.snapshot().fitness[stat],stat),1);
  }
  await page.reload();await page.waitForFunction(()=>window.__PINK_HIDEOUT?.snapshot().ready,null,{timeout:180000});assert.deepEqual(await page.evaluate(()=>__PINK_HIDEOUT.snapshot().fitness),{strength:1,dexterity:1,endurance:1});assert.deepEqual(errors,[]);await page.close();
 }
}finally{await browser.close();}
