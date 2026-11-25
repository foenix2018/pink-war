// Original civil animations, authored on LYLU's existing skeleton. No third-party motion files.
export const FITNESS_CLIPS=Object.freeze({squat:'fitnessSquat',dumbbells:'fitnessCurl',rower:'fitnessRow'});
export function buildCivilMotion(T,visual,bones,original){
 const names=[...bones.keys()],V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Q=()=>new T.Quaternion();
 const bone=n=>bones.get(n).bone,base=new Map(names.map(n=>[n,{q:bone(n).quaternion.clone(),p:bone(n).position.clone()}]));
 const reset=()=>{for(const n of names){bone(n).quaternion.copy(base.get(n).q);bone(n).position.copy(base.get(n).p);}visual.updateMatrixWorld(true);};
 const pos=n=>bone(n).getWorldPosition(V()),wq=n=>bone(n).getWorldQuaternion(Q());
 // Coordinates here are in the model's +Z-forward frame before its game-facing rotation.
 const direction=(n,child,d)=>{const b=bone(n),current=pos(child).sub(pos(n)).normalize(),target=d.clone().normalize();if(target.lengthSq()<.5)return;const world=Q().setFromUnitVectors(current,target).multiply(wq(n));b.quaternion.copy(b.parent.getWorldQuaternion(Q()).invert().multiply(world));visual.updateMatrixWorld(true);};
 const solve=(a,b,c,target,pole)=>{const start=pos(a),end=target.clone().sub(start),l1=pos(b).distanceTo(start),l2=pos(c).distanceTo(pos(b)),d=Math.min(l1+l2-.0001,Math.max(Math.abs(l1-l2)+.0001,end.length())),u=end.normalize(),p=pole.clone().sub(start);p.addScaledVector(u,-p.dot(u));if(p.lengthSq()<1e-6)p.set(0,0,1).addScaledVector(u,-u.z);p.normalize();const x=(l1*l1+d*d-l2*l2)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-x*x));const mid=start.clone().addScaledVector(u,x).addScaledVector(p,h);direction(a,b,mid.clone().sub(start));direction(b,c,start.clone().addScaledVector(u,d).sub(pos(b)));};
 const footRest={L:pos('Foot_L'),R:pos('Foot_R')},footRot={L:wq('Foot_L'),R:wq('Foot_R')};
 const pelvisRest=pos('Pelvis');
 const setPelvis=(dx,dy,dz)=>{const b=bone('Pelvis');b.position.copy(b.parent.worldToLocal(pelvisRest.clone().add(V(dx,dy,dz))));visual.updateMatrixWorld(true);};
 const feet=(targets)=>{for(const s of ['L','R']){solve('Thigh_'+s,'Shin_'+s,'Foot_'+s,targets[s],targets[s].clone().add(V(0,.55,.70)));bone('Foot_'+s).quaternion.copy(bone('Foot_'+s).parent.getWorldQuaternion(Q()).invert().multiply(footRot[s]));visual.updateMatrixWorld(true);}};
 // Civil gait: derive shoulder swing from the opposite thigh rather than an unrelated sine.
 const relaxedArm=(s,side,mode,u)=>{
  const run=mode.startsWith('run'),idle=/idle/i.test(mode),lateral=/(Left|Right)$/.test(mode),opposite=s==='L'?'R':'L';
  const leg=pos('Shin_'+opposite).sub(pos('Thigh_'+opposite)).normalize();
  const swing=idle?0:lateral?.08*Math.sin(u*Math.PI*2+(side>0?0:Math.PI)):Math.max(-1,Math.min(1,leg.z/.55))*(run?.48:.29);
  const shoulderAngle=swing,elbowAngle=(run?.88:.16)+Math.max(0,swing)*(run?.40:.28);
  const upper=V(side*(run?.075:.085),-Math.cos(shoulderAngle),Math.sin(shoulderAngle));
  direction('UpperArm_'+s,'ForeArm_'+s,upper);
  direction('ForeArm_'+s,'Hand_'+s,V(side*.025,-Math.cos(shoulderAngle+elbowAngle),Math.sin(shoulderAngle+elbowAngle)));
 };
 const arms=(mode,u,row=null)=>{for(const [s,side] of [['L',1],['R',-1]]){const sh=pos('UpperArm_'+s);let target,pole;
 if(mode==='fitnessCurl'){const a=.12+2.15*u,el=sh.clone().add(V(side*.045,-.27,.025));target=el.clone().add(V(side*.015,-.25*Math.cos(a),.25*Math.sin(a)));pole=el.clone().add(V(0,0,-.08));}
 else if(mode==='fitnessSquat'){const chest=pos('Chest');target=V(side*.34,chest.y+.105,chest.z-.12);pole=sh.clone().add(V(side*.38,-.20,-.24));}
 else if(mode==='fitnessRow'){target=V(side*.18,.69+.07*row.pull,.58-.34*row.legs-.12*row.swing-.25*row.pull);pole=sh.clone().add(V(side*.22,-.22,-.12));}
 else {relaxedArm(s,side,mode,u);continue;}
 solve('UpperArm_'+s,'ForeArm_'+s,'Hand_'+s,target,pole);
 }};
 const clips=[];
 const lateral=/^(walk|run)(Left|Right)$/;
 const sideStep=(name,u)=>{const sign=name.endsWith('Left')?1:-1,fast=name.startsWith('run'),stride=fast?.20:.135,phase=u%1;setPelvis(sign*.018*Math.sin(phase*Math.PI*2),-.035-.013*Math.cos(phase*Math.PI*4),0);const targets={};for(const s of ['L','R']){const lead=(s==='L')===(sign>0),p=(phase+(lead?0:.5))%1;const swing=p<.5;const f=swing?-.5+.5*(1-Math.cos(p*2*Math.PI)):.5-((p-.5)*2);targets[s]=footRest[s].clone().add(V(sign*stride*f,swing?(fast?.095:.06)*Math.sin(p*2*Math.PI):0,0));}feet(targets);arms(name,u);};
 // Keep exact retargeted leg/pelvis tracks for directional locomotion; replace combat upper body.
 for(const name of ['idle','walk','run','walkLeft','walkRight','walkBack','runLeft','runRight','runBack','crouchIdle','crouchWalk','crouchLeft','crouchRight','crouchBack']){
  const source=original.find(c=>c.name===name);if(!source)continue;
  if(lateral.test(name)){const duration=name.startsWith('run')?.62:1.02,n=Math.ceil(duration*30)+1,times=Array.from({length:n},(_,i)=>i*duration/(n-1)),values=Object.fromEntries(names.map(k=>[k,[]])),hip=[];for(let i=0;i<n;i++){reset();sideStep(name,i/(n-1));for(const k of names){const q=bone(k).quaternion,a=values[k];if(a.length&&q.dot(Q().fromArray(a,a.length-4))<0)q.set(-q.x,-q.y,-q.z,-q.w);a.push(...q.toArray());}hip.push(...bone('Pelvis').position.toArray());}const tracks=names.map(k=>new T.QuaternionKeyframeTrack(k+'.quaternion',times,values[k]));tracks.push(new T.VectorKeyframeTrack('Pelvis.position',times,hip));clips.push(new T.AnimationClip('civil_'+name,duration,tracks));continue;}const duration=Math.max(.1,source.duration),n=Math.max(3,Math.ceil(duration*30)+1),times=Array.from({length:n},(_,i)=>i*duration/(n-1)),upper=names.filter(n=>/^(Spine|Chest|Neck|Head|UpperArm|ForeArm|Hand)/.test(n)),values=Object.fromEntries(upper.map(n=>[n,[]]));
  for(let i=0;i<n;i++){reset();for(const tr of source.tracks){const [id,prop]=tr.name.split('.');if(!bones.has(id)||upper.includes(id))continue;const a=tr.createInterpolant().evaluate(times[i]);if(prop==='quaternion')bone(id).quaternion.fromArray(a);else if(prop==='position')bone(id).position.fromArray(a);}visual.updateMatrixWorld(true);arms(name,name.includes('Idle')||name==='idle'?0:i/(n-1));for(const k of upper){const q=bone(k).quaternion,arr=values[k];if(arr.length&&q.dot(new T.Quaternion().fromArray(arr,arr.length-4))<0)q.set(-q.x,-q.y,-q.z,-q.w);arr.push(...q.toArray());}}
  const tracks=source.tracks.filter(t=>!upper.includes(t.name.split('.')[0])).map(t=>t.clone());for(const k of upper)tracks.push(new T.QuaternionKeyframeTrack(k+'.quaternion',times,values[k]));clips.push(new T.AnimationClip('civil_'+name,duration,tracks));
 }
 // Looping original fitness poses; the feet are solved against fixed anchors.
 for(const [name,duration] of [['fitnessCurl',3.0],['fitnessSquat',3.6],['fitnessRow',2.8]]){
  const n=Math.ceil(duration*30)+1,times=Array.from({length:n},(_,i)=>i*duration/(n-1)),values=Object.fromEntries(names.map(n=>[n,[]])),hip=[];
  for(let i=0;i<n;i++){reset();const t=i/(n-1),smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};let u=smooth(t/.48)*(1-smooth((t-.55)/.40));let row=null;
   if(name==='fitnessSquat'){setPelvis(0,-.40*u,-.19*u);direction('Spine','Chest',V(0,1,.42*u));feet(footRest);}
   if(name==='fitnessRow'){const legs=smooth(t/.29)*(1-smooth((t-.70)/.30)),swing=smooth((t-.16)/.20)*(1-smooth((t-.53)/.20)),pull=smooth((t-.27)/.16)*(1-smooth((t-.43)/.16));row={legs,swing,pull};// Keep the ankle anchors fixed and limit rail travel to the actual leg reach.
   const targets={L:footRest.L.clone().add(V(0,.12,.32)),R:footRest.R.clone().add(V(0,.12,.32))};
   setPelvis(0,-.49,-.09);
   const hips={L:pos('Thigh_L'),R:pos('Thigh_R')};
   let travel=.34;
   for(const side of ['L','R']){const hip=hips[side],target=targets[side],reach=pos('Shin_'+side).distanceTo(hip)+pos('Foot_'+side).distanceTo(pos('Shin_'+side))-.025;const dx=target.x-hip.x,dy=target.y-hip.y,dz=target.z-hip.z;travel=Math.min(travel,Math.max(0,Math.sqrt(Math.max(0,reach*reach-dx*dx-dy*dy))-dz));}
   setPelvis(0,-.49,-.09-travel*legs);direction('Spine','Chest',V(0,1,.38-.66*swing));feet(targets);}
   arms(name,u,row);for(const k of names){const q=bone(k).quaternion,a=values[k];if(a.length&&q.dot(new T.Quaternion().fromArray(a,a.length-4))<0)q.set(-q.x,-q.y,-q.z,-q.w);a.push(...q.toArray());}hip.push(...bone('Pelvis').position.toArray());
  }
  const tracks=names.map(k=>new T.QuaternionKeyframeTrack(k+'.quaternion',times,values[k]));tracks.push(new T.VectorKeyframeTrack('Pelvis.position',times,hip));clips.push(new T.AnimationClip(name,duration,tracks));
 }
 reset();return clips;
}
