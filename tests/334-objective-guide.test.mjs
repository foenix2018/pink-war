import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.core.min.js';
import { objectiveIndicator, createObjectiveGuide } from '../dist/objective-guidance.js';
import { VRController } from '../dist/vr.js';

const player = {x:0,z:0,elevation:0};
test('objective point follows heading and wraps behind to the shortest turn', () => {
  let hint=objectiveIndicator({x:0,z:-20},player,0);
  assert.equal(hint.offset,0);assert.equal(hint.behind,false);assert.equal(hint.distance,20);
  assert.equal(objectiveIndicator({x:20,z:0},player,0).offset,1);
  assert.equal(objectiveIndicator({x:-20,z:0},player,0).offset,-1);
  hint=objectiveIndicator({x:10,z:10},player,0);
  assert.equal(hint.behind,true);assert.equal(hint.turn,1);
  hint=objectiveIndicator({x:10,z:10},player,-Math.PI*3/4);
  assert.ok(Math.abs(hint.offset)<1e-12);assert.equal(hint.behind,false);
  hint=objectiveIndicator({x:-.05,z:20},player,-Math.PI+.02);
  assert.ok(Math.abs(hint.offset)<.02,'crossing +/-PI does not point across the screen');
});

test('floor elevations guide upstairs without showing up when already on the relay', () => {
  const waypoint={x:0,z:-5,y:4.8,label:'Relais'};
  assert.equal(objectiveIndicator(waypoint,player,0).elevation,1);
  const upstairs={...player,elevation:4.8};
  assert.equal(objectiveIndicator(waypoint,upstairs,0).elevation,0);
  assert.equal(objectiveIndicator({...waypoint,y:0},upstairs,0).elevation,-1);
  const vertical=objectiveIndicator({x:0,z:0,y:4.8},player,1.25);
  assert.equal(vertical.offset,0);assert.equal(vertical.elevation,1);assert.equal(vertical.arrived,false);
  assert.equal(objectiveIndicator({x:.5,z:0,y:4.8},upstairs,0).arrived,true);
});

test('guidance is absent when there is no campaign objective or a non-playing state', () => {
  for(const state of ['paused','won','dead'])assert.equal(objectiveIndicator({x:1,z:0},player,0,state),null);
  assert.equal(objectiveIndicator(null,player,0),null);
  assert.equal(objectiveIndicator({x:NaN,z:0},player,0),null);
  assert.equal(objectiveIndicator({x:1,z:0},player,NaN),null);
});

test('headset geometry stays above sight, shows turn and storey, and releases owned resources', () => {
  const camera=new T.PerspectiveCamera(),guide=createObjectiveGuide(T,camera);
  assert.equal(guide.group.parent,camera);assert.equal(guide.group.visible,false);
  const [dot,halo,turn,level]=guide.group.children;
  assert.ok(guide.group.position.y>.10);assert.equal(dot.material.color.getHex(),0xffe5ac);
  guide.update(objectiveIndicator({x:10,z:10,y:4.8},player,0));
  assert.equal(guide.group.visible,true);assert.equal(guide.group.position.x,.15);
  assert.equal(turn.visible,true);assert.equal(level.visible,true);assert.equal(halo.visible,false);
  assert.equal(level.rotation.z,Math.PI/2);assert.equal(dot.material.depthTest,false);
  guide.update(objectiveIndicator({x:0,z:-.5},player,0));
  assert.equal(guide.group.position.x,0);assert.equal(halo.visible,true);assert.equal(turn.visible,false);assert.equal(level.visible,false);
  guide.update(null);assert.equal(guide.group.visible,false);
  const resources=new Set(guide.group.children.flatMap(mesh=>[mesh.geometry,mesh.material]));let disposed=0;
  for(const resource of resources)resource.addEventListener('dispose',()=>disposed++);
  guide.dispose();assert.equal(camera.children.length,0);assert.equal(disposed,resources.size);
});

test('VR guide uses translated headset and updates bearing between HUD text refreshes', () => {
  const camera=new T.PerspectiveCamera();camera.position.set(4,6.5,0);camera.updateMatrixWorld();
  const game={state:'playing',player:{x:0,z:0,elevation:4.8},guidance:()=>({x:4,y:4.8,z:-10})};
  let phase='playing';const objective=createObjectiveGuide(T,camera);
  const controller=Object.assign(Object.create(VRController.prototype),{
    mode:'stereo',hud:{objective},hudTime:1,pauseBoard:null,scratch:null,
    hooks:{world:()=>({T,camera}),game:()=>game,phase:()=>phase}
  });
  controller.update(.01,0);
  assert.equal(objective.group.position.x,0,'physical head translation is respected');
  assert.equal(controller.hud.objectiveHint.elevation,0,'head height does not invent floor arrows');
  camera.rotation.y=Math.PI/2;camera.updateMatrixWorld();controller.update(.01,0);
  assert.ok(Math.abs(objective.group.position.x-.15)<1e-12,'head turn updates before the 120ms text HUD cycle');
  phase='paused';controller.update(.01,0);assert.equal(objective.group.visible,false);
  phase='playing';game.guidance=()=>null;controller.update(.01,0);assert.equal(objective.group.visible,false);
  objective.dispose();
});
