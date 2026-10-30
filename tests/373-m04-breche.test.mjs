import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ArenaGame,ARENA_SIZE} from '../dist/game-logic.js';
import * as L from '../dist/m04-layout.js';
import {createM04Mission,PORTAL_CHARGE,SHIELD} from '../dist/m04-mission.js';
import {SCRIPT,linesFor,logFor,LOGS,ENDING} from '../dist/m04-story.js';
import {logFor as m03Log} from '../dist/m03-story.js';

const read=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');
const inside=(o,x,z,y=0,r=.6,h=1.8)=>Math.abs(x-o.x)<o.hx+r&&Math.abs(z-o.z)<o.hz+r&&y<(o.y||0)+o.height-.02&&y+h>(o.y||0);
function mission(characterId='lylu'){
  const traversal=L.createTraversal(),g=new ArenaGame(L.buildCollisions(),()=>.5,traversal);g.reset(characterId);g.enableArmorShield();
  const log={said:[],notices:[],stages:[],doors:{},finished:0,power:{},breach:[]};
  const m=createM04Mission({game:g,characterId,hooks:{say:id=>log.said.push(id),notice:t=>log.notices.push(t),stage:(i,s)=>log.stages.push(s.id),setDoor:(id,o)=>{log.doors[id]=o;},
    finish:()=>log.finished++,setPower:(r,on)=>{log.power[r]=on;},breach:v=>log.breach.push(v)}});
  return {g,m,log,traversal};
}
const step=(g,m,dt=1/30)=>{g.nextWave=Infinity;g.toSpawn=0;g.invulnerable=1e9;g.step(dt,{});m.update(dt);};
const run=(g,m,s,{clear=false}={})=>{for(let t=0;t<s;t+=1/30){if(clear)g.enemies.length=0;step(g,m);}};
const go=(g,m,x,z)=>{Object.assign(g.player,{x,z,elevation:m&&L.createTraversal().height(x,z)||0,grounded:true});step(g,m);};
const use=(g,m,id)=>{const it=L.INTERACTIONS.find(i=>i.id===id);Object.assign(g.player,{x:it.x,z:it.z,elevation:it.y||0,grounded:true});const r=m.interact();assert.equal(r?.id,id,`${id} used`);return r;};
const clearAll=g=>{g.enemies=g.enemies.filter(e=>e.guardian);};

test('six linked sectors on three heights, all inside the arena; the catwalk and the gantry are reached on foot',()=>{
  const half=ARENA_SIZE/2-1;for(const a of L.AREAS)for(const v of [a.x1,a.x2,a.z1,a.z2])assert.ok(Math.abs(v)<=half+.5,a.id);
  assert.ok(new Set(L.AREAS.map(a=>a.id)).size>=8);assert.deepEqual([...new Set(L.FLOORS.map(f=>f.height||f.from))].sort(),[4.5,6]);
  const tr=L.createTraversal(),g=new ArenaGame(L.buildCollisions({open:['sas','maintenance']}),()=>.5,tr);g.reset('lylu');
  const walk=pts=>{Object.assign(g.player,{x:pts[0][0],z:pts[0][1],elevation:tr.height(pts[0][0],pts[0][1]),grounded:true});for(const [tx,tz] of pts.slice(1))for(let i=0;i<4000;i++){const dx=tx-g.player.x,dz=tz-g.player.z,d=Math.hypot(dx,dz);if(d<.35)break;g.step(1/60,{x:dx/d,z:dz/d,yaw:0,moveYaw:0});g.enemies.length=0;g.nextWave=Infinity;}return g.player;};
  assert.equal(walk([[0,48],[0,40],[0,10]]).elevation,4.5,'up the south ramp onto the catwalk');
  assert.equal(walk([[34,-93],[22,-93],[0,-92]]).elevation,6,'up the gantry ramp');
  g.navigation.update({x:L.START.x,z:L.START.z},0);const reach=(x,z)=>{const i=g.navigation.nearestOpen(x,z);return i>=0&&g.navigation.distance[i]>=0;};
  for(const s of L.STAGES)assert.ok(reach(s.checkpoint.x,s.checkpoint.z),`checkpoint ${s.id}`);
  for(const it of L.INTERACTIONS.filter(i=>!i.y))assert.ok(reach(it.x,it.z),`machines reach ${it.id}`);
});

test('interactions, caches and every machine stand clear of the colliders',()=>{
  const w=L.buildCollisions();
  for(const it of L.INTERACTIONS){assert.ok(L.areaAt(it.x,it.z),it.id);assert.ok(!w.some(o=>inside(o,it.x,it.z,it.y||0,.45)),`${it.id} clear`);if(it.log)assert.ok(LOGS[it.log],it.log);}
  for(const s of L.SUPPLIES)assert.ok(!w.some(o=>inside(o,s.x,s.z,s.y,.4)),`cache ${s.x},${s.z}`);
  for(const [n,e] of Object.entries(L.ENCOUNTERS))for(const u of e.units)assert.ok(!w.some(o=>inside(o,u.x,u.z,0,u.form==='brute'||u.elite||u.form==='bulwark'?1.05:.86)),`${n}/${u.form}`);
});

test('the whole mission: badge, lock, court, two relays, maintenance, three stabilisers, the guardian, the reactor log',()=>{
  const {g,m,log}=mission('lylu');m.start();
  assert.equal(m.stageId,'quai');assert.deepEqual(log.said,['intro']);
  use(g,m,'poste');assert.equal(m.stageId,'sas');
  assert.ok(m.collisions.some(o=>o.door==='sas'));use(g,m,'scanner');assert.equal(log.doors.sas,true);assert.equal(m.stageId,'cour');assert.equal(m.groups().cour.deployed,5);
  g.enemies.length=0;step(g,m);assert.equal(m.stageId,'relais');assert.ok(m.collisions.some(o=>o.door==='maintenance'),'north door locked');
  go(g,m,-60,28);assert.equal(m.groups().hangar.deployed,5,'drones wake in the hangar');
  Object.assign(g.player,{x:-89.6,z:28});assert.equal(m.nearInteraction(),null,'the hangar first');g.enemies.length=0;
  use(g,m,'relais-ouest');run(g,m,4+PORTAL_CHARGE+.2);assert.equal(m.groups().hangar2.deployed,3);run(g,m,L.HOLDS['relais-ouest']);assert.equal(log.power['relais-ouest'],true);
  g.enemies.length=0;go(g,m,60,28);assert.equal(m.groups().atelier.deployed,5);g.enemies.length=0;
  use(g,m,'relais-est');run(g,m,L.HOLDS['relais-est']+1,{clear:true});assert.equal(m.stageId,'maintenance');assert.equal(log.doors.maintenance,true);assert.ok(m.groups().retour);
  assert.match(logFor('signatures','lylu').lines.join(' '),/07-GHJU — active/);
  g.enemies.length=0;go(g,m,0,-50);assert.equal(m.stageId,'stabilisateurs');assert.equal(m.guardian.shield,SHIELD[0],'phase shield up');
  for(const [k,id] of ['stab-1','stab-2','stab-3'].entries()){
    clearAll(g);use(g,m,id);run(g,m,L.HOLDS[id]+1);clearAll(g);step(g,m);assert.equal(m.guardian.shield,SHIELD[k+1],`shield after ${id}`);
  }
  assert.equal(m.stageId,'gardien');assert.ok(log.said.includes('stab3'));
  const boss=g.enemies.find(e=>e.guardian);const hp=boss.hp;g.damageEnemy(boss,40,{x:boss.x,y:1.5,z:boss.z});assert.ok(hp-boss.hp>=30,'full damage once the cages are cut (armour aside)');
  g.enemies.length=0;step(g,m);assert.equal(m.stageId,'journal');assert.ok(log.said.includes('gardienOk'));assert.equal(log.breach.at(-1),0);
  assert.equal(use(g,m,'console').log,'journal-reacteur');assert.equal(m.completed,true);assert.equal(log.finished,1);
});

test('the guardian takes only part of the damage while its cages hold, and the checkpoint restores the ring',()=>{
  const {g,m}=mission('ghju');m.start();
  for(const id of ['poste','scanner'])use(g,m,id);g.enemies.length=0;step(g,m);
  m.restoreCheckpoint();assert.equal(m.stageId,'relais');
  // Skip to the ring.
  for(const id of ['relais-ouest','relais-est']){g.enemies.length=0;go(g,m,id==='relais-ouest'?-60:60,28);g.enemies.length=0;use(g,m,id);run(g,m,L.HOLDS[id]+1,{clear:true});}
  g.enemies.length=0;go(g,m,0,-50);const boss=g.enemies.find(e=>e.guardian);assert.ok(boss&&boss.boss);
  const hp=boss.hp;g.damageEnemy(boss,100,{x:boss.x,y:1.5,z:boss.z});assert.ok(hp-boss.hp<=SHIELD[0]*100+.01,'shielded');
  m.restoreCheckpoint();assert.equal(m.stageId,'stabilisateurs');assert.ok(g.enemies.some(e=>e.guardian),'the guardian is back at the checkpoint');assert.equal(m.guardian.shield,SHIELD[0]);
});

test('the story continues chapter 03 and leads to chapter 05; both heroes; generic wording',()=>{
  for(const id of Object.keys(SCRIPT)){const ly=linesFor(id,'lylu'),gh=linesFor(id,'ghju');assert.ok(ly.length&&gh.length,id);
    assert.ok(!ly.some(l=>['gaby','ghju'].includes(l.who))&&!gh.some(l=>['cara','lylu'].includes(l.who)),id);assert.ok([...ly,...gh].every(l=>l.speaker?.name),id);}
  assert.match(m03Log('regulation','ghju').lines.join(' '),/station énergétique Est/);assert.match(logFor('feuille-route').lines.join(' '),/lot spécial/);
  const journal=logFor('journal-reacteur','ghju').lines.join(' ');assert.match(journal,/22 h 47/);assert.match(journal,/JANUS-9/);assert.match(journal,/07-LYLU/);
  assert.match(read('m01-extension-story.js'),/22 h 47/,'the night of the fall in chapter 01');assert.match(read('ligne9-layout.js'),/JANUS-9/,'the anchor of chapter 05');
  assert.match(ENDING.next,/Ligne Noyée/);
  const all=JSON.stringify(SCRIPT)+JSON.stringify(Object.keys(LOGS).flatMap(k=>[logFor(k,'ghju'),logFor(k,'lylu')]));
  assert.doesNotMatch(all,/est mort|est morte|VSAV|caserne|pompier/i);
});
