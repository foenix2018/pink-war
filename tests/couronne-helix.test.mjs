import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ArenaGame,ARENA_SIZE} from '../dist/game-logic.js';
import * as L from '../dist/couronne-layout.js';

const read=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');
const traversal=L.createTraversal();
const game=(gatesOpen=false)=>{const g=new ArenaGame(L.buildCollisions({gatesOpen}),()=>.5,traversal,'lylu');g.nextWave=Infinity;g.toSpawn=0;g.enableArmorShield();return g;};
// Walk the player through waypoints (world-space input with yaw 0: +x right, +z back).
function walk(g,points){
  const [sx,sz]=points[0];Object.assign(g.player,{x:sx,z:sz,elevation:traversal.height(sx,sz),grounded:true});
  for(const [tx,tz] of points.slice(1))for(let i=0;i<1200;i++){
    const dx=tx-g.player.x,dz=tz-g.player.z,d=Math.hypot(dx,dz);if(d<.35)break;
    g.step(1/60,{x:dx/d,z:dz/d,yaw:0,moveYaw:0});g.nextWave=Infinity;
  }
  return g.player;
}
const inside=(o,x,z,y,r=.8,h=1.8)=>Math.abs(x-o.x)<o.hx+r&&Math.abs(z-o.z)<o.hz+r&&y<(o.y||0)+o.height-.02&&y+h>(o.y||0);

test('the Crown fits the engine arena and every stair joins the floors it serves',()=>{
  const edge=ARENA_SIZE/2-2,colliders=L.buildCollisions();
  for(const o of colliders)assert.ok(Math.abs(o.x)+o.hx<=edge&&Math.abs(o.z)+o.hz<=edge,o.kind);
  for(const s of L.STAIRS){
    assert.ok(s.bottomZ>s.topZ,'stairs climb towards -z, as the engine routes expect');
    assert.equal(traversal.height(s.x,s.bottomZ+.5),s.base,s.id+' starts on its floor');
    assert.equal(traversal.height(s.x,s.topZ-.5),s.height,s.id+' arrives at its floor');
    const slope=(s.height-s.base)/(s.bottomZ-s.topZ);assert.ok(slope<=.6,s.id+' is a walkable slope ('+slope.toFixed(2)+')');
    const floor=L.FLOORS.find(f=>f.id===s.to);assert.equal(floor.height,s.height);
    // The landing notch: no podium piece of the destination floor covers the last metre of the stair.
    assert.ok(!colliders.some(o=>o.kind==='podium'&&inside(o,s.x,s.topZ-.6,s.height-.3,.3)),s.id+' landing is free');
  }
});

test('the player climbs from the heliport to the anchor terrace, and the security field holds until it is lifted',()=>{
  const central=walk(game(),[[0,78],[0,64],[0,57],[-7,50],[-7,26],[0,17],[0,2],[0,-12]]);
  assert.ok(Math.abs(central.elevation-L.HEIGHTS.parvis)<.01&&central.z<-11,'grand stair to the parvis');
  const locked=walk(game(),[[0,-12],[21,-12],[28,-17],[28,-30],[28,-38]]);
  assert.ok(locked.z>-22&&locked.elevation<6.1,'the HELIX field blocks the ascent');
  const open=walk(game(true),[[0,-12],[21,-12],[28,-17],[28,-30],[28,-38],[0,-45]]);
  assert.ok(Math.abs(open.elevation-L.HEIGHTS.ancrage)<.01&&open.z<-44,'ascent to the anchor terrace');
  const west=walk(game(true),[[0,-12],[-21,-12],[-28,-17],[-28,-38]]);
  assert.equal(west.elevation,L.HEIGHTS.ancrage,'the west ascent too');
  const east=walk(game(),[[0,57],[35,59],[35,50],[32.5,38],[33.6,16],[34,13],[34,2],[20,-5]]);
  assert.ok(Math.abs(east.elevation-L.HEIGHTS.parvis)<.01,'flank route: ramp, east terrace, east stair');
});

test('wind screens and balustrades keep everyone on the Crown',()=>{
  for(const [gatesOpen,path] of [[false,[[0,57],[-39,57],[-48,57]]],[false,[[0,57],[39,30],[48,30]]],[false,[[0,78],[0,90]]],[false,[[0,-10],[-40,-10]]],[true,[[0,-45],[-20,-45],[-40,-45]]],[true,[[20,-50],[20,-90]]]]){
    const p=walk(game(gatesOpen),path);
    assert.ok(Math.abs(p.x)<40.5&&p.z<84.5&&p.z>-86.5,`stopped at (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`);
  }
  const g=game();const p=walk(g,[[-15,-4],[-15,6]]);
  assert.ok(p.z<4&&p.elevation===L.HEIGHTS.parvis,'the parvis balustrade is real cover, not a drop');
});

test("a machine on the plaza climbs the grand stair to reach the player on the parvis, kept on task by the encounter pressure",()=>{
  const g=game();Object.assign(g.player,{x:0,z:-2,elevation:6,grounded:true});g.invulnerable=1e9;
  g.enemies=[{id:1,form:'stalker',x:0,z:30,elevation:0,aimHeight:1.15,hp:1e4,radius:.8,speed:3.2,awareness:'engaged',attackTimer:99,stunnedUntil:0,limpUntil:0,ranged:false,yaw:0,phase:0,alertedUntil:1e9,lastSeenAt:0,lastKnownX:0,lastKnownZ:-2,lastKnownHeight:6}];
  // The engine's director keeps the pressure every two seconds (couronne-helix.js), as the level does.
  for(let i=0;i<60*25&&g.enemies[0].elevation<5.9;i++){if(i%120===0)L.keepPressure(g,[1]);g.step(1/60,{});g.nextWave=Infinity;g.invulnerable=1e9;}
  assert.ok(g.enemies[0].elevation>5.9,'the stalker reached the parvis (elevation '+g.enemies[0].elevation.toFixed(2)+')');
});

test('encounters, consoles and checkpoints stand on their floors, clear of every collider',()=>{
  const colliders=L.buildCollisions({gatesOpen:true});
  for(const [name,enc] of Object.entries(L.ENCOUNTERS)){
    for(const u of enc.units){
      const floor=L.FLOOR_HEIGHT[u.floor];
      assert.equal(traversal.height(u.x,u.z),floor,`${name}/${u.form} on ${u.floor}`);
      const hit=colliders.find(o=>inside(o,u.x,u.z,floor,u.form==='probe'?.9:u.elite?1.05:.8));
      assert.ok(!hit,`${name}/${u.form} at (${u.x}, ${u.z}) overlaps ${hit?.kind}`);
    }
    if(enc.portal)assert.equal(traversal.height(enc.portal.x,enc.portal.z),L.FLOOR_HEIGHT[enc.portal.floor],name+' portal');
  }
  for(const it of L.INTERACTIONS){assert.equal(traversal.height(it.x,it.z),it.y,it.id);assert.ok(!colliders.some(o=>inside(o,it.x,it.z,it.y,.4)),it.id+' reachable');}
  assert.equal(L.STAGES.length,7);
  for(const s of L.STAGES){const c=s.checkpoint;assert.ok(!colliders.some(o=>inside(o,c.x,c.z,traversal.height(c.x,c.z),.5)),s.label);}
  const total=Object.values(L.ENCOUNTERS).reduce((n,e)=>n+e.units.length,0);
  assert.ok(total>=25&&total<=40,'a full sandbox sequence ('+total+' machines)');
});

test('the level is standalone: same production engine, not linked from the lobby or the campaign',()=>{
  const engine=read('couronne-helix.js'),page=read('couronne-helix.html');
  for(const module of ['./game-logic.js','./combat-hud.js','./armor-feedback.js','./mission-xr.js','./level2-input.js','./couronne-layout.js','./couronne-art.js','./couronne-mission.js'])assert.ok(engine.includes(`from '${module}'`),module);
  assert.match(engine,/game\.enableArmorShield\(\)/);assert.match(engine,/mountCombatHud\(\{characterId,onAction:armorTouch\}\)/);
  assert.match(page,/import\('\.\/couronne-helix\.js\?v=\d+'\)/);
  for(const file of ['index.html','entry.js','game.js','story-chapters.js','launch-ui.js'])assert.ok(!read(file).includes('couronne-helix'),file+' does not link it yet');
  const art=read('couronne-art.js');
  assert.match(art,/M\.phase/,'magenta stays on the phase anchor');assert.ok(!/new T\.(Point|Spot)Light/.test(art.replace(/anchorLight = new T\.PointLight|lobbyLight = new T\.PointLight/g,'')),'only the two planned point lights');
});

test('the whole mission plays through: encounters, announced portals, security lock, two stabilizers, the end',async()=>{
  const {createCouronneMission,PORTAL_CHARGE}=await import('../dist/couronne-mission.js');
  const log={stages:[],portals:[],gates:[],consoles:{},anchor:[],finished:0};
  const g=new ArenaGame(L.buildCollisions(),()=>.5,traversal,'ghju');g.reset('ghju');g.enableArmorShield();
  const m=createCouronneMission({game:g,characterId:'ghju',hooks:{stage:i=>log.stages.push(i),openPortal:(x,y,z)=>log.portals.push([x,y,z]),setGatesOpen:o=>log.gates.push(o),
    setConsole:(id,done)=>{log.consoles[id]=done;},setAnchorPower:v=>log.anchor.push(v),finish:()=>log.finished++}});
  const run=seconds=>{for(let t=0;t<seconds;t+=1/30){g.invulnerable=1e9;g.step(1/30,{});m.update();}};
  const go=(x,z)=>Object.assign(g.player,{x,z,elevation:traversal.height(x,z),grounded:true});
  const kill=n=>{for(const e of g.enemies.slice(0,n))g.enemies.splice(g.enemies.indexOf(e),1);};
  m.start();
  assert.equal(m.stage,0);assert.equal(g.enemies.length,7);assert.ok(g.ownedWeapons.size>=4,'a choice of weapons');
  assert.ok(g.enemies.some(e=>e.form==='seer'&&e.elevation===L.HEIGHTS.terrace),'two shooters hold the east terrace');
  go(0,56);run(.1);assert.equal(m.stage,1);
  kill(4);run(.1);assert.deepEqual(m.pending,['renfortEsplanade']);assert.equal(log.portals.length,1,'the portal is announced before anyone steps out');
  run(PORTAL_CHARGE+.2);assert.equal(m.groups().renfortEsplanade.deployed,3);
  kill(99);run(.1);assert.equal(m.stage,2);assert.deepEqual(m.pending,['parvis']);
  run(PORTAL_CHARGE+.2);assert.equal(m.groups().parvis.deployed,8);
  assert.ok(g.enemies.every(e=>e.elevation>=L.HEIGHTS.parvis),'the parvis group lands on the parvis');
  kill(99);run(.1);assert.equal(m.stage,3);
  go(0,-28.2);assert.equal(m.nearInteraction()?.id,'securite');assert.ok(m.interact());
  assert.equal(m.stage,4);assert.equal(m.gatesOpen,true);assert.deepEqual(log.gates.at(-1),true);
  assert.ok(!m.collisions.some(o=>o.gate),'the security fields are gone from the colliders');assert.equal(m.groups().ancrage.deployed,8);
  kill(99);go(-11,-44.6);assert.ok(m.interact());run(.1);assert.deepEqual(m.pending,['renfortAncrage'],'cutting a stabilizer calls a last portal');
  go(11,-44.6);assert.ok(m.interact());run(.1);assert.equal(m.stage,5);assert.equal(log.anchor.at(-1),0,'the anchor goes dark');
  run(PORTAL_CHARGE+.2);assert.equal(m.groups().renfortAncrage.deployed,4);assert.equal(m.completed,false,'the terrace must still be held');
  kill(99);run(.1);assert.equal(m.completed,true);assert.equal(log.finished,1);assert.equal(m.stage,6);
  assert.deepEqual([...new Set(log.stages)],[0,1,2,3,4,5,6]);
});

test('a defeat restarts the current stage at its checkpoint with its encounter set again',async()=>{
  const {createCouronneMission}=await import('../dist/couronne-mission.js');
  const g=new ArenaGame(L.buildCollisions(),()=>.5,traversal,'lylu');g.reset('lylu');g.enableArmorShield();
  const m=createCouronneMission({game:g,characterId:'lylu'});
  const go=(x,z)=>Object.assign(g.player,{x,z,elevation:traversal.height(x,z),grounded:true});
  m.start();go(0,56);m.update();g.enemies.length=0;m.update();
  for(let t=0;t<4;t+=1/30){g.step(1/30,{});m.update();}g.enemies.length=0;m.update();
  for(let t=0;t<4;t+=1/30){g.step(1/30,{});m.update();}g.enemies.length=0;m.update();
  assert.equal(m.stage,3);go(0,-28.2);m.interact();go(-11,-44.6);m.interact();
  g.damage(500);assert.equal(g.state,'over');
  m.restoreCheckpoint();
  assert.equal(g.state,'playing');assert.equal(m.stage,4);assert.deepEqual(m.consoles,[],'stabilizers back on');
  assert.equal(m.gatesOpen,true,'the lifted lock stays lifted');assert.equal(g.player.hp,100);assert.equal(g.player.shield,60);
  const cp=L.STAGES[4].checkpoint;assert.deepEqual([g.player.x,g.player.z],[cp.x,cp.z]);
  assert.equal(m.groups().ancrage.deployed,8);
});
