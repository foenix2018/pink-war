const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=new URL('../dist',import.meta.url).pathname,out=process.env.AUDIT_OUTPUT||'/tmp/pink-wars-iphone-audit';mkdirSync(out,{recursive:true});
const m01=readFileSync(root+'/vesper-level1-v7.html','utf8');
const stick=m01.slice(m01.indexOf(" let stick=$('stick');"),m01.indexOf(" $('btnJump').onpointerdown"));
const input=m01.slice(m01.indexOf('getState:()=>({input:')+14,m01.indexOf(',position,yaw,pitch,aiming:',m01.indexOf('getState:()=>({input:')));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(String(e))));
const html=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;touch-action:none;background:#122131;color:white}canvas{width:390px;height:600px}.m02-stick,#stick{position:absolute;left:10px;top:610px;width:112px;height:112px;touch-action:none}.m02-stick-ring{width:112px;height:112px;border:1px solid cyan;border-radius:50%}.m02-stick-knob,#nub{display:block;width:30px;height:30px;background:hotpink;border-radius:50%;position:relative;left:40px;top:40px}.m02-actions{position:absolute;left:180px;top:600px;display:flex;flex-wrap:wrap;width:190px;gap:8px}.m02-actions button{min-height:40px;touch-action:none}</style><canvas id="host"></canvas><script type="module">
import {createPinkWarsTouch} from '/level2-input.js';import {touchAnalogSprint} from '/locomotion.js';import {frameDelta} from '/frame-timing.js';import {ArenaGame} from '/game-logic.js';
const mode=new URL(location.href).searchParams.get('mode');
let controls,touch={moveX:0,moveY:0,sprint:false},gamepadMove={x:0,y:0},keys=new Set(),padRun=false,jumpQueued=false,combatWorld={xrActive:false},mobileMovement={touchAnalogSprint};const $=id=>document.getElementById(id);
if(mode==='m01'){const el=document.createElement('div');el.id='stick';el.innerHTML='<span id="nub"></span>';document.body.append(el);${stick};controls={get state(){return {x:touch.moveX,z:touch.moveY,sprint:touch.sprint||touchAnalogSprint(touch.moveX,touch.moveY)}}};}
else controls=createPinkWarsTouch($('host'));
window.qa={state:()=>({...controls.state}),tick:dt=>controls.step?.(dt),reset:()=>controls.reset?.(),input:()=>(${input}}),travel:(hz)=>{const g=new ArenaGame([],()=>.5,{routes:[],lifts:[],height:()=>0,surfaces:()=>[]});g.nextWave=Infinity;g.toSpawn=0;g.player.x=g.player.z=0;const s=controls.state;for(let i=0;i<hz*2;i++)g.step(frameDelta(1/hz),{x:s.x,z:s.z,touchMoving:!!(s.x||s.z),sprint:s.sprint});return {distance:Math.hypot(g.player.x,g.player.z),time:g.time};}};
</script>`;
await context.route('**/qa-iphone*',r=>r.fulfill({contentType:'text/html',body:html}));
const results={};
for(const mode of ['missions','m01']){
 const p=await context.newPage();await p.goto((process.env.PINK_WARS_BASE_URL||'http://127.0.0.1:4173')+'/qa-iphone?mode='+mode);await p.waitForFunction(()=>window.qa);
 const cdp=await context.newCDPSession(p);const send=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
 const point=(x,y,id=1)=>({x,y,id});
 await send('touchStart',[point(66,666)]);await send('touchMove',[point(66,630)]);
 const full=await p.evaluate(()=>qa.state());assert.ok(full.z<-.99);assert.equal(full.sprint,true);
 const travel=await p.evaluate(()=>({slow:qa.travel(15),fast:qa.travel(60)}));assert.ok(Math.abs(travel.slow.distance-travel.fast.distance)<1e-8);assert.ok(travel.slow.distance>10);
 if(mode==='m01'){const actual=await p.evaluate(()=>qa.input());assert.equal(actual.input.touchMoving,true);assert.equal(actual.input.sprint,true);}
 await send('touchEnd',[]);assert.equal((await p.evaluate(()=>qa.state())).sprint,false);assert.equal((await p.evaluate(()=>qa.state())).z,0);
 await send('touchStart',[point(66,666)]);await send('touchMove',[point(66,654)]);const fine=await p.evaluate(()=>qa.state());assert.equal(fine.sprint,false);assert.ok(fine.z<0&&fine.z>-.5);await send('touchEnd',[]);
 if(mode==='missions'){
  await p.locator('[data-m02="aim"]').tap();assert.equal((await p.evaluate(()=>qa.state())).aim,true);
  await send('touchStart',[point(66,666)]);await send('touchMove',[point(66,630)]);await send('touchEnd',[]);assert.equal((await p.evaluate(()=>qa.state())).aim,true);
  await p.locator('[data-m02="aim"]').tap();assert.equal((await p.evaluate(()=>qa.state())).aim,false);
  await send('touchStart',[point(66,666)]);await send('touchMove',[point(66,630)]);await p.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal((await p.evaluate(()=>qa.state())).z,0);await send('touchEnd',[]);
 }
 results[mode]={full,fine,travel};await p.screenshot({path:out+'/'+mode+'-touch.png'});await p.close();
}
assert.deepEqual(errors,[]);writeFileSync(out+'/controls.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser.close();}
