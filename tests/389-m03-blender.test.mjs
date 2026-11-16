import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import * as T from '../dist/vendor/three.webgpu.min.js';
import * as L from '../dist/m03-layout.js';
import {parsePWM} from '../dist/blender-models.js';

const ctx=new Proxy({},{get:(t,k)=>k==='createLinearGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});
globalThis.document??={createElement:()=>({width:0,height:0,getContext:()=>ctx,style:{}}),createElementNS:()=>({addEventListener(){},removeEventListener(){},style:{},setAttribute(){}})};
const {M03_MODEL_FILES}=await import('../dist/m03-depot.js');
const load=f=>{const b=readFileSync(new URL('../dist/assets/m03/models/'+f,import.meta.url));return parsePWM(T,b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));};

test('M03 Blender models exist with baked occlusion and stay on the floor',()=>{
 for(const file of Object.values(M03_MODEL_FILES)){
  assert.ok(existsSync(new URL('../dist/assets/m03/models/'+file+'_ao.jpg',import.meta.url)),file);
  const m=load(file+'.pwm');assert.ok(m.triangles>1000&&m.triangles<80000,file+' '+m.triangles);assert.ok(Math.abs(m.min[1])<.05,file+' on the floor');
 }
});
test('M03 factory line fits the conveyor and the robot bases that now collide',()=>{
 const m=load('factory_line.pwm'),F=L.FACTORY,len=F.line.x2-F.line.x1,world=L.extraObstacles();
 assert.ok(m.max[0]-m.min[0]<=len+.6,'line length');
 const robots=world.filter(o=>o.kind==='robot');assert.equal(robots.length,6);
 for(const r of robots){assert.ok(r.x>F.x1&&r.x<F.x2&&r.z>F.z1&&r.z<F.z2,'robot inside the plant');assert.ok(Math.abs(Math.abs(r.z-F.line.z)-1.95)<.01);}
 // No machine of the plant's encounter starts inside a robot.
 for(const u of [...L.ENCOUNTERS.usine.units,...L.ENCOUNTERS.usine2.units])for(const r of robots)assert.ok(Math.abs(u.x-r.x)>r.hx+.6||Math.abs(u.z-r.z)>r.hz+.6,'unit clear of robot');
});
test('M03 detention module and barrier posts fit their places',()=>{
 const d=load('detention_module.pwm'),mod=L.RETENTION_MODULES[0];
 assert.ok(d.max[0]-d.min[0]<=mod.x2-mod.x1+1.2&&d.max[2]-d.min[2]<=mod.z2-mod.z1+1.8);
 const b=load('barrier_posts.pwm');assert.ok(Math.abs(b.min[0]+10.1)<.4&&Math.abs(b.max[0]-9.95)<.4,'posts at ±9.6 m');
 const src=readFileSync(new URL('../dist/m03-depot.js',import.meta.url),'utf8');assert.match(src,/fallback\.removeFromParent\(\)/);assert.match(src,/modèles de repli/);
});
