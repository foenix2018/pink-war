import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnemyDestructionFX,enemyDamageStage,robotDeathDuration} from '../dist/enemy-destruction-fx.js';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');
class Dummy{
 constructor(){this.position={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;}};
 this.rotation={x:0,y:0,z:0};this.instanceMatrix={setUsage(){},needsUpdate:false};
 this.count=0;this.visible=true;this.quaternion={};}
 setMatrixAt(){}dispose(){}
}
class V{
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
 setScalar(n){this.n=n;return this;}
 normalize(){return this;}
 setFromAxisAngle(){return this;}
 identity(){return this;}
 copy(){return this;}
}
const T={DataTexture:Dummy,PlaneGeometry:Dummy,TetrahedronGeometry:Dummy,BoxGeometry:Dummy,MeshBasicMaterial:Dummy,InstancedMesh:Dummy,Vector3:V,Quaternion:V,Matrix4:class{compose(){}},RGBAFormat:1,LinearFilter:2,DynamicDrawUsage:3,DoubleSide:4,AdditiveBlending:5};
test('robot health damage spawns bounded smoke/spark meshes and delayed explosions',()=>{
 const scene={added:new Set(),add(...xs){xs.forEach(x=>this.added.add(x));},remove(...xs){xs.forEach(x=>this.added.delete(x));}};
 const camera={position:{x:0,y:1,z:0},quaternion:{}};
 const fx=createEnemyDestructionFX(T,scene,{camera,low:true,maxDeaths:4});
 const model=new Dummy();model.position.set(3,0,4);scene.add(model);
 for(let i=0;i<20;i++){fx.mark({id:7,form:'stalker',hp:10,maxHp:100,x:3,z:4,elevation:0},model,.05);fx.update(.05);}
 assert.ok(fx.stats().damagedParticles>0);
 assert.ok(fx.stats().electricArcs>0,'damaged robots emit visible electrical arcs');
 assert.ok(fx.stats().damagedParticles<=75,'low power budget');
 fx.kill(model,{id:7,form:'stalker',x:3,z:4,groundY:0});
 assert.equal(fx.stats().falling,1);
 for(let i=0;i<9;i++)fx.update(.05);
 assert.equal(fx.stats().falling,1,'falls before blowing up');
 for(let i=0;i<30;i++)fx.update(.05);
 assert.equal(fx.stats().falling,0);
 assert.ok(fx.stats().explosions>0,'fire/smoke/debris blast spawned');
 assert.equal(scene.added.has(model),false,'robot rig removed after blast only');
 fx.reset();
 assert.equal(fx.stats().explosions,0,'reset clears active blasts');
 assert.equal(fx.stats().damagedParticles,0,'reset clears particles');
 fx.dispose();
});
test('shared scenes and missions consume the same destruction FX and preserve gameplay damage rules',()=>{
 const main=read('scene.js');assert.match(main,/enemyFailureFX\.kill\(/);assert.match(main,/enemyFailureFX\.mark\(/);
 assert.match(main,/enemyFailureFX\.dispose\(/);
 for(const file of ['level2-test.js','niveau3.js','niveau4.js','ligne9.js']){
  const s=read(file);assert.match(s,/enemyDestructionFX\?\.mark\(e,model,dt\)/);
  assert.match(s,/enemyDestructionFX\.kill\(o,/);
  assert.match(s,/enemyDestructionFX\?\.reset\(\)/);
 }
 const gameplay=read('game-logic.js');
 assert.doesNotMatch(gameplay,/createEnemyDestructionFX/);
 assert.ok(robotDeathDuration('probe')<robotDeathDuration('brute'));
 assert.ok(enemyDamageStage(15,100).sparks>enemyDamageStage(75,100).sparks);
});
