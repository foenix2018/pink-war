import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {parsePWM} from '../dist/blender-models.js';
import {ArenaGame,segmentBox,moveInArena} from '../dist/game-logic.js';
import {sweepGrapplePlayer} from '../dist/grapple-logic.js';
import * as L from '../dist/m09-layout.js';
import {createM09Mission} from '../dist/m09-mission.js';
import {CHAPTER_ROUTES,chapterURL,recordHideoutArrival,readHideoutProfile,historyForHero} from '../dist/hideout-state.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const storage=()=>{const values=new Map();return{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};};
function fixture(hero='ghju',store=storage(),resume=false){
 const g=new ArenaGame(L.buildCollisions(),()=>.5,L.createTraversal(),hero),m=createM09Mission({game:g,characterId:hero,storage:store});m.start({resume});g.invulnerable=1e8;return{g,m,store};
}
const blocking=(p,boxes,r=.55)=>boxes.filter(b=>p.height<(b.y||0)+b.height-.02&&p.height+1.8>(b.y||0)&&Math.abs(p.x-b.x)<b.hx+r&&Math.abs(p.z-b.z)<b.hz+r);
const place=(g,p)=>Object.assign(g.player,{x:p.x,z:p.z,elevation:g.surfaceHeight(p.x,p.z),grounded:true,verticalSpeed:0});

test('the authored map preserves the nine ordered sites, left conservatories, central ascent and eastern exfiltration',()=>{
 assert.deepEqual(L.INTERACTIONS.map(o=>o.number),[1,2,3,4,5,6,7,8,9]);assert.equal(L.STAGES.length,10);
 const p=Object.fromEntries(L.DATA.platforms.map(p=>[p.id,p]));
 assert.ok(p.access.x< -90&&p.access.z>100);assert.ok(p.research.x< -70&&p.pavilion.x< -50);assert.ok(p.bridge.y<p.meeting.y&&p.meeting.y<p.core.y);assert.ok(p.core.z<p.meeting.z-50);assert.ok(p.control.x>75&&p.liberation.x>75&&p.extraction.x>75);assert.ok(p.extraction.z>70);
 assert.equal(L.DATA.plan.waterfalls.length,4);assert.ok(L.DATA.plan.pools.length>=4);assert.equal(L.DATA.plan.drones.length,5);
});
test('each objective, checkpoint and complete passage has a clear physical capsule footprint',()=>{
 const boxes=L.buildCollisions({open:['access']}),t=L.createTraversal();
 for(const i of [...L.INTERACTIONS,...L.STAGES.map(s=>s.checkpoint)]){const height=t.height(i.x,i.z);assert.ok(height>0);assert.deepEqual(blocking({...i,height},boxes),[],i.id||'checkpoint');}
 for(const l of L.DATA.links)for(let k=0;k<=160;k++){const p=L.linkPoint(l,k/160);assert.deepEqual(blocking(p,boxes),[],l.id+' at '+k);assert.ok(t.surfaces(p.x,p.z).some(s=>Math.abs(s.height-p.height)<.01),l.id+' has the same visible and physical floor');}
});
for(const dt of [1/60,1/15])test('the real player walks all stairs and bridges without clipping, falling or hitting the old arena envelope ('+Math.round(1/dt)+' Hz)',()=>{
 const g=new ArenaGame(L.buildCollisions({open:['access']}),()=>.5,L.createTraversal());g.nextWave=Infinity;g.toSpawn=0;g.invulnerable=1e8;place(g,L.START);
 const walk=p=>{let frames=0;while(Math.hypot(g.player.x-p.x,g.player.z-p.z)>.17&&frames++<1200){const dx=p.x-g.player.x,dz=p.z-g.player.z,d=Math.hypot(dx,dz),yaw=-Math.atan2(dx,-dz);g.step(dt,{x:0,z:-Math.min(1,d/.35),yaw,moveYaw:yaw});assert.ok(g.player.elevation>0,'no fall through a stair flight');}assert.ok(frames<1200,'stuck at '+JSON.stringify(p));assert.ok(Math.abs(g.player.elevation-L.createTraversal().height(g.player.x,g.player.z))<.3);};
 for(const link of L.DATA.links)for(let k=0;k<=70;k++)walk(L.linkPoint(link,k/70));
 assert.ok(Math.hypot(g.player.x-104,g.player.z-82)<.3);
});
test('closed entry leaves, greenhouse walls and the ORDRE building stop bodies and rays',()=>{
 const {g,m}=fixture();for(let k=0;k<130;k++)g.step(1/60,{z:-1,yaw:0,moveYaw:0});assert.ok(g.player.z>115.7);
 const closed=g.obstacles.find(b=>b.doorId==='access');assert.notEqual(segmentBox({x:-105,y:11.5,z:122},{x:-105,y:11.5,z:110},closed),null);
 place(g,L.INTERACTIONS[0]);assert.ok(m.interact());assert.equal(g.obstacles.some(b=>b.doorId==='access'),false);
 const wall=g.obstacles.find(b=>b.kind==='bâtiment ORDRE');assert.notEqual(segmentBox({x:92,y:45.5,z:-54},{x:92,y:45.5,z:-80},wall),null);
 assert.ok(g.obstacles.some(b=>b.kind==='verrière'));assert.ok(g.obstacles.some(b=>b.kind==='garde-corps'));
});
test('all enemy squads spawn on their own visible terrace with finite original models and no solid overlap',()=>{
 const boxes=L.buildCollisions({open:['access']}),t=L.createTraversal();
 for(const [id,units]of Object.entries(L.ENCOUNTERS))for(const u of units){const h=t.height(u.x,u.z);assert.ok(h>0,id);assert.deepEqual(blocking({x:u.x,z:u.z,height:h+(u.form==='probe'?3.2:0)},boxes,u.form==='probe'?.44:.8),[],id+'/'+u.form);}
});
test('all nine mission steps are ordered, combat gated, held and completed with real chapter 9 weapon access',()=>{
 const {g,m}=fixture();assert.equal(g.missionLevel,9);assert.equal(g.isWeaponAvailable(9),false,'IEM remains gated until chapter 10');assert.equal(m.available('core'),false);
 for(const target of L.INTERACTIONS){assert.equal(m.stageId,target.id);place(g,target);if(target.id!=='access'&&target.id!=='meeting'&&g.enemies.length){assert.equal(m.interact(),null,'guards must be defeated');}g.enemies=[];assert.ok(m.interact(),target.id);if(L.HOLDS[target.id]){assert.equal(m.stageId,target.id);g.time+=L.HOLDS[target.id]+.01;m.update();}}
 assert.ok(m.completed);assert.equal(m.stageId,'fin');assert.equal(m.done.length,9);assert.equal(m.hold,null);
});
test('checkpoints persist per hero, restore completed actions and reject a forged future stage',()=>{
 const store=storage(),{g,m}=fixture('lylu',store);
 for(const target of L.INTERACTIONS.slice(0,3)){g.enemies=[];place(g,target);assert.ok(m.interact());}
 const next=fixture('lylu',store,true);assert.equal(next.m.stageId,'bridge');assert.deepEqual(next.m.done,['access','research','pavilion']);assert.ok(next.m.opened.includes('access'));next.m.restoreCheckpoint();assert.equal(next.m.stageId,'bridge');assert.equal(next.g.player.elevation,22);
 const independent=fixture('ghju',store);independent.m.start({resume:true});assert.equal(independent.m.stageId,'access');
 store.setItem('pink-wars-m09-checkpoint-v1-ghju',JSON.stringify({version:1,stage:8,done:['access']}));independent.m.start({resume:true});assert.equal(independent.m.stageId,'access');
});
test('extended locomotion, grapple and navigation bounds are chapter-local and the ravine is excluded',()=>{
 const {g}=fixture();assert.equal(g.navigation.size,165);assert.equal(g.navigation.solid[g.navigation.index(150,0)],1,'AI does not plan across empty air');assert.ok(g.navigation.point(g.navigation.index(-105,122)).x< -98);
 place(g,L.START);sweepGrapplePlayer(g,{x:0,y:0,z:-1});assert.ok(g.player.x< -100,'grapple does not teleport to the old arena edge');
 const old=new ArenaGame([]);old.player.x=105;moveInArena(old.player,0,0,.55,[]);assert.equal(old.player.x,98.45,'all existing arena bounds remain unchanged');assert.equal(old.navigation.size,99);
});
test('both metric LODs contain a finite Blender mesh, authored glazing, neon tubes and texture coordinates',()=>{
 const stats=[];
 for(const file of ['gardens.pwm.gz','gardens-low.pwm.gz']){const gz=read('dist/assets/m09/'+file),raw=gunzipSync(gz),asset=parse(raw);stats.push(asset.triangles);assert.ok(asset.triangles>400000&&asset.triangles<1200000);assert.ok(asset.primitives.length<60);assert.ok(gz.length<(file.includes('low')?13e6:20e6));
  for(const p of asset.primitives){assert.ok(p.geometry.attributes.uv);assert.ok([...p.geometry.attributes.position.array].every(Number.isFinite));
   if(/^(leaf|blossom)/.test(p.material)){
    assert.ok([...p.geometry.attributes.uv.array].every(v=>v>=0&&v<=1),'botanical atlas UVs survive the metric export');
    const indices=p.geometry.index.array;assert.equal(indices.length%6,0,'mobile and desktop retain complete twig cards');
    for(let i=0;i<indices.length;i+=6)assert.equal(new Set(indices.slice(i,i+6)).size,4,'a twig is a complete quad, not isolated triangles');
   }
   p.geometry.dispose();}}
 assert.ok(stats[1]<stats[0]*.8,'mobile has a geometric canopy LOD, not missing architecture');
 const source=read('assets/m09/PinkWars_N09_Jardins_Suspendus.blend'),publicCopy=read('dist/assets/m09/PinkWars_N09_Jardins_Suspendus.blend');assert.ok(source.length>1e6);assert.equal(createHash('sha256').update(source).digest('hex'),createHash('sha256').update(publicCopy).digest('hex'));
});
function parse(raw){return parsePWM(T,raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));}
test('chapter 9 launches from the story menu and its completed record returns to the actual hideout',()=>{
 assert.equal(CHAPTER_ROUTES[9],'niveau9.html');assert.match(chapterURL(9,{characterId:'lylu'}),/niveau9.html\?character=lylu/);assert.match(read('dist/index.html').toString(),/data-chapter="campaign9"/);
 const store=storage();recordHideoutArrival({level:9,characterId:'lylu',completed:true,storage:store});const profile=readHideoutProfile('lylu',store);assert.deepEqual(profile.completed,[9]);assert.equal(historyForHero(profile)[0].title,'Les Jardins suspendus');
});

test('botanical silhouettes and touchscreen art carry authored UVs and local material maps',()=>{
 const materials=JSON.parse(read('dist/assets/m09/materials.json'));
 for(const name of ['leaf','leaf-light','leaf-dark','blossom','blossom-light','blossom-pale','terminal-ui']){
  const m=materials[name];assert.equal(m.textureSpace,'m09');assert.equal(m.authoredUV,true);assert.equal(m.uvScale,1);assert.ok(read('dist/assets/m09/'+m.texture).length>1000);
  if(name!=='terminal-ui'){assert.ok(m.alphaTest>.3&&m.alphaTest<.6);assert.equal(m.alpha,1,'cutout foliage writes depth without transparent sorting');assert.equal(read('dist/assets/m09/'+m.texture)[25],6,'the botanical PNG contains its alpha silhouette');}
 }
 for(const name of ['bark','biotic']){const m=materials[name];assert.ok(m.emissive<.5,'wood retains a shaded volume');assert.ok(read('dist/assets/m09/'+m.normalTexture).length>1000);assert.ok(read('dist/assets/m09/'+m.roughTexture).length>1000);}
});
