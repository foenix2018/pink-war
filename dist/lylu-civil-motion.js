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
 const arms=(mode,u)=>{for(const [s,side] of [['L',1],['R',-1]]){const sh=pos('UpperArm_'+s);let target,pole;
 if(mode==='fitnessCurl'){const a=(.10+2.0*u),el=sh.clone().add(V(side*.035,-.26,0));target=el.clone().add(V(side*.025,-.25*Math.cos(a),.25*Math.sin(a)));pole=el.clone();}
 else if(mode==='fitnessSquat'){target=sh.clone().add(V(side*.13,.075,-.10));pole=sh.clone().add(V(side*.40,-.18,-.19));}
 else if(mode==='fitnessRow'){target=V(side*.18,.64+.12*u,.58-.41*u);pole=sh.clone().add(V(side*.22,-.22,-.12));}
 else {const swing=(mode.startsWith('run')?.14:.085)*Math.sin(u*Math.PI*2+(side>0?0:Math.PI));target=sh.clone().add(V(side*.065,-.47,swing));pole=sh.clone().add(V(side*.12,-.24,-.08));}
 solve('UpperArm_'+s,'ForeArm_'+s,'Hand_'+s,target,pole);
 }};
 const clips=[];
 // Keep exact retargeted leg/pelvis tracks for directional locomotion; replace combat upper body.
 for(const name of ['idle','walk','run','walkLeft','walkRight','walkBack','runLeft','runRight','runBack','crouchIdle','crouchWalk','crouchLeft','crouchRight','crouchBack']){
  const source=original.find(c=>c.name===name);if(!source)continue;const duration=Math.max(.1,source.duration),n=Math.max(3,Math.ceil(duration*30)+1),times=Array.from({length:n},(_,i)=>i*duration/(n-1)),upper=names.filter(n=>/^(Spine|Chest|Neck|Head|UpperArm|ForeArm|Hand)/.test(n)),values=Object.fromEntries(upper.map(n=>[n,[]]));
  for(let i=0;i<n;i++){reset();for(const tr of source.tracks){const [id,prop]=tr.name.split('.');if(!bones.has(id)||upper.includes(id))continue;const a=tr.createInterpolant().evaluate(times[i]);if(prop==='quaternion')bone(id).quaternion.fromArray(a);else if(prop==='position')bone(id).position.fromArray(a);}visual.updateMatrixWorld(true);arms(name,name.includes('Idle')||name==='idle'?0:i/(n-1));for(const k of upper){const q=bone(k).quaternion,arr=values[k];if(arr.length&&q.dot(new T.Quaternion().fromArray(arr,arr.length-4))<0)q.set(-q.x,-q.y,-q.z,-q.w);arr.push(...q.toArray());}}
  const tracks=source.tracks.filter(t=>!upper.includes(t.name.split('.')[0])).map(t=>t.clone());for(const k of upper)tracks.push(new T.QuaternionKeyframeTrack(k+'.quaternion',times,values[k]));clips.push(new T.AnimationClip('civil_'+name,duration,tracks));
 }
 // Looping original fitness poses; the feet are solved against fixed anchors.
 for(const [name,duration] of [['fitnessCurl',3.0],['fitnessSquat',3.6],['fitnessRow',2.8]]){
  const n=Math.ceil(duration*30)+1,times=Array.from({length:n},(_,i)=>i*duration/(n-1)),values=Object.fromEntries(names.map(n=>[n,[]])),hip=[];
  for(let i=0;i<n;i++){reset();const t=i/(n-1),u=.5-.5*Math.cos(t*2*Math.PI);
   if(name==='fitnessSquat'){setPelvis(0,-.34*u,-.12*u);direction('Spine','Chest',V(0,1,.32*u));feet(footRest);}
   if(name==='fitnessRow'){setPelvis(0,-.49,-.18-.34*u);direction('Spine','Chest',V(0,1,.35-.62*u));feet({L:footRest.L.clone().add(V(0,.12,.51)),R:footRest.R.clone().add(V(0,.12,.51))});}
   arms(name,u);for(const k of names){const q=bone(k).quaternion,a=values[k];if(a.length&&q.dot(new T.Quaternion().fromArray(a,a.length-4))<0)q.set(-q.x,-q.y,-q.z,-q.w);a.push(...q.toArray());}hip.push(...bone('Pelvis').position.toArray());
  }
  const tracks=names.map(k=>new T.QuaternionKeyframeTrack(k+'.quaternion',times,values[k]));tracks.push(new T.VectorKeyframeTrack('Pelvis.position',times,hip));clips.push(new T.AnimationClip(name,duration,tracks));
 }
 reset();return clips;
}
