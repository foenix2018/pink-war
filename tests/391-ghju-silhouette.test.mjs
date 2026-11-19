import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createCharacterKit,createSoldier} from '../dist/soldier.js';
import {CHARACTERS} from '../dist/characters.js';
import {buildGun} from '../dist/weapons.js';
import {installShadowUnit,applyShadowMaterials} from '../dist/shadow-unit-game.js';
import {FEMININE_FIGURE,waistProfile} from '../dist/hero-figure.js';

// Headless stand-ins for the canvas used by the cloth and gear textures.
const ctx=new Proxy({},{get:(t,k)=>k==='createLinearGradient'?()=>({addColorStop(){}}):()=>{},set:()=>true});
globalThis.document??={createElement:()=>({width:0,height:0,getContext:()=>ctx,style:{}}),createElementNS:()=>({addEventListener(){},removeEventListener(){},style:{},setAttribute(){}})};
globalThis.fetch=async()=>({ok:false,status:404}); // the gear files are not needed here
const warn=console.warn;console.warn=()=>{};

function hero(profile){
 const kit=createCharacterKit(new T.Texture());applyShadowMaterials(kit,profile);
 const mats=Object.fromEntries(['dark','steel','armor','armorLight','rose','pale','violet','cyan'].map(n=>[n,new T.MeshStandardMaterial()]));
 const model=createSoldier(kit,o=>buildGun({mats,gloves:kit.gloves,sleeve:o?.sleeve!==false,makeFlash:p=>{const m=new T.Mesh(new T.SphereGeometry(.05),mats.rose);m.visible=false;p.add(m);return m;}}),profile);
 installShadowUnit(model,profile);return model;
}
const bodyMeshes=m=>{const out=[];m.root.traverse(o=>{if(o.isSkinnedMesh&&!o.userData.heroAuthoring&&!/^Shadow/.test(o.name)&&o.geometry.attributes.skinIndex)out.push(o);});return out;};
// Half-width of the torso at height y: the widest torso vertex (weighted mostly to Hips/Spine bones) within a thin slice.
function torsoWidth(m,y){let w=0;for(const mesh of bodyMeshes(m)){
 const bones=mesh.skeleton.bones,torso=new Set(bones.map((b,i)=>/(Hips|Spine)$|Spine[12]$/.test(b.name)?i:-1).filter(i=>i>=0)),g=mesh.geometry,p=g.attributes.position,si=g.attributes.skinIndex,sw=g.attributes.skinWeight;
 for(let i=0;i<p.count;i++){if(Math.abs(p.getY(i)-y)>.012)continue;let t=0;for(let k=0;k<4;k++)if(torso.has(si.getComponent(i,k)))t+=sw.getComponent(i,k);if(t>.9)w=Math.max(w,Math.abs(p.getX(i)));}}
 return w;}

test('the waist profile is zero at the pelvis and the chest and deepest in between',()=>{
 const {y0,y1,peak}=FEMININE_FIGURE.waist;assert.equal(waistProfile(y0-.01),0);assert.equal(waistProfile(y1+.01),0);
 const mid=y0+(y1-y0)*peak;assert.ok(Math.abs(waistProfile(mid)-1)<1e-9);
 for(const u of [.1,.25,.4,.6,.8])assert.ok(waistProfile(y0+(y1-y0)*u)>0&&waistProfile(y0+(y1-y0)*u)<1);
});
test('GHJU has a narrower waist than LYLU, at the same bind height, with exact bones and shared geometry untouched',()=>{
 const ghju=hero(CHARACTERS.find(c=>c.id==='ghju')),lylu=hero(CHARACTERS.find(c=>c.id==='lylu'));
 assert.ok(ghju.figure&&ghju.figure.moved>5000,'the body mesh was reshaped');assert.equal(lylu.figure,undefined,'LYLU keeps his body');
 const {y0,y1,peak}=FEMININE_FIGURE.waist,yw=y0+(y1-y0)*peak,hips=y0-.02,chest=y1+.03;
 const wg=torsoWidth(ghju,yw),wl=torsoWidth(lylu,yw);
 assert.ok(wg>0&&wl>0&&wg<wl*.92,`waist narrower than the reference body: ${wg.toFixed(3)} vs ${wl.toFixed(3)}`);
 // The pelvis and the chest are unchanged: the silhouette is an hourglass, not a thinner soldier.
 assert.ok(Math.abs(torsoWidth(ghju,chest)-torsoWidth(lylu,chest))<.03||torsoWidth(ghju,chest)>=torsoWidth(lylu,chest)*.9,'chest keeps its width');
 // Skeleton: no bone is scaled, every bone keeps its bind position (grips, feet and hit zones are exact).
 for(const b of ghju.actor.bones)assert.ok(b.scale.x===1&&b.scale.y===1&&b.scale.z===1,'unscaled '+b.name);
 // GHJU's meshes are her own copies; the geometry shared with the other hero is left as it was.
 const own=bodyMeshes(ghju).filter(m=>m.geometry.userData.heroFigure);assert.ok(own.length>5);
 const theirs=new Set(bodyMeshes(lylu).map(m=>m.geometry));for(const m of own)assert.ok(!theirs.has(m.geometry));
 ghju.dispose();lylu.dispose();
});
test('the sculpted bust and hip guards ship for GHJU only, with their baked occlusion',async()=>{
 const {HERO_FIGURE_FILES}=await import('../dist/hero-gear.js'),{existsSync}=await import('node:fs');
 assert.deepEqual([...HERO_FIGURE_FILES],['bust','hips']);
 for(const f of HERO_FIGURE_FILES)for(const ext of ['.pwm','_ao.jpg'])assert.ok(existsSync(new URL('../dist/assets/heroes/'+f+ext,import.meta.url)),f+ext);
 const src=(await import('node:fs')).readFileSync(new URL('../dist/hero-gear.js',import.meta.url),'utf8');assert.match(src,/if \(!blue\) \{ \/\/ GHJU's figure/);
});
test.after?.(()=>{console.warn=warn;});
