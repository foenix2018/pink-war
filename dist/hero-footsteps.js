import * as T from './vendor/three.webgpu.min.js';

const smooth=T.MathUtils.smoothstep,clamp=T.MathUtils.clamp,up=new T.Vector3(0,1,0);
const wrap=n=>n-Math.floor(n);

// Contacts live in the world, not in the moving avatar's frame. The inspector
// uses a virtual translation, so it runs exactly the same contact solver.
export function createHeroFootsteps(model,solveChain){
 const {root,actor,hips,legs,knees,feet}=model,virtual=new T.Vector3(),velocity=new T.Vector3(),planning=new T.Vector3();
 const native=feet.map(()=>({p:new T.Vector3(),q:new T.Quaternion()}));let solePoints=[];
 const initialFeet=feet.map(f=>root.worldToLocal(f.getWorldPosition(new T.Vector3())));
 const flat=feet.map(f=>new T.Quaternion().setFromRotationMatrix(new T.Matrix4().fromArray(actor.data.bones[actor.bones.indexOf(f)].inverse).invert()));
 const pads=feet.map(()=>new T.Vector3()),probes=feet.map(()=>[]),point=new T.Vector3();
 const contacts=feet.map(()=>({ready:false,cycle:0,mode:'stance',anchor:new T.Vector3(),from:new T.Vector3(),to:new T.Vector3(),position:new T.Vector3(),q:new T.Quaternion(),fromQ:new T.Quaternion(),toQ:new T.Quaternion(),stopAge:0,swingStart:0}));
 const bindFootY=feet.map(f=>new T.Matrix4().fromArray(actor.data.bones[actor.bones.indexOf(f)].inverse).invert().elements[13]);
 const bindHipY=actor.data.bones[actor.bones.indexOf(hips)].p[1];
 let phase=0,stride=1.3,duty=.60,lift=.10,frequency=0,inPlace=false,actualSpeed=0,travel=0,wasMoving=false,wasAir=false,landingNow=false,ground=null,referenceY=0,drop=0,standingY=bindHipY,pelvisY=null,pelvisVelocity=0;
 let lastScale=root.getWorldScale(new T.Vector3()).y;
 const state={phase:0,stride:1.3,frequency:0,duty:.6,distance:0,pelvisDrop:0,contacts:[null,null]};
 function setSoles(soles){
  solePoints=soles;
  let floor=0;
  for(let i=0;i<2;i++){
   let min=Infinity;for(const p of soles[i])min=Math.min(min,point.copy(p).applyQuaternion(flat[i]).y);
   floor+=bindFootY[i]+min;
   const bottom=soles[i].filter(p=>point.copy(p).applyQuaternion(flat[i]).y<min+.0005);pads[i].set(0,0,0);for(const p of bottom)pads[i].add(p);pads[i].multiplyScalar(1/Math.max(1,bottom.length));
   // Heel, toe and both sides of the actual outsole, deduplicated once.
   const hull=new Set();for(const axis of ['x','z'])for(const sign of [-1,1]){let best=-Infinity,index=0;for(let j=0;j<bottom.length;j++){const n=point.copy(bottom[j]).applyQuaternion(flat[i])[axis]*sign;if(n>best){best=n;index=j;}}hull.add(bottom[index]);}
   probes[i]=[...hull].filter(Boolean).map(p=>p.clone());contacts[i].ready=false;
  }
  standingY=bindHipY-floor/2;
 }
 const fallbackSoles=feet.map((f,i)=>[-1,1].flatMap(x=>[-1,1].map(z=>new T.Vector3(x*.055,-.13,z*.12).applyQuaternion(flat[i].clone().invert()))));setSoles(fallbackSoles);
 const world=p=>root.localToWorld(p).add(virtual),local=p=>root.worldToLocal(p.sub(virtual));
 function height(x,z){const y=ground?.(x,z,referenceY);return Number.isFinite(y)?y:referenceY;}
 function frame(dt,flight,measured,teleport){
  const scale=root.getWorldScale(new T.Vector3()).y;
  if(inPlace!==!!flight.inPlace||teleport||Math.abs(scale-lastScale)>.01){virtual.set(0,0,0);for(const c of contacts)c.ready=false;}
  lastScale=scale;inPlace=!!flight.inPlace;ground=typeof flight.ground==='function'?flight.ground:null;referenceY=root.getWorldPosition(new T.Vector3()).y;
  velocity.copy(measured);actualSpeed=velocity.length();travel=actualSpeed*dt;
  planning.copy(velocity);
  if(inPlace)virtual.addScaledVector(velocity,dt);
  if(flight.airborne){for(const c of contacts)c.ready=false;wasAir=true;}
  else if(wasAir){landingNow=true;for(let i=0;i<2;i++){contacts[i].ready=false;contacts[i].pending=feet[i].getWorldPosition(new T.Vector3()).add(virtual);}}
 }
 function advance(motion,dt,flight){
  if(flight.airborne){frequency=0;wasMoving=false;state.frequency=0;return {phase:wrap(phase),frequency:0,moving:false};}
  const moving=actualSpeed>.025&&!flight.airborne,scale=root.getWorldScale(new T.Vector3()).y,speed=actualSpeed/scale;
  const run=motion==='run',side=Math.abs(model.state.travelDirection.x);
  const forward=forwardWeight(),nativeDistance=2.6*(actor.actions[motion]?.getClip().duration||1);
  const desired=T.MathUtils.lerp(nativeDistance,flight.crouched?clamp(speed*.70,.85,1.65):run?clamp(speed*.50,2.0,5.8):clamp(speed*.80,.70,2.0),forward);
  stride+=(desired-stride)*(1-Math.exp(-dt*12));
  duty=run?clamp(.80/stride,.15,.36):flight.crouched?.62:Math.min(.72/stride,.62-.30*smooth(speed,1.2,3.2));
  if(!landingNow)duty/=1+2*Math.abs(clamp((flight.velocity?.y||0)/Math.max(.1,actualSpeed),-.6,.6));
  lift=flight.crouched?.085:run?.24:.115;
  frequency=moving?actualSpeed/(stride*scale):0;
  if(moving&&!wasMoving){phase=duty*(landingNow?.75:.25);for(let i=0;i<2;i++){const c=contacts[i];c.anchor.copy(c.position);c.cycle=Math.floor(phase+i*.5);c.mode='stance';}}
  if(moving){phase+=travel/(stride*scale);state.distance+=travel;}
  wasMoving=moving;
  Object.assign(state,{phase:wrap(phase),stride,frequency,duty});
  return {phase:wrap(phase),frequency,moving};
 }
 function forwardWeight(){const d=model.state.travelDirection;return (1-smooth(Math.abs(d.x),.15,.55))*(1-smooth(d.z,-.5,-.1));}
 function captureNative(){root.updateMatrixWorld(true);for(let i=0;i<2;i++){native[i].p.copy(root.worldToLocal(feet[i].getWorldPosition(new T.Vector3())));native[i].q.copy(feet[i].getWorldQuaternion(new T.Quaternion()));}}
 function directionalTarget(i){
  const n=native[i],d=model.state.travelDirection,sign=i===0?-1:1,side=Math.abs(d.x),back=smooth(d.z,-.2,.4),p=n.p.clone();
  const centre=actor.gaitReference[actor.motion]?.centres[i]||0,excursion=-(p.z-centre)*(1-.30*side-.30*back),warp=smooth(model.state.speed,.05,.5);
  p.x+=excursion*d.x*warp;p.z=T.MathUtils.lerp(p.z,centre+excursion*d.z,warp);
  const min=T.MathUtils.lerp(.065,.095,side),x=sign*p.x;p.x=sign*.5*(x+min+Math.sqrt((x-min)**2+.0001));
  return {p:world(p),q:new T.Quaternion().setFromAxisAngle(up,d.x*.10*(1-back*.4)).multiply(n.q)};
 }
 function surface(p,i,yawQ){
  const s=root.getWorldScale(new T.Vector3()).y,h=height(p.x,p.z),e=.055*s;
  const dx=height(p.x+e,p.z)-height(p.x-e,p.z),dz=height(p.x,p.z+e)-height(p.x,p.z-e);
  const n=Math.abs(dx)<e*1.2&&Math.abs(dz)<e*1.2?new T.Vector3(-dx/(2*e),1,-dz/(2*e)).normalize():up;
  const q=new T.Quaternion().setFromUnitVectors(up,n).multiply(yawQ).multiply(flat[i]);
  p.y=h+.003*s;return q;
 }
 function landing(i,horizon){
  const side=Math.abs(model.state.travelDirection.x),p=world(new T.Vector3((i===0?-1:1)*(.14+.09*side),0,.025));
  p.add(pads[i].clone().applyQuaternion(root.getWorldQuaternion(new T.Quaternion()).multiply(flat[i])).multiplyScalar(root.getWorldScale(new T.Vector3()).y));
  p.addScaledVector(planning,horizon);return p;
 }
 function plant(dt,flight){
  if(flight.airborne)return;
  root.updateMatrixWorld(true);const scale=root.getWorldScale(new T.Vector3()).y,rootQ=root.getWorldQuaternion(new T.Quaternion()),moving=actualSpeed>.025;
  const targets=[],stance=[];
  for(let i=0;i<2;i++){
   const c=contacts[i],p=phase+i*.5,cycle=Math.floor(p),t=wrap(p),on=moving?t<duty:true;
   if(!c.ready){
    c.position.copy(landingNow&&c.pending?c.pending:!moving?world(initialFeet[i].clone()):feet[i].getWorldPosition(new T.Vector3()).add(virtual));
    c.position.add(pads[i].clone().applyQuaternion(landingNow||!moving?rootQ.clone().multiply(flat[i]):feet[i].getWorldQuaternion(new T.Quaternion())).multiplyScalar(scale));
    c.q.copy(surface(c.position,i,rootQ));c.anchor.copy(c.position);c.from.copy(c.position);c.to.copy(c.position);c.fromQ.copy(c.q);c.toQ.copy(c.q);c.mode='stance';c.cycle=cycle;c.stopAge=0;c.ready=true;
   }
   if(moving){
    c.stopAge=0;
    if(on&&(c.mode!=='stance'||cycle!==c.cycle)){
     // The final swing position is the contact; it cannot jump sideways to a
     // newly predicted target on the first frame of support.
     c.anchor.copy(c.position);c.q.copy(c.toQ);surface(c.anchor,i,rootQ);c.mode='stance';
    }else if(!on&&c.mode==='stance'){
     c.from.copy(c.position);c.fromQ.copy(c.q);c.mode='swing';c.swingStart=Math.max(duty,t-Math.max(.001,frequency*dt));c.targetReady=false;
    }
    if(on){c.position.copy(c.anchor);c.position.y=height(c.anchor.x,c.anchor.z)+.003*scale;}
    else{
     const progress=clamp((t-c.swingStart)/(1-c.swingStart),0,1),ease=progress*progress*(3-2*progress);
     if(progress<.60||!c.targetReady){const predicted=landing(i,(1-t+duty*.5)/Math.max(.01,frequency));if(!c.targetReady)c.to.copy(predicted);else c.to.lerp(predicted,1-Math.exp(-dt*20));c.targetReady=true;}
     c.toQ.copy(surface(c.to,i,rootQ));
     c.position.lerpVectors(c.from,c.to,ease);c.position.y+=Math.sin(Math.PI*progress)**2*lift*scale;
     c.position.y=Math.max(c.position.y,height(c.position.x,c.position.z)+.003*scale);c.q.slerpQuaternions(c.fromQ,c.toQ,ease);
    }
   }else{
    if(c.mode==='swing'){c.from.copy(c.position);c.mode='settle';c.stopAge=0;}
    if(c.mode==='stance'&&c.q.angleTo(rootQ.clone().multiply(flat[i]))>.42&&contacts[1-i].mode!=='pivot'){
     c.from.copy(c.position);c.fromQ.copy(c.q);c.mode='pivot';c.stopAge=0;
    }
    if(c.mode==='pivot'){
     c.stopAge+=dt;const progress=clamp(c.stopAge/.24,0,1);c.to.copy(landing(i,0));c.toQ.copy(surface(c.to,i,rootQ));c.position.lerpVectors(c.from,c.to,smooth(progress,0,1));c.position.y+=.07*scale*Math.sin(Math.PI*progress)**2;c.q.slerpQuaternions(c.fromQ,c.toQ,smooth(progress,0,1));c.pivotDone=progress===1;
    }
    else if(c.mode==='settle'){c.stopAge+=dt;c.position.y=T.MathUtils.lerp(c.from.y,height(c.position.x,c.position.z)+.003*scale,smooth(c.stopAge,0,.16));if(c.stopAge>=.16){c.anchor.copy(c.position);c.mode='stance';}}
    else{c.position.copy(c.anchor);c.position.y=height(c.anchor.x,c.anchor.z)+.003*scale;}
   }
   c.cycle=cycle;c.mobility=c.mode==='pivot'?Math.max(.001,Math.sin(Math.PI*clamp(c.stopAge/.24,0,1))**2):c.mode==='swing'?Math.sin(Math.PI*clamp((t-c.swingStart)/(1-c.swingStart),0,1))**2:0;
   const offset=pads[i].clone().applyQuaternion(c.q).multiplyScalar(scale),ankle=c.position.clone().sub(offset);
   // Outsole corners use the same collision surfaces as the player's centre.
   for(const p of probes[i]){point.copy(p).applyQuaternion(c.q).multiplyScalar(scale).add(ankle);ankle.y=Math.max(ankle.y,height(point.x,point.z)-point.y+ankle.y+.003*scale);}
   targets.push(ankle);stance.push(c.mode==='stance'&&Math.abs(c.position.y-height(c.position.x,c.position.z))<.02*scale);
  }
  // Retain the established sideways/backward knee paths. Only forward travel
  // uses long running strides; a sidestep must not become a crossing run.
  const forward=forwardWeight(),footQ=contacts.map(c=>c.q.clone());
  if(forward<.999)for(let i=0;i<2;i++){
   const target=directionalTarget(i);let lowest=Infinity;
   for(const p of solePoints[i])lowest=Math.min(lowest,point.copy(p).applyQuaternion(target.q).y);
   target.p.y=Math.max(target.p.y,height(target.p.x,target.p.z)-lowest*scale+.003*scale);
   targets[i].lerp(target.p,1-forward);footQ[i].slerp(target.q,1-forward);stance[i]=false;contacts[i].mobility=1-forward+forward*contacts[i].mobility;
  }
  // A closing sidestep never scissors through the supporting shin. Move the
  // airborne foot, retaining the supporting contact exactly in world space.
  const L=local(targets[0].clone()),R=local(targets[1].clone()),gap=.15;
  if(R.x-L.x<gap+.04){const d=gap-(R.x-L.x),missing=.5*(d+Math.sqrt(d*d+.0001)),sum=contacts[0].mobility+contacts[1].mobility;
   if(sum>1e-8){L.x-=missing*contacts[0].mobility/sum;R.x+=missing*contacts[1].mobility/sum;targets[0].copy(world(L));targets[1].copy(world(R));for(let i=0;i<2;i++)if(!stance[i])contacts[i].position.copy(targets[i]).add(pads[i].clone().applyQuaternion(contacts[i].q).multiplyScalar(scale));}
  }
  // The original running clip's vertical offset was authored for different
  // boots and a shorter stride. Use a compliant pelvis in the actual sole
  // frame; keep the native lateral sway and upper-body animation.
  const nativeHipY=hips.position.y,running=actor.motion==='run'&&moving;
  // Longer walking strides need a lower, flexed pelvis before support ends;
  // otherwise an almost straight leg forces a late reach correction.
  const walkFlex=.075+.10*smooth(stride,1.4,2.0);
  const targetY=standingY-(flight.crouched?.265:running?.11:moving?walkFlex:0)+(moving&&!flight.crouched?(running?.015:.008)*(1-Math.cos(phase*Math.PI*4)):0);
  if(pelvisY===null)pelvisY=nativeHipY;
  const omega=20,e=Math.exp(-omega*dt),change=pelvisY-targetY,temp=(pelvisVelocity+omega*change)*dt;
  pelvisY=targetY+(change+temp)*e;pelvisVelocity=(pelvisVelocity-omega*temp)*e;hips.position.y=pelvisY;root.updateMatrixWorld(true);
  let needed=0;const softness=[];
  for(let i=0;i<2;i++){
   if(targets[i].y<referenceY-.5*scale){stance[i]=false;targets[i].y=referenceY-.25*scale;}
   let lowest=Infinity,lowestPoint=new T.Vector3();for(const p of solePoints[i]){point.copy(p).applyQuaternion(footQ[i]).multiplyScalar(scale);if(point.y<lowest){lowest=point.y;lowestPoint.copy(point);}}
   lowestPoint.add(targets[i]);const floor=height(lowestPoint.x,lowestPoint.z),clearance=lowestPoint.y-floor;
   if(clearance<.003*scale)targets[i].y+=.003*scale-clearance;
   const supported=targets[i].y>=referenceY-.5*scale?1-smooth(Math.max(0,clearance)/scale,.010,.060):0;
   softness[i]=1-supported;
   if(!supported)continue;
   const hip=legs[i].getWorldPosition(new T.Vector3()).add(virtual),reach=(knees[i].position.length()+feet[i].position.length()-.020)*scale,h2=(hip.x-targets[i].x)**2+(hip.z-targets[i].z)**2;
   needed=Math.max(needed,(hip.y-targets[i].y-Math.sqrt(Math.max(.002,reach*reach-h2)))*supported);
  }
  needed=clamp(needed/scale,0,.24);drop+=(needed-drop)*(1-Math.exp(-dt*24));const correction=Math.max(needed,drop);hips.position.y-=correction;state.pelvisDrop=nativeHipY-hips.position.y;
  root.updateMatrixWorld(true);
  for(let i=0;i<2;i++){
   const c=contacts[i],target=targets[i].clone().sub(virtual),pole=root.localToWorld(new T.Vector3(i===0?-.24:.24,.52,-.65));
   solveChain(legs[i],knees[i],feet[i],target,pole,softness[i]);feet[i].quaternion.copy(feet[i].parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(footQ[i]));
   model.state.planted[i]=stance[i];model.state.supportWeight[i]=Number(stance[i]);state.contacts[i]={point:c.position.clone().sub(virtual),planted:stance[i]};
   if(c.pivotDone){c.anchor.copy(c.position);c.mode='stance';c.pivotDone=false;}
  }
  wasAir=false;landingNow=false;
 }
 return {state,frame,advance,plant,setSoles,captureNative};
}
