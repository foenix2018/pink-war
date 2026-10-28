import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ArenaGame,ARENA_SIZE} from '../dist/game-logic.js';
import * as L from '../dist/ligne9-layout.js';
import {SCRIPT,LOGS,linesFor,ENDING} from '../dist/ligne9-story.js';

const read=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');
const traversal=L.createTraversal();
const ALL_OPEN={open:L.DOORS.map(d=>d.id),drained:L.WATER.filter(w=>w.drainable).map(w=>w.id)};
const game=(state={})=>{const g=new ArenaGame(L.buildCollisions(state),()=>.5,traversal,'lylu');g.nextWave=Infinity;g.toSpawn=0;g.enableArmorShield();return g;};
const inside=(o,x,z,y=0,r=.8,h=1.8)=>Math.abs(x-o.x)<o.hx+r&&Math.abs(z-o.z)<o.hz+r&&y<(o.y||0)+o.height-.02&&y+h>(o.y||0);
// Walk the player through waypoints (world input with yaw 0: +x right, +z back).
function walk(g,points){
  const [sx,sz]=points[0];Object.assign(g.player,{x:sx,z:sz,elevation:traversal.height(sx,sz),grounded:true});
  for(const [tx,tz] of points.slice(1))for(let i=0;i<2400;i++){
    const dx=tx-g.player.x,dz=tz-g.player.z,d=Math.hypot(dx,dz);if(d<.35)break;
    g.step(1/60,{x:dx/d,z:dz/d,yaw:0,moveYaw:0});g.nextWave=Infinity;g.invulnerable=1e9;
  }
  return g.player;
}
// The full player route, room by room (centre lines of corridors and doorways).
const ROUTE=[[0,-92],[0,-86],[0,-70],[0,-66],[14,-62],[22,-60],[14,-62],[12,-58],[12,-54],[0,-50],[0,-46],[0,-36],[8,-36],[0,-36],[0,-20],[38,-20],[44,-20],
  [43,-26],[43,-34],[43,-42.5],[43,-26],[49,-24],[49,-10],[86,-10],[89.5,-2],[84,-2],[84,4],[84,14],[92,14],[84,14],[84,24],[84,30],[90,33],[60,36],[32,36],[0,36],
  [-18,36],[-18,40],[-18,36],[-58,36],[-64,36],[-66,31],[-90,30],[-74,34],[-66,34],[-64,46],[-64,49],[-76,49.5],[-76,58],[-76,66],[-86,71],[-70,72],[-50,72],[-38,72],
  [-34,90],[-10,64],[14,64],[10,88],[22,88],[22,92],[38,86],[47,86]];

test('Ligne 9 fits the engine arena: rooms, colliders and route inside the playable square',()=>{
  const half=ARENA_SIZE/2-1.8;
  for(const r of L.ROOMS)for(const v of [r.x1,r.x2,r.z1,r.z2])assert.ok(Math.abs(v)<=half,`${r.id} inside the arena`);
  for(const o of L.buildCollisions())assert.ok(Math.abs(o.x)+o.hx<=ARENA_SIZE/2&&Math.abs(o.z)+o.hz<=ARENA_SIZE/2,`${o.kind} inside`);
  for(const [x,z] of ROUTE)assert.ok(L.roomAt(x,z),`route point ${x},${z} lies in a room`);
  assert.equal(L.STAGES.length,16);assert.equal(L.ROOMS.length,20);
});

test('corridors and doorways are wide enough for the machines’ navigation grid',()=>{
  for(const r of L.ROOMS.filter(r=>r.look==='corridor'||r.look==='service')){
    const w=Math.min(r.x2-r.x1,r.z2-r.z1),c=(r.x2-r.x1)<(r.z2-r.z1)?(r.x1+r.x2)/2:(r.z1+r.z2)/2;
    assert.ok(w>=4&&Math.abs(c%2)<1e-9,`${r.id}: 4 m wide or more, centred on the 2 m grid`);
  }
  for(const d of L.DOORS)assert.ok(d.width>=3&&Math.abs(d.centre%2)<1e-9,`${d.id}: doorway of 3 m or more on the grid`);
  // With every door open and the water pumped, one navigation field reaches every place of the mission.
  const g=game(ALL_OPEN);g.navigation.update({x:-10,z:70},0);
  const reach=(x,z)=>{const i=g.navigation.nearestOpen(x,z);return i>=0&&g.navigation.distance[i]>=0;};
  for(const [x,z] of ROUTE.slice(3))assert.ok(reach(x,z),`machines can reach ${x},${z}`);
  for(const s of L.STAGES.slice(1))assert.ok(reach(s.checkpoint.x,s.checkpoint.z),`checkpoint of ${s.id}`);
});

test('the player walks the whole line, from the street down to the service lift, once doors open and water is pumped',()=>{
  const g=game(ALL_OPEN);let p=walk(g,ROUTE.slice(0,3));
  assert.ok(p.z>-71&&p.elevation<.01,'down the street stair to the ticket hall');
  p=walk(g,ROUTE.slice(2));
  assert.ok(Math.hypot(p.x-47,p.z-86)<.6,`reaches the lift (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`);
});

test('closed doors and live or deep water really block the way',()=>{
  const service=walk(game(),[[0,-58],[0,-44]]);assert.ok(service.z<-48,'the dead service door holds');
  const shutter=walk(game(ALL_OPEN.open.filter(id=>id!=='rideau').length?{open:ALL_OPEN.open.filter(id=>id!=='rideau'),drained:ALL_OPEN.drained}:{}),[[84,-4],[84,8]]);
  assert.ok(shutter.z<2,'the market shutter holds');
  const tunnel=walk(game({open:ALL_OPEN.open}),[[20,36],[-50,36]]);assert.ok(tunnel.x>-1,'the flooded service tunnel stops the player');
  const tracks=walk(game(ALL_OPEN),[[60,36],[60,56]]);assert.ok(tracks.z<44,'nobody wades into the live tracks');
  const basin=walk(game(ALL_OPEN),[[66,-38],[66,-20]]);assert.ok(basin.z<-32,'the market collapse is not walkable');
  const lock=walk(game({open:ALL_OPEN.open.filter(id=>id!=='ecluse'),drained:['tunnel']}),[[-70,72],[-50,72]]);assert.ok(lock.x<-62,'the lock gate holds');
});

test('interactions, documents, spawns, supplies and checkpoints stand clear of every collider',()=>{
  const world=L.buildCollisions(ALL_OPEN);
  for(const it of L.INTERACTIONS){assert.ok(L.roomAt(it.x,it.z),`${it.id} in a room`);assert.ok(!world.some(o=>inside(o,it.x,it.z,0,.6)),`${it.id} reachable`);}
  for(const [name,enc] of Object.entries(L.ENCOUNTERS))for(const u of enc.units){
    assert.ok(L.roomAt(u.x,u.z),`${name}/${u.form} in a room`);
    assert.ok(!world.some(o=>inside(o,u.x,u.z,0,u.form==='brute'||u.elite?1.05:.86)),`${name}/${u.form} at ${u.x},${u.z} clear`);
  }
  for(const s of L.STAGES){assert.ok(!world.some(o=>inside(o,s.checkpoint.x,s.checkpoint.z,traversal.height(s.checkpoint.x,s.checkpoint.z))),`checkpoint ${s.id}`);}
  for(const it of L.INTERACTIONS.filter(i=>i.log))assert.ok(LOGS[it.log],`document ${it.log} written`);
});

test('the script: every line exists for both heroes, Cara speaks to LYLU and Gaby to GHJU, documents are complete',()=>{
  for(const id of Object.keys(SCRIPT)){
    const lylu=linesFor(id,'lylu'),ghju=linesFor(id,'ghju');
    assert.ok(lylu.length&&ghju.length,`${id} has lines`);
    assert.ok(!lylu.some(l=>l.who==='gaby'||l.who==='ghju'),`${id}: LYLU’s version`);assert.ok(!ghju.some(l=>l.who==='cara'||l.who==='lylu'),`${id}: GHJU’s version`);
  }
  for(const [id,log] of Object.entries(LOGS)){assert.ok(log.title&&log.body.length>=3,`${id}`);}
  assert.ok(ENDING.text.lylu&&ENDING.text.ghju);
  const all=JSON.stringify(SCRIPT)+JSON.stringify(LOGS)+JSON.stringify(ENDING);
  for(const canon of ['Nira Solen','JANUS','HELIX','ORDRE','Retrouve les anciens relais','Épars'])assert.ok(all.includes(canon),`canon: ${canon}`);
  assert.doesNotMatch(all,/est mort|est morte|tué net/,'no death is confirmed');
});

test('the whole mission plays through: power, relays, three holds, valves, lock, anchor, evidence, escape, relay, lift',async()=>{
  const {createLigne9Mission,PORTAL_CHARGE,HOLDS,ESCAPE_SECONDS}=await import('../dist/ligne9-mission.js');
  const log={stages:[],said:[],doors:{},water:{},power:{},portals:0,emerged:0,finished:0,revealed:false,flood:[]};
  const g=new ArenaGame(L.buildCollisions(),()=>.5,traversal,'lylu');g.reset('lylu');g.enableArmorShield();
  const m=createLigne9Mission({game:g,characterId:'lylu',hooks:{stage:i=>log.stages.push(i),say:id=>log.said.push(id),setDoor:(id,o)=>{log.doors[id]=o;},setWater:(id,s)=>{log.water[id]=s;},
    setPower:(z,s)=>{log.power[z]=s;},openPortal:()=>log.portals++,emerge:()=>log.emerged++,finish:()=>log.finished++,reveal:v=>{log.revealed=v;},flood:v=>log.flood.push(v)}});
  const run=seconds=>{for(let t=0;t<seconds;t+=1/30){g.invulnerable=1e9;g.step(1/30,{});m.update();}};
  const go=(x,z)=>{Object.assign(g.player,{x,z,elevation:traversal.height(x,z),grounded:true});m.update();};
  const kill=()=>{g.enemies.length=0;};
  const use=id=>{const it=L.INTERACTIONS.find(i=>i.id===id);go(it.x,it.z);const done=m.interact();assert.ok(done&&done.id===id,`${id} used`);return done;};
  m.start();assert.equal(m.stage,0);assert.deepEqual(log.said,['intro']);assert.ok(g.ownedWeapons.size>=5,'an arsenal for a long mission');
  assert.ok(g.pickups.length>=6,'supplies along the line');
  go(0,-66);assert.equal(m.stage,1);assert.equal(g.enemies.length,5);
  go(0,-58);assert.equal(m.nearInteraction(),null);use('tableau');assert.equal(m.stage,2);assert.equal(log.doors.service,true);assert.equal(log.power.station,'secours');
  assert.ok(!m.collisions.some(o=>o.door==='service'),'the service door leaves the colliders');
  kill();go(8,-36);assert.ok(log.said.includes('secours'));
  const doc=use('doc-registre');assert.equal(doc.log,'registre');
  go(46,-20);assert.equal(m.stage,3);assert.ok(log.emerged>=3,'crawlers rise from the market collapse');
  use('relais-ouest');assert.equal(m.stage,4);assert.deepEqual(m.pending,['renfortHalles']);run(PORTAL_CHARGE+.2);assert.equal(m.groups().renfortHalles.deployed,4);
  kill();use('relais-est');assert.equal(m.stage,5);assert.equal(log.doors.rideau,true);
  kill();go(92,14);assert.ok(log.said.includes('abri'));go(84,30);assert.equal(m.stage,6);
  kill();use('pompe-a');assert.equal(m.hold.name,'pompeA');assert.equal(m.nearInteraction(),null,'nothing else to use during a hold');
  run(HOLDS.pompeA+.5);assert.ok(log.emerged>=12,'three waves from under the platform');assert.equal(m.stage,7);assert.equal(log.water.tunnel,'drained');
  assert.ok(!m.collisions.some(o=>o.water==='tunnel'),'the tunnel is walkable');
  kill();go(-36,36);assert.equal(log.power.tunnel,'off','the blackout in the tunnel');assert.ok(log.said.includes('delestage'));
  kill();go(-64,36);assert.equal(m.stage,8);
  kill();use('vanne-1');use('vanne-2');assert.equal(m.nearInteraction(),null,'the desk waits for the third valve');use('vanne-3');assert.equal(m.stage,9);
  kill();use('pupitre-p9');run(HOLDS.pompes+.5);assert.equal(m.stage,10);assert.equal(log.doors.galerie,true);assert.equal(log.water.voies,'low');
  kill();go(-76,58);go(-80,71);use('ecluse');assert.equal(log.doors.ecluse,'opening');run(HOLDS.ecluse+.5);assert.equal(m.stage,11);
  assert.equal(log.water.voie,'drained');assert.equal(log.revealed,true,'the drained track reveals the phase traces');
  kill();go(-36,72);assert.equal(m.stage,12);assert.ok(g.enemies.some(e=>e.boss==='TRAQUEUR ALPHA'),'the alpha tracker guards the chamber');
  kill();use('preuve-1');run(PORTAL_CHARGE+.2);kill();use('preuve-2');assert.equal(m.stage,13);assert.equal(log.doors.orme,true);
  assert.ok(m.escape>ESCAPE_SECONDS-1,'the escape countdown starts');assert.equal(log.flood.at(-1),true);
  kill();go(26,86);assert.equal(m.stage,14);assert.equal(m.escape,null);
  const relay=use('relais-orme');assert.equal(relay.log,'relais-orme');assert.equal(log.doors.cabine,true);
  go(47,86);assert.equal(m.completed,true);assert.equal(log.finished,1);assert.equal(m.stage,15);
  assert.deepEqual([...new Set(log.stages)],[...Array(16).keys()]);
  for(const id of ['hall','courant','halles','relais1','relais2','quai','pompeA','rampants','vidange','pompes','vannes','demarrage','pompesOk','ecluse','revelation','chambre','preuve','preuves','orme','transmis'])
    assert.ok(log.said.includes(id),`line ${id} played`);
});

test('defeats: the stage restarts at its checkpoint; the flooded line drowns a slow escape',async()=>{
  const {createLigne9Mission,ESCAPE_SECONDS}=await import('../dist/ligne9-mission.js');
  const g=new ArenaGame(L.buildCollisions(),()=>.5,traversal,'ghju');g.reset('ghju');g.enableArmorShield();
  const m=createLigne9Mission({game:g,characterId:'ghju'});
  const go=(x,z)=>{Object.assign(g.player,{x,z,elevation:traversal.height(x,z),grounded:true});m.update();};
  const use=id=>{const it=L.INTERACTIONS.find(i=>i.id===id);go(it.x,it.z);return m.interact();};
  m.start();go(0,-66);use('tableau');go(46,-20);use('relais-ouest');
  g.damage(500);assert.equal(g.state,'over');m.restoreCheckpoint();
  assert.equal(g.state,'playing');assert.equal(m.stage,4);assert.ok(!m.done.includes('relais-ouest'),'the relay must be connected again');
  assert.ok(m.opened.includes('service'),'the service door stays open');assert.equal(g.player.hp,100);
  const cp=L.STAGES[4].checkpoint;assert.deepEqual([g.player.x,g.player.z],[cp.x,cp.z]);assert.equal(m.groups().halles.deployed,11);
  // Jump to the escape and let the water win.
  for(const id of ['relais-ouest','relais-est'])use(id);go(84,30);use('pompe-a');
  for(let t=0;t<61;t+=1/30){g.invulnerable=1e9;g.step(1/30,{});m.update();}
  go(-64,36);for(const id of ['vanne-1','vanne-2','vanne-3'])use(id);use('pupitre-p9');
  for(let t=0;t<91;t+=1/30){g.invulnerable=1e9;g.step(1/30,{});m.update();}
  go(-80,71);use('ecluse');for(let t=0;t<46;t+=1/30){g.invulnerable=1e9;g.step(1/30,{});m.update();}
  go(-36,72);g.enemies.length=0;use('preuve-1');use('preuve-2');assert.equal(m.stage,13);
  g.enemies.length=0;for(let t=0;t<ESCAPE_SECONDS+1;t+=1/30){g.invulnerable=0;g.step(1/30,{});m.update();if(g.state==='over')break;}
  assert.equal(g.state,'over','too slow: the line floods again');
  m.restoreCheckpoint();assert.equal(m.stage,13);assert.ok(m.escape>ESCAPE_SECONDS-1,'a fresh countdown from the chamber');
  assert.ok(m.drained.includes('voie'),'the drained track stays drained');
});

test('Ligne 9 is its own page on the production engine, listed as chapter 05 in Histoire',()=>{
  const page=read('ligne9.html'),code=read('ligne9.js');
  assert.match(page,/ligne9\.js/);assert.match(code,/new ArenaGame\(/);assert.match(code,/createLigne9Mission/);assert.match(code,/createMissionXR/);
  assert.match(read('index.html'),/data-chapter="ligne9"/);
});
