#!/usr/bin/env node
// Export the actual RLH dressed firefighter, without an FBX loader in the game.
// Usage: node tools/export-rlh-firefighter.cjs /path/to/RLH output.json [http://127.0.0.1:4173]
const fs=require('node:fs'),path=require('node:path');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const source=path.resolve(process.argv[2]||'/workspace/RLH'),output=path.resolve(process.argv[3]||'/tmp/rlh-dressed-object.json'),origin=process.argv[4]||'http://127.0.0.1:4173';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage();
  await page.route('**/__rlh_export.html',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><script type="module">import * as T from './vendor/three.webgpu.min.js';window.THREE={...T,LoaderUtils:{extractUrlBase:T.LoaderUtils.extractUrlBase,decodeText:b=>new TextDecoder().decode(b)},PMREMGenerator:class{fromScene(){return {texture:new T.Texture()}}dispose(){}}};window.__rlhRenderer={capabilities:{getMaxAnisotropy:()=>4}};window.ready=true;</script>`}));
  await page.goto(origin+'/__rlh_export.html');await page.waitForFunction(()=>window.ready);
  for(const file of ['js/vendor/fflate.min.js','js/vendor/FBXLoader.js','js/modules/gameplay/mask-msa-g1-v757.js','js/modules/gameplay/firefighter-gear-v691.js'])await page.addScriptTag({path:path.join(source,file)});
  const chunks=fs.readdirSync(path.join(source,'js/chunks')).filter(f=>/^pompier-mixamo-idle-part/.test(f)).sort(),b64=chunks.map(f=>fs.readFileSync(path.join(source,'js/chunks',f),'utf8').match(/='([^']+)'/)[1]).join('');
  const raw=await page.evaluate(base=>{
   const buffer=Uint8Array.from(atob(base),x=>x.charCodeAt(0)).buffer,actor=new THREE.FBXLoader().parse(buffer,'');actor.updateMatrixWorld(true);
   const box=new THREE.Box3().setFromObject(actor),scale=1.90/(box.max.y-box.min.y);actor.scale.setScalar(scale);actor.position.y=-box.min.y*scale;actor.updateMatrixWorld(true);
   if(!RLH_GEAR_V684.dress(actor))throw Error('RLH gear could not dress the source skeleton');actor.updateMatrixWorld(true);
   actor.traverse(o=>{if(!o.isMesh)return;
    // Preserve baked primitive transforms, not just constructor parameters.
    o.geometry.type='BufferGeometry';delete o.geometry.parameters;o.geometry.toJSON=THREE.BufferGeometry.prototype.toJSON;
    for(const material of Array.isArray(o.material)?o.material:[o.material]){material.envMap=null;material.onBeforeCompile=()=>{};material.userData={};}
    o.onBeforeRender=()=>{};
   });return JSON.stringify(actor.toJSON());
  },b64);
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,raw);console.log(output,raw.length,'bytes');
 }finally{await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
