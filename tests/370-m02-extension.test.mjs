import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ArenaGame,ARENA_SIZE} from '../dist/game-logic.js';
import * as X from '../dist/m02-extension-layout.js';
import {createM02Extension,readM02Checkpoint,PORTAL_CHARGE} from '../dist/m02-extension.js';
import {SCRIPT,linesFor,logFor,LOGS} from '../dist/m02-extension-story.js';
import {chapterStory} from '../dist/story-chapters.js';

const read=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');
const ALL=X.DOORS.map(d=>d.id);
const inside=(o,x,z,y=0,r=.8,h=1.8)=>Math.abs(x-o.x)<o.hx+r&&Math.abs(z-o.z)<o.hz+r&&y<(o.y||0)+o.height-.02&&y+h>(o.y||0);
const memory=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};
// The street of M02 is built by its page (three.js); its two end blocks are enough to frame the new areas here.
const STREET=[{x:-23,z:65,hx:9,hz:8.5,y:0,height:12},{x:23,z:65,hx:10.5,hz:8.5,y:0,height:12},{x:-23,z:-67,hx:9,hz:8.5,y:0,height:12},{x:23,z:-67,hx:10.5,hz:8.5,y:0,height:12}];
function mission(characterId='ghju',hooks={}){
  const g=new ArenaGame([...STREET],()=>.5);g.reset(characterId);g.enableArmorShield();g.nextWave=Infinity;
  const log={said:[],doors:{},notices:[],stages:[],core:0,finale:0};
  const ext=createM02Extension(g,{characterId,obstacles:STREET,hooks:{say:id=>log.said.push(id),setDoor:(id,s)=>{log.doors[id]=s;},notice:t=>log.notices.push(t),
    stage:id=>log.stages.push(id),core:()=>log.core++,finale:()=>log.finale++,...hooks}});
  return {g,ext,log};
}
const step=(g,ext,s=1/60,input={})=>{g.nextWave=Infinity;g.toSpawn=0;g.invulnerable=1e9;g.step(s,input);ext.update();};
function walkNav(g,ext,to,limit=240){
  const nav=new g.navigation.constructor(g.obstacles);nav.update({x:to[0],z:to[1]},0);
  for(let i=0;i<60*limit;i++){
    const p=g.player;if(Math.hypot(p.x-to[0],p.z-to[1])<.6)break;
    let wp=nav.waypoint({...p,radius:.55});if(!wp||Math.hypot(p.x-to[0],p.z-to[1])<2.2)wp={x:to[0],z:to[1]};
    const dx=wp.x-p.x,dz=wp.z-p.z,d=Math.hypot(dx,dz)||1;step(g,ext,1/60,{x:dx/d,z:dz/d,yaw:0,moveYaw:0});
  }
  return g.player;
}
const use=(g,ext,id)=>{const it=X.INTERACTIONS.find(i=>i.id===id);Object.assign(g.player,{x:it.x,z:it.z,elevation:0,grounded:true});assert.equal(ext.interaction()?.id,id,`${id} offered`);assert.ok(ext.interact(),`${id} used`);return ext.takeJournal();};
const run=(g,ext,s)=>{for(let t=0;t<s;t+=1/30)step(g,ext,1/30);};

test('the enclave and the transit tower close the two open ends of the street, on free ground of the arena',()=>{
  const half=ARENA_SIZE/2-2;
  for(const r of X.ROOMS){
    for(const v of [r.x1,r.x2,r.z1,r.z2])assert.ok(Math.abs(v)<=half,`${r.id} inside the arena`);
    assert.ok(r.z1>=73.5||r.z2<=-75.5,`${r.id} beyond the street (z −75.5…73.5)`);
  }
  for(const o of X.extensionObstacles({open:ALL}))assert.ok(!STREET.some(c=>Math.abs(c.x-o.x)<c.hx+o.hx-.05&&Math.abs(c.z-o.z)<c.hz+o.hz-.05),`${o.kind} at ${o.x},${o.z} does not cut the street blocks`);
  // The rain of the street stops at the covered market.
  assert.match(read('level2-test.js'),/z=-82\+rng\(\)\*162/);
});

test('corridors and doorways suit the machines’ navigation; every room is reachable from the street',()=>{
  for(const r of X.ROOMS.filter(r=>r.look==='corridor')){const w=Math.min(r.x2-r.x1,r.z2-r.z1),c=(r.z1+r.z2)/2;assert.ok(w>=4&&Math.abs(c%2)<1e-9,`${r.id}: 4 m on the grid`);}
  for(const d of X.DOORS)assert.ok(d.width>=3&&Math.abs(d.centre%2)<1e-9,`${d.id}: doorway on the grid`);
  const g=new ArenaGame([...STREET,...X.extensionObstacles({open:ALL})],()=>.5);g.reset('lylu');g.navigation.update({x:0,z:0},0);
  const reach=(x,z)=>{const i=g.navigation.nearestOpen(x,z);return i>=0&&g.navigation.distance[i]>=0;};
  for(const r of X.ROOMS){const cx=(r.x1+r.x2)/2,cz=(r.z1+r.z2)/2;assert.ok([[0,0],[-4,0],[4,0],[0,-2],[0,2]].some(([dx,dz])=>reach(cx+dx,cz+dz)),`machines reach ${r.id}`);}
  for(const s of [...X.PROLOGUE,...X.EPILOGUE])assert.ok(reach(s.checkpoint.x,s.checkpoint.z),`checkpoint ${s.id}`);
});

test('interactions, documents, caches and every unit of every encounter stand clear of the colliders',()=>{
  const list=[...STREET,...X.extensionObstacles({open:ALL})];
  for(const it of X.INTERACTIONS){assert.ok(X.roomAt(it.x,it.z),`${it.id} in a room`);assert.ok(!list.some(o=>inside(o,it.x,it.z,0,.5)),`${it.id} reachable`);if(it.log)assert.ok(LOGS[it.log],`document ${it.log}`);}
  for(const [name,enc] of Object.entries(X.ENCOUNTERS))for(const u of enc.units){assert.ok(X.roomAt(u.x,u.z),`${name}/${u.form} in a room`);assert.ok(!list.some(o=>inside(o,u.x,u.z,0,u.form==='brute'||u.elite?1.05:.86)),`${name}/${u.form} at ${u.x},${u.z}`);}
  for(const c of X.SUPPLIES)assert.ok(!list.some(o=>inside(o,c.x,c.z,0,.5)),`cache at ${c.x},${c.z}`);
  // HELIX Security in pairs, with a few isolated machines (Tome II, M02 opposition).
  const units=Object.values(X.ENCOUNTERS).flatMap(e=>e.units);assert.ok(units.filter(u=>u.helix).length>=units.length/2);
});

test('the prologue plays: service lift, dispensary register, radio, HELIX scouts, the gate held open, then the street',()=>{
  const {g,ext,log}=mission('lylu');
  ext.start();assert.equal(ext.stage,'x-arrivee');assert.deepEqual(log.said,['intro']);
  assert.ok(Math.hypot(g.player.x-X.LIFT_START.x,g.player.z-X.LIFT_START.z)<.1);
  assert.ok(g.obstacles.some(o=>o.door==='grille'),'the enclave gate is shut');assert.equal(g.pickups.filter(p=>p.extension).length,X.SUPPLIES.length);
  walkNav(g,ext,[20,86]);assert.equal(ext.stage,'x-dispensaire','entering the dispensary');
  const reg=use(g,ext,'registre-soins');assert.equal(reg.then,'registre');assert.match(reg.entry.lines.join(' '),/07-GHJU/);assert.equal(ext.stage,'x-radio');
  Object.assign(g.player,{x:32,z:82.4});assert.equal(ext.interaction(),null,'the radio is dead before the batteries');
  use(g,ext,'batterie');const radio=use(g,ext,'radio');assert.equal(radio.then,'radio');assert.equal(ext.stage,'x-eclaireurs');
  assert.equal(ext.groups().eclaireurs.deployed,3);assert.ok(g.enemies.filter(e=>e.helix).length===2,'two HELIX agents and a probe');
  g.enemies.length=0;step(g,ext);assert.equal(ext.stage,'x-grille');assert.ok(log.said.includes('eclaireursOk'));
  use(g,ext,'manivelle');assert.equal(ext.hold.name,'grille');assert.equal(ext.interaction(),null,'nothing else during the crank');
  run(g,ext,2+PORTAL_CHARGE+.2);assert.ok(ext.groups().grille1.deployed===2,'HELIX drop in during the hold');
  run(g,ext,X.HOLDS.grille);assert.equal(ext.hold,null);assert.equal(ext.stage,null,'the street takes over');assert.equal(log.core,1);
  assert.equal(log.doors.grille,true);assert.ok(!g.obstacles.some(o=>o.door==='grille'));
  g.enemies.length=0;Object.assign(g.player,{x:0,z:86});walkNav(g,ext,[0,60]);assert.ok(g.player.z<61,'the gate leads to the street');
});

test('the transit tower: HELIX checkpoint, badge, data vault, manifest, dock hold, then the chapter’s choice',()=>{
  const {g,ext,log}=mission('ghju');ext.start();
  ext.beginEpilogue();assert.equal(ext.stage,'x-tour');assert.ok(!g.obstacles.some(o=>o.door==='tour'),'the tower opens');assert.ok(log.said.includes('tour'));
  Object.assign(g.player,{x:0,z:-60});walkNav(g,ext,[0,-79]);assert.ok(g.player.z<-78,'the forecourt leads to the tower');
  g.enemies.length=0;step(g,ext);assert.equal(ext.stage,'x-badge');
  use(g,ext,'badge');assert.equal(ext.stage,'x-coffre');
  Object.assign(g.player,{x:-18.6,z:-86.4});assert.equal(ext.interaction(),null,'the vault is locked');
  assert.ok(g.obstacles.some(o=>o.door==='coffre'));use(g,ext,'lecteur');assert.ok(!g.obstacles.some(o=>o.door==='coffre'));assert.equal(ext.stage,'x-manifeste');
  g.enemies.length=0;const kessler=use(g,ext,'doc-kessler');assert.match(kessler.entry.lines.join(' '),/supports de 2189/);
  const manifest=use(g,ext,'manifeste');assert.equal(manifest.then,'manifeste');assert.match(manifest.entry.lines.join(' '),/07-LYLU.*Anneau logistique|Anneau logistique[\s\S]*07-LYLU/);
  assert.match(manifest.entry.lines.join(' '),/déclarés « perdus » par l’armée/);assert.equal(ext.stage,'x-quai');assert.ok(log.said.includes('alarme'));
  Object.assign(g.player,{x:43,z:-84.6});assert.equal(ext.interaction(),null,'the dock team first');
  g.enemies.length=0;use(g,ext,'commande-quai');assert.equal(ext.hold.name,'quai');
  run(g,ext,X.HOLDS.quai+1);assert.equal(ext.hold,null);assert.equal(ext.stage,'x-fin');assert.equal(log.doors.convoi,true);
  assert.equal(ext.groups().quai3.deployed,3,'three waves on the dock');assert.ok(log.said.includes('agent'),'a HELIX agent doubts');
  assert.equal(log.finale,0,'the dock is cleared first');g.enemies.length=0;step(g,ext);assert.equal(log.finale,1);
});

test('checkpoints: an extension stage resumes at its place, earlier progress kept, the stage’s own action redone',()=>{
  const storage=memory();const {g,ext}=mission('lylu');ext.start();
  Object.assign(g.player,{x:20,z:85});step(g,ext);use(g,ext,'registre-soins');ext.takeJournal();use(g,ext,'batterie');
  assert.ok(ext.writeCheckpoint(storage));const save=readM02Checkpoint('lylu',storage);assert.equal(save.stage,'x-radio');
  const second=mission('lylu');assert.ok(second.ext.restoreCheckpoint(save));assert.equal(second.ext.stage,'x-radio');
  assert.ok(!second.ext.done.includes('batterie'),'the batteries are connected again');assert.ok(second.ext.done.includes('registre-soins'));
  const cp=X.STAGE['x-radio'].checkpoint;assert.ok(Math.hypot(second.g.player.x-cp.x,second.g.player.z-cp.z)<.1);
  const third=mission('lylu');assert.ok(third.ext.restoreCheckpoint({...save,stage:'x-coffre',opened:['monte-charge'],done:['badge']}));
  assert.ok(!third.g.obstacles.some(o=>o.door==='grille'||o.door==='tour'),'epilogue: gate and tower open');assert.ok(third.g.obstacles.some(o=>o.door==='coffre'));
  assert.equal(third.ext.groups().coffre,undefined);assert.ok(third.g.pickups.every(p=>!p.extension||p.z<0),'tower caches only');
  // Once the gate is open the street itself is the checkpoint.
  const fourth=mission('lylu');assert.ok(fourth.ext.restoreCheckpoint({...save,stage:'x-rue'}));assert.equal(fourth.ext.stage,null);assert.equal(fourth.log.core,1);
  assert.ok(!fourth.g.obstacles.some(o=>o.door==='grille'));assert.ok(fourth.g.player.z<78&&fourth.g.player.z>74);
  assert.ok(fourth.ext.writeCheckpoint(storage));assert.equal(readM02Checkpoint('lylu',storage).stage,'x-rue');
  // A stage saved before its group was deployed brings the group back; a cleared one does not.
  const fifth=mission('lylu');fifth.ext.start();fifth.ext.beginEpilogue();assert.equal(fifth.ext.groups().tour.deployed,4);
});

test('the story: both heroes, HELIX Security, records the army calls lost, the sibling on the convoy to the Anneau logistique',()=>{
  for(const id of Object.keys(SCRIPT)){
    const lylu=linesFor(id,'lylu'),ghju=linesFor(id,'ghju');assert.ok(lylu.length&&ghju.length,id);
    assert.ok(!lylu.some(l=>['gaby','ghju'].includes(l.who)),`${id} LYLU`);assert.ok(!ghju.some(l=>['cara','lylu'].includes(l.who)),`${id} GHJU`);
    assert.ok([...lylu,...ghju].every(l=>l.speaker?.name),`${id} speakers`);
  }
  assert.ok(linesFor('manifeste','ghju').some(l=>l.text==='Ils protègent les données. Pas les gens.'),'storyboard 02B');
  assert.match(logFor('registre-soins','lylu').lines.join(' '),/Archives végétales/,'continuity with M01');
  assert.match(logFor('kessler').stamp,/JANUS/);assert.match(logFor('avis-helix').footer,/Kessler/);assert.match(logFor('consignes').lines.join(' '),/On m’a dit qu’on évacuait/);
  const all=JSON.stringify(SCRIPT)+JSON.stringify(Object.keys(LOGS).flatMap(k=>[logFor(k,'ghju'),logFor(k,'lylu')]));
  assert.doesNotMatch(all,/est mort|est morte/);
  for(const c of ['lylu','ghju'])assert.match(chapterStory(2,c,'proof').text,/Anneau logistique/);
});

test('the M02 page drives the extension: start in the lift, journals, subtitles, HELIX look, resume after a defeat',()=>{
  const code=read('level2-test.js');
  for(const part of ['createM02Extension','createM02ExtensionArt','createSubtitles','showMissionJournal','readM02Checkpoint','REPRENDRE AU POINT DE CONTRÔLE','extension.beginEpilogue','helixFactory'])assert.ok(code.includes(part),part);
  const art=read('m02-extension-art.js');for(const part of ['HELIX','MARCHÉ','DISPENSAIRE','CONVOI'])assert.ok(art.includes(part),part);
});
