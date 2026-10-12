import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BRIDGES, BRIDGE_LANDINGS, BRIDGE_APPROACHES, PLATFORMS, STAIRS,
  bridgeContains, bridgeSegments, traversalSurfaces, createTraversalObstacles
} from '../dist/world-layout.js';
import { ArenaGame, walkSurfaceHeight, elevatedRouteForSurface, brokenBridgeDetour } from '../dist/game-logic.js';

const EPS=1e-7;
test('three structurally connected footbridges use the same geometries for visual spans and player floors',()=>{
  assert.equal(BRIDGES.length,3);
  assert.equal(BRIDGE_LANDINGS.length,3);
  for(const bridge of BRIDGES){
    assert.ok(bridge.height>1&&bridge.halfWidth>1);
    assert.ok(bridgeSegments(bridge).length===1||bridgeSegments(bridge).length===2);
    for(const [a,b] of bridgeSegments(bridge)){
      assert.ok(a>=0&&b<=1&&b>a);
      for(let i=0;i<=20;i++){
        const t=a+(b-a)*i/20;
        const x=bridge.x1+(bridge.x2-bridge.x1)*t;
        const hit=traversalSurfaces(x,bridge.z).find(s=>s.id===bridge.id);
        assert.ok(hit,bridge.id+' segment must be walkable at '+t);
        assert.ok(Math.abs(hit.height-bridge.height)<EPS);
        assert.equal(bridgeContains(bridge,x,bridge.z),true);
      }
    }
  }
});

test('intentionally broken bridge has a genuine hole in both walkSurfaceHeight and collision geometry',()=>{
 const b=BRIDGES.find(b=>b.damage);
 const middle=(b.gapFrom+b.gapTo)/2,x=b.x1+(b.x2-b.x1)*middle;
 assert.equal(bridgeContains(b,x,b.z),false);
 assert.equal(traversalSurfaces(x,b.z).find(s=>s.id===b.id),undefined);
 assert.ok(walkSurfaceHeight(x,b.z)<.05,'no invisible walking plane above the road');
 const floors=createTraversalObstacles().filter(o=>o.bridgeId===b.id&&o.walkableSurface);
 assert.equal(floors.length,2,'real distinct floor colliders, one each side');
 assert.ok(floors.every(o=>Math.abs(x-o.x)>o.hx+.001),'no collision panel over missing deck');
});

test('all raised entrances connect to accessible ramps with no unsupported or floating terminals',()=>{
 const garden=BRIDGES.find(b=>b.id==='garden-link');
 const relay=BRIDGES.find(b=>b.id==='relay-link');
 const ruined=BRIDGES.find(b=>b.id==='ruin-link');
 const pg=PLATFORMS.find(p=>p.id==='garden'),pr=PLATFORMS.find(p=>p.id==='relay');
 assert.ok(Math.abs(garden.x1-(pg.x+pg.hx))<EPS);
 assert.ok(Math.abs(relay.x1-(pr.x-pr.hx))<EPS);
 assert.equal(elevatedRouteForSurface('garden-link'),'garden-stairs');
 assert.equal(elevatedRouteForSurface('relay-link'),'relay-stairs');
 assert.equal(elevatedRouteForSurface('ruin-link',-19),'garden-stairs');
 assert.equal(elevatedRouteForSurface('ruin-link',-11),'ruin-approach');
 for(const landing of BRIDGE_LANDINGS){
  assert.ok(walkSurfaceHeight(landing.x,landing.z,0)>=landing.height-.001,landing.id);
 }
 assert.ok(Math.abs(ruined.x1-(BRIDGE_LANDINGS.find(p=>p.id==='garden-deck').x))<EPS);
 const far=BRIDGE_LANDINGS.find(p=>p.id==='ruin-deck'),ramp=BRIDGE_APPROACHES[0];
 assert.ok(Math.abs(ruined.x2-far.x)<EPS);
 assert.equal(ramp.topZ,far.z+far.hz);
 assert.ok(Math.abs(walkSurfaceHeight(ramp.x,ramp.topZ)-ramp.height)<EPS);
 assert.ok(Math.abs(walkSurfaceHeight(ramp.x,ramp.bottomZ+.025))<EPS);
 for(let i=0;i<=32;i++){
  const u=i/32,z=ramp.bottomZ+(ramp.topZ-ramp.bottomZ)*u;
  const item=traversalSurfaces(ramp.x,z).find(h=>h.id===ramp.id);
  assert.ok(item);
  assert.ok(Math.abs(item.height-ramp.height*u)<EPS);
 }
});

test('the footbridge safety rails never block the center walkway or the ground beneath the decks',()=>{
 const obstacles=createTraversalObstacles();
 for(const b of BRIDGES)for(const [a,c] of bridgeSegments(b)){
  const x=b.x1+(b.x2-b.x1)*(a+c)/2,z=b.z;
  const middle=obstacles.filter(o=>!o.walkableSurface&&o.bridgeRail&&
    Math.abs(x-o.x)<o.hx+.45&&Math.abs(z-o.z)<o.hz+.55);
  assert.equal(middle.length,0,'walkable center must not be blocked by rails');
  const rails=obstacles.filter(o=>o.bridgeRail&&Math.abs(x-o.x)<=o.hx+.25);
  assert.ok(rails.length>=2,'both sides must be protected');
  assert.ok(rails.every(o=>o.y>=b.height-.001),'rails only at deck height, not at street');
 }
});

test('jumping across broken crossing is possible, while simply walking off causes a fall',()=>{
 const b=BRIDGES.find(b=>b.id==='ruin-link');
 const floor=createTraversalObstacles();
 const startX=b.x1+(b.x2-b.x1)*(b.gapFrom-.09);
 const setup=()=>{const g=new ArenaGame(floor);g.nextWave=999;g.player.x=startX;g.player.z=b.z;g.player.elevation=b.height;g.player.grounded=true;return g;};
 const walked=setup();
 for(let i=0;i<70;i++)walked.step(.016,{x:1,moveYaw:0,yaw:0});
 assert.ok(walked.player.elevation<b.height-1.5,'walking into missing span is a fall');
 const jumped=setup();
 for(let i=0;i<70;i++)jumped.step(.016,{x:1,moveYaw:0,yaw:0,jump:i===0});
 assert.ok(jumped.player.x>b.x1+(b.x2-b.x1)*b.gapTo,'run-jump reaches far side');
 assert.ok(jumped.player.elevation>b.height-1.2,'jump can reach intact far deck');
});

test('AI detours around the broken span but not on intact bridges or the same bank',()=>{
 const b=BRIDGES.find(b=>b.damage);
 const a={x:-19,z:b.z,elevation:b.height};
 const far={x:-10.8,z:b.z,elevation:b.height};
 assert.equal(brokenBridgeDetour(a,far),'garden-stairs');
 assert.equal(brokenBridgeDetour(far,a),'ruin-approach');
 assert.equal(brokenBridgeDetour({...a,elevation:0},far),null);
 assert.equal(brokenBridgeDetour(a,{...far,z:far.z+8}),null);
 assert.equal(brokenBridgeDetour({...a,x:-22},{...far,x:-20}),null);
});

test('an alerted machine actually walks down, around and back up to reach the opposite broken bridge bank',()=>{
 const game=new ArenaGame(createTraversalObstacles(),()=>.5);
 game.nextWave=999;game.wave=4;game.toSpawn=0;
 game.player.x=-8.6;game.player.z=39;game.player.elevation=4.8;game.player.grounded=true;
 const enemy={id:57,x:-20,z:39,elevation:4.8,grounded:true,verticalSpeed:0,speed:5,radius:.6,
   form:'stalker',elite:false,ranged:false,hp:99999,attackTimer:999,phase:0,
   aimHeight:1.15,yaw:Math.PI/2,homeX:-20,homeZ:39,stunnedUntil:0,limpUntil:0,
   alertedUntil:999,awareness:'engaged',lastKnownX:game.player.x,lastKnownZ:game.player.z,lastSeenAt:0};
 game.enemies=[enemy];
 let bottom=false,ascended=false,airCrossing=false;
 for(let i=0;i<640;i++){
   game.step(.05,{});
   if(enemy.elevation<.05&&enemy.z>54)bottom=true;
   if(bottom&&enemy.elevation>4.55&&enemy.x>-11&&enemy.x< -5)ascended=true;
   if(enemy.elevation>3.5&&enemy.x> -15.7 && enemy.x< -12.8)airCrossing=true;
 }
 assert.ok(bottom,'AI descended the existing garden ramp');
 assert.ok(ascended,'AI ascended the new ruin approach to reach the player');
 assert.equal(airCrossing,false,'AI never cheated across the missing deck at high elevation');
});
