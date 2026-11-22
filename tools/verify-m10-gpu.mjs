import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.AUDIT_OUTPUT||'/tmp/pink-m10-details',tag=process.env.CAPTURE_TAG||'after';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-unsafe-webgpu','--enable-dawn-features=allow_unsafe_apis','--enable-features=Vulkan','--use-vulkan=swiftshader','--disable-vulkan-surface']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/m10-details-verify',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><canvas></canvas>'}));
 await page.goto('http://127.0.0.1:4176/m10-details-verify');
 const result=await page.evaluate(async()=>{
  const T=await import('/vendor/three.webgpu.min.js'),{createM10Art}=await import('/m10-art.js'),L=await import('/m10-layout.js');
  const renderer=new T.WebGPURenderer({canvas:document.querySelector('canvas'),antialias:true});await renderer.init();renderer.setSize(1152,768);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const scene=new T.Scene(),art=createM10Art(T,scene,{webgpu:true});art.build(L.buildCollisions({open:['access','security','laboratoires','archives','evacuation']}));for(const id of ['access','security','laboratoires','archives','evacuation'])art.setDoor(id,true);await art.ready;const camera=new T.PerspectiveCamera(42,1.5,.1,2500),target=new T.RenderTarget(1152,768);target.texture.colorSpace=T.SRGBColorSpace;
  const views={overview:[[105,100,160],[8,8,-5]],laboratory:[[-20,14.2,-60],[-25.7,13.9,-72]],archives:[[20,14.1,-60],[26,13.8,-72]],kessler:[[3,14.4,-45],[0,15.1,-57]],extraction:[[80,30,-35],[58,14,-64]]},frames={};
  for(const [name,[eye,aim]]of Object.entries(views)){camera.position.set(...eye);camera.lookAt(...aim);camera.updateMatrixWorld();art.update(4,1,camera);renderer.setRenderTarget(target);await renderer.renderAsync(scene,camera);const bytes=await renderer.readRenderTargetPixelsAsync(target,0,0,1152,768),canvas=document.createElement('canvas');canvas.width=1152;canvas.height=768;canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(bytes),1152,768),0,0);frames[name]=canvas.toDataURL();}
  return{native:renderer.backend.isWebGPUBackend,stats:art.stats(),frames};
 });assert.ok(result.native);assert.equal(result.stats.scanShader,'TSL → WGSL');assert.equal(result.stats.reunionHero,'lylu');assert.equal(result.stats.secondSphere,'Cara');assert.ok(result.stats.foliage?.cards>0&&result.stats.foliage?.wind);assert.ok(result.stats.batching?.savedDraws>0);assert.deepEqual(errors,[]);for(const [name,png]of Object.entries(result.frames))writeFileSync(out+'/'+tag+'-'+name+'.png',Buffer.from(png.split(',')[1],'base64'));delete result.frames;result.errors=errors;writeFileSync(out+'/'+tag+'-details.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
