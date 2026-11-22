import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ArenaGame} from '../dist/game-logic.js';
import {createPinkWarsInput} from '../dist/level2-input.js';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {batchStaticGeometry} from '../dist/static-geometry-batch.js';
const sandbox=(hero,mode,level)=>{const g=new ArenaGame([]);g.reset(hero);g.configureWeaponAccess({mode,level});g.nextWave=Infinity;g.toSpawn=0;return g;};
function verify(g,dt){
 g.step(dt,{jump:true,jumpPressed:true});assert.equal(g.player.grounded,false);g.step(dt,{jump:true});assert.equal(g.player.airJumps,0,'holding the first press never spends the second jump');
 g.drainEvents();g.step(dt,{jump:true,jumpPressed:true});assert.equal(g.player.airJumps,1);assert.ok(g.player.verticalSpeed>0);assert.equal(g.drainEvents().filter(e=>e.type==='jump'&&e.kind==='double').length,1,'one edge across all low-FPS simulation slices');
 g.step(dt,{jump:true,jumpPressed:true});assert.equal(g.drainEvents().filter(e=>e.type==='jump').length,0,'a third press cannot give infinite jumps');
 for(let elapsed=0;elapsed<5;elapsed+=dt)g.step(dt,{jump:true});assert.ok(g.player.grounded);assert.equal(g.player.airJumps,0);assert.equal(g.drainEvents().filter(e=>e.type==='jump').length,0,'landing while held never auto-jumps');
 g.step(dt,{jump:false});g.step(dt,{jump:true,jumpPressed:true});assert.equal(g.player.grounded,false,'landing replenishes the two-press sequence');
}
for(const hero of ['ghju','lylu'])for(const level of Array.from({length:10},(_,i)=>i+1))for(const hz of [15,60])test(`${hero} · chapter ${level} · ${hz}Hz: a second press works even with no release frame`,()=>verify(sandbox(hero,'campaign',level),1/hz));
for(const mode of ['arena','training'])for(const hero of ['ghju','lylu'])test(hero+' · '+mode+': double jump has the same budget',()=>verify(sandbox(hero,mode,1),1/60));
test('a 200ms frame consumes only one jump press, then a second packet gives exactly one air jump',()=>{
 const g=sandbox('ghju','campaign',1);g.step(.2,{jump:true,jumpPressed:true});assert.equal(g.player.airJumps,0);assert.equal(g.drainEvents().filter(e=>e.type==='jump').length,1);g.step(.2,{jump:true,jumpPressed:true});assert.equal(g.player.airJumps,1);assert.equal(g.drainEvents().filter(e=>e.type==='jump').length,1);
});
test('gamepad A forwards its edge separately from the held state, so it can sustain the second jump',()=>{
 const input=createPinkWarsInput(),keys=new Set(),buttons=Array.from({length:17},()=>({pressed:false,value:0})),pad={index:0,id:'Standard Pad',mapping:'standard',connected:true,axes:[0,0,0,0],buttons,timestamp:1};
 const read=()=>input.read(1/60,keys,[pad]);read();buttons[0]={pressed:true,value:1};let a=read();assert.ok(a.jumpPressed&&a.jump);a=read();assert.equal(a.jumpPressed,false);assert.equal(a.jump,true,'still held, not a one-frame pulse');buttons[0]={pressed:false,value:0};a=read();assert.equal(a.jump,false);buttons[0]={pressed:true,value:1};a=read();assert.equal(a.jumpPressed,true);input.reset();
});
test('every playable campaign adapter, arena and range forwards the press independently of the held key',()=>{
 const read=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');
 for(const file of ['level2-test.js','niveau3.js','niveau4.js','ligne9.js','niveau6.js','niveau7.js','niveau8.js','niveau9.js','niveau10.js','couronne-helix.js']){const s=read(file);assert.match(s,/const jumpPressed=jumpQueued\|\|controls\.jumpPressed/);assert.match(s,/sprint,jump,jumpPressed,crouchToggle/);assert.match(s,/e\.code==='KeyJ'\|\|e\.code==='Space'/);}
 assert.match(read('game.js'),/jump,jumpPressed,crouchToggle/);assert.match(read('vesper-level1-v7.html'),/jumpPressed:jumpQueued,jump:jumpQueued\|\|padJump/);assert.match(read('mission-xr.js'),/jump:down\(rp\?\.buttons\[4\]\),jumpPressed:jump/);assert.match(read('level2-input.js'),/state\.jump=false/);
});
for(const [n,file]of [[3,'m03-layout'],[4,'m04-layout'],[5,'ligne9-layout'],[6,'m06-layout'],[7,'m07-layout'],[8,'m08-layout'],[9,'m09-layout'],[10,'m10-layout']])test('actual chapter '+n+' spawn keeps the shared second impulse above its own floor',async()=>{
 const L=await import('../dist/'+file+'.js');let obstacles,traversal;if(n===3){const S=await import('../dist/m03-sector.js'),meta=JSON.parse(readFileSync(new URL('../dist/assets/m03/vesper-sector.json',import.meta.url)));obstacles=S.sectorObstacles(meta);traversal=S.sectorTraversal(meta);}else{obstacles=L.buildCollisions();traversal=L.createTraversal();}const g=new ArenaGame(obstacles,()=>.5,traversal,'lylu');g.nextWave=Infinity;g.toSpawn=0;g.configureWeaponAccess({mode:'campaign',level:n});const p=L.START;Object.assign(g.player,{x:p.x,z:p.z,elevation:g.surfaceHeight(p.x,p.z),grounded:true});
 const floor=g.player.elevation;assert.ok(Number.isFinite(floor));g.step(1/60,{jump:true,jumpPressed:true});g.step(1/60,{jump:true});g.step(1/60,{jump:true,jumpPressed:true});assert.equal(g.player.airJumps,1);assert.ok(g.player.elevation>floor);assert.ok(g.player.verticalSpeed>0);
});
test('static batching preserves real world geometry and UVs while keeping glass and moving groups separate',()=>{
 const root=new T.Group(),mat=new T.MeshStandardMaterial({vertexColors:true}),glass=new T.MeshStandardMaterial({transparent:true,opacity:.5});const original=[];
 for(let i=0;i<3;i++){const geometry=new T.BoxGeometry(1,1,1),colors=new Uint8Array(geometry.attributes.position.count*3);for(let j=0;j<colors.length;j+=3)colors[j]=255;geometry.setAttribute('color',new T.BufferAttribute(colors,3,true));const o=new T.Mesh(geometry,mat);o.position.set(2+i*2,0,0);o.scale.set(1+i*.2,1,1);root.add(o);original.push(o);}
 const moving=new T.Group();moving.userData.keepDynamic=true;root.add(moving);const live=new T.Mesh(new T.BoxGeometry(1,1,1),mat);moving.add(live);const pane=new T.Mesh(new T.BoxGeometry(1,1,.1),glass);root.add(pane);
 const result=batchStaticGeometry(T,root);assert.deepEqual(result,{input:3,output:1,savedDraws:2});assert.equal(live.parent,moving);assert.equal(pane.parent,root);assert.ok(original.every(o=>!o.parent));const merged=root.children.find(o=>o.name==='HELIX / décor groupé');assert.equal(merged.geometry.index.count,108);assert.equal(merged.geometry.attributes.uv.count,72);assert.equal(merged.geometry.attributes.color.getX(0),1,'normalized vertex colours must stay normalized');merged.geometry.computeBoundingBox();assert.ok(merged.geometry.boundingBox.min.x<1.51&&merged.geometry.boundingBox.max.x>6.69);
});
