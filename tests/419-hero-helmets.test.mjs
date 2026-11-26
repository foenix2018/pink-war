import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createCharacterKit,createSoldier} from '../dist/soldier.js';
import {buildGun} from '../dist/weapons.js';
import {CHARACTERS} from '../dist/characters.js';
import {installShadowUnit} from '../dist/shadow-unit-game.js';
import {HERO_HELMETS,HELMET_STAGES,parseHelmetGLB,helmetForStage} from '../dist/hero-helmets.js';

const file=f=>readFileSync(new URL('../dist/'+f,import.meta.url));
const buffer=f=>{const b=file(f);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
const createHero=profile=>{
  const kit=createCharacterKit(new T.Texture());
  const mats=Object.fromEntries(['dark','steel','armor','armorLight','rose','pale','violet','cyan'].map(key=>[key,new T.MeshStandardMaterial({color:0x728499})]));
  return createSoldier(kit,()=>buildGun({mats,gloves:kit.gloves,sleeve:false,makeFlash:parent=>{const o=new T.Object3D();parent.add(o);return o;}}),profile);
};

test('the two supplied helmets are the outfit 4 and 5 helmets, prepared for the game',()=>{
  assert.deepEqual([...HELMET_STAGES],[4,5]);
  assert.deepEqual([1,2,3,4,5,6,10].map(helmetForStage),[false,false,false,true,true,true,true]);
  const ghju=parseHelmetGLB(buffer(HERO_HELMETS.ghju.file)),lylu=parseHelmetGLB(buffer(HERO_HELMETS.lylu.file));
  for(const h of [ghju,lylu]){
    assert.ok(h.triangles>20000&&h.triangles<36000,'reduced for mobile, still detailed: '+h.triangles);
    const box=new T.Box3().setFromObject(h.scene),size=box.getSize(new T.Vector3());
    assert.ok(size.y>.3&&size.y<.34&&size.x<.32&&size.z<.33,'real helmet dimensions, upright');
    assert.ok(Math.abs(box.min.y)<.01,'neck ring at y = 0');
  }
  const glow=h=>h.materials.filter(m=>m.emissive.getHex()).map(m=>m.emissive);
  assert.ok(glow(ghju).every(c=>c.r>c.b),'GHJU: pink lights');assert.ok(glow(lylu).every(c=>c.b>c.r),'LYLU: blue lights');
  assert.deepEqual(lylu.clips.map(c=>c.name).sort(),['Visiere_Fermeture','Visiere_Ouverture'],'LYLU keeps its animated visor');
  assert.equal(ghju.clips.length,0);
});

for(const profile of CHARACTERS){
  test(profile.id+' wears the supplied helmet on outfits 4 and 5 only, in place of the Shadow helmet',async()=>{
    const previous=globalThis.fetch;
    globalThis.fetch=async url=>{const name=new URL(url).pathname.split('/dist/').pop();return {ok:true,arrayBuffer:async()=>buffer(name)};};
    try{
      const model=createHero(profile),unit=installShadowUnit(model,profile),helmet=unit.helmet;
      assert.equal(helmet.id,profile.id);assert.ok(await helmet.ready);
      assert.equal(helmet.anchor.parent,model.actor.bone('Head'),'carried by the head bone');
      const shadowTriangles=()=>unit.armour.batches.reduce((n,m)=>n+m.geometry.index.count/3,0);
      model.setLevel(1);assert.equal(helmet.visible,false);model.setLevel(3);const base=shadowTriangles();
      for(const level of [4,5]){model.setLevel(level);assert.equal(helmet.visible,true,'outfit '+level);}
      const helmetTriangles=unit.armour.bindings.filter(b=>b.source.parent===unit.armour.helmet).reduce((n,b)=>n+b.count/3,0);assert.ok(helmetTriangles>500);
      const visibleHelmet=()=>unit.armour.bindings.filter(b=>b.source.parent===unit.armour.helmet).some(b=>[...b.batch.geometry.index.array].includes(b.first));
      assert.equal(visibleHelmet(),false,'the Shadow helmet is removed under it');
      model.setLevel(3);assert.equal(helmet.visible,false);assert.equal(shadowTriangles(),base,'the Shadow helmet is back on lower outfits');assert.equal(visibleHelmet(),true);
      // The helmet encloses the head of the rig.
      model.setLevel(4);model.root.updateMatrixWorld(true);
      const box=new T.Box3().setFromObject(helmet.anchor),head=model.actor.bone('Head').getWorldPosition(new T.Vector3());
      assert.ok(box.containsPoint(head.clone().add(new T.Vector3(0,.08,0))),'head inside the helmet');
      if(profile.id==='lylu'){assert.ok(helmet.visor(true));helmet.update(.6);assert.ok(helmet.visor(false));}
      model.dispose();
    }finally{globalThis.fetch=previous;}
  });
}
