import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const home = readFileSync(new URL('../dist/at-home.html', import.meta.url),'utf8');
const index = readFileSync(new URL('../dist/index.html', import.meta.url),'utf8');
const js = readFileSync(new URL('../dist/at-home.js', import.meta.url),'utf8');

test('AT HOME is linked twice from the original Pink War lobby',()=>{
  assert.match(index,/href="at-home\.html"/);
  assert.match(index,/AT HOME · JOUER CHEZ MOI/);
  assert.match(home,/id="at-home-enter"/);
  assert.match(home,/src="at-home\.js"/);
});
test('AT HOME uses an AR session so the player can return to passthrough from the immersive laboratory',()=>{
  assert.match(js,/requestSession\('immersive-ar'/);
  assert.match(js,/alpha:true/);
  assert.match(js,/renderer\.setClearColor\(0x000000,0\)/);
  assert.match(js,/['"]plane-detection['"]/);
  assert.match(js,/['"]mesh-detection['"]/);
  assert.match(js,/frame\.detectedPlanes/);
  assert.match(js,/frame\.detectedMeshes/);
});
test('Room geometry is required before spawning a combat enemy',()=>{
  assert.match(js,/new RoomGame\(room\)/);
  assert.match(js,/clearLineOfSight/);
  assert.match(js,/hasFloor:\(\)=>floors\(\)\.length>0/);
  assert.match(js,/initiateRoomCapture/);
  assert.match(js,/zone|ZONE/);
});
test('AT HOME reuses the original Pink War gameplay asset modules',()=>{
  const assets=readFileSync(new URL('../dist/at-home-assets.js',import.meta.url),'utf8');
  assert.match(assets,/from '.\/enemies\.js'/);
  assert.match(assets,/from '.\/soldier\.js'/);
  assert.match(assets,/from '.\/weapons\.js'/);
  assert.match(assets,/from '.\/world-art\.js'/);
  assert.match(assets,/createEnemyFactory\(player\.mats\)/);
  assert.match(assets,/createSoldier\(companionKit\.kit/);
  assert.match(assets,/buildGun\(/);
  assert.match(assets,/createRuinedRoomMaterials\(/);
  assert.match(js,/game\.weapon/);
  assert.match(js,/colorWrite:false,depthWrite:false/);
  assert.match(js,/assets\.projectRuin/);
});
test('AT HOME room asset module passes Node syntax check',()=>{
  const check=spawnSync(process.execPath,['--check','dist/at-home-assets.js'],{encoding:'utf8'});
  assert.equal(check.status,0,check.stderr);
});

test('AT HOME JavaScript passes Node syntax check',()=>{
  const check=spawnSync(process.execPath,['--check','dist/at-home.js'],{encoding:'utf8'});
  assert.equal(check.status,0,check.stderr);
});
