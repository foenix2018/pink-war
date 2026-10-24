import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.min.js';
import {installLeanPBR} from '../dist/level2-materials.js';

test('a slow first render cannot permanently replace packaged photographs with procedural textures',async t=>{
 const saved=new Map(['document','Image'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 t.after(()=>{for(const [k,d]of saved)d?Object.defineProperty(globalThis,k,d):delete globalThis[k];});
 const images=[];
 class Image {constructor(){images.push(this);}}
 Object.defineProperty(globalThis,'Image',{configurable:true,value:Image});
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement(){const canvas={};canvas.getContext=()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){},drawImage(image){canvas.decodedFrom=image.src;}});return canvas;}}});
 const materials=Object.fromEntries(['asphalt','concrete','wall','plaster','dark','iron','road','rust'].map(k=>[k,new T.MeshStandardMaterial()]));
 const architecture={pbrTargets:{masonry:new T.MeshStandardMaterial()}};
 const controller=installLeanPBR(T,materials,architecture,{performance:true,fallbackAfter:1});
 await new Promise(resolve=>setTimeout(resolve,15));
 assert.equal(controller.stats.fallback,6);
 const temporary=materials.asphalt.map,version=temporary.version;
 for(const image of images)image.onload();
 await controller.done;
 assert.equal(controller.stats.loadedFromSource,6);assert.equal(controller.stats.fallback,0);
 assert.equal(materials.asphalt.map,temporary,'upgrade in place instead of allocating another GPU map');
 assert.ok(temporary.version>version);assert.match(temporary.image.decodedFrom,/asphalt_03_diff_512\.jpg/);
 assert.equal(architecture.pbrTargets.masonry.map.image.width,128);
 for(const texture of controller.textures)texture.dispose();
});
