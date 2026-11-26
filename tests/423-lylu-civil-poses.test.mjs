import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {buildCivilMotion,SIT} from '../dist/lylu-civil-motion.js';

// LYLU's measured joints (planque, root frame facing −Z) turned into the model's +Z-forward frame.
const M={Pelvis:[0,1.012,0],Spine:[-.002,1.132,.003],Chest:[-.006,1.322,-.007],Neck:[-.01,1.502,-.005],Head:[-.012,1.612,-.009],
 UpperArm_L:[-.214,1.473,-.013],ForeArm_L:[-.32,1.286,.06],Hand_L:[-.279,1.003,-.013],UpperArm_R:[.196,1.481,-.012],ForeArm_R:[.301,1.294,.061],Hand_R:[.261,1.011,-.012],
 Thigh_L:[-.118,.992,-.026],Shin_L:[-.121,.55,-.119],Foot_L:[-.13,.172,-.002],Thigh_R:[.118,.997,-.025],Shin_R:[.12,.55,-.119],Foot_R:[.199,.173,-.023]};
const PARENT={Spine:'Pelvis',Chest:'Spine',Neck:'Chest',Head:'Neck',UpperArm_L:'Chest',ForeArm_L:'UpperArm_L',Hand_L:'ForeArm_L',UpperArm_R:'Chest',ForeArm_R:'UpperArm_R',Hand_R:'ForeArm_R',Thigh_L:'Pelvis',Shin_L:'Thigh_L',Foot_L:'Shin_L',Thigh_R:'Pelvis',Shin_R:'Thigh_R',Foot_R:'Shin_R'};
function rig(){
  const visual=new T.Group(),bones=new Map(),world=n=>new T.Vector3(-M[n][0],M[n][1],-M[n][2]);
  for(const n of Object.keys(M)){const b=new T.Bone();b.name=n;const parent=PARENT[n];b.position.copy(parent?world(n).sub(world(parent)):world(n));(parent?bones.get(parent).bone:visual).add(b);bones.set(n,{bone:b});}
  visual.updateMatrixWorld(true);
  const still=name=>new T.AnimationClip(name,1,[new T.VectorKeyframeTrack('Pelvis.position',[0,1],[...world('Pelvis').toArray(),...world('Pelvis').toArray()])]);
  const clips=buildCivilMotion(T,visual,bones,['idle','walk','run'].map(still));
  const sample=(name,phase)=>{const clip=clips.find(c=>c.name===name),mixer=new T.AnimationMixer(visual),a=mixer.clipAction(clip);a.play();mixer.setTime(clip.duration*phase);visual.updateMatrixWorld(true);
    const at=n=>bones.get(n).bone.getWorldPosition(new T.Vector3());return Object.fromEntries(Object.keys(M).map(n=>[n,at(n)]));};
  return {clips,sample};
}

test('marche et repos en civil : bras le long du corps, coude vers l’arrière, balancement opposé (plus de mains sur les hanches)',()=>{
  const {sample}=rig();
  for(const name of ['civil_idle','civil_walk']){
    const p=sample(name,.25);
    for(const s of ['L','R']){
      const sh=p['UpperArm_'+s],el=p['ForeArm_'+s],hand=p['Hand_'+s],lateral=Math.abs(hand.x)-Math.abs(sh.x);
      assert.ok(sh.y-hand.y>.47,name+' '+s+' : main basse ('+(sh.y-hand.y).toFixed(3)+')');
      assert.ok(Math.abs(el.x)-Math.abs(sh.x)<.06,name+' '+s+' : coude non écarté ('+(Math.abs(el.x)-Math.abs(sh.x)).toFixed(3)+')');
      assert.ok(el.z<Math.max(sh.z,hand.z),name+' '+s+' : coude vers l’arrière');
      assert.ok(lateral<.06&&lateral>-.06,name+' '+s+' : main contre la cuisse');
    }
  }
  const a=sample('civil_walk',.25),b=sample('civil_walk',.75);
  const swing=s=>b['Hand_'+s].z-a['Hand_'+s].z;
  assert.ok(Math.abs(swing('L'))>.15&&Math.abs(swing('R'))>.15,'les bras balancent pendant la marche');
  assert.ok(Math.sign(swing('L'))!==Math.sign(swing('R')),'balancement alterné');
});

test('travail assis : bassin à hauteur de chaise, genoux devant, pieds au sol, mains devant la poitrine',()=>{
  const {clips,sample}=rig();assert.ok(clips.some(c=>c.name==='civilSit'));
  const p=sample('civilSit',.3);
  assert.ok(Math.abs(p.Pelvis.y-SIT.pelvis)<.02,'bassin sur l’assise : '+p.Pelvis.y.toFixed(3));
  for(const s of ['L','R']){
    assert.ok(p['Shin_'+s].z-p.Pelvis.z>.3,'genou devant le bassin');
    assert.ok(Math.abs(p['Foot_'+s].y-.172)<.03,'pied posé au sol');
    assert.ok(p['Hand_'+s].z-p.Chest.z>.15&&Math.abs(p['Hand_'+s].x)<.16,'mains devant, vers le centre (tablette)');
  }
});

test('la planque assoit LYLU sur la chaise de l’atelier et la couche sur son lit (le plus proche du repos)',()=>{
  const js=readFileSync(new URL('../dist/planque.js',import.meta.url),'utf8'),civ=readFileSync(new URL('../dist/lylu-civil-hideout.js',import.meta.url),'utf8');
  assert.match(js,/civil\.setSpots\(civilSpots\(\)\)/);assert.match(js,/find\('siège d’atelier','workshop'\)/);assert.match(js,/find\('Dortoir','rest'\)/);
  assert.match(js,/sort\(\(a,b\)=>Math\.hypot/,'le lit le plus proche de la station de repos');
  assert.match(civ,/root\.rotation\.set\(0,yaw,0\)/,'après le lit, le corps est remis droit (aucune inclinaison résiduelle)');
  assert.match(js,/cameraYaw=p\.anchor\.yaw\+\(id==='squat'\?Math\.PI-\.6:-\.65\)/,'squat filmé de trois-quarts face, hors du rack');
  assert.match(civ,/spotBlend/);assert.match(civ,/tablette de travail/);
});
