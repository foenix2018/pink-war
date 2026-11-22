import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {parsePWM} from '../dist/blender-models.js';
import {ArenaGame,segmentBox} from '../dist/game-logic.js';
import * as L from '../dist/m10-layout.js';
import {createM10Mission} from '../dist/m10-mission.js';
import {linesFor,ENDING} from '../dist/m10-story.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const store=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const opened=['access','security','laboratoires','archives','evacuation'];
const overlaps=(p,b,r=.55)=>p.y<(b.y||0)+b.height-.02&&p.y+1.8>(b.y||0)&&Math.abs(p.x-b.x)<b.hx+r&&Math.abs(p.z-b.z)<b.hz+r;
const fixture=(hero='ghju',storage=store(),resume=false)=>{const g=new ArenaGame(L.buildCollisions(),()=>.5,L.createTraversal(),hero),m=createM10Mission({game:g,characterId:hero,storage});m.start({resume});g.invulnerable=1e9;return{g,m,storage};};
function use(g,m,it){g.enemies=[];Object.assign(g.player,{x:it.x,z:it.z,elevation:it.y,grounded:true,verticalSpeed:0});assert.ok(m.interact(),it.id);if(m.hold){g.time+=L.HOLDS[it.id]+.01;m.update();}}

test('HELIX has an ordered infiltration, laboratories, Kessler, evidence, confinement and separate east exit',()=>{
 assert.deepEqual(L.INTERACTIONS.map(i=>i.id),['access','esplanade','security','laboratoires','kessler','archives','confinement','extraction']);assert.equal(L.ROOMS.length,2);assert.equal(L.STAGES.length,9);assert.ok(L.INTERACTIONS.at(-1).x>44);assert.equal(L.createTraversal().height(90,0),-165,'empty sky is not an invisible floor');
});
test('every objective, checkpoint, supplies and enemy spawn has a free capsule on its visible floor',()=>{
 const cols=L.buildCollisions({open:opened}),t=L.createTraversal();
 for(const p of [...L.INTERACTIONS,...L.STAGES.map(s=>s.checkpoint),...L.SUPPLIES]){const y=p.y??t.height(p.x,p.z);assert.equal(t.height(p.x,p.z),y);assert.deepEqual(cols.filter(b=>overlaps({...p,y},b)),[],JSON.stringify(p));}
 for(const[id,units]of Object.entries(L.ENCOUNTERS))for(const u of units){const y=t.height(u.x,u.z)+(u.form==='probe'?3.2:0);assert.ok(y>=0);assert.deepEqual(cols.filter(b=>overlaps({...u,y},b,u.form==='probe'?.44:.8)),[],id+'/'+u.form);}
});
for(const hz of [60,15])test('the real player traverses the entire route, desk detour, stairs and exit at '+hz+' Hz',()=>{
 const t=L.createTraversal(),g=new ArenaGame(L.buildCollisions({open:opened}),()=>.5,t);g.nextWave=Infinity;g.toSpawn=0;g.invulnerable=1e9;Object.assign(g.player,{...L.START,elevation:0,grounded:true});
 for(const target of L.WALKTHROUGH){let n=0;while(Math.hypot(g.player.x-target.x,g.player.z-target.z)>.17&&n++<2400){const dx=target.x-g.player.x,dz=target.z-g.player.z,d=Math.hypot(dx,dz),yaw=-Math.atan2(dx,-dz);g.step(1/hz,{z:-Math.min(1,d/.35),yaw,moveYaw:yaw});assert.ok(g.player.elevation>=-.02,'fell at '+JSON.stringify(target));}assert.ok(n<2400,'blocked at '+JSON.stringify({target,player:g.player}));assert.ok(Math.abs(g.player.elevation-t.height(g.player.x,g.player.z))<.2);}
 assert.ok(Math.hypot(g.player.x-56,g.player.z+60)<.2);
});
test('room glass, closed laboratory doors and the escape lock stop projectiles and bodies until their actual unlock',()=>{
 const before=L.buildCollisions();for(const id of ['access','laboratoires','archives','evacuation'])assert.ok(before.some(b=>b.doorId===id));
 const door=before.find(b=>b.doorId==='laboratoires');assert.notEqual(segmentBox({x:-20,y:13.4,z:-55},{x:-20,y:13.4,z:-62},door),null);
 const pane=before.find(b=>b.kind==='verrière laboratoire'&&b.x< -25);assert.notEqual(segmentBox({x:-30,y:13.4,z:-67},{x:-25,y:13.4,z:-67},pane),null);
 const{g,m}=fixture();use(g,m,L.INTERACTIONS[0]);assert.equal(g.obstacles.some(b=>b.doorId==='access'),false);assert.ok(g.obstacles.some(b=>b.doorId==='archives'));
 use(g,m,L.INTERACTIONS[1]);use(g,m,L.INTERACTIONS[2]);assert.equal(g.obstacles.some(b=>b.doorId==='laboratoires'),false);assert.ok(g.obstacles.some(b=>b.doorId==='archives'));assert.equal(g.obstacles.some(b=>b.gate==='securite'),false);
});
for(const hero of ['ghju','lylu'])test(hero+': all eight guarded stages complete, IEM unlocks at 10 and the hero returns with the evidence',()=>{
 const{g,m}=fixture(hero);assert.equal(g.missionLevel,10);assert.ok(g.isWeaponAvailable(9));assert.ok(g.ownedWeapons.has(9));assert.ok(g.selectWeapon(9));assert.equal(g.weapon.id,'iem');assert.equal(m.available('archives'),false);
 for(const it of L.INTERACTIONS){assert.equal(m.stageId,it.id);if(!['access','kessler'].includes(it.id)){Object.assign(g.player,{x:it.x,z:it.z,elevation:it.y});assert.equal(m.interact(),null,'guards are not optional');}use(g,m,it);}
 assert.ok(m.completed);assert.equal(m.done.length,8);assert.equal(m.stageId,'fin');assert.ok(m.opened.includes('evacuation'));assert.match(ENDING.text[hero],/archives/i);
});
test('archive transfer is interrupted if the player walks away; it cannot finish remotely',()=>{
 const{g,m}=fixture();for(const it of L.INTERACTIONS.slice(0,5))use(g,m,it);g.enemies=[];const p=L.INTERACTIONS[5];Object.assign(g.player,{x:p.x,z:p.z,elevation:p.y});assert.ok(m.interact());g.player.x=0;g.time+=20;m.update();assert.equal(m.stageId,'archives');assert.equal(m.hold,null);
});
test('checkpoint resumes at a cleared position per hero, restores real doors and rejects forged progression',()=>{
 const{g,m,storage}=fixture();for(const it of L.INTERACTIONS.slice(0,5))use(g,m,it);const again=fixture('ghju',storage,true);again.m.start({resume:true});assert.equal(again.m.stageId,'archives');assert.equal(again.g.player.elevation,12);assert.ok(again.m.opened.includes('archives'));assert.equal(again.g.obstacles.some(b=>b.doorId==='archives'),false);
 const other=fixture('lylu',storage);other.m.start({resume:true});assert.equal(other.m.stageId,'access');storage.setItem('pink-wars-m10-checkpoint-v1-ghju',JSON.stringify({version:1,stage:7,done:['access']}));again.m.start({resume:true});assert.equal(again.m.stageId,'access');
});
test('Kessler accepts the transfer of authority and recognises the two spheres without revealing later chapters',()=>{
 assert.match(linesFor('kessler').map(x=>x.text).join(' '),/empêcher la Chute/);assert.match(linesFor('archives').map(x=>x.text).join(' '),/autorité.*ORDRE/);assert.match(linesFor('capture').map(x=>x.text).join(' '),/capturez/);assert.doesNotMatch(JSON.stringify({ENDING,dialogue:['intro','kessler','capture','fin'].flatMap(id=>linesFor(id))}),/conscience.*parents|leurs parents.*sphères/i);
});
test('new props come from a finite Blender model with usable UVs and exactly matching editable source copies',()=>{
 const packed=read('dist/assets/m10/helix.pwm.gz');assert.ok(packed.length<2e6);const raw=gunzipSync(packed),model=parsePWM(T,raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));assert.ok(model.triangles>20000&&model.triangles<180000);assert.ok(model.primitives.length<30);
 for(const p of model.primitives){assert.ok([...p.geometry.attributes.position.array].every(Number.isFinite));assert.ok(p.geometry.attributes.uv);p.geometry.dispose();}
 const a=read('assets/m10/PinkWars_N10_Couronne_HELIX.blend'),b=read('dist/assets/m10/PinkWars_N10_Couronne_HELIX.blend');assert.ok(a.length>1e5);assert.equal(createHash('sha256').update(a).digest('hex'),createHash('sha256').update(b).digest('hex'));
});

test('the live HUD waypoints guide the player around the fountain, reception desk, glass and stair sides',()=>{
 const{g,m}=fixture();
 for(const it of L.INTERACTIONS){g.enemies=[];let frames=0;
  while(!m.nearInteraction()&&frames++<14000){const p=L.guideTarget(m.stage,g.player),dx=p.x-g.player.x,dz=p.z-g.player.z,d=Math.hypot(dx,dz),yaw=-Math.atan2(dx,-dz);g.step(1/60,{z:-Math.min(1,d/.30),yaw,moveYaw:yaw});m.update();assert.ok(g.player.elevation>=-.02);}
  assert.ok(frames<14000,'guidance trapped the player '+JSON.stringify({stage:m.stageId,player:g.player,target:L.guideTarget(m.stage,g.player)}));assert.ok(m.interact());if(m.hold){g.time+=L.HOLDS[it.id]+.01;m.update();}
 }
 assert.ok(m.completed);
});
