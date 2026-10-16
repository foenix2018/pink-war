import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../dist/vendor/three.core.min.js';
import {createLaserFX} from '../dist/laser-fx.js';
import {parseKenneyGLB} from '../dist/kenney-blasters.js';
import {KENNEY_HOLD,WEAPON_FRAME} from '../dist/weapons.js';

test('laser bullets project instanced colored light onto the ground, aligned to world coordinates',()=>{
  const scene=new T.Scene(),fx=createLaserFX(T,scene,{rose:0xff43c4});
  const proj=scene.getObjectByName('Laser / taches de lumière projetées au sol');
  assert.ok(proj?.isInstancedMesh);
  assert.equal(proj.count,0);
  fx.shot({origin:{x:1,y:1.6,z:4},weapon:'r9',bulletId:27});
  fx.update([{id:27,weapon:'r9',hostile:false,x:3,y:1.1,z:-12}],.016);
  assert.equal(proj.count,1);
  const matrix=new T.Matrix4();proj.getMatrixAt(0,matrix);
  const position=new T.Vector3().setFromMatrixPosition(matrix);
  assert.ok(Math.abs(position.x-3)<1e-4);
  assert.ok(Math.abs(position.y-.035)<1e-4);
  assert.ok(Math.abs(position.z+12)<1e-4);
  assert.equal(fx.stats().groundGlows,1);
  fx.impact({bulletId:27,weapon:'r9',x:3,y:0,z:-13,normal:{x:0,y:1,z:0}});
  fx.update([],.02);assert.ok(fx.stats().groundGlows>=1);
  for(let i=0;i<4;i++)fx.update([],.08);assert.equal(fx.stats().groundGlows,0);
  fx.dispose();
});

test('all five Kenney guns show only their connected source GLB, not floating procedural attachments',()=>{
 const src=readFileSync(new URL('../dist/kenney-blasters.js',import.meta.url),'utf8');
 assert.doesNotMatch(src,/\n    upgradeKenneyWeapon\(models\[i\]/);
 const weaponSrc=readFileSync(new URL('../dist/weapons.js',import.meta.url),'utf8');
 assert.match(weaponSrc,/rail\.visible=false;rail\.userData\.shell\.visible=false/);
 assert.match(weaponSrc,/optic\.glass\.visible=false;optic\.reticle\.visible=false/);
 for(const id of ['b','g','d','f','p']){
   const bytes=readFileSync(new URL('../dist/assets/kenney/blaster-'+id+'.glb',import.meta.url));
   const parsed=parseKenneyGLB(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
   let vertices=0;parsed.traverse(o=>{if(o.isMesh)vertices+=o.geometry.attributes.position.count;});
   assert.ok(vertices>250, 'connected source glb must have geometry '+id);
 }
 assert.equal(KENNEY_HOLD.length,5);
 assert.equal(WEAPON_FRAME.length,6);
});

test('Quest control mapping and trigger meanings do not collide with aiming',async()=>{
 const {buttonNames,questControls,VR_DEFAULTS,VRController}=await import('../dist/vr.js');
 assert.equal(VR_DEFAULTS.hand,'right');
 assert.deepEqual(buttonNames(),{reload:'B',next:'Y',jump:'A',pause:'X'});
 const help=Object.fromEntries(questControls());
 assert.ok(help['Gâchette INDEX droite'].includes('Tirer'));
 assert.ok(help['Gâchette MAJEUR droite'].includes('Viser'));
 assert.ok(!help['Gâchette INDEX gauche'].includes('Viser'));
});
