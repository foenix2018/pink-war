#!/usr/bin/env node
// Isolated extraction of GHJU and LYLU from current Pink Wars game source.
// Only writes to exports/; no gameplay or production files are modified.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {chromium} from 'playwright';
import {build} from 'esbuild';
const require=createRequire(import.meta.url);
const repo=process.cwd(),out=path.join(repo,'exports','heroes');
fs.mkdirSync(out,{recursive:true});
const vendor=path.join(repo,'dist/vendor/three.webgpu.min.js');
const bundled=await build({entryPoints:[require.resolve('three/addons/exporters/GLTFExporter.js')],bundle:true,platform:'browser',format:'esm',write:false,alias:{three:vendor},logLevel:'silent'});
const exporterJS=bundled.outputFiles[0].text;
const original=fs.readFileSync('dist/personnage-lab.js','utf8');
const lab=original+'\nwindow.__PW_EXPORT={subjects,kit};\n';
const port=4187,origin='http://127.0.0.1:'+port;
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory','dist'],{stdio:'ignore'});
let browser;
async function ready(){
 for(let i=0;i<100;i++){try{const r=await fetch(origin+'/personnage.html');if(r.ok)return;}catch{}
  await new Promise(resolve=>setTimeout(resolve,150));}
 throw new Error('local server not available');
}
try{
 await ready();
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report=[];
 for(const id of ['ghju','lylu']){
  const page=await browser.newPage({viewport:{width:1152,height:900},acceptDownloads:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/personnage-lab.js*',route=>route.fulfill({contentType:'text/javascript',body:lab}));
  await page.route('**/__pw_exporter.js',route=>route.fulfill({contentType:'text/javascript',body:exporterJS}));
  await page.goto(origin+'/personnage.html',{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForFunction(()=>window.__PW_EXPORT?.subjects?.size===2,null,{timeout:90000});
  await page.evaluate(id=>window.__PINKWAR_CHARACTER_LAB.selectCharacter(id),id);
  await page.waitForTimeout(500);
  await page.screenshot({path:path.join(out,id.toUpperCase()+'-SOURCE.png')});
  const downloadPromise=page.waitForEvent('download',{timeout:240000});
  const stats=await page.evaluate(async id=>{
    window.requestAnimationFrame=()=>0;
    const {subjects,kit}=window.__PW_EXPORT,model=subjects.get(id);
    if(!model?.actor?.bones?.length||!model.shadowUnit)throw Error('Missing original hero rig/Shadow unit');
    const T=await import('./vendor/three.webgpu.min.js');
    const {createGlove}=await import('./hands.js');
    const {poseUnarmedForInspection}=await import('./rlh-firefighter.js');
    const {GLTFExporter}=await import('/__pw_exporter.js');
    model.root.visible=true;
    model.setLevel(1);
    const gloves=[createGlove(kit.gloves,{mirror:true,sleeve:false}),createGlove(kit.gloves,{sleeve:false})];
    gloves.forEach(g=>model.root.add(g));
    poseUnarmedForInspection(model,gloves);
    model.root.updateMatrixWorld(true);
    const restored=[];
    model.root.traverse(mesh=>{
      if(!mesh.isMesh||!mesh.visible)return;
      if(mesh.isSkinnedMesh){
        const a=mesh.geometry?.getAttribute('skinIndex');
        if(a&&a.array instanceof Float32Array){
          const geometry=mesh.geometry.clone();
          geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(Uint16Array.from(a.array),4));
          restored.push({mesh,oldGeometry:mesh.geometry,newGeometry:geometry});
          mesh.geometry=geometry;
        }
      }
      if(mesh.material){
        const old=mesh.material;
        const fix=m=>{
          const c=m.clone();
          for(const k of Object.keys(c))if((k.endsWith('Map')||k==='envMap')&&c[k]?.isTexture)c[k]=null;
          return c;
        };
        mesh.material=Array.isArray(old)?old.map(fix):fix(old);
        restored.push({mesh,oldMaterial:old,newMaterial:mesh.material});
      }
    });
    const clips=model.actor.data.clips.map(c=>c.animation).filter(Boolean);
    const buffer=await new GLTFExporter().parseAsync(model.root,{binary:true,trs:true,onlyVisible:true,animations:clips,maxTextureSize:2048});
    const blob=new Blob([buffer],{type:'model/gltf-binary'});
    const href=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=href;a.download=id.toUpperCase()+'-SOURCE.glb';document.body.append(a);a.click();a.remove();
    const result={character:id,bones:model.actor.bones.length,clips:clips.map(c=>c.name),bytes:buffer.byteLength,
      height:model.targetHeight,skins:model.actor.skeleton.bones.length,
      meshes:restored.filter(r=>r.oldGeometry).length};
    return result;
  },id);
  const download=await downloadPromise;
  const output=path.join(out,id.toUpperCase()+'-SOURCE.glb');
  await download.saveAs(output);
  const buf=fs.readFileSync(output);
  if(buf.toString('ascii',0,4)!=='glTF')throw Error('not a binary GLB: '+output);
  report.push({...stats,file:output,size:buf.length,pageErrors:errors});
  console.log(JSON.stringify(report.at(-1)));
  await page.close();
 }
 fs.writeFileSync(path.join(out,'extraction-report.json'),JSON.stringify(report,null,2));
}finally{await browser?.close();server.kill('SIGTERM');}