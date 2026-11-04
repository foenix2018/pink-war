import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ArenaGame,ARENA_SIZE} from '../dist/game-logic.js';
import * as L from '../dist/m06-layout.js';
import {createM06Mission,PORTAL_CHARGE,ADAPT_EVERY,ADAPTED} from '../dist/m06-mission.js';
import {SCRIPT,linesFor,logFor,LOGS,ENDING,SEGMENTS,estimatedMinutes,segmentSeconds} from '../dist/m06-story.js';
import * as M05 from '../dist/ligne9-story.js';
import * as M07 from '../dist/m07-story.js';

const read=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');
const bible=readFileSync(new URL('../docs/pink-wars/BIBLE_NARRATIVE_V2_HERITIERS_DU_SILENCE.md',import.meta.url),'utf8');
const inside=(o,x,z,y=0,r=.6,h=1.8)=>Math.abs(x-o.x)<o.hx+r&&Math.abs(z-o.z)<o.hz+r&&y<(o.y||0)+o.height-.02&&y+h>(o.y||0);
function mission(characterId='lylu'){
  const traversal=L.createTraversal(),g=new ArenaGame(L.buildCollisions(),()=>.5,traversal);g.reset(characterId);g.enableArmorShield();
  const log={said:[],notices:[],stages:[],doors:{},finished:0,line:[],adapt:[]};
  const m=createM06Mission({game:g,characterId,hooks:{say:id=>log.said.push(id),notice:t=>log.notices.push(t),stage:(i,s)=>log.stages.push(s.id),setDoor:(id,o)=>{log.doors[id]=o;},
    finish:()=>log.finished++,setLine:on=>log.line.push(on),adapt:p=>log.adapt.push(p)}});
  return {g,m,log};
}
const step=(g,m,dt=1/30)=>{g.nextWave=Infinity;g.toSpawn=0;g.invulnerable=1e9;g.step(dt,{});m.update(dt);};
const run=(g,m,s,{clear=false}={})=>{for(let t=0;t<s;t+=1/30){if(clear)g.enemies=g.enemies.filter(e=>e.n08);step(g,m);}};
const go=(g,m,x,z)=>{Object.assign(g.player,{x,z,elevation:L.createTraversal().height(x,z)||0,grounded:true});step(g,m);};
const use=(g,m,id)=>{const it=L.INTERACTIONS.find(i=>i.id===id);Object.assign(g.player,{x:it.x,z:it.z,elevation:it.y||0,grounded:true});const r=m.interact();assert.equal(r?.id,id,`${id} used`);return r;};

test('seven linked sectors inside the arena; the control booth and the crane deck are reached on foot; every checkpoint and machine is reachable',()=>{
  const half=ARENA_SIZE/2-1;for(const a of L.AREAS)for(const v of [a.x1,a.x2,a.z1,a.z2])assert.ok(Math.abs(v)<=half+.5,a.id);
  assert.ok(new Set(L.AREAS.map(a=>a.id)).size>=7);
  const tr=L.createTraversal(),g=new ArenaGame(L.buildCollisions({open:['portail','coeur','quai']}),()=>.5,tr);g.reset('lylu');
  const walk=pts=>{Object.assign(g.player,{x:pts[0][0],z:pts[0][1],elevation:tr.height(pts[0][0],pts[0][1]),grounded:true});for(const [tx,tz] of pts.slice(1))for(let i=0;i<4000;i++){const dx=tx-g.player.x,dz=tz-g.player.z,d=Math.hypot(dx,dz);if(d<.35)break;g.step(1/60,{x:dx/d,z:dz/d,yaw:0,moveYaw:0});g.enemies.length=0;g.nextWave=Infinity;}return g.player;};
  assert.equal(walk([[-4,48],[-12,48],[-23,48]]).elevation,L.HEIGHTS.cabine,'up the booth ramp');
  assert.equal(walk([[91,6],[91,-8],[91,-15],[70,-15]]).elevation,L.HEIGHTS.pont,'up the crane ramp');
  g.navigation.update({x:L.START.x,z:L.START.z},0);const reach=(x,z)=>{const i=g.navigation.nearestOpen(x,z);return i>=0&&g.navigation.distance[i]>=0;};
  for(const s of L.STAGES)assert.ok(reach(s.checkpoint.x,s.checkpoint.z),`checkpoint ${s.id}`);
  for(const it of L.INTERACTIONS.filter(i=>!i.y))assert.ok(reach(it.x,it.z),`machines reach ${it.id}`);
});

test('interactions, caches and machines stand clear of the colliders',()=>{
  const w=L.buildCollisions();
  for(const it of L.INTERACTIONS){assert.ok(L.areaAt(it.x,it.z),it.id);assert.ok(!w.some(o=>inside(o,it.x,it.z,it.y||0,.45)),`${it.id} clear`);if(it.log)assert.ok(LOGS[it.log],it.log);}
  for(const s of L.SUPPLIES)assert.ok(!w.some(o=>inside(o,s.x,s.z,s.y,.4)),`cache ${s.x},${s.z}`);
  for(const [n,e] of Object.entries(L.ENCOUNTERS))for(const u of e.units)assert.ok(!w.some(o=>inside(o,u.x,u.z,0,u.form==='brute'||u.elite||u.form==='bulwark'?1.05:.86)),`${n}/${u.form}`);
});

test('the whole mission: scrap yard key, gate, casting hall, Varenne, three breakers, Kim, the N-08, its log, the evacuation',()=>{
  const {g,m,log}=mission('ghju');m.start();
  assert.equal(m.stageId,'voie');assert.deepEqual(log.said,['intro']);assert.ok(m.collisions.some(o=>o.door==='portail'),'the gate is shut');
  g.enemies.length=0;go(g,m,-40,84);assert.equal(m.stageId,'ferraille');assert.equal(m.groups().ferraille.deployed,6);
  Object.assign(g.player,{x:-56,z:58.6});assert.equal(m.nearInteraction(),null,'the scrap yard fight first');g.enemies.length=0;
  use(g,m,'cle');assert.equal(m.stageId,'portail');
  use(g,m,'commande');run(g,m,4+PORTAL_CHARGE+.2);assert.equal(m.groups().portail1.deployed,2);run(g,m,L.HOLDS.commande,{clear:true});
  assert.equal(log.doors.portail,true);assert.ok(log.stages.includes('coulee'));assert.equal(m.groups().coulee.deployed,6);assert.ok(log.said.includes('coulee'));
  g.enemies.length=0;step(g,m);assert.equal(m.stageId,'varenne');assert.ok(log.said.includes('couleeOk'));use(g,m,'varenne');assert.equal(m.stageId,'chaine');
  go(g,m,60,30);assert.equal(m.groups().chaine.deployed,5);g.enemies.length=0;
  for(const id of ['disj-1','disj-2','disj-3']){g.enemies.length=0;use(g,m,id);run(g,m,L.HOLDS[id]+1,{clear:true});}
  assert.equal(log.line.at(-1),false,'the line stops');assert.equal(m.stageId,'pont');assert.ok(m.collisions.some(o=>o.door==='coeur'));
  g.enemies.length=0;step(g,m);use(g,m,'kim');assert.equal(log.doors.coeur,true);assert.equal(m.stageId,'coeur');
  g.enemies.length=0;go(g,m,10,-30);assert.ok(m.n08,'the N-08 wakes in the core');assert.ok(log.said.includes('n08'));
  g.enemies=g.enemies.filter(e=>e.n08);step(g,m);g.enemies.length=0;step(g,m);assert.equal(m.stageId,'noyau');assert.ok(log.said.includes('n08Ok'));
  assert.equal(use(g,m,'noyau').log,'journal-n08');assert.equal(log.doors.quai,true);assert.equal(m.stageId,'sortie');
  go(g,m,-80,-66);assert.ok(m.hold?.name==='evac');run(g,m,L.HOLDS.evac+1,{clear:true});
  assert.equal(m.completed,true);assert.equal(log.finished,1);assert.equal(m.stageId,'fin');assert.ok(log.said.includes('fin'));
});

test('the N-08 learns where the player shoots from: reduced damage until the player moves; the checkpoint restores it',()=>{
  const {g,m,log}=mission('lylu');m.start();
  for(const id of ['cle','commande']){g.enemies.length=0;if(id==='cle'){go(g,m,-40,84);g.enemies.length=0;}use(g,m,id);if(id==='commande')run(g,m,L.HOLDS.commande+1,{clear:true});}
  g.enemies.length=0;step(g,m);use(g,m,'varenne');go(g,m,60,30);
  for(const id of ['disj-1','disj-2','disj-3']){g.enemies.length=0;use(g,m,id);run(g,m,L.HOLDS[id]+1,{clear:true});}
  g.enemies.length=0;step(g,m);use(g,m,'kim');g.enemies.length=0;go(g,m,10,-30);
  const boss=g.enemies.find(e=>e.n08);assert.ok(boss&&boss.boss);
  Object.assign(g.player,{x:0,z:-36});run(g,m,ADAPT_EVERY+.2,{clear:true});assert.equal(log.adapt.length,1,'one adaptation');
  assert.equal(m.n08.shield,ADAPTED,'learnt position');let hp=boss.hp;g.damageEnemy(boss,100,{x:boss.x,y:1.5,z:boss.z});assert.ok(hp-boss.hp<=ADAPTED*100+.01);
  Object.assign(g.player,{x:-30,z:-60});step(g,m);assert.equal(m.n08.shield,1,'a new position restores the damage');
  m.restoreCheckpoint();assert.equal(m.stageId,'coeur');assert.ok(g.enemies.some(e=>e.n08),'the N-08 is back at the checkpoint');
});

test('chapter 06 lasts at least 30 minutes for each hero; every scene and document is placed in the run',()=>{
  for(const c of ['ghju','lylu'])assert.ok(estimatedMinutes(c)>=30,`${c}: ${estimatedMinutes(c).toFixed(1)} min`);
  assert.ok(SEGMENTS.every(s=>segmentSeconds(s)<=8*60));
  assert.deepEqual(new Set(SEGMENTS.flatMap(s=>s.lines)),new Set(Object.keys(SCRIPT)));assert.deepEqual(new Set(SEGMENTS.flatMap(s=>s.logs)),new Set(Object.keys(LOGS)));
  for(const id of Object.keys(SCRIPT)){const ly=linesFor(id,'lylu'),gh=linesFor(id,'ghju');assert.ok(ly.length&&gh.length,id);
    assert.ok(!ly.some(l=>['gaby','ghju'].includes(l.who))&&!gh.some(l=>['cara','lylu'].includes(l.who)),id);assert.ok([...ly,...gh].every(l=>l.speaker?.name),id);}
});

test('the bible’s chapter 6, between chapter 05 (Ligne 9) and chapter 07 (forest): P-0, AEGIS technicians, Brutes, Remparts, Sondes, the N-08 that learns',()=>{
  assert.match(bible,/### Chapitre 6 — Le cœur d’acier/);assert.match(bible,/unité expérimentale N-08 coordonne les autres machines et adapte leurs tactiques/);
  const all=JSON.stringify(SCRIPT)+JSON.stringify(Object.keys(LOGS).flatMap(k=>[logFor(k,'ghju'),logFor(k,'lylu')]))+JSON.stringify(ENDING);
  for(const part of ['BR-11','R-11','S-19','SY-05','AEGIS','apprend'])assert.match(all,new RegExp(part,'i'),part);
  // Before: the P-0 order of the Ligne 9 names this foundry; Nira sent the archives to Voss; Varenne and Kim come from the station Est.
  assert.match(JSON.stringify(M05.LOGS),/usine de Vesper-Nord/);assert.match(logFor('bon-p0').lines.join(' '),/usine de Vesper-Nord/);assert.match(M05.ENDING.next,/06 — Le Cœur d’Acier/);
  assert.match(read('m04-story.js'),/Varenne/);assert.match(read('m04-story.js'),/Kim/);
  // After: the same evening, the AEGIS truck, the N-08 that learn « since the foundry », the Tilleuls file about the forest antenna.
  assert.match(M07.SCRIPT.lisiere.ghju[0][1],/Depuis la fonderie, les SY-05 apprennent/);assert.match(logFor('requisition').lines.join(' '),/antenne de terrain[\s\S]*forêt des Sources/);
  assert.match(ENDING.next,/07 — Mémoires Locales/);assert.match(logFor('depart').lines.join(' '),/coucher du soleil/);
  assert.match(logFor('journal-n08','ghju').lines.join(' '),/station énergétique Est[\s\S]*Ligne 9[\s\S]*transmis à toutes les unités SY-05/);
  assert.doesNotMatch(all,/Gabrielle|Carla|empreinte neuronale|est mort|est morte|CONVERGENCE|Résonance/);
});

test('the chapter 06 page: shared engine and HUD, N-08 bar, level screen, menu entry between chapters 05 and 07',()=>{
  const page=read('niveau6.js'),html=read('niveau6.html');
  for(const part of ['mountCombatHud','ArenaGame','createMissionXR','createM06Mission','createM06Art','CHAPITRE 06','REPRENDRE AU POINT DE CONTRÔLE'])assert.ok(page.includes(part),part);
  assert.match(html,/decorateShade\(document\.getElementById\('shade'\),\{mission:6/);assert.match(html,/import\('\.\/niveau6\.js/);assert.match(html,/mode=foret/,'the end leads to chapter 07');
  assert.match(read('index.html'),/data-chapter="campaign6"[^>]*>06 — LE CŒUR D’ACIER/);assert.match(read('entry.js'),/'\.\/niveau6\.html'/);assert.match(read('game.js'),/'campaign6'/);
  assert.match(read('m06-art.js'),/createSignage/);
});
