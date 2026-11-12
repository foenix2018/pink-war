// Browser regression for sampled depth, shadows and post-processing. Requires
// Playwright and Chromium; no dependencies are added to the shipped game.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const server=createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/__render-check'){res.setHeader('content-type','text/html');res.end('<canvas></canvas>');return;}
 if(pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
 const path=resolve(root,'.'+decodeURIComponent(pathname));if(!path.startsWith(root.endsWith(sep)?root:root+sep)){res.writeHead(403);res.end();return;}
 try{res.setHeader('content-type',extname(path)==='.js'?'application/javascript':'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const args=['--no-sandbox'];
if(process.env.PINK_RENDER_SOFTWARE!=='0')args.push('--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-unsafe-webgpu','--enable-dawn-features=allow_unsafe_apis','--enable-features=Vulkan','--use-vulkan=swiftshader','--disable-vulkan-surface');
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args});
 const artPage=await browser.newPage(),artErrors=[];artPage.on('pageerror',e=>artErrors.push(String(e)));
 await artPage.goto(`http://127.0.0.1:${server.address().port}/__render-check`);
 const chapters=await artPage.evaluate(async()=>{
  const T=await import('./vendor/three.webgpu.min.js'),results=[];
  for(const chapter of ['04','06']){
   const artModule=await import(`./m${chapter}-art.js`),layout=await import(`./m${chapter}-layout.js`),scene=new T.Scene();
   const art=artModule[`createM${chapter}Art`](T,scene,{quality:'normal',webgpu:false});art.build(layout.buildCollisions());await art.ready;
   const camera=new T.PerspectiveCamera();camera.position.set(0,1.7,70);art.update(0,0,camera,{x:0,z:70,elevation:0});
   results.push({chapter,light:art.sun?.isDirectionalLight===true,photo:art.stats().photo});
  }
  return results;
 });
 assert.deepEqual(artErrors,[]);for(const result of chapters){assert.equal(result.light,true,'chapter lighting must expose its actual directional source');assert.equal(result.photo.failed,0);assert.ok(result.photo.loaded>0);}console.log(JSON.stringify({industrialChapters:chapters}));await artPage.close();
 for(const [backend,antialias]of [['webgpu',false],['webgpu',true],['webgl',true]]){
  const page=await browser.newPage({viewport:{width:256,height:192}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(`http://127.0.0.1:${server.address().port}/__render-check`);
  const result=await page.evaluate(async({backend,antialias})=>{
   const T=await import('./vendor/three.webgpu.min.js'),{WebGLRenderer}=await import('./vendor/three.module.min.js'),{installFPSGrade}=await import('./fps-grade.js'),{createWorldEffects}=await import('./webgpu-world-fx.js');
   const renderer=backend==='webgpu'?new T.WebGPURenderer({canvas:document.querySelector('canvas'),antialias}):new WebGLRenderer({canvas:document.querySelector('canvas'),antialias});
   if(renderer.init)await renderer.init();if(backend==='webgpu'&&!renderer.backend.isWebGPUBackend)throw new Error('A native WebGPU adapter is required for this check');
   renderer.setSize(256,192);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;
   const scene=new T.Scene(),camera=new T.PerspectiveCamera(65,4/3,.06,50);camera.position.set(3,2.3,5);camera.lookAt(0,.6,0);scene.add(camera);scene.background=new T.Color(0x192536);
   scene.add(new T.HemisphereLight(0xc2dbf4,0x24212a,1.6));const sun=new T.DirectionalLight(0xffc7a0,2.2);sun.position.set(3,6,1);sun.castShadow=true;sun.shadow.mapSize.set(512,512);scene.add(sun);
   const material=new T.MeshStandardMaterial({color:0xa6b1bc,roughness:.7});
   for(const [x,y,z,w,h,d]of [[0,-.1,0,10,.2,10],[0,1,-2,8,2,.2],[-2,1,0,.2,2,4],[0,.5,0,1,1,1],[1.7,.25,.5,.8,.5,1]]){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);}
   const fx=createWorldEffects(T,{webgpu:backend==='webgpu',reflections:true});if(fx.reflectionTarget)scene.add(fx.reflectionTarget);
   const water=new T.Mesh(new T.CircleGeometry(1,12),fx.water({puddle:true,refraction:false}));water.rotation.x=-Math.PI/2;water.position.set(0,.034,.8);scene.add(water);fx.fog(scene,{x:0,y:1.2,z:.2,width:2,height:3,depth:2,beam:true});fx.update(1,camera.position);
   const grade=installFPSGrade(renderer,{artQuality:'normal',antialias});if(renderer.renderAsync)await renderer.renderAsync(scene,camera);else renderer.render(scene,camera);
   const means=[];
   for(const ao of [false,true]){grade.setOcclusionEnabled(ao);let pixels;
    if(backend==='webgpu'){const target=new T.RenderTarget(256,192);target.texture.colorSpace=T.SRGBColorSpace;await grade.renderToTarget(scene,camera,target);pixels=await renderer.readRenderTargetPixelsAsync(target,0,0,256,192);target.dispose();}
    else{renderer.render(scene,camera);pixels=new Uint8Array(256*192*4);const gl=renderer.getContext();gl.readPixels(0,0,256,192,gl.RGBA,gl.UNSIGNED_BYTE,pixels);}
    let sum=0;for(let i=0;i<pixels.length;i+=4)sum+=pixels[i]+pixels[i+1]+pixels[i+2];means.push(sum/(256*192*3));
   }
   const result={backend,antialias,means,stats:grade.stats()};fx.dispose();renderer.dispose();return result;
  },{backend,antialias});
  assert.deepEqual(errors,[]);assert.ok(result.means.every(v=>Number.isFinite(v)&&v>2),'render must contain visible colour');
  if(backend==='webgpu'){assert.ok(result.means[1]<result.means[0]-.001,'contact occlusion must affect the geometry');assert.equal(result.stats.sceneSamples,0,'sampled depth must remain resolved when canvas antialiasing is enabled');}
  console.log(JSON.stringify(result));await page.close();
 }
}finally{await browser?.close();await new Promise(r=>server.close(r));}
