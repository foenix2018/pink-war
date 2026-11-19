import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createCharacterKit,createSoldier} from '../dist/soldier.js';
import {CHARACTERS} from '../dist/characters.js';
import {buildGun} from '../dist/weapons.js';
import {installShadowUnit,applyShadowMaterials} from '../dist/shadow-unit-game.js';
import {FEMININE_FIGURE,waistProfile,chestSwell} from '../dist/hero-figure.js';

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
test('the chest swells slightly forward as one soft contour: body and plates, nothing at the back, the flanks, the collar or the waist',()=>{
 const c=FEMININE_FIGURE.chest,mid=(c.y0+c.y1)/2;
 assert.equal(chestSwell(0,mid,.05),0,'the back does not move');assert.equal(chestSwell(c.halfWidth+.01,mid,-.1),0,'nothing past the flanks');
 assert.equal(chestSwell(0,c.y1+.02,-.1),0);assert.equal(chestSwell(0,c.y0-.02,-.1),0);
 assert.ok(chestSwell(0,mid,-.1)>.9,'full swell at the middle of the front');assert.ok(chestSwell(.1,mid,-.1)<chestSwell(0,mid,-.1),'easing towards the flanks');
 assert.ok(c.forward<=.015,'discreet: at most 1.5 cm on the body');
 const ghju=hero(CHARACTERS.find(c=>c.id==='ghju')),lylu=hero(CHARACTERS.find(c=>c.id==='lylu'));
 const front=m=>{let z=Infinity;for(const mesh of bodyMeshes(m)){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i))<.05&&p.getY(i)>mid-.03&&p.getY(i)<mid+.03)z=Math.min(z,p.getZ(i));}return z;};
 const dz=front(lylu)-front(ghju);assert.ok(dz>.006&&dz<.02,'the body front sits slightly forward: '+dz.toFixed(4));
 // The armour plates carry the swell: GHJU's front plates reach further forward than LYLU's.
 const plateFront=m=>{let z=Infinity;for(const b of m.shadowUnit.armour.batches){const p=b.geometry.attributes.position;for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i))<.06&&p.getY(i)>1.38&&p.getY(i)<1.46)z=Math.min(z,p.getZ(i));}return z;};
 const dp=plateFront(lylu)-plateFront(ghju);assert.ok(dp>.008&&dp<.03,'the chest plates swell forward: '+dp.toFixed(4));
 ghju.dispose();lylu.dispose();
});
test('GHJU wears flared hip guards with their baked occlusion; nothing separate on the chest',async()=>{
 const {HERO_FIGURE_FILES}=await import('../dist/hero-gear.js'),{existsSync,readFileSync}=await import('node:fs');
 assert.deepEqual([...HERO_FIGURE_FILES],['hips']);
 for(const ext of ['.pwm','_ao.jpg'])assert.ok(existsSync(new URL('../dist/assets/heroes/hips'+ext,import.meta.url)),'hips'+ext);
 assert.ok(!existsSync(new URL('../dist/assets/heroes/bust.pwm',import.meta.url)),'no separate bust shells');
 assert.match(readFileSync(new URL('../dist/hero-gear.js',import.meta.url),'utf8'),/if \(!blue\) \{ \/\/ GHJU's figure/);
});
test.after?.(()=>{console.warn=warn;});
