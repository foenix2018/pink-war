import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.AUDIT_OUTPUT||'/tmp/pink-m09-details',tag=process.env.CAPTURE_TAG||'after';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-unsafe-webgpu','--enable-dawn-features=allow_unsafe_apis','--enable-features=Vulkan','--use-vulkan=swiftshader','--disable-vulkan-surface']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/m09-details-verify',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><canvas></canvas>'}));if(tag==='before'){await page.route('**/assets/m09/gardens.pwm.gz',r=>r.fulfill({body:readFileSync(out+'/before-gardens.pwm.gz'),contentType:'application/octet-stream'}));await page.route('**/assets/m09/materials.json',r=>r.fulfill({body:readFileSync(out+'/before-materials.json'),contentType:'application/json'}));}
 await page.goto('http://127.0.0.1:4176/m09-details-verify');
 const result=await page.evaluate(async()=>{
  const T=await import('/vendor/three.webgpu.min.js'),{createM09Art}=await import('/m09-art.js');
  const renderer=new T.WebGPURenderer({canvas:document.querySelector('canvas'),antialias:true});await renderer.init();renderer.setSize(1152,768);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const scene=new T.Scene(),art=createM09Art(T,scene,{webgpu:true});await art.ready;const camera=new T.PerspectiveCamera(42,1.5,.1,2500),target=new T.RenderTarget(1152,768);target.texture.colorSpace=T.SRGBColorSpace;
  const views={terminal:[[-99.1,12.6,122],[-102.4,11.2,118.8]],garden:[[-86,13.4,119],[-91.8,11.2,112]],janus:[[12,57,-47],[-8,63,-102]],shuttle:[[121,28,97],[107,25,80]],overview:[[150,220,330],[0,16,-25]]},frames={};
  for(const [name,[eye,aim]]of Object.entries(views)){camera.position.set(...eye);camera.lookAt(...aim);camera.updateMatrixWorld();art.update(4,.05,camera);renderer.setRenderTarget(target);await renderer.renderAsync(scene,camera);const bytes=await renderer.readRenderTargetPixelsAsync(target,0,0,1152,768),canvas=document.createElement('canvas');canvas.width=1152;canvas.height=768;canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(bytes),1152,768),0,0);frames[name]=canvas.toDataURL();}
  return{native:renderer.backend.isWebGPUBackend,stats:art.stats(),frames};
 });assert.ok(result.native);assert.deepEqual(errors,[]);for(const [name,png]of Object.entries(result.frames))writeFileSync(out+'/'+tag+'-'+name+'.png',Buffer.from(png.split(',')[1],'base64'));delete result.frames;result.errors=errors;writeFileSync(out+'/'+tag+'-details.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
