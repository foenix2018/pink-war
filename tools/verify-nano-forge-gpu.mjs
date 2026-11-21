import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.AUDIT_OUTPUT||'/tmp/pink-wars-nano',base=process.env.PINK_WARS_BASE_URL||'http://127.0.0.1:4176';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-unsafe-webgpu','--enable-dawn-features=allow_unsafe_apis','--enable-features=Vulkan','--use-vulkan=swiftshader','--disable-vulkan-surface']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/gpu-nano',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><canvas></canvas>'}));await page.goto(base+'/gpu-nano');
 const result=await page.evaluate(async()=>{
  const T=await import('/vendor/three.webgpu.min.js'),{ArenaGame}=await import('/game-logic.js'),{dropNanoSalvage}=await import('/nano-forge.js'),{createNanoForgeFX}=await import('/nano-forge-fx.js');
  const renderer=new T.WebGPURenderer({canvas:document.querySelector('canvas'),antialias:true});await renderer.init();renderer.info.autoReset=false;renderer.setSize(800,500);
  const scene=new T.Scene();scene.background=new T.Color(0x142334);scene.add(new T.HemisphereLight(0xd5f6ff,0x24363f,4));const light=new T.DirectionalLight(0xffffff,3);light.position.set(2,5,3);scene.add(light);
  const camera=new T.PerspectiveCamera(52,800/500,.04,50);camera.position.set(1.5,1.5,2.4);camera.lookAt(0,.5,0);scene.add(camera);scene.add(new T.GridHelper(10,20,0x68b0ba,0x334657));
  const game=new ArenaGame([],()=>.5,{height:()=>0,surfaces:()=>[],routes:[],lifts:[]});game.configureWeaponAccess({mode:'arena',level:3});Object.assign(game.player,{x:0,z:0});game.nano.plans=[{id:'matrice',name:'Matrice de manipulation nanométrique',x:-.5,y:0,z:-.2}];dropNanoSalvage(game,{x:.55,z:0,elevation:0,tier:6,form:'synth'});
  const fx=createNanoForgeFX(T,{scene,camera});fx.handle({type:'nano-crafted',name:'Assemblage',companion:'Gaby'});fx.update(game,.016);
  const target=new T.RenderTarget(800,500);renderer.setRenderTarget(target);await renderer.renderAsync(scene,camera);
  const bytes=await renderer.readRenderTargetPixelsAsync(target,0,0,800,500),stride=bytes.length===800*500*4?800*4:Math.ceil(800*4/256)*256,rgba=new Uint8ClampedArray(800*500*4);for(let y=0;y<500;y++)rgba.set(bytes.subarray(y*stride,y*stride+800*4),y*800*4);
  const c=document.createElement('canvas');c.width=800;c.height=500;c.getContext('2d').putImageData(new ImageData(rgba,800,500),0,0);return{native:renderer.backend.isWebGPUBackend,draws:renderer.info.render.drawCalls,triangles:renderer.info.render.triangles,fx:fx.stats(),png:c.toDataURL()};
 });
 const png=result.png;delete result.png;result.errors=errors;writeFileSync(out+'/native-nano.png',Buffer.from(png.split(',')[1],'base64'));writeFileSync(out+'/native-webgpu.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));assert.ok(result.native);assert.equal(result.fx.nanites,64);assert.ok(result.draws<20);assert.deepEqual(errors,[]);
}finally{await browser.close();}
