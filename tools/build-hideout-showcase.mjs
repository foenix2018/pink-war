// Bake the actual game builders offline: the refuge never creates extra rigs.
import {mkdirSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.PINK_WARS_BASE_URL||'http://127.0.0.1:4176',out=new URL('../dist/assets/hideout/',import.meta.url);
mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});let result;
try{
 const page=await browser.newPage();page.on('pageerror',e=>{throw e;});await page.route('**/showcase-build',r=>r.fulfill({contentType:'text/html',body:'<!doctype html>'}));await page.goto(base+'/showcase-build');
 result=await page.evaluate(async()=>{
  const T=await import('/vendor/three.webgpu.min.js'),{createHideoutShowcase,freezeShowcase,showcaseMaterialResolver}=await import('/hideout-showcase.js');
  const layout=await(await fetch('/assets/hideout/layout.json')).json();
  const source=await createHideoutShowcase({layout,levels:{ghju:10,lylu:10}});
  const baked=freezeShowcase(source.root,{name:'Armes, tenues et compagnons officiels',resolveMaterial:showcaseMaterialResolver()});
  const pending=[];for(const mesh of baked.root.children)for(const value of Object.values(mesh.material))if(value?.isTexture&&value.image instanceof HTMLImageElement&&!value.image.complete)pending.push(new Promise((yes,no)=>{value.image.addEventListener('load',yes,{once:true});value.image.addEventListener('error',no,{once:true});}));await Promise.all(pending);
  const json=baked.root.toJSON();delete json.geometries;delete json.object;
  const images=new Map(json.images.map(i=>[i.uuid,i]));
  for(const mesh of baked.root.children)for(const texture of Object.values(mesh.material)){
   if(!texture?.isTexture)continue;const image=texture.image,record=images.get(texture.source.uuid);if(!record)continue;
   const url=image?.currentSrc||image?.src;
   if(url?.startsWith(location.origin+'/'))record.url='./'+new URL(url).pathname.slice(1);
   else if(image?.data&&(image.data instanceof Uint8Array||image.data instanceof Uint8ClampedArray)){
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const data=new Uint8ClampedArray(image.width*image.height*4),channels=image.data.length/(image.width*image.height);
    for(let i=0;i<image.width*image.height;i++){data[i*4]=image.data[i*channels];data[i*4+1]=image.data[i*channels+Math.min(1,channels-1)];data[i*4+2]=image.data[i*channels+Math.min(2,channels-1)];data[i*4+3]=channels===4?image.data[i*channels+3]:255;}
    canvas.getContext('2d').putImageData(new ImageData(data,image.width,image.height),0,0);record.url=canvas.toDataURL('image/png');
   }
  }
  const encode=array=>{const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);let text='';for(let i=0;i<bytes.length;i+=16384)text+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(text);};
  return{snapshot:source.snapshot(),materials:json,parts:baked.root.children.map(m=>({material:m.material.uuid,attributes:Object.fromEntries(['position','normal','uv','uv1','color'].map(k=>[k,encode(m.geometry.attributes[k].array)]))})),batches:baked.batches,triangles:baked.triangles};
 });
}finally{await browser.close();}
const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
const decoded=result.parts.map(p=>{const a=Object.fromEntries(Object.entries(p.attributes).map(([k,b])=>{const bytes=Buffer.from(b,'base64');return[k,new Float32Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/4)];}));for(let i=0;i<a.position.length;i++) {const k=i%3;min[k]=Math.min(min[k],a.position[i]);max[k]=Math.max(max[k],a.position[i]);}return{material:p.material,a};});
const chunks=[],primitives=[];let offset=0;
function append(bytes){const padding=(-offset)&3;if(padding){chunks.push(Buffer.alloc(padding));offset+=padding;}const at=offset;chunks.push(Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength));offset+=bytes.byteLength;return at;}
for(const {material,a}of decoded){
 const unique=new Map(),vertices=[],indices=[];
 for(let i=0;i<a.position.length/3;i++){
  const values=[...a.position.subarray(i*3,i*3+3),...a.normal.subarray(i*3,i*3+3),...a.uv.subarray(i*2,i*2+2),...a.uv1.subarray(i*2,i*2+2),...a.color.subarray(i*3,i*3+3)];
  const key=values.map(v=>Math.round(v*1e5)).join(',');if(!unique.has(key)){unique.set(key,vertices.length);vertices.push(values);}indices.push(unique.get(key));
 }
 const n=vertices.length,pos=new Int16Array(n*3),nor=new Int8Array(n*4),uv=new Float32Array(n*2),uv1=new Uint16Array(n*2),color=new Float32Array(n*3);
 vertices.forEach((v,i)=>{for(let k=0;k<3;k++){pos[i*3+k]=Math.max(-32767,Math.min(32767,Math.round((v[k]-min[k])/Math.max(1e-6,max[k]-min[k])*65534-32767)));nor[i*4+k]=Math.round(v[3+k]*127);color[i*3+k]=v[10+k];}for(let k=0;k<2;k++){uv[i*2+k]=k===1?1-v[6+k]:v[6+k];uv1[i*2+k]=Math.round(Math.max(0,Math.min(1,v[8+k]))*65535);}});
 const ix=n>65535?new Uint32Array(indices):new Uint16Array(indices);const p={material,vertices:n,indices:ix.length,index32:n>65535};p.position=append(pos);p.normal=append(nor);p.uv0=append(uv);p.uv1=append(uv1);p.color=append(color);p.index=append(ix);primitives.push(p);
}
const meta={min,max,primitives,source:'Canonical Pink Wars builders · offline static capture',units:'metres'};let header=Buffer.from(JSON.stringify(meta));header=Buffer.concat([header,Buffer.alloc((-header.length)&3,32)]);const prefix=Buffer.alloc(8);prefix.write('PWM1');prefix.writeUInt32LE(header.length,4);
const packed=gzipSync(Buffer.concat([prefix,header,...chunks]),{level:9});
const materials={...result.materials,catalogue:result.snapshot,source:'createWeaponModels + installPinkWarsSoldier + poseUnarmedForInspection + createCompanionModel',triangles:result.triangles,batches:result.batches,downloadBytes:packed.byteLength};
writeFileSync(new URL('showcase.pwm.gz',out),packed);writeFileSync(new URL('showcase-materials.json',out),JSON.stringify(materials));
writeFileSync(new URL('showcase-stats.json',out),JSON.stringify({triangles:result.triangles,batches:primitives.length,vertices:primitives.reduce((s,p)=>s+p.vertices,0),downloadBytes:packed.byteLength,materialBytes:JSON.stringify(materials).length,companions:result.snapshot.companions.length,weapons:result.snapshot.weapons.length,outfits:result.snapshot.outfits.length},null,2));
console.log(JSON.stringify({triangles:result.triangles,batches:primitives.length,downloadBytes:packed.byteLength,companions:result.snapshot.companions.length,weapons:result.snapshot.weapons.length,outfits:result.snapshot.outfits.length}));
