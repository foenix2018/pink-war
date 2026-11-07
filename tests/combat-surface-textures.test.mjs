import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.core.min.js';
import {createCombatSurfaceTextures,metricSurfaceUV} from '../dist/combat-surface-textures.js';

test('surface density follows physical dimensions rather than stretching one tile over each box',()=>{
 const geometry=metricSurfaceUV(new T.BoxGeometry(12,3,2),2),p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
 let min=Infinity,max=-Infinity;for(let i=0;i<p.count;i++)if(n.getZ(i)>.9){min=Math.min(min,uv.getX(i));max=Math.max(max,uv.getX(i));}
 assert.equal(max-min,6);assert.ok([...uv.array].every(Number.isFinite));geometry.dispose();
});
test('loads lazily, shares matching maps, separates repetitions and excludes normal maps on compact profiles',async()=>{
 const before=globalThis.document;globalThis.document={};
 try{for(const low of [true,false]){
  const jobs=[],kit=createCombatSurfaceTextures({...T,TextureLoader:class{load(url,ok,progress,fail){jobs.push({url,ok,fail});}}},{low});
  const a=new T.MeshStandardMaterial(),b=a.clone(),c=a.clone();kit.bind(a,'steel');kit.bind(b,'steel');kit.bind(c,'steel',[3,2]);assert.equal(jobs.length,0);
  const ready=kit.enable();kit.enable();assert.equal(jobs.length,low?2:3);
  for(const job of jobs)job.ok(new T.Texture());await ready;
  assert.equal(a.map,b.map);assert.notEqual(a.map,c.map);assert.equal(a.map.source,c.map.source);assert.deepEqual(c.map.repeat.toArray(),[3,2]);
  assert.equal(a.map.colorSpace,T.SRGBColorSpace);assert.equal(a.roughnessMap.colorSpace,T.NoColorSpace);assert.equal(!!a.normalMap,!low);
  const late=a.clone();kit.bind(late,'steel');await kit.ready;assert.equal(late.map,a.map);assert.equal(jobs.length,low?2:3);
  kit.dispose();for(const m of [a,b,c,late])m.dispose();
 }}finally{globalThis.document=before;}
});
test('failed images retain fallback textures and disposal ignores pending callbacks and shared fallbacks',async()=>{
 const before=globalThis.document;globalThis.document={};
 try{
  const jobs=[],fallback=new T.Texture();let fallbackFreed=0;fallback.addEventListener('dispose',()=>fallbackFreed++);
  const kit=createCombatSurfaceTextures({...T,TextureLoader:class{load(url,ok,progress,fail){jobs.push({ok,fail});}}},{low:true});
  const m=new T.MeshStandardMaterial({map:fallback});kit.bind(m,'steel');const ready=kit.enable();jobs[0].fail();jobs[1].ok(new T.Texture());await ready;assert.equal(m.map,fallback);assert.equal(kit.stats().failed,1);kit.dispose();assert.equal(fallbackFreed,0);
  const waiting=[],late=createCombatSurfaceTextures({...T,TextureLoader:class{load(url,ok){waiting.push(ok);}}},{low:true});late.bind(m,'crate');const pending=late.enable();late.dispose();let released=0;
  for(const cb of waiting){const tex=new T.Texture();tex.addEventListener('dispose',()=>released++);cb(tex);}await pending;assert.equal(released,2);assert.equal(m.map,fallback);late.dispose();m.dispose();fallback.dispose();
 }finally{globalThis.document=before;}
});

test('arena uses local scanned asphalt and concrete at 1k only on the detailed profile',async()=>{
 const before=globalThis.document;globalThis.document={};
 try{for(const low of [true,false]){
  const urls=[],kit=createCombatSurfaceTextures({...T,TextureLoader:class{load(url,ok){urls.push(url);ok(new T.Texture());}}},{low,detailed:true});
  const road=new T.MeshStandardMaterial(),wall=new T.MeshStandardMaterial();kit.bind(road,'asphalt');kit.bind(wall,'concrete');await kit.enable();
  assert.ok(urls.some(u=>u.endsWith('asphalt_03_diff_'+(low?'512':'1k')+'.jpg')));
  assert.ok(urls.some(u=>u.endsWith('concrete_floor_diff_'+(low?'512':'1k')+'.jpg')));
  assert.equal(urls.length,low?4:6);assert.equal(!!road.normalMap,!low);kit.dispose();
 }}finally{globalThis.document=before;}
});
