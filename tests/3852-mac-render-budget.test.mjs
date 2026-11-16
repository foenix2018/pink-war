import test from 'node:test';
import assert from 'node:assert/strict';
import {graphicsProfile,renderPixelRatio} from '../dist/renderer-policy.js';
import {gradePolicy} from '../dist/fps-grade.js';
import {createFrameBudget,installRenderBudget} from '../dist/render-budget.js';

const mac={userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',platform:'MacIntel',maxTouchPoints:0,gpu:{}};
const scene={isScene:true},camera={isPerspectiveCamera:true};
function fixture(profile={adaptive:true}){
 let time=0,ratio=1,target=null,scissor=false,grade=true;
 const doc={hidden:false},resizes=[],calls=[];
 const renderer={domElement:{ownerDocument:doc},xr:{isPresenting:false},shadowMap:{enabled:true},
  getPixelRatio:()=>ratio,setPixelRatio:r=>{ratio=r;resizes.push(r);},getRenderTarget:()=>target,getScissorTest:()=>scissor,
  render(s,c,...args){calls.push({s,c,args});return 'rendered';},dispose(){this.disposed=true;},
  fpsPresentation:{stats:()=>({enabled:grade}),setEnabled:v=>{grade=v;}}};
 const budget=installRenderBudget(renderer,profile,()=>time);
 return {renderer,budget,doc,resizes,calls,get grade(){return grade;},setTarget:t=>{target=t;},setScissor:v=>{scissor=v;},
  advance(ms=50){time+=ms;return renderer.render(scene,camera);}};
}
const frames=(f,count,ms)=>{for(let i=0;i<count;i++)f.advance(ms);};

test('automatic Retina Mac keeps GPU routing but removes default supersampling and costly lighting passes',()=>{
 const p=graphicsProfile(mac);assert.equal(p.mac,true);assert.equal(p.ios,false);assert.equal(p.preferWebGL,false);
 assert.equal(p.economy,true);assert.equal(p.adaptive,true);assert.equal(p.antialias,false);assert.equal(p.shadows,false);
 assert.equal(p.artQuality,'low');assert.equal(gradePolicy(p).enabled,false);
 const ratio=renderPixelRatio(p,2,1512,982),pixels=1512*982*ratio*ratio;
 assert.ok(pixels<=1100001);assert.ok(pixels/2400000<.46);
 const high=graphicsProfile(mac,'high');assert.equal(high.economy,false);assert.equal(high.adaptive,false);
 assert.equal(high.antialias,true);assert.equal(high.shadows,true);assert.equal(high.artQuality,'high');
 assert.equal(gradePolicy(high).enabled,true);assert.ok(renderPixelRatio(high,2,1512,982)>ratio);
});

test('desktop-mode iPad and Quest do not enter the Mac profile',()=>{
 const ipad=graphicsProfile({...mac,maxTouchPoints:5});assert.equal(ipad.ios,true);assert.equal(ipad.mac,false);assert.equal(ipad.preferWebGL,true);
 const quest=graphicsProfile({userAgent:'OculusBrowser Quest 3',gpu:{}});assert.equal(quest.headset,true);assert.equal(quest.adaptive,false);
});

test('sustained expensive frames progressively reduce resolution to a floor and recover slowly',()=>{
 const b=createFrameBudget();for(let i=0;i<100;i++)b.sample(50);
 assert.equal(b.snapshot().scale,.55);assert.equal(b.snapshot().degraded,true);
 for(let i=0;i<10;i++)b.sample(16);assert.equal(b.snapshot().scale,.55,'a brief fast interval cannot oscillate resolution');
 for(let i=0;i<1800;i++)b.sample(16);assert.equal(b.snapshot().scale,1);assert.equal(b.snapshot().degraded,false);
});

test('one loading hitch or a background stall cannot lower quality',()=>{
 const b=createFrameBudget();for(let i=0;i<40;i++)b.sample(16);
 b.sample(600);for(let i=0;i<120;i++)b.sample(16);
 assert.equal(b.snapshot().scale,1);b.sample(30000);b.sample(NaN);assert.equal(b.snapshot().scale,1);
});

test('main renders adapt the drawing ratio, preserve render arguments and honor later viewport resizes',()=>{
 const f=fixture();assert.equal(f.advance(),'rendered');frames(f,20,50);
 assert.ok(f.budget.stats().scale<1);assert.equal(f.renderer.shadowMap.enabled,false);assert.equal(f.grade,false);
 const scale=f.budget.stats().scale;f.renderer.setPixelRatio(1.4);
 assert.equal(f.budget.stats().baseRatio,1.4);assert.equal(f.resizes.at(-1),1.4*scale);
 f.renderer.render(scene,camera,'probe');assert.equal(f.calls.at(-1).args[0],'probe');
});

test('optical targets, stereo scissors, orthographic cameras, hidden tabs and XR never drive adaptation',()=>{
 const f=fixture();f.setTarget({});frames(f,30,80);f.setTarget(null);
 f.setScissor(true);frames(f,30,80);f.setScissor(false);
 f.renderer.xr.isPresenting=true;frames(f,30,80);f.renderer.xr.isPresenting=false;
 for(let i=0;i<30;i++)f.renderer.render(scene,{isOrthographicCamera:true});
 f.doc.hidden=true;frames(f,30,80);f.doc.hidden=false;
 assert.equal(f.budget.stats().scale,1);assert.equal(f.renderer.shadowMap.enabled,true);assert.equal(f.grade,true);
 frames(f,20,80);assert.ok(f.budget.stats().scale<1);
});

test('manual high quality restores the base ratio and only effects that were originally enabled',()=>{
 const f=fixture();f.renderer.setPixelRatio(1.3);frames(f,50,50);assert.ok(f.budget.stats().scale<1);
 f.budget.configure({adaptive:false});assert.equal(f.resizes.at(-1),1.3);assert.equal(f.renderer.shadowMap.enabled,true);assert.equal(f.grade,true);
 frames(f,30,80);assert.equal(f.budget.stats().scale,1);
 const disabled=fixture();disabled.renderer.shadowMap.enabled=false;disabled.renderer.fpsPresentation.setEnabled(false);
 frames(disabled,50,50);disabled.budget.configure({adaptive:false});assert.equal(disabled.renderer.shadowMap.enabled,false);assert.equal(disabled.grade,false);
});

test('an asynchronous renderer cannot resize midway through an outstanding render or count its internal render twice',async()=>{
 let time=0,ratio=1,finish;const sizes=[];
 const renderer={domElement:{ownerDocument:{}},xr:{},getRenderTarget:()=>null,getPixelRatio:()=>ratio,
  setPixelRatio:r=>{ratio=r;sizes.push(r);},render(){return 1;},
  async renderAsync(s,c){await new Promise(resolve=>{finish=resolve;});this.render(s,c);return 7;}};
 const budget=installRenderBudget(renderer,{adaptive:true},()=>time);
 for(let i=0;i<30;i++){
  time+=50;const promise=renderer.renderAsync(scene,camera),before=sizes.length;
  renderer.render(scene,camera);assert.equal(sizes.length,before);finish();assert.equal(await promise,7);
 }
 assert.ok(budget.stats().scale<1);assert.ok(sizes.length<10);
});

test('renderer failures propagate and release the guard for the next frame',async()=>{
 let time=0,broken=true;const error=new Error('device lost');
 const renderer={setPixelRatio(){},render(){if(broken)throw error;return 1;},async renderAsync(){if(broken)throw error;return 2;}};
 const budget=installRenderBudget(renderer,{adaptive:true},()=>time);
 assert.throws(()=>renderer.render(scene,camera),e=>e===error);
 await assert.rejects(renderer.renderAsync(scene,camera),e=>e===error);broken=false;
 for(let i=0;i<30;i++){time+=50;assert.equal(renderer.render(scene,camera),1);}
 assert.ok(budget.stats().scale<1);
});

test('resize and manual configuration wait for the outstanding async render to finish',async()=>{
 let finish,time=0;const sizes=[];
 const renderer={setPixelRatio:r=>sizes.push(r),render(){},renderAsync:()=>new Promise(resolve=>{finish=resolve;})};
 const budget=installRenderBudget(renderer,{adaptive:true},()=>time);
 const promise=renderer.renderAsync(scene,camera);renderer.setPixelRatio(1.2);budget.configure({adaptive:false});
 assert.equal(sizes.length,0);finish();await promise;time+=50;renderer.render(scene,camera);
 assert.equal(sizes.at(-1),1.2);assert.equal(budget.stats().enabled,false);
});

test('persistently extreme foreground stalls also reduce the budget instead of being mistaken for loading',()=>{
 const b=createFrameBudget();for(let i=0;i<30;i++)b.sample(2000);
 assert.ok(b.snapshot().scale<1);assert.equal(b.snapshot().degraded,true);
});


test('Mac automatic rendering enforces its shadow budget even when a world shadow manager re-enables maps',()=>{
 const f=fixture({adaptive:true,economy:true});f.advance(16);assert.equal(f.renderer.shadowMap.enabled,false);
 f.renderer.shadowMap.enabled=true;f.advance(16);assert.equal(f.renderer.shadowMap.enabled,false);
 f.budget.configure({adaptive:false,economy:false});assert.equal(f.renderer.shadowMap.enabled,true);
});
