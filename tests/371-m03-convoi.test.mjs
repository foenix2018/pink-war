import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ArenaGame,ARENA_SIZE} from '../dist/game-logic.js';
import {sectorObstacles,sectorTraversal,decodeSector} from '../dist/m03-sector.js';
import * as L from '../dist/m03-layout.js';
import {createM03Mission,PORTAL_CHARGE} from '../dist/m03-mission.js';
import {SCRIPT,linesFor,logFor,LOGS,ENDING} from '../dist/m03-story.js';
import {M03_STEPS} from '../dist/mission3-visit.js';

const read=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');
const meta=JSON.parse(read('assets/m03/vesper-sector.json'));
const bin=readFileSync(new URL('../dist/assets/m03/vesper-sector.bin',import.meta.url));
const inside=(o,x,z,y=0,r=.6,h=1.8)=>Math.abs(x-o.x)<o.hx+r&&Math.abs(z-o.z)<o.hz+r&&y<(o.y||0)+o.height-.02&&y+h>(o.y||0);
const world=(open=[])=>sectorObstacles(meta,[...L.extraObstacles({open}),...L.CHECKPOINT_POSTS]);
function mission(characterId='ghju',choice='escort'){
  const traversal=sectorTraversal(meta),base=sectorObstacles(meta);
  const g=new ArenaGame(base,()=>.5,traversal);g.reset(characterId);g.enableArmorShield();
  const log={said:[],notices:[],stages:[],movable:{},lost:0,finished:0,power:{}};
  const m=createM03Mission({game:g,characterId,choice,base,hooks:{say:id=>log.said.push(id),notice:t=>log.notices.push(t),stage:(i,s)=>log.stages.push(s.id),
    setMovable:(id,open)=>{log.movable[id]=open;},lost:()=>log.lost++,finish:()=>log.finished++,setPower:(z,on)=>{log.power[z]=on;}}});
  return {g,m,log,traversal};
}
const step=(g,m,dt=1/30,input={})=>{g.nextWave=Infinity;g.toSpawn=0;g.invulnerable=1e9;g.step(dt,input);m.update(dt);};
const run=(g,m,s,{clear=false}={})=>{for(let t=0;t<s;t+=1/30){if(clear)g.enemies.length=0;step(g,m);}};
const use=(g,m,id)=>{const it=L.INTERACTIONS.find(i=>i.id===id);Object.assign(g.player,{x:it.x,z:it.z,elevation:it.y||0,grounded:true});const r=m.interact();assert.equal(r?.id,id,`${id} used`);return r;};
// The player walks next to the van so that it never waits for its escort.
const escortVan=(g,m,s)=>{for(let t=0;t<s;t+=1/30){g.enemies.length=0;const v=m.van;Object.assign(g.player,{x:v.x+3,z:v.z+3,elevation:0,grounded:true});step(g,m);}};

test('the baked Vesper sector decodes, stays in the arena and keeps the first version’s four steps',()=>{
  const s=decodeSector(meta,bin.buffer.slice(bin.byteOffset,bin.byteOffset+bin.byteLength));
  assert.equal(s.world.n,meta.quads);assert.ok(meta.quads>150000,'the whole visitor map');assert.ok(s.portal.n>0&&s.drone.n>0);
  assert.ok(meta.colliders.length>300,'page colliders plus solid boxes found in the geometry');
  const half=ARENA_SIZE/2-1;
  for(const a of L.AREAS)for(const v of [a.x1,a.x2,a.z1,a.z2])assert.ok(Math.abs(v)<=half+.5,`${a.id} in the arena`);
  // The first version’s steps: annex archive, workshop manifest, A3 relay (high), ORDRE beacon at the fracture.
  const near=(id,step)=>{const it=L.INTERACTIONS.find(i=>i.id===id);return Math.hypot(it.x-step.x,it.z-step.z)<8;};
  assert.ok(near('dossier',M03_STEPS[0])&&near('manifeste',M03_STEPS[1])&&near('relais',M03_STEPS[2]));
  assert.equal(L.INTERACTIONS.find(i=>i.id==='relais').y>4,true);assert.ok(Math.abs(L.INTERACTIONS.find(i=>i.id==='balise').z-M03_STEPS[3].z)<8);
});

test('interactions, caches, machines and the van route stand clear; every place is reachable, the A3 deck by its stairway',()=>{
  const w=world();
  for(const it of L.INTERACTIONS){assert.ok(L.areaAt(it.x,it.z),`${it.id} in an area`);assert.ok(!w.some(o=>inside(o,it.x,it.z,it.y||0,.45)),`${it.id} clear`);if(it.log)assert.ok(LOGS[it.log],`page ${it.log}`);}
  for(const s of L.SUPPLIES)assert.ok(!w.some(o=>inside(o,s.x,s.z,s.y,.4)),`cache ${s.x},${s.z}`);
  for(const [n,e] of Object.entries(L.ENCOUNTERS))for(const u of e.units)assert.ok(!w.some(o=>inside(o,u.x,u.z,0,u.form==='brute'||u.elite||u.form==='bulwark'?1.05:.86)),`${n}/${u.form} at ${u.x},${u.z}`);
  for(const p of L.VAN_PATH)assert.ok(!w.some(o=>!o.movable&&inside(o,p.x,p.z,0,1)),`van waypoint ${p.x},${p.z}`);
  const g=new ArenaGame(world(['barriere','remorque']),()=>.5,sectorTraversal(meta));g.reset('lylu');g.navigation.update({x:L.START.x,z:L.START.z},0);
  const reach=(x,z)=>{const i=g.navigation.nearestOpen(x,z);return i>=0&&g.navigation.distance[i]>=0;};
  for(const s of L.STAGES)assert.ok(reach(s.checkpoint.x,s.checkpoint.z),`checkpoint ${s.id}`);
  for(const it of L.INTERACTIONS.filter(i=>!i.y))assert.ok(reach(it.x,it.z),`machines reach ${it.id}`);
  // Up the stairway to the relay.
  Object.assign(g.player,{x:-9,z:-4,elevation:0,grounded:true});
  for(const [tx,tz] of [[-9,-21],[-12,-24],[-17.5,-28]])for(let i=0;i<4000;i++){const dx=tx-g.player.x,dz=tz-g.player.z,d=Math.hypot(dx,dz);if(d<.35)break;g.step(1/60,{x:dx/d,z:dz/d,yaw:0,moveYaw:0});g.enemies.length=0;g.nextWave=Infinity;}
  assert.ok(g.player.elevation>5,'on the A3 deck');assert.ok(Math.hypot(g.player.x+17.5,g.player.z+28)<1);
});

test('the first part plays: Inès, the annex power, the convoy file, the resuscitation kits under attack, the workshop',()=>{
  const {g,m,log}=mission('lylu','proof');m.start();
  assert.equal(m.stageId,'arrivee');assert.deepEqual(log.said,['intro']);assert.ok(Math.hypot(g.player.x-L.START.x,g.player.z-L.START.z)<.1);
  assert.equal(linesFor('ines','lylu','proof').at(-1).who,'ines');assert.match(linesFor('ines','ghju','escort').at(-1).text,/quatorze/);
  use(g,m,'ines');assert.equal(m.stageId,'alimentation');
  use(g,m,'alimentation');assert.equal(log.power.annexe,true);assert.equal(m.stageId,'dossier');
  assert.equal(use(g,m,'dossier').log,'dossier');assert.equal(m.stageId,'kit');assert.match(logFor('dossier','lylu').lines.join(' '),/lot à part/);
  use(g,m,'kit');assert.equal(m.groups().annexe.deployed,4);run(g,m,1);assert.equal(m.stageId,'kit','the annex fight first');
  g.enemies.length=0;step(g,m);assert.equal(m.stageId,'atelier');
  Object.assign(g.player,{x:24,z:28});step(g,m);assert.equal(m.groups().atelier.deployed,4,'patrol at the workshop');
  use(g,m,'manifeste');assert.equal(m.stageId,'verin');
  Object.assign(g.player,{x:34,z:38.4});assert.equal(m.nearInteraction(),null,'the patrol first');
  g.enemies.length=0;use(g,m,'verin');assert.equal(m.stageId,'escorte');assert.ok(log.said.includes('escorte'));
});

test('the convoy: escort, ORDRE barrier, A3 relay, beacon at the fracture, the barrier repaired, the interchange, the freight station',()=>{
  const {g,m,log}=mission('ghju');m.start();
  for(const id of ['ines','alimentation','dossier','kit'])use(g,m,id);g.enemies.length=0;step(g,m);use(g,m,'manifeste');g.enemies.length=0;use(g,m,'verin');
  // The van waits for its escort.
  Object.assign(g.player,{x:0,z:-60});run(g,m,2,{clear:true});assert.equal(m.van.waiting,'escorte');assert.ok(m.van.z>40);
  escortVan(g,m,90);assert.equal(m.stageId,'a3','the van stops at the ORDRE barrier');assert.equal(L.VAN_PATH[m.van.index].stop,'barriere');
  assert.ok(m.groups().route1&&m.groups().route2,'ambushes on the avenue');assert.ok(log.said.includes('barrage'));
  g.enemies.length=0;assert.equal(use(g,m,'relais').log,'relais');assert.equal(m.stageId,'balise');assert.match(linesFor('relais','ghju')[0].text,/Ravel/);
  Object.assign(g.player,{x:0,z:-84,elevation:0});step(g,m);assert.equal(m.groups().fracture.deployed,4,'heavy ambush at the fracture');
  assert.ok(g.enemies.some(e=>e.elite&&e.form==='brute'));
  Object.assign(g.player,{x:0,z:-91.4});assert.equal(m.nearInteraction(),null,'the ambush first');
  g.enemies.length=0;use(g,m,'balise');assert.equal(m.hold.name,'balise');
  run(g,m,2+PORTAL_CHARGE+.2);assert.equal(m.groups().balise1.deployed,3,'portal reinforcements');
  run(g,m,L.HOLDS.balise);assert.equal(m.hold,null);assert.equal(m.stageId,'barriere');assert.ok(m.reads.includes('balise'));
  g.enemies.length=0;use(g,m,'barriere');run(g,m,L.HOLDS.barriere+1);g.enemies.length=0;step(g,m);
  assert.equal(m.stageId,'escorte2');assert.equal(log.movable.barriere,true);assert.ok(!m.collisions.some(o=>o.movable==='barriere'));
  escortVan(g,m,60);assert.equal(m.stageId,'echangeur');assert.equal(L.VAN_PATH[m.van.index].stop,'remorque');assert.ok(m.groups().voie);
  g.enemies.length=0;use(g,m,'treuil');run(g,m,L.HOLDS.treuil+1);g.enemies.length=0;step(g,m);assert.equal(m.stageId,'gare');assert.equal(log.movable.remorque,true);
  escortVan(g,m,60);assert.equal(m.stageId,'arrimage');assert.ok(m.groups().gare);
  g.enemies.length=0;step(g,m);use(g,m,'arrimage');run(g,m,L.HOLDS.arrimage+1);assert.equal(m.groups().arrimage3.deployed,4,'three waves on the platform');
  assert.equal(m.stageId,'regulation');g.enemies.length=0;
  assert.equal(use(g,m,'regulation').log,'regulation');assert.equal(m.completed,true);assert.equal(log.finished,1);
});

test('the van loses integrity when machines reach it, and the checkpoint puts everything back at the stage',()=>{
  const {g,m,log}=mission('lylu');m.start();
  for(const id of ['ines','alimentation','dossier','kit'])use(g,m,id);g.enemies.length=0;step(g,m);use(g,m,'manifeste');g.enemies.length=0;use(g,m,'verin');
  // Machines around the van, the player beside it: the van stops and is sabotaged.
  const v=m.van;g.toSpawn=1;g.activePortals=[{id:1,x:v.x+2,z:v.z-3,yaw:0,openedAt:0}];g.spawnEnemy();g.activePortals=[];const e=g.enemies.at(-1);e.form='stalker';
  for(let t=0;t<5;t+=1/30){Object.assign(e,{x:v.x+2,z:v.z-3});Object.assign(g.player,{x:v.x-2,z:v.z+2});step(g,m);}
  assert.equal(m.van.waiting,'machines');assert.ok(m.van.hp<100);
  for(let t=0;t<40&&!log.lost;t+=1/30){Object.assign(e,{x:m.van.x+2,z:m.van.z-3});step(g,m);}
  assert.equal(log.lost,1,'the van can be lost');
  m.restoreCheckpoint();assert.equal(m.stageId,'escorte');assert.equal(m.van.hp,100);assert.equal(m.van.index,0);assert.ok(m.done.includes('verin'));
  assert.equal(g.enemies.length,0);
});

test('the story: both heroes, Inès and Ravel from chapter 02, Mara Voss and AEGIS, the first glimpse of the sibling, the road to the Protocole Interdit',()=>{
  for(const [id,entry] of Object.entries(SCRIPT)){
    const lylu=linesFor(id,'lylu'),ghju=linesFor(id,'ghju');assert.ok(lylu.length&&ghju.length,id);
    assert.ok(!lylu.some(l=>['gaby','ghju'].includes(l.who)),`${id} LYLU`);assert.ok(!ghju.some(l=>['cara','lylu'].includes(l.who)),`${id} GHJU`);
    assert.ok([...lylu,...ghju].every(l=>l.speaker?.name),`${id} speakers`);
  }
  assert.match(logFor('regulation','lylu').lines.join(' '),/Hadi[\s\S]*station énergétique/);
  assert.match(linesFor('treuilOk','lylu').map(l=>l.text).join(' '),/marques roses/);assert.match(linesFor('treuilOk','ghju').map(l=>l.text).join(' '),/signature bleue/);
  assert.ok(linesFor('intro','ghju').some(l=>l.who==='voss'),'Mara Voss, AEGIS');assert.match(logFor('regulation','ghju').lines.join(' '),/Kessler/);
  assert.match(logFor('relais').lines.join(' '),/Ravel/);assert.match(logFor('dossier','ghju').lines.join(' '),/stabilisation/);
  // The first version's texts are kept.
  for(const [i,id] of ['dossier','manifeste','relais'].entries())assert.ok(logFor(id,'ghju').lines[0].includes(M03_STEPS[i].message.split(' — ')[1].slice(0,40)),id);
  assert.match(ENDING.next,/Protocole Interdit/);assert.match(ENDING.text.ghju,/raison d’espérer que LYLU est vivant/);
  const all=JSON.stringify(SCRIPT)+JSON.stringify(Object.keys(LOGS).flatMap(k=>[logFor(k,'ghju'),logFor(k,'lylu')]));assert.doesNotMatch(all,/est mort|est morte/);
});

test('the level 3 page: shared combat HUD and engine, the baked sector, the menu entry; the first version stays reachable',()=>{
  const page=read('niveau3.js'),html=read('niveau3.html'),entry=read('entry.js'),vercel=readFileSync(new URL('../vercel.json',import.meta.url),'utf8');
  for(const part of ['mountCombatHud','ArenaGame','createMissionXR','fetchSector','createM03Mission','createM03Art','logFor','REPRENDRE AU POINT DE CONTRÔLE','AMBULANCE · '])assert.ok(page.includes(part),part);
  assert.match(html,/import\('\.\/niveau3\.js/);assert.match(html,/vesper-level1-v7\.html\?chapter=3/,'first version (free visit) linked');
  assert.match(entry,/mission===3\?'\.\/niveau3\.html'/);assert.doesNotMatch(vercel,/niveau3\.html/,'the page is served directly');
  assert.doesNotMatch(read('index.html'),/LE CONVOI DES ABSENTS · DÉCOUVERTE/);
});

test('the wording stays generic: an ambulance, not fire-brigade jargon',()=>{
  const text=['m03-story.js','m03-layout.js','m03-mission.js','m03-art.js','niveau3.js','niveau3.html'].map(read).join('\n');
  assert.doesNotMatch(text,/VSAV|fourgon|chef d’agrès|\bFPT\b|caserne/i);assert.match(text,/ambulance/i);
});

test('one level screen for every chapter (logo, chapter, zone, objectives, RETOUR / COMMENCER), and the traced logo',async()=>{
  const {BRIEFINGS,briefingFor}=await import('../dist/mission-briefing.js');
  for(const m of [1,2,3,5]){const b=briefingFor(m,'ghju');assert.equal(b.objectives.length,4,`chapter ${m}`);assert.ok(b.zone.startsWith('Vesper //'));assert.equal(b.number,String(m).padStart(2,'0'));}
  assert.deepEqual(briefingFor(3).objectives.map(o=>o.title),['Fouiller l’annexe médicale','Récupérer le manifeste du convoi','Rejoindre les archives A3','Couper la balise d’ORDRE'],'the chapter 03 model');
  for(const page of ['niveau3.html','ligne9.html','level2-test.html'])assert.match(read(page),/decorateShade\(document\.getElementById\('shade'\)/,page);
  assert.match(read('mission-loading.js'),/buildLoadingCover/);assert.ok(Object.keys(BRIEFINGS).length>=4);
  const logo=read('art/pink-wars-wordmark.svg');assert.match(logo,/<path d="M/);assert.doesNotMatch(logo,/<text/,'traced letters, no font');
  assert.match(read('pw-identity.js'),/pink-wars-wordmark-inline\.svg/);
});

test('chapters 01 and 02 speak generically too: a station, an ambulance, a hangar — no fire-brigade jargon',()=>{
  const story=read('m01-extension-story.js')+read('m02-extension-story.js'),labels=read('m01-extension-layout.js').split('\n').filter(l=>!l.trim().startsWith('//')).join('\n');
  assert.doesNotMatch(story.replace(/^\/\/.*$/gm,''),/VSAV|\bFPT\b|[Cc]aserne|chef d’agrès|main courante|[Pp]ompiers|adjudant|caporal|Départs à la voix|\bARI\b/);
  assert.doesNotMatch(labels,/'[^'\n]*(Caserne|CASERNE|MAIN COURANTE|SECTIONNELLE|REMISE|Remise)[^'\n]*'/);
  assert.match(story,/ambulance 07/);assert.match(story,/STATION AEGIS 07/);
});
