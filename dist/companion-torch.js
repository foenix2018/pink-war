import {segmentBox} from './game-logic.js';

const luma=c=>c.r*.2126+c.g*.7152+c.b*.0722;
// Sample visible scene lights at the player and ahead, with ceiling/sun
// occlusion. No GPU readback, and the companion's own lights are excluded.
export function companionIllumination(T,scene,at,obstacles=[]){
 const p=new T.Vector3(at.x,at.y,at.z),q=new T.Vector3(),d=new T.Vector3();let sky=0,brightness=0;
 const clear=(a,b)=>!obstacles.some(box=>segmentBox(a,b,box)!==null);
 for(const v of [[0,1,0],[.55,1,0],[-.55,1,0],[0,1,.55],[0,1,-.55]]){q.copy(p).add(d.set(...v).normalize().multiplyScalar(16));if(clear(p,q))sky+=.2;}
 scene.traverseVisible(light=>{
  if(!light.isLight||light.intensity<=0)return;
  for(let parent=light;parent;parent=parent.parent)if(parent.userData.companionLight)return;
  const c=luma(light.color),intensity=light.intensity;
  if(light.isHemisphereLight){brightness+=intensity*c*.60*(light.userData.indoorFill?1:.10+.90*sky);return;}
  if(light.isAmbientLight){brightness+=intensity*c*.65;return;}
  if(light.isDirectionalLight){
   const from=light.getWorldPosition(new T.Vector3()),to=light.target.getWorldPosition(new T.Vector3());
   d.subVectors(from,to).normalize();q.copy(p).addScaledVector(d,45);
   if(clear(p,q))brightness+=intensity*c*.65;return;
  }
  if(!light.isPointLight&&!light.isSpotLight)return;
  light.getWorldPosition(q);d.subVectors(p,q);const distance=d.length();
  if(light.distance>0&&distance>light.distance||!clear(p,q))return;
  let cone=1;
  if(light.isSpotLight){const axis=light.target.getWorldPosition(new T.Vector3()).sub(q).normalize(),cos=d.normalize().dot(axis),edge=Math.cos(light.angle);
   if(cos<=edge)return;cone=Math.min(1,(cos-edge)/Math.max(.01,Math.cos(light.angle*(1-light.penumbra))-edge));}
  brightness+=intensity*c*cone/Math.max(1,distance**(light.decay||2))*.22;
 });
 return brightness;
}

export function createCompanionTorch(T,scene){
 const light=new T.SpotLight(0xfff2dd,0,15,.42,.55,2),target=new T.Object3D();
 light.name='Companion / automatic torch';light.userData.companionLight=true;light.castShadow=false;light.target=target;scene.add(light,target);
 let sampleAge=Infinity,illumination=1,wanted=false,power=0,disposed=false;
 function disable(){wanted=false;power=0;light.intensity=0;sampleAge=Infinity;}
 return {light,target,update(dt,{game,origin,head,forward,active=true}={}){
  if(disposed)return;if(!active){disable();return;}if(dt<=0)return;
  sampleAge+=dt;
  if(sampleAge>=.25){
   const ahead={x:head.x+forward.x*2.5,y:head.y-.35,z:head.z+forward.z*2.5};
   illumination=Math.min(companionIllumination(T,scene,head,game.obstacles),companionIllumination(T,scene,ahead,game.obstacles));
   wanted=illumination<(wanted?.30:.20);sampleAge=0;
  }
  power+=(Number(wanted)-power)*(1-Math.exp(-dt*7));light.intensity=power*85;light.position.copy(origin);
  const end=new T.Vector3(head.x+forward.x*14,head.y-.45+forward.y*9,head.z+forward.z*14);
  let nearest=1;for(const box of game.obstacles){const hit=segmentBox(origin,end,box);if(hit!==null)nearest=Math.min(nearest,hit);}
  const range=origin.distanceTo(end);light.distance=Math.min(15,Math.max(.25,range*nearest+.10));target.position.copy(end);
 },snapshot:()=>({on:wanted,power,illumination,distance:light.distance}),reset:disable,
 dispose(){if(disposed)return;disposed=true;light.removeFromParent();target.removeFromParent();light.dispose?.();}};
}
