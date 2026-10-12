import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import { ArenaGame, WEAPONS, segmentBox, moveInArena } from '../dist/game-logic.js';
import { PERIMETER_WALLS, OUTER_BUILDINGS } from '../dist/city-layout.js';
import { createLaserFX } from '../dist/laser-fx.js';
import { createSoldier, createCharacterKit } from '../dist/soldier.js';
import { buildGun, OPTICS } from '../dist/weapons.js';
import { CHARACTERS } from '../dist/characters.js';
const solid=()=>new T.MeshStandardMaterial(),neon=()=>new T.MeshBasicMaterial();
const mats=()=>({dark:solid(),steel:solid(),armor:solid(),armorLight:solid(),rose:neon(),pale:neon(),violet:neon(),cyan:neon()});
function setup(){const kit=createCharacterKit(new T.Texture());return {kit,gun:()=>buildGun({mats:mats(),gloves:kit.gloves,sleeve:false,makeFlash:p=>{const flash=new T.Object3D();p.add(flash);return flash;}})};}

test('LANCE is a precise single-shot sniper, has its own battery and cannot fire automatically',()=>{
  assert.equal(WEAPONS.some(w=>w.id==='petal'),false);
  const game=new ArenaGame([],()=>.9);game.wave=5;game.nextWave=999;game.ownedWeapons.add(2);game.selectWeapon(2);game.cooldown=0;
  const origin={x:0,y:1.5,z:0},direction={x:.13,y:.04,z:-1};
  game.trigger(true,.02,origin,direction);assert.equal(game.bullets.length,1);assert.equal(game.ammo[2],4);
  const bullet=game.bullets[0],length=Math.hypot(...Object.values(direction));
  for(const axis of ['x','y','z'])assert.ok(Math.abs(bullet['v'+axis]/280-direction[axis]/length)<1e-12,'no random spread or guidance');
  game.cooldown=0;game.trigger(true,.02,origin,direction);assert.equal(game.ammo[2],4,'holding is not an automatic burst');
  game.trigger(false,.02,origin,direction);game.trigger(true,.02,origin,direction);assert.equal(game.ammo[2],3);
  assert.equal(game.reload(),true);for(let i=0;i<50;i++)game.step(.05);assert.equal(game.ammo[2],5);
});

test('continuous perimeter blocks movement and shots along all edges and at every corner',()=>{
  for(let i=0;i<360;i++){
    const angle=i*Math.PI/180,end={x:Math.cos(angle)*145,y:1.6,z:Math.sin(angle)*145};
    assert.ok(PERIMETER_WALLS.some(w=>segmentBox({x:0,y:1.6,z:0},end,w)!==null),'no radial gap at '+i);
    const p={x:0,z:0};moveInArena(p,end.x*10,end.z*10,.55,PERIMETER_WALLS);
    assert.ok(Math.abs(p.x)<=98.45&&Math.abs(p.z)<=98.45);
  }
  const game=new ArenaGame(PERIMETER_WALLS,()=>.5);game.nextWave=999;
  game.shoot({x:0,y:1.6,z:98},{x:0,y:0,z:1});game.step(.05);
  assert.equal(game.bullets.length,0);assert.ok(game.drainEvents().some(e=>e.type==='impact'&&e.z===99));
});

test('a held sniper press waits for equip delay once, and releasing cancels a pending shot',()=>{
  const game=new ArenaGame([],()=>.5);game.nextWave=999;game.ownedWeapons.add(2);game.selectWeapon(2);
  const origin={x:0,y:1.6,z:0},direction={x:0,y:0,z:-1};
  game.trigger(true,.02,origin,direction);assert.equal(game.ammo[2],5,'equip animation is still in progress');
  for(let i=0;i<30;i++){game.step(.05);game.trigger(true,.05,origin,direction);}
  assert.equal(game.ammo[2],4,'exactly one press is retained through the delay');
  game.trigger(false,.02,origin,direction);game.cooldown=.25;
  game.trigger(true,.02,origin,direction);game.trigger(false,.02,origin,direction);
  for(let i=0;i<10;i++){game.step(.05);game.trigger(false,.05,origin,direction);}
  assert.equal(game.ammo[2],4,'an already released press does not fire later');
});

test('64 outer buildings stay outside the combat arena, including their full footprints',()=>{
  assert.equal(OUTER_BUILDINGS.length,64);
  assert.ok(OUTER_BUILDINGS.some(b=>b.near)&&OUTER_BUILDINGS.some(b=>!b.near));
  for(const b of OUTER_BUILDINGS)assert.ok(Math.abs(b.x)-b.width/2>100||Math.abs(b.z)-b.depth/2>100,'skyline cannot block a route without a collider');
});

test('laser trails follow actual projectiles, stop at impact and reuse a bounded light pool',()=>{
  const scene=new T.Scene(),fx=createLaserFX(T,scene,{rose:0x347fed}),origin={x:0,y:1.6,z:0};
  const lights=[];scene.traverse(o=>{if(o.isPointLight)lights.push(o);});assert.equal(lights.length,3);
  fx.shot({bulletId:7,weapon:'lance',power:1,origin});assert.ok(lights.some(l=>l.intensity>0));
  fx.update([{id:7,x:0,y:1.6,z:-4,originX:0,originY:1.6,originZ:0,weapon:'lance'}],.016);
  assert.equal(fx.stats().trails,1);const core=scene.getObjectByName('Laser cores, halos and pulse lights').children.find(o=>o.isInstancedMesh);
  const matrix=new T.Matrix4();core.getMatrixAt(0,matrix);const position=new T.Vector3(),scale=new T.Vector3();matrix.decompose(position,new T.Quaternion(),scale);
  assert.ok(Math.abs(position.z+2)<1e-6&&Math.abs(scale.y-4)<1e-6,'visible trail cannot extend behind its real origin');
  fx.impact({bulletId:7,x:0,y:1.6,z:-4.5,weapon:'lance',normal:{x:0,y:0,z:1}});fx.update([],.016);assert.equal(fx.stats().trails,1);
  core.getMatrixAt(0,matrix);matrix.decompose(position,new T.Quaternion(),scale);assert.ok(position.z-scale.y/2>=-4.5-1e-6,'afterglow ends on the collision face');
  for(let i=0;i<60;i++){fx.shot({bulletId:i,weapon:'bloom',origin});fx.update([],.02);}assert.equal(fx.stats().lightCount,3);
  fx.update([],.1);fx.update([],.1);assert.equal(fx.stats().activeLights,0);assert.equal(fx.stats().trails,0);
  fx.reset();assert.equal(fx.stats().cachedProjectiles,0);fx.dispose();
});

test('optic reticle appears only through its aperture and aiming never moves a tracked gun',()=>{
  const {gun}=setup(),g=gun(),camera=new T.PerspectiveCamera();
  for(const [index,id] of [[1,'bloom'],[2,'lance']]){
    g.userData.setVariant(index);const cfg=OPTICS[id];camera.position.set(0,cfg.y,.25);camera.updateMatrixWorld(true);
    const position=g.position.clone(),quaternion=g.quaternion.clone();g.userData.setSight(true,camera);
    assert.equal(g.userData.optics[index].reticle.visible,true);
    assert.deepEqual(g.position.toArray(),position.toArray());assert.deepEqual(g.quaternion.toArray(),quaternion.toArray());
    camera.position.x=.3;camera.updateMatrixWorld(true);g.userData.setSight(true,camera);assert.equal(g.userData.optics[index].reticle.visible,false,'off-axis eye cannot see a floating reticle outside the glass');
    g.userData.setSight(false,camera);assert.equal(g.userData.optics[index].reticle.visible,false);
  }
  g.userData.disposeDynamic();
});

test('AÉGIS armour follows native bones, shares geometry and gains protections at every stage',()=>{
  for(const profile of CHARACTERS){
    const {kit,gun}=setup(),a=createSoldier(kit,gun,profile),b=createSoldier(kit,gun,profile);
    assert.equal(a.actor.parts.length,11,'the complete original firefighter is preserved');
    assert.equal(a.nativeSkeleton.bones.length,34);let previous=0;
    for(let level=1;level<=10;level++){
      a.setLevel(level);b.setLevel(level);assert.ok(a.armor.count>previous);previous=a.armor.count;
      assert.ok(a.batchCount<=16,'all new protection is merged into at most five skin batches');
      for(const [i,mesh] of a.armor.parts.entries()){
        assert.equal(mesh.geometry,b.armor.parts[i].geometry);assert.equal(mesh.skeleton,a.nativeSkeleton);assert.notEqual(mesh.skeleton,b.nativeSkeleton);
      }
    }
    const mesh=a.armor.parts.find(p=>p.name==='AÉGIS pearl'),g=mesh.geometry,indices=g.attributes.skinIndex;
    const foreIndex=a.nativeSkeleton.bones.indexOf(a.actor.bone('LeftForeArm'));
    const vertex=Array.from({length:indices.count},(_,i)=>i).find(i=>indices.getX(i)===foreIndex);assert.ok(Number.isInteger(vertex));
    a.root.updateMatrixWorld(true);a.nativeSkeleton.update();const initial=mesh.getVertexPosition(vertex,new T.Vector3());
    for(let i=0;i<24;i++)a.animate(i*.016,false,0,.8,1,.016,{aim:true});
    a.root.updateMatrixWorld(true);a.nativeSkeleton.update();assert.ok(mesh.getVertexPosition(vertex,new T.Vector3()).distanceTo(initial)>.025,'armour moves with the forearm during a vertical reload');
    a.dispose();b.dispose();
  }
});
