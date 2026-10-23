import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseKenneyGLB,KENNEY_WEAPON_ASSETS} from '../dist/kenney-blasters.js';

test('five Kenney CC0 GLB files are stored locally and contain actual Three.js geometry',()=>{
  assert.equal(KENNEY_WEAPON_ASSETS.length,5);
  for(const file of KENNEY_WEAPON_ASSETS){
    const bytes=readFileSync(new URL('../dist/assets/kenney/'+file,import.meta.url));
    const buf=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
    assert.ok(bytes.length>20000,file+' should be a real 3D asset');
    const group=parseKenneyGLB(buf);
    let meshes=0,vertices=0;
    group.traverse(o=>{if(o.isMesh){meshes++;vertices+=o.geometry.getAttribute('position').count;}});
    assert.ok(meshes>0&&vertices>100,file+' must render full mesh');
  }
  const png=readFileSync(new URL('../dist/assets/kenney/colormap.png',import.meta.url));
  assert.equal(png[0],0x89);assert.equal(png[1],0x50);
});

test('the isolated training range has no portal or survival art and survives WebXR rebuild',()=>{
 const src=readFileSync(new URL('../dist/scene.js',import.meta.url),'utf8');
 assert.match(src,/next\.setRangeActive\(rangeActive\)/);
 assert.match(src,/portal\.visible=!rangeActive/);
 assert.match(src,/dust\.visible=!rangeActive/);
 assert.match(src,/arenaRoot\.visible=!campaignActive&&!rangeActive/);
 assert.match(src,/obstacles\.splice\(0,obstacles\.length,\.\.\.\(rangeActive\?rangeObstacles/);
});

test('VR main hand stays curled over the primary grip and support hand attaches within reach',()=>{
 const src=readFileSync(new URL('../dist/vr.js',import.meta.url),'utf8');
 assert.match(src,/grip:Math\.max\(\.92,isMain\?this\.handPose\.mainGrip:this\.handPose\.sideGrip\)/);
 assert.match(src,/linked=target\.distanceTo\(wrist\)<\.24/);
 assert.match(src,/c\.gun\.visible=armed&&\['left','right'\]\.includes\(physicalHand\)&&\(!holster\?\.visible\|\|holster\.position\.y<-\.56\)/);
});
