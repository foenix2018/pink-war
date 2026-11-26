// Original civil animations, authored on LYLU's existing skeleton. No third-party motion files.
export const FITNESS_CLIPS=Object.freeze({squat:'fitnessSquat',dumbbells:'fitnessCurl',rower:'fitnessRow'});
// Seated work: pelvis joint height above the floor for the workshop chair (seat ≈ 0,48 m).
export const SIT=Object.freeze({pelvis:.57});
export function buildCivilMotion(T,visual,bones,original){
 const names=[...bones.keys()],V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Q=()=>new T.Quaternion();
 const bone=n=>bones.get(n).bone,base=new Map(names.map(n=>[n,{q:bone(n).quaternion.clone(),p:bone(n).position.clone()}]));
 const reset=()=>{for(const n of names){bone(n).quaternion.copy(base.get(n).q);bone(n).position.copy(base.get(n).p);}visual.updateMatrixWorld(true);};
 const pos=n=>bone(n).getWorldPosition(V()),wq=n=>bone(n).getWorldQuaternion(Q());
 // Coordinates here are in the model's +Z-forward frame before its game-facing rotation.
 const direction=(n,child,d)=>{const b=bone(n),current=pos(child).sub(pos(n)).normalize(),target=d.clone().normalize();if(target.lengthSq()<.5)return;const world=Q().setFromUnitVectors(current,target).multiply(wq(n));b.quaternion.copy(b.parent.getWorldQuaternion(Q()).invert().multiply(world));visual.updateMatrixWorld(true);};
 const solve=(a,b,c,target,pole)=>{const start=pos(a),end=target.clone().sub(start),l1=pos(b).distanceTo(start),l2=pos(c).distanceTo(pos(b)),d=Math.min(l1+l2-.0001,Math.max(Math.abs(l1-l2)+.0001,end.length())),u=end.normalize(),p=pole.clone().sub(start);p.addScaledVector(u,-p.dot(u));if(p.lengthSq()<1e-6)p.set(0,0,1).addScaledVector(u,-u.z);p.normalize();const x=(l1*l1+d*d-l2*l2)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-x*x));const mid=start.clone().addScaledVector(u,x).addScaledVector(p,h);direction(a,b,mid.clone().sub(start));direction(b,c,start.clone().addScaledVector(u,d).sub(pos(b)));};
 // The armoured rifle stance (feet at 0.13 m and 0.20 m, toes in a V, knees at 140°/160°) is not copied to the civil body:
 // the civil feet are rebuilt symmetric, parallel and under the hips.
 const sourceFeet={L:pos('Foot_L'),R:pos('Foot_R')},footRot={L:wq('Foot_L'),R:wq('Foot_R')};
 const hipRest={L:pos('Thigh_L'),R:pos('Thigh_R')},stanceX=Math.abs(hipRest.L.x-hipRest.R.x)/2+.012;
 const footRest={L:V(stanceX,(sourceFeet.L.y+sourceFeet.R.y)/2,.01),R:V(-stanceX,(sourceFeet.L.y+sourceFeet.R.y)/2,.01)};
 const TOE_OUT=.14,neutralFoot={};
 for(const k of ['L','R']){const f=V(0,1,0).applyQuaternion(footRot[k]),yaw0=Math.atan2(f.x,f.z);neutralFoot[k]=Q().setFromAxisAngle(V(0,1,0),(k==='L'?1:-1)*TOE_OUT-yaw0).multiply(footRot[k]);}
 const pelvisRest=pos('Pelvis');
 const setPelvis=(dx,dy,dz)=>{const b=bone('Pelvis');b.position.copy(b.parent.worldToLocal(pelvisRest.clone().add(V(dx,dy,dz))));visual.updateMatrixWorld(true);};
 // pitch (rad, about the lateral axis): + toe down at toe-off, − toe up at heel strike.
 const feet=(targets,pitch={})=>{for(const s of ['L','R']){solve('Thigh_'+s,'Shin_'+s,'Foot_'+s,targets[s],targets[s].clone().add(V(0,.55,.70)));const w=Q().setFromAxisAngle(V(1,0,0),pitch[s]||0).multiply(neutralFoot[s]);bone('Foot_'+s).quaternion.copy(bone('Foot_'+s).parent.getWorldQuaternion(Q()).invert().multiply(w));visual.updateMatrixWorld(true);}};
 const arms=(mode,u,swing={})=>{for(const [s,side] of [['L',1],['R',-1]]){const sh=pos('UpperArm_'+s);let target,pole;
 if(mode==='fitnessCurl'){const a=(.10+2.0*u),el=sh.clone().add(V(side*.035,-.26,0));target=el.clone().add(V(side*.025,-.25*Math.cos(a),.25*Math.sin(a)));pole=el.clone();}
 else if(mode==='fitnessSquat'){target=sh.clone().add(V(side*.16,-.015,-.105));pole=sh.clone().add(V(side*.36,-.22,-.18));}
 else if(mode==='fitnessRow'){target=V(side*.18,.67+.09*u,.58-.41*u);pole=sh.clone().add(V(side*.22,-.22,-.12));}
 else if(mode==='civilSit'){const tap=.008*Math.sin(u*Math.PI*4+(side>0?0:Math.PI));target=sh.clone().add(V(-side*.105,-.30+tap,.27));pole=sh.clone().add(V(side*.26,-.30,-.05));}
 else {
  // Arms hang from the shoulder (reach .52 m): hand beside the thigh, elbow slightly bent and pointing back.
  // `swing` (metres, forward +) is derived from the legs by the gait: the arm goes back when the same-side leg goes forward.
  const run=mode.startsWith('run'),crouch=mode.startsWith('crouch'),w=swing[s]||0;
  target=sh.clone().add(V(side*.028,run?-.45:crouch?-.47:-.502,.03+w+(run?.05:0)));pole=sh.clone().add(V(side*.04,-.22,run?-.34:-.26));
 }
 solve('UpperArm_'+s,'ForeArm_'+s,'Hand_'+s,target,pole);
 }};
 const clips=[];
 const smooth=t=>.5-.5*Math.cos(Math.PI*t),LEG=.84;
 const GAITS={ // A: half stride (m), speed = 2A / (stance · T): walk 1.6 m/s, run 4.2 m/s, crouch 1.2 m/s (nominal speeds of the refuge animator)
  walk:{A:.34,T:.85,stance:.5,lift:.075,sway:.014,arm:.14,crouch:0,bounce:0},
  run:{A:.45,T:.66,stance:.33,lift:.17,sway:.012,arm:.26,crouch:.04,bounce:.05},
  crouch:{A:.20,T:.67,stance:.5,lift:.05,sway:.010,arm:.05,crouch:.28,bounce:.02,lean:.14,stanceX:.04}};
 // One frame of a walking/running gait: feet follow stance (back at ground speed) and swing (lifted arc); the pelvis is lowered only as far as
 // the legs need to reach, so knees bend naturally and never hyper-extend or lift the stance foot.
 const gaitFrame=(cfg,dir,phase)=>{
  const z={},y={},pitch={},targets={};
  for(const k of ['L','R']){
   const p=(phase+(k==='L'?0:.5))%1;let zz,yy=0,pp=0;
   if(p<cfg.stance){const u=p/cfg.stance;zz=cfg.A*(1-2*u);pp=u<.2?-.18*(1-u/.2):u>.75?.45*((u-.75)/.25):0;yy=u>.85?.035*((u-.85)/.15):0;}
   else{const q=(p-cfg.stance)/(1-cfg.stance);zz=cfg.A*(-1+2*smooth(q));yy=cfg.lift*Math.sin(Math.PI*q)**1.2;pp=.45+(-.18-.45)*q;}
   // The foot pivots about the ankle: raise it so the toe (toe-off) or the heel (heel strike) stays on the ground instead of sinking.
   z[k]=dir*zz;y[k]=yy+(pp>0?.15*Math.sin(pp):.07*Math.sin(-pp));pitch[k]=pp;
  }
  const sx=cfg.sway*Math.sin(2*Math.PI*phase),widen=cfg.stanceX||0;let hipY=Infinity,need=0;
  for(const k of ['L','R']){
   const side=k==='L'?1:-1,fx=footRest[k].x+side*widen,t=footRest[k].clone();t.x=fx;t.z=footRest[k].z+z[k];t.y=footRest[k].y+y[k];targets[k]=t;
   const hd=Math.hypot(t.x-(hipRest[k].x+sx),t.z-hipRest[k].z),req=t.y+Math.sqrt(Math.max(0,LEG*LEG-hd*hd));need=Math.max(need,req);
  }
  const bob=(cfg.bounce||0)*(.5+.5*Math.cos(4*Math.PI*(phase-cfg.stance/2)));
  hipY=Math.min(hipRest.L.y-cfg.crouch-bob,need);
  return {targets,pitch,z,pelvis:[sx,hipY-hipRest.L.y,0]};
 };
 const upperTracks=(source,times,i)=>{for(const tr of source.tracks){const [id,prop]=tr.name.split('.');if(!bones.has(id)||!/^(Spine|Chest|Neck|Head)/.test(id))continue;const a=tr.createInterpolant().evaluate(times[i]);if(prop==='quaternion')bone(id).quaternion.fromArray(a);}visual.updateMatrixWorld(true);};
 const record=(name,duration,n,frame)=>{
  const times=Array.from({length:n},(_,i)=>i*duration/(n-1)),values=Object.fromEntries(names.map(k=>[k,[]])),hip=[];
  for(let i=0;i<n;i++){reset();frame(i,times);for(const k of names){const q=bone(k).quaternion,a=values[k];if(a.length&&q.dot(Q().fromArray(a,a.length-4))<0)q.set(-q.x,-q.y,-q.z,-q.w);a.push(...q.toArray());}hip.push(...bone('Pelvis').position.toArray());}
  const tracks=names.map(k=>new T.QuaternionKeyframeTrack(k+'.quaternion',times,values[k]));tracks.push(new T.VectorKeyframeTrack('Pelvis.position',times,hip));clips.push(new T.AnimationClip(name,duration,tracks));
 };
 const lateral=/^(walk|run|crouch)(Left|Right)$/;
 // Side steps (same procedural feet, along x).
 const sideStep=(name,u,crouch)=>{const sign=name.endsWith('Left')?1:-1,fast=name.startsWith('run'),stride=fast?.20:crouch?.10:.135,phase=u%1,drop=crouch?.28:0;
  setPelvis(sign*.018*Math.sin(phase*Math.PI*2),-.035-drop-.013*Math.cos(phase*Math.PI*4),0);
  if(crouch)bone('Pelvis').rotateX(.12);visual.updateMatrixWorld(true);
  const targets={};for(const s of ['L','R']){const lead=(s==='L')===(sign>0),p=(phase+(lead?0:.5))%1,swing=p<.5,f=swing?-.5+.5*(1-Math.cos(p*2*Math.PI)):.5-((p-.5)*2);targets[s]=footRest[s].clone().add(V(sign*stride*f,swing?(fast?.095:crouch?.04:.06)*Math.sin(p*2*Math.PI):0,0));}
  feet(targets);arms(name,u,{L:.025*Math.sin(u*Math.PI*2),R:-.025*Math.sin(u*Math.PI*2)});};
 for(const name of ['idle','walk','run','walkBack','runBack','crouchIdle','crouchWalk','crouchBack','walkLeft','walkRight','runLeft','runRight','crouchLeft','crouchRight']){
  const source=original.find(c=>c.name===name);if(!source)continue;
  if(lateral.test(name)){const duration=name.startsWith('run')?.62:name.startsWith('crouch')?1.2:1.02;record('civil_'+name,duration,Math.ceil(duration*30)+1,(i)=>{sideStep(name,i/(Math.ceil(duration*30)),name.startsWith('crouch'));});continue;}
  const family=name.startsWith('run')?'run':name.startsWith('crouch')?'crouch':'walk',still=/Idle$|^idle$/.test(name),dir=/Back$/.test(name)?-1:1;
  if(still){
   // Standing / crouching still: breathing and weight shift stay in the source upper body; legs are a symmetric relaxed stance.
   const duration=Math.max(.1,source.duration),n=Math.max(3,Math.ceil(duration*30)+1),crouch=name==='crouchIdle';
   record('civil_'+name,duration,n,(i,times)=>{upperTracks(source,times,i);setPelvis(0,crouch?-.30:0,0);if(crouch)bone('Pelvis').rotateX(.16);visual.updateMatrixWorld(true);feet(crouch?{L:footRest.L.clone().add(V(.04,0,.12)),R:footRest.R.clone().add(V(-.04,0,-.06))}:footRest);arms(name,0);});
   continue;
  }
  const cfg=GAITS[family],duration=cfg.T,n=Math.ceil(duration*30)+1;
  record('civil_'+name,duration,n,(i,times)=>{
   const phase=i/(n-1)%1,f=gaitFrame(cfg,dir,phase);upperTracks(source,times,i);
   setPelvis(...f.pelvis);if(cfg.lean)bone('Pelvis').rotateX(cfg.lean);visual.updateMatrixWorld(true);
   feet(f.targets,f.pitch);
   // arms oppose the same-side leg: forward foot ⇒ hand back
   arms(name,phase,{L:-f.z.L/cfg.A*cfg.arm,R:-f.z.R/cfg.A*cfg.arm});
  });
 }
 // Looping original fitness poses; the feet are solved against fixed anchors.
 for(const [name,duration] of [['fitnessCurl',3.0],['fitnessSquat',3.6],['fitnessRow',2.8],['civilSit',4.0]]){
  const n=Math.ceil(duration*30)+1,times=Array.from({length:n},(_,i)=>i*duration/(n-1)),values=Object.fromEntries(names.map(n=>[n,[]])),hip=[];
  for(let i=0;i<n;i++){reset();const t=i/(n-1),u=.5-.5*Math.cos(t*2*Math.PI);
   if(name==='fitnessSquat'){setPelvis(0,-.34*u,-.12*u);direction('Spine','Chest',V(0,1,.32*u));feet(footRest);}
   if(name==='civilSit'){const seat=SIT.pelvis-pelvisRest.y;setPelvis(0,seat,-.06);direction('Spine','Chest',V(0,1,.16+.015*u));direction('Neck','Head',V(0,1,.42));feet({L:footRest.L.clone().add(V(.02,0,.36)),R:footRest.R.clone().add(V(-.02,0,.36))});}
   if(name==='fitnessRow'){setPelvis(0,-.49,-.18-.34*u);direction('Spine','Chest',V(0,1,.35-.62*u));feet({L:footRest.L.clone().add(V(0,.12,.51)),R:footRest.R.clone().add(V(0,.12,.51))});}
   arms(name,u);for(const k of names){const q=bone(k).quaternion,a=values[k];if(a.length&&q.dot(new T.Quaternion().fromArray(a,a.length-4))<0)q.set(-q.x,-q.y,-q.z,-q.w);a.push(...q.toArray());}hip.push(...bone('Pelvis').position.toArray());
  }
  const tracks=names.map(k=>new T.QuaternionKeyframeTrack(k+'.quaternion',times,values[k]));tracks.push(new T.VectorKeyframeTrack('Pelvis.position',times,hip));clips.push(new T.AnimationClip(name,duration,tracks));
 }
 reset();return clips;
}
