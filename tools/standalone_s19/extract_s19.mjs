#!/usr/bin/env node
// Standalone SONDE S-19 extractor. Reads actual Pink Wars probe geometry and rig.
// Only writes to exports/sonde-s19, never edits dist/ or deploys the game.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
import { build } from 'esbuild';

const require=createRequire(import.meta.url), out=path.resolve('exports/sonde-s19');
fs.mkdirSync(out,{recursive:true});
const exporterFile=require.resolve('three/addons/exporters/GLTFExporter.js');
const exporter=await build({entryPoints:[exporterFile],bundle:true,platform:'browser',format:'esm',write:false,
  alias:{three:path.resolve('dist/vendor/three.webgpu.min.js')},logLevel:'silent'});
const exporterJS=exporter.outputFiles[0].text;
const port=4193,origin='http://127.0.0.1:'+port;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory','dist'],{stdio:'ignore'});
let browser;
try {
  for(let i=0;i<100;i++){try{if((await fetch(origin+'/ennemis.html')).ok)break;}catch{}await new Promise(r=>setTimeout(r,150));}
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1250,height:950},acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/__pw_exporter.js',route=>route.fulfill({contentType:'text/javascript',body:exporterJS}));
  await page.goto(origin+'/ennemis.html?form=probe',{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>window.__PINKWAR_ENEMIES?.actor?.userData?.form==='probe',null,{timeout:60000});
  // The existing enemy lab screenshot is a trusted before-state.
  await page.waitForTimeout(750);
  await page.screenshot({path:path.join(out,'SONDE-S19-ORIGINAL.png')});
  const incoming=page.waitForEvent('download',{timeout:180000});
  const report=await page.evaluate(async()=>{
    const actor=window.__PINKWAR_ENEMIES.actor;
    const T=await import('./vendor/three.webgpu.min.js');
    const {GLTFExporter}=await import('/__pw_exporter.js');
    const restores=[];
    actor.rotation.y=0;
    actor.userData.animate?.(0,0,false,{awareness:'patrol'},0);
    actor.updateMatrixWorld(true);
    let triangles=0,meshes=0;
    actor.traverse(o=>{
      if(!o.isMesh)return;
      meshes++;
      triangles+=o.geometry?.index?.count/3||o.geometry?.attributes?.position?.count/3||0;
      const skin=o.geometry?.getAttribute('skinIndex');
      if(o.isSkinnedMesh&&skin&&skin.array instanceof Float32Array){
        const original=o.geometry,geo=original.clone();
        geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(Uint16Array.from(skin.array),4));
        o.geometry=geo;restores.push({o,original,geo});
      }
      if(o.material) {
        const old=o.material;
        const clean=m=>{
          const c=m.clone();
          for(const k of Object.keys(c))if((k.endsWith('Map')||k==='envMap')&&c[k]?.isTexture)c[k]=null;
          return c;
        };
        o.material=Array.isArray(old)?old.map(clean):clean(old);
      }
    });
    const buffer=await new GLTFExporter().parseAsync(actor,{binary:true,trs:true,onlyVisible:true,maxTextureSize:1024});
    const url=URL.createObjectURL(new Blob([buffer],{type:'model/gltf-binary'}));
    const a=document.createElement('a');a.href=url;a.download='SONDE-S19-SOURCE.glb';document.body.append(a);a.click();a.remove();
    const boneNames=[];actor.traverse(o=>{if(o.isBone)boneNames.push(o.name)});
    return {objectName:actor.name,form:actor.userData.form,bytes:buffer.byteLength,meshes,triangles,boneNames,probeRevision:actor.userData.probeRevision};
  });
  const download=await incoming;const source=path.join(out,'SONDE-S19-SOURCE.glb');
  await download.saveAs(source);
  const bytes=fs.readFileSync(source);
  if(bytes.toString('ascii',0,4)!=='glTF')throw Error('GLB signature not found');
  fs.writeFileSync(path.join(out,'source-report.json'),JSON.stringify({...report,size:bytes.length,pageErrors:errors},null,2));
  console.log(JSON.stringify({...report,size:bytes.length,pageErrors:errors}));
  await page.close();
}finally{await browser?.close();server.kill('SIGTERM');}