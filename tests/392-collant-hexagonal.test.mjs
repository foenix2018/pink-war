import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createCharacterKit,createSoldier} from '../dist/soldier.js';
import {CHARACTERS} from '../dist/characters.js';
import {buildGun} from '../dist/weapons.js';
import {installShadowUnit,applyShadowMaterials} from '../dist/shadow-unit-game.js';
import {projectHexUV,SUIT_TILE} from '../dist/hero-suit.js';

const ctx=new Proxy({},{get:(t,k)=>k==='createLinearGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});
globalThis.document??={createElement:()=>({width:0,height:0,getContext:()=>ctx,style:{}}),createElementNS:()=>({addEventListener(){},removeEventListener(){},style:{},setAttribute(){}})};
globalThis.fetch=async()=>({ok:false,status:404});
const warn=console.warn;console.warn=()=>{};
const url=f=>new URL('../dist/assets/heroes/'+f,import.meta.url);
function hero(profile){
 const kit=createCharacterKit(new T.Texture());applyShadowMaterials(kit,profile);
 const mats=Object.fromEntries(['dark','steel','armor','armorLight','rose','pale','violet','cyan'].map(n=>[n,new T.MeshStandardMaterial()]));
 const m=createSoldier(kit,o=>buildGun({mats,gloves:kit.gloves,sleeve:o?.sleeve!==false,makeFlash:p=>{const f=new T.Mesh(new T.SphereGeometry(.05),mats.rose);f.visible=false;p.add(f);return f;}}),profile);
 installShadowUnit(m,profile);return m;
}
const suitMesh=m=>{let r=null;m.root.traverse(o=>{if(o.isSkinnedMesh&&o.name==='AÉGIS IV suit')r=o;});return r;};

test('the honeycomb textures exist: one colour map and one outline glow per hero, a shared relief and roughness',()=>{
 for(const f of ['suit_hex_ghju.jpg','suit_hex_lylu.jpg','suit_hex_nor.jpg','suit_hex_rough.jpg','suit_hex_glow_ghju.jpg','suit_hex_glow_lylu.jpg'])assert.ok(existsSync(url(f)),f);
 assert.ok(readFileSync(url('suit_hex_ghju.jpg')).length>50000,'real detail, not a flat fill');
 // Near-black carbon: the generator's cell colours stay dark; only the outlines (rim, glow) carry the hero's colour.
 const src=readFileSync(new URL('../tools/blender/hex_suit_textures.py',import.meta.url),'utf8');
 for(const id of ['ghju','lylu']){
  const row=src.split('\n').find(l=>l.includes(`'${id}': dict(`)),num=k=>row.match(new RegExp(k+'=\\((\\d+), (\\d+), (\\d+)\\)')).slice(1).map(Number);
  assert.ok(Math.max(...num('hi'))<=60&&Math.max(...num('lo'))<=24,id+' cells are near-black carbon');
  assert.ok(Math.max(...num('rim'))>=100,id+' outline stays visible, just discreet');
 }
});
test('every triangle is projected on its own dominant axis in metres, on an unindexed copy of the suit geometry',()=>{
 const g=new T.BoxGeometry(.4,.8,.2,2,2,2),uvGeo=projectHexUV(g,.3);
 assert.equal(uvGeo.index,null);assert.equal(uvGeo.attributes.uv.count,uvGeo.attributes.position.count);
 const p=uvGeo.attributes.position,uv=uvGeo.attributes.uv;
 for(let i=0;i<p.count;i+=3){ // a triangle is planar: its UV area is proportional to its area projected on the dominant plane
  const a=new T.Vector3().fromBufferAttribute(p,i),b=new T.Vector3().fromBufferAttribute(p,i+1),c=new T.Vector3().fromBufferAttribute(p,i+2);
  const n=new T.Vector3().crossVectors(b.clone().sub(a),c.clone().sub(a)),area=n.length()/2;
  const ua=new T.Vector2().fromBufferAttribute(uv,i),ub=new T.Vector2().fromBufferAttribute(uv,i+1),uc=new T.Vector2().fromBufferAttribute(uv,i+2);
  const uvArea=Math.abs((ub.x-ua.x)*(uc.y-ua.y)-(uc.x-ua.x)*(ub.y-ua.y))/2*SUIT_TILE*SUIT_TILE;
  assert.ok(Math.abs(uvArea-area)<area*.02,'metric UV: '+uvArea+' vs '+area);
 }
 assert.ok(g.index,'the source geometry is untouched');
});
test('GHJU and LYLU wear their own honeycomb suit; the original geometry and material are restored on disposal',()=>{
 for(const id of ['ghju','lylu']){
  const profile=CHARACTERS.find(c=>c.id===id),m=hero(profile),mesh=suitMesh(m);
  assert.ok(m.shadowUnit.suit.meshes>=1&&mesh,id+' suit');
  assert.equal(mesh.geometry.index,null,'unindexed copy');assert.ok(mesh.geometry.attributes.uv&&mesh.geometry.attributes.skinIndex,'skinned, with a pattern UV');
  assert.match(mesh.material.name,id==='lylu'?/bleu/:/prune/);
  const own=mesh.geometry;m.dispose();assert.notEqual(mesh.geometry,own,'the pattern copy is released');assert.doesNotMatch(mesh.material.name,/hexagonal/,'the plain suit material is back');
 }
});
test.after?.(()=>{console.warn=warn;});
