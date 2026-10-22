import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PBR_ASSETS} from '../dist/level2-materials.js';
const level=readFileSync(new URL('../dist/level2-test.js',import.meta.url),'utf8');
const materialSource=readFileSync(new URL('../dist/level2-materials.js',import.meta.url),'utf8');
const architecture=readFileSync(new URL('../dist/level2-architecture.js',import.meta.url),'utf8');

test('W02 uses five shared low-res material sets from the packaged CC0 library',()=>{
 assert.deepEqual(Object.keys(PBR_ASSETS),['asphalt','concrete','blueMetal','chequer','rust']);
 for(const material of Object.values(PBR_ASSETS)){
  assert.ok(material.asset);
  assert.ok(material.roughness>=0&&material.roughness<=1);
  assert.ok(material.metalness>=0&&material.metalness<=1);
 }
 assert.match(materialSource,/jpg\/1k/);
 assert.match(materialSource,/performance\?256:512/);
 assert.match(materialSource,/T\.SRGBColorSpace/);
 assert.match(materialSource,/T\.RepeatWrapping/);
 assert.match(materialSource,/Promise\.allSettled/);
 assert.match(materialSource,/proceduralCanvas/);
 assert.doesNotMatch(materialSource,/TextureLoader\([\s\S]*normalMap/);
});
test('W02 keeps boot and engine independent of CDN download',()=>{
 assert.match(level,/installLeanPBR\(T,materials,architecture/);
 assert.match(level,/scene\.add\(camera\);createEnvironment\(\)/);
 assert.match(level,/setupPlayer\(\);resize\(\)/);
 assert.doesNotMatch(level,/await installLeanPBR/);
 assert.match(level,/createCompatibleRenderer/);
});
test('Architectural meshes use static quality booleans, not callable boolean',()=>{
 assert.doesNotMatch(architecture,/!\s*low\(\)/);
 assert.match(architecture,/mesh\.castShadow=!low;/);
 assert.match(architecture,/pbrTargets/);
});
test('No unexpected Full HD or 4K texture transfer',()=>{
 assert.doesNotMatch(materialSource,/\/(2k|4k|8k|16k)\//i);
 const high=Object.keys(PBR_ASSETS).length*512*512*4*1.34*3/(1024*1024);
 const perf=Object.keys(PBR_ASSETS).length*256*256*4*1.34*2/(1024*1024);
 assert.ok(high<21,'color, normal and roughness stay below 21 MiB');
 assert.ok(perf<3.5,'phone omits normals and stays below 3.5 MiB');
});
