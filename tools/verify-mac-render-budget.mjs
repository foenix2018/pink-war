const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const out=process.env.AUDIT_OUTPUT||'/tmp/pink-wars-mac-audit';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:2,userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15'}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/qa-mac',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><style>body{margin:0;background:#09151c}canvas{display:block}p{position:absolute;top:0;left:20px;color:white;font:20px sans-serif}</style><canvas id="world"></canvas><p>PINK WARS · Contrôle du rendu Mac</p><script type="module">
 import * as T from '/vendor/three.module.min.js';import {graphicsProfile,renderPixelRatio} from '/renderer-policy.js';import {installRenderBudget} from '/render-budget.js';
 const profile=graphicsProfile({userAgent:navigator.userAgent,platform:'MacIntel',maxTouchPoints:0,gpu:{}}),canvas=document.getElementById('world');
 const renderer=new T.WebGLRenderer({canvas,antialias:profile.antialias});let time=0;
 const budget=installRenderBudget(renderer,profile,()=>time);renderer.setPixelRatio(renderPixelRatio(profile,devicePixelRatio,innerWidth,innerHeight));renderer.setSize(innerWidth,innerHeight);
 const scene=new T.Scene();scene.background=new T.Color(0x10222c);const camera=new T.PerspectiveCamera(60,innerWidth/innerHeight,.1,100);camera.position.z=5;
 const mesh=new T.Mesh(new T.BoxGeometry(1.5,1.5,1.5),new T.MeshStandardMaterial({color:0xff2277,roughness:.7}));scene.add(mesh,new T.HemisphereLight(0xcceeff,0x332244,3));
 window.qa={profile,step:ms=>{time+=ms;renderer.render(scene,camera);},snapshot:()=>({budget:budget.stats(),width:canvas.width,height:canvas.height,css:canvas.getBoundingClientRect().toJSON(),aspect:camera.aspect}),resize:(w,h)=>{camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setPixelRatio(renderPixelRatio(profile,devicePixelRatio,w,h));renderer.setSize(w,h);}};
 </script>`}));
 await page.goto((process.env.PINK_WARS_BASE_URL||'http://127.0.0.1:4173')+'/qa-mac');await page.waitForFunction(()=>window.qa);
 const before=await page.evaluate(()=>{qa.step(16);return qa.snapshot();});
 for(let i=0;i<32;i++)await page.evaluate(()=>qa.step(50));
 const slow=await page.evaluate(()=>qa.snapshot());assert.ok(slow.width<before.width);assert.equal(slow.css.width,before.css.width);assert.equal(slow.css.height,before.css.height);assert.equal(slow.aspect,before.aspect);
 await page.evaluate(()=>qa.resize(800,500));const resized=await page.evaluate(()=>qa.snapshot());assert.equal(resized.css.width,800);assert.equal(resized.css.height,500);assert.ok(resized.width<800);assert.equal(resized.aspect,1.6);
 await page.screenshot({path:out+'/adaptive-render.png'});assert.deepEqual(errors,[]);
 const result={before,slow,resized,errors};writeFileSync(out+'/adaptive-render.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
