import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ARENA_SIZE} from '../dist/game-logic.js';
import {CampaignLevel1,LEVEL1} from '../dist/campaign-level1.js';
import {createLevel1Obstacles,LEVEL1_MAP} from '../dist/level1-layout.js';
import * as X from '../dist/m01-extension-layout.js';
import {installM01Extension,readExtensionCheckpoint,PORTAL_CHARGE} from '../dist/m01-extension.js';
import {SCRIPT,linesFor,logFor,LOGS,ENDING} from '../dist/m01-extension-story.js';
import {chapterStory} from '../dist/story-chapters.js';

const read=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');
const ALL=X.DOORS.map(d=>d.id);
const inside=(o,x,z,y=0,r=.8,h=1.8)=>Math.abs(x-o.x)<o.hx+r&&Math.abs(z-o.z)<o.hz+r&&y<(o.y||0)+o.height-.02&&y+h>(o.y||0);
const memory=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};
function campaign(characterId='ghju',hooks={}){
  const g=new CampaignLevel1(createLevel1Obstacles(),()=>.5,characterId);g.enableArmorShield();
  const log={said:[],doors:{},notices:[]};
  const ext=installM01Extension(g,{say:id=>log.said.push(id),setDoor:(id,s)=>{log.doors[id]=s;},notice:t=>log.notices.push(t),...hooks});
  return {g,ext,log};
}
function walkNav(g,to,limit=240){
  const nav=new g.navigation.constructor(g.obstacles);nav.update({x:to[0],z:to[1]},0);
  for(let i=0;i<60*limit;i++){
    const p=g.player;if(Math.hypot(p.x-to[0],p.z-to[1])<.6)break;
    let wp=nav.waypoint({...p,radius:.55});if(!wp||Math.hypot(p.x-to[0],p.z-to[1])<2.2)wp={x:to[0],z:to[1]};
    const dx=wp.x-p.x,dz=wp.z-p.z,d=Math.hypot(dx,dz)||1;g.step(1/60,{x:dx/d,z:dz/d,yaw:0,moveYaw:0});g.invulnerable=1e9;
  }
  return g.player;
}

test('the Caserne 07 and the Archives végétales stand on free ground of the arena, outside the original quarter',()=>{
  const half=ARENA_SIZE/2-2,b=LEVEL1_MAP.bounds;
  for(const r of X.ROOMS){
    for(const v of [r.x1,r.x2,r.z1,r.z2])assert.ok(Math.abs(v)<=half,`${r.id} inside the arena`);
    const overlaps=r.x2>b.minX&&r.x1<b.maxX&&r.z2>b.minZ&&r.z1<b.maxZ;
    assert.ok(!overlaps,`${r.id} outside the quarter`);
  }
  const core=createLevel1Obstacles().filter(o=>!o.fence);
  for(const o of X.extensionObstacles({open:ALL}))assert.ok(!core.some(c=>Math.abs(c.x-o.x)<c.hx+o.hx&&Math.abs(c.z-o.z)<c.hz+o.hz),`${o.kind} at ${o.x},${o.z} does not cut the original map`);
  // Two openings in the waist-high fence, nothing else removed.
  const fences=createLevel1Obstacles().filter(o=>o.fence),split=fences.flatMap(f=>X.splitFence(f)||[f]);
  assert.equal(split.length,fences.length+2);
});

test('corridors and doorways suit the machines’ navigation; every place of both buildings is reachable from the quarter',()=>{
  for(const r of X.ROOMS.filter(r=>['corridor','gallery'].includes(r.look))){
    const w=Math.min(r.x2-r.x1,r.z2-r.z1),c=(r.x2-r.x1)<(r.z2-r.z1)?(r.x1+r.x2)/2:(r.z1+r.z2)/2;
    assert.ok(w>=4&&Math.abs(c%2)<1e-9,`${r.id}: 4 m on the grid`);
  }
  for(const d of X.DOORS)assert.ok(d.width>=3&&Math.abs(d.centre%2)<1e-9,`${d.id}: doorway on the grid`);
  const {g}=campaign();
  const list=g.obstacles;for(let i=list.length-1;i>=0;i--)if(list[i].extension)list.splice(i,1);list.push(...X.extensionObstacles({open:ALL}));g.replaceObstacles(list);
  g.navigation.update({x:LEVEL1.start.x,z:LEVEL1.start.z},0);
  const reach=(x,z)=>{const i=g.navigation.nearestOpen(x,z);return i>=0&&g.navigation.distance[i]>=0;};
  // A room counts as reached when a free point near its middle is (centres may hold furniture).
  for(const r of X.ROOMS){const cx=(r.x1+r.x2)/2,cz=(r.z1+r.z2)/2;assert.ok([[0,0],[-4,0],[4,0],[0,-3],[0,3]].some(([dx,dz])=>reach(cx+dx,cz+dz)),`machines reach ${r.id}`);}
  for(const s of [...X.PROLOGUE,...X.EPILOGUE])assert.ok(reach(s.checkpoint.x,s.checkpoint.z),`checkpoint ${s.id}`);
});

test('interactions, documents and every machine of every encounter stand clear of the colliders',()=>{
  const {g}=campaign();const list=g.obstacles;list.push(...X.extensionObstacles({open:ALL}));
  for(const it of X.INTERACTIONS.filter(i=>!i.core)){assert.ok(X.roomAt(it.x,it.z),`${it.id} in a room`);assert.ok(!list.some(o=>inside(o,it.x,it.z,0,.6)),`${it.id} reachable`);}
  for(const [name,enc] of Object.entries(X.ENCOUNTERS))for(const u of enc.units)assert.ok(!list.some(o=>inside(o,u.x,u.z,0,u.form==='brute'||u.elite?1.05:.86)),`${name}/${u.form} at ${u.x},${u.z}`);
  for(const it of X.INTERACTIONS.filter(i=>i.log))assert.ok(LOGS[it.log],`document ${it.log}`);
  for(const c of X.SUPPLIES){assert.ok(X.roomAt(c.x,c.z),`cache at ${c.x},${c.z} in a room`);assert.ok(!list.some(o=>inside(o,c.x,c.z,0,.5)),`cache at ${c.x},${c.z} reachable`);}
  const {g:fresh,ext}=campaign();ext.start();assert.equal(fresh.pickups.filter(p=>p.extension).length,X.SUPPLIES.length,'AEGIS caches laid out');
});

test('the prologue plays: yard, dispatch log, lockers, generator hold, apparatus-bay door, then the original quarter',()=>{
  const {g,ext,log}=campaign('lylu');
  ext.start();assert.equal(g.stage,'x-cour');assert.deepEqual(log.said,['intro']);
  assert.ok(Math.hypot(g.player.x-X.CASERNE_START.x,g.player.z-X.CASERNE_START.z)<.1);
  assert.equal(g.campaign.title,'La Caserne 07');assert.ok(g.guidance(),'the objective guide works inside the station');
  // The bay door is shut and the generator room cannot be bypassed.
  assert.ok(g.obstacles.some(o=>o.door==='portail'),'the sectional door is closed');
  let p=walkNav(g,[-82,48]);assert.equal(g.stage,'x-garde','entering the corridor');
  const use=id=>{const it=X.INTERACTIONS.find(i=>i.id===id);Object.assign(g.player,{x:it.x,z:it.z,elevation:0,grounded:true});assert.equal(g.getInteraction()?.id,id,`${id} offered`);assert.ok(g.interact(),`${id} used`);return ext.takeJournal();};
  assert.equal(use('main-courante').id,'main-courante');assert.equal(g.stage,'x-vestiaires');
  const casier=use('casier');assert.equal(casier.then,'casier');assert.match(casier.entry.lines.join(' '),/GHJU/);assert.equal(g.stage,'x-groupe');
  Object.assign(g.player,{x:-91,z:50.4});assert.equal(g.getInteraction()?.id,undefined,'no start before the fuel valve');
  use('gazole');use('demarreur');assert.equal(ext.hold.name,'groupe');
  const run=s=>{for(let t=0;t<s;t+=1/30){g.invulnerable=1e9;g.step(1/30,{});}};
  run(4);assert.ok(ext.groups().nid.deployed===3,'machines wake in the bay');assert.ok(log.said.includes('nid'));
  run(X.HOLDS.groupe);assert.equal(ext.hold,null);assert.equal(g.stage,'x-remise');g.enemies.length=0;
  use('porte-remise');assert.equal(log.doors.portail,true);assert.ok(!g.obstacles.some(o=>o.door==='portail'),'the bay opens');assert.equal(g.stage,'x-sortie');
  g.enemies.length=0;Object.assign(g.player,{x:-82,z:86});p=walkNav(g,[-70,88]);
  assert.equal(g.stage,'approach','the original chapter takes over');assert.ok(ext.prologueDone);assert.ok(log.said.includes('quartier'));
  assert.equal(g.campaign.stage,'approach');assert.ok(g.campaign.objective,'core objective intact');
});

test('the relay A3 opens the epilogue: Archives végétales, bivouac, registry copy under assault, lift to the Bas-Niveaux',()=>{
  const events=[];const {g,ext,log}=campaign('ghju');ext.resumeCore();
  // The original chapter is done up to its relay.
  g.setStage('exit');Object.assign(g.player,{...LEVEL1.exit,elevation:LEVEL1.exit.y,grounded:true});
  assert.equal(g.getInteraction()?.id,'exit');assert.ok(g.interact());assert.equal(g.completed,false,'the relay no longer ends the chapter');
  assert.equal(g.stage,'x-route');const relay=ext.takeJournal();assert.equal(relay.id,'relais-a3');assert.match(relay.entry.lines.join(' '),/07-LYLU/);
  g.enemies.length=0;Object.assign(g.player,{x:6,z:-58,elevation:0});walkNav(g,[6,-64.5]);assert.equal(g.stage,'x-entree');
  assert.ok(g.obstacles.some(o=>o.door==='accueil'),'the entrance is locked');
  const use=id=>{const it=X.INTERACTIONS.find(i=>i.id===id);Object.assign(g.player,{x:it.x,z:it.z,elevation:0,grounded:true});assert.ok(g.interact(),`${id} used`);return ext.takeJournal();};
  g.enemies.length=0;use('deverrouillage');assert.equal(g.stage,'x-bivouac');assert.ok(!g.obstacles.some(o=>o.door==='accueil'));
  g.enemies.length=0;assert.match(use('doc-visiteurs').entry.lines.join(' '),/LYLU, AEGIS 07/);
  assert.equal(use('bivouac').then,'bivouac');assert.equal(g.stage,'x-copie');
  g.enemies.length=0;use('copie');assert.equal(ext.hold.name,'copie');assert.equal(g.getInteraction(),null,'nothing else during the copy');
  const run=s=>{for(let t=0;t<s;t+=1/30){g.invulnerable=1e9;g.step(1/30,{});for(const e of g.drainEvents())events.push(e.type);}};
  run(4+PORTAL_CHARGE+.2);assert.equal(ext.groups().copie1.deployed,3,'reinforcements step out of the greenhouse portal');assert.ok(events.includes('portals'));
  run(X.HOLDS.copie);assert.equal(ext.hold,null);assert.equal(g.stage,'x-depart');
  const registre=ext.takeJournal();assert.equal(registre.id,'registre');assert.match(registre.entry.lines.join(' '),/Pas disparue/);assert.equal(registre.then,'copieOk');
  g.enemies.length=0;Object.assign(g.player,{x:40.4,z:-82.6});assert.ok(g.interact());assert.equal(g.stage,'x-fin');
  walkNav(g,[45,-80]);assert.equal(g.completed,true);assert.equal(g.state,'won');
});

test('checkpoints: an extension stage resumes at its place with earlier progress kept; a defeat brings the save back',()=>{
  const storage=memory();const {g,ext}=campaign('lylu');ext.start();
  Object.assign(g.player,{x:-82,z:50});g.step(1/60,{});assert.equal(g.stage,'x-garde');
  g.enemies.length=0;assert.ok(ext.writeCheckpoint(storage));
  const save=readExtensionCheckpoint('lylu',storage);assert.equal(save.stage,'x-garde');
  const second=campaign('lylu');assert.ok(second.ext.restoreCheckpoint(save));assert.equal(second.g.stage,'x-garde');
  assert.ok(Math.hypot(second.g.player.x-X.STAGE['x-garde'].checkpoint.x,second.g.player.z-X.STAGE['x-garde'].checkpoint.z)<.1);
  // Epilogue save: the bay door stays open, the original chapter is behind.
  const third=campaign('lylu');assert.ok(third.ext.restoreCheckpoint({...save,stage:'x-copie',opened:['accueil'],done:['bivouac']}));
  assert.equal(third.g.stage,'x-copie');assert.ok(!third.g.obstacles.some(o=>o.door==='accueil'||o.door==='portail'));assert.ok(third.ext.prologueDone);
});

test('the story: both heroes, Gaby with GHJU and Cara with LYLU, the night of 2189 matching Ligne 9, a recent trace, the road to the Bas-Niveaux',()=>{
  for(const id of Object.keys(SCRIPT)){
    const lylu=linesFor(id,'lylu'),ghju=linesFor(id,'ghju');assert.ok(lylu.length&&ghju.length,id);
    assert.ok(!lylu.some(l=>['gaby','ghju'].includes(l.who)),`${id} LYLU`);assert.ok(!ghju.some(l=>['cara','lylu'].includes(l.who)),`${id} GHJU`);
  }
  const main=logFor('main-courante','ghju').lines.join(' ');
  for(const fact of ['22 h 05','pompes P9','22 h 12','34 civils','22 h 47','23 h 00','Ne prends pas le réseau principal. Retrouve les anciens relais.','17 h 42','canal 07'])assert.ok(main.includes(fact),fact);
  const ligne9=read('ligne9-story.js');for(const fact of ['22 h 05','22 h 12','22 h 47','34 civils'])assert.ok(ligne9.includes(fact),`Ligne 9 agrees: ${fact}`);
  assert.match(logFor('registre','lylu').lines.join(' '),/GHJU.*Bas-Niveaux/);assert.match(logFor('bivouac','ghju').lines.join(' '),/Ligne 9 → poste Orme/);
  assert.match(logFor('serveur').lines.join(' '),/HELIX/);
  const all=JSON.stringify(SCRIPT)+JSON.stringify(Object.keys(LOGS).map(k=>logFor(k,'ghju')))+JSON.stringify(ENDING);
  assert.doesNotMatch(all,/est mort|est morte/);assert.match(ENDING.text.ghju,/LYLU est vivant/);assert.match(ENDING.text.lylu,/GHJU est vivante/);
  assert.match(chapterStory(1,'ghju').text,/Bas-Niveaux/);assert.match(chapterStory(1,'ghju').text,/registre/);
});

test('the M01 page drives the extension: journals, subtitles, daylight adaptation, resume after a defeat',()=>{
  const code=read('vesper-combat.js');
  for(const part of ['installM01Extension','createM01ExtensionArt','createSubtitles','extArt.adapt(atmosphere','readExtensionCheckpoint','REPRENDRE AU POINT DE CONTRÔLE','M01_ENDING'])assert.ok(code.includes(part),part);
  const art=read('m01-extension-art.js');for(const part of ['VSAV','FPT','GROUPE ÉLECTROGÈNE','ARCHIVES VÉGÉTALES','MONTE-CHARGE'])assert.ok(art.includes(part),part);
});
