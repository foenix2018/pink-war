import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createRLHGlove,GLOVE_FINISHES} from '../dist/rlh-gloves.js';

// Planche « LYLU tactical gloves » : Standard / Stealth / Heavy sur les cinq tenues.
const kit=accent=>({plate:new T.MeshStandardMaterial({color:0x232630}),trim:new T.MeshStandardMaterial({color:0x616773}),fabric:new T.MeshStandardMaterial({color:0x101218}),glow:new T.MeshStandardMaterial({color:accent})});
const visible=g=>g.userData.parts.filter(({mesh})=>mesh.visible).map(({part})=>part);
const tris=g=>g.userData.parts.reduce((n,{mesh})=>n+mesh.geometry.attributes.position.count/3,0);

test('avant-bras FPS : brassard léger (1), plaques Standard/Stealth (2–4), blindage Heavy (5)',()=>{
  const g=createRLHGlove(kit(0x45a5ff),{sleeve:true,arm:true});
  const at=n=>{g.userData.setLevel(n);return visible(g);};
  const light=at(1);assert.ok(light.some(p=>p.max===1),'tenue 1 : brassard céramique et sangles');assert.ok(!light.some(p=>p.level>=2),'aucune pièce des tenues suivantes');
  for(const n of [2,3,4]){const v=at(n);assert.ok(v.some(p=>p.level===2&&p.max===4),'plaques Standard/Stealth à la tenue '+n);assert.ok(!v.some(p=>p.max===1),'brassard léger retiré');assert.ok(!v.some(p=>p.level===5),'pas de blindage lourd');}
  const heavy=at(5);assert.ok(heavy.some(p=>p.level===5&&p.key==='hardAccent'),'blocs latéraux couleur accent');assert.ok(heavy.some(p=>p.level===5&&p.key==='hardPlate'));assert.ok(!heavy.some(p=>p.max===4),'les plaques Standard laissent place au Heavy');
  // Les plaques de l'avant-bras suivent l'os de la manchette, pas les doigts.
  const forearm=g.userData.skeleton.bones.findIndex(b=>b.name==='D_manchette');
  for(const part of g.userData.parts.map(p=>p.part).filter(p=>p.level===5&&p.key==='hardAccent')){
    const ix=part.geometry.attributes.skinIndex;for(let i=0;i<ix.count;i+=7)assert.equal(ix.getX(i),forearm);
  }
  assert.ok(tris(g)<60000,'budget FPS : '+tris(g));g.userData.dispose();
});

test('raccord de poignet circulaire dès la tenue 2 sur tous les gants (FPS, VR, troisième personne)',()=>{
  for(const options of [{sleeve:false},{sleeve:true,arm:false},{sleeve:true,arm:true}]){
    const g=createRLHGlove(kit(0xff4f9a),options);
    g.userData.setLevel(1);const c1=g.userData.assembly.count;
    g.userData.setLevel(2);assert.ok(g.userData.assembly.count>c1-10&&visible(g).some(p=>p.level===2),'couplage à la tenue 2');
    g.userData.setLevel(5);assert.ok(visible(g).some(p=>p.level===5),'lunette renforcée Heavy');
    g.userData.dispose();
  }
  assert.ok(tris(createRLHGlove(kit(0xff4f9a),{sleeve:false}))<45000,'gant court : budget mobile');
});

test('finitions : Standard blanc cassé, titane, Stealth graphite aux accents atténués, Heavy blanc cassé aux accents vifs',()=>{
  const lum=hex=>(Math.max(hex>>16&255,hex>>8&255,hex&255)+Math.min(hex>>16&255,hex>>8&255,hex&255))/510;
  assert.ok(lum(GLOVE_FINISHES[0].plate)>.8&&lum(GLOVE_FINISHES[1].plate)>.8,'Standard');
  assert.ok(GLOVE_FINISHES[2].metalness>.7,'titane');
  assert.ok(lum(GLOVE_FINISHES[3].plate)<.3&&GLOVE_FINISHES[3].accent<.7,'Stealth');
  assert.ok(lum(GLOVE_FINISHES[4].plate)>.8&&GLOVE_FINISHES[4].accent>1,'Heavy');
  const g=createRLHGlove(kit(0x45a5ff),{sleeve:false});g.userData.setLevel(5);
  const accent=g.userData.parts.find(({part})=>part.key==='hardAccent').mesh.material.color;assert.ok(accent.b>accent.r,'LYLU : accents bleus');
  const p=createRLHGlove(kit(0xff4f9a),{sleeve:false});p.userData.setLevel(5);
  const pink=p.userData.parts.find(({part})=>part.key==='hardAccent').mesh.material.color;assert.ok(pink.r>pink.b,'GHJU : accents roses');
});
