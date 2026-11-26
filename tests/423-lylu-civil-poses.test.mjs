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
  const clips=buildCivilMotion(T,visual,bones,['idle','walk','run','walkLeft','walkRight','walkBack','runLeft','runRight','runBack','crouchIdle','crouchWalk','crouchLeft','crouchRight','crouchBack'].map(still));
  const sample=(name,phase)=>{const clip=clips.find(c=>c.name===name),mixer=new T.AnimationMixer(visual),a=mixer.clipAction(clip);a.play();mixer.setTime(clip.duration*phase);visual.updateMatrixWorld(true);
    const at=n=>bones.get(n).bone.getWorldPosition(new T.Vector3());return Object.fromEntries(Object.keys(M).map(n=>[n,at(n)]));};
  return {clips,sample};
}

test('marche et repos en civil : bras le long du corps, coude vers l’arrière (plus de mains sur les hanches)',()=>{
  const {sample}=rig();
  for(const name of ['civil_idle','civil_walk']){
    const p=sample(name,.25);
    for(const s of ['L','R']){
      const sh=p['UpperArm_'+s],el=p['ForeArm_'+s],hand=p['Hand_'+s],lateral=Math.abs(hand.x)-Math.abs(sh.x);
      assert.ok(sh.y-hand.y>.45,name+' '+s+' : main basse ('+(sh.y-hand.y).toFixed(3)+')');
      assert.ok(Math.abs(el.x)-Math.abs(sh.x)<.06,name+' '+s+' : coude non écarté');
      assert.ok(lateral<.06&&lateral>-.06,name+' '+s+' : main contre la cuisse');
    }
  }
});

// Mouvements de marche : même repère modèle (+Z devant). Un pied « devant » a un z supérieur au bassin.
const corr=(a,b)=>{const m=x=>x.reduce((s,v)=>s+v,0)/x.length,ma=m(a),mb=m(b);let n=0,da=0,db=0;for(let i=0;i<a.length;i++){n+=(a[i]-ma)*(b[i]-mb);da+=(a[i]-ma)**2;db+=(b[i]-mb)**2;}return n/Math.sqrt(da*db||1);};
test('les bras balancent en opposition à la jambe du même côté (marche avant, arrière, course, accroupi)',()=>{
  const {sample}=rig();
  for(const name of ['civil_walk','civil_run','civil_walkBack','civil_crouchWalk']){
    const f=Array.from({length:24},(_,i)=>sample(name,i/24));
    for(const s of ['L','R']){
      const c=corr(f.map(p=>p['Hand_'+s].z-p['UpperArm_'+s].z),f.map(p=>p['Foot_'+s].z-p.Pelvis.z));
      assert.ok(c<-.9,name+' '+s+' : main et pied du même côté en opposition (corrélation '+c.toFixed(2)+')');
    }
    const range=n=>{const v=f.map(p=>p['Hand_'+n].z-p['UpperArm_'+n].z);return Math.max(...v)-Math.min(...v);};
    assert.ok(range('L')>(name==='civil_crouchWalk'?.05:.2),name+' : les bras balancent');
  }
});

test('jambes symétriques : pieds sous les hanches, parallèles, genoux presque tendus au repos, sans hyperextension',()=>{
  const {sample}=rig(),side=p=>[p.Foot_L,p.Foot_R];
  const idle=sample('civil_idle',.3);
  assert.ok(Math.abs(idle.Foot_L.x+idle.Foot_R.x)<.02,'pieds symétriques : '+idle.Foot_L.x.toFixed(3)+' / '+idle.Foot_R.x.toFixed(3));
  assert.ok(Math.abs(idle.Foot_L.z-idle.Foot_R.z)<.02,'pieds à la même hauteur de pas');
  assert.ok(Math.abs(idle.Foot_L.x-idle.Thigh_L.x)<.05&&Math.abs(idle.Foot_R.x-idle.Thigh_R.x)<.05,'pieds sous les hanches (plus de V)');
  const knee=(p,s)=>{const a=p['Thigh_'+s],b=p['Shin_'+s],c=p['Foot_'+s],u=a.clone().sub(b),w=c.clone().sub(b);return u.angleTo(w)*180/Math.PI;};
  assert.ok(knee(idle,'L')>145&&knee(idle,'R')>145&&Math.abs(knee(idle,'L')-knee(idle,'R'))<2,'genoux symétriques, jambes non fléchies : '+knee(idle,'L').toFixed(1)+' / '+knee(idle,'R').toFixed(1));
  for(const name of ['civil_walk','civil_run','civil_walkBack','civil_crouchWalk','civil_walkLeft']){
    for(let i=0;i<24;i++){const p=sample(name,i/24);
      for(const s of ['L','R']){assert.ok(knee(p,s)<=179.5,name+' : pas d’hyperextension du genou');
        // le genou plie vers l’avant : il est devant la ligne hanche–cheville
        const hip=p['Thigh_'+s],kn=p['Shin_'+s],an=p['Foot_'+s],t=(kn.y-an.y)/((hip.y-an.y)||1),lineZ=an.z+(hip.z-an.z)*t;
        assert.ok(kn.z>=lineZ-.01,name+' '+s+' : genou plié vers l’avant');}
      assert.ok(Math.abs(p.Foot_L.x-p.Foot_R.x)>.08,name+' : les pieds ne se croisent pas');}
  }
});

test('contact au sol : la cheville reste à hauteur de pied posé en appui, et les pieds ne s’enfoncent pas quand la pointe pivote',()=>{
  const {sample}=rig(),rest=sample('civil_idle',0).Foot_L.y;
  for(const name of ['civil_walk','civil_run','civil_walkBack','civil_crouchWalk']){
    let lowest=Infinity;for(let i=0;i<48;i++){const p=sample(name,i/48);lowest=Math.min(lowest,p.Foot_L.y,p.Foot_R.y);}
    assert.ok(lowest>rest-.02,name+' : cheville la plus basse '+lowest.toFixed(3)+' (repos '+rest.toFixed(3)+')');
  }
  // marche : le pied d’appui avance à la vitesse nominale de 1,6 m/s (pas de patinage), phase d’appui = moitié du cycle
  const {clips}=rig(),walk=clips.find(c=>c.name==='civil_walk');
  const t=.1,e=.9,z=(ph)=>sample('civil_walk',ph).Foot_L.z-sample('civil_walk',ph).Pelvis.z;
  const speed=Math.abs((z(.05)-z(.4))/(.35*walk.duration));assert.ok(Math.abs(speed-1.6)<.15,'vitesse du pied d’appui '+speed.toFixed(2)+' m/s');
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
