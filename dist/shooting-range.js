import { ArenaGame, WEAPONS } from './game-logic.js';

// Shooting range: target-only simulation with the unchanged Pink War weapon
// handling, audio and VR aiming. Distances are from the firing line z=22.
export const TRAINING_BARRIER=Object.freeze({z:19.12,stopZ:19.80,height:1.13,width:25.5});
export const TRAINING_STAGES=Object.freeze([
  Object.freeze({id:'near',label:'CIBLES FIXES · 15 M',duration:20,kind:'fixed-near'}),
  Object.freeze({id:'far',label:'CIBLES FIXES · 40 À 60 M',duration:20,kind:'fixed-far'}),
  Object.freeze({id:'lateral',label:'CIBLES MOBILES · GAUCHE / DROITE',duration:25,kind:'lateral'}),
  Object.freeze({id:'depth',label:'CIBLES MOBILES · AVANT / ARRIÈRE',duration:25,kind:'depth'}),
  Object.freeze({id:'mixed',label:'CHALLENGE · VITESSE CROISSANTE',duration:Infinity,kind:'mixed'})
]);
export function trainingStage(time){
  let elapsed=Math.max(0,time);
  for(let i=0;i<TRAINING_STAGES.length;i++){
    const stage=TRAINING_STAGES[i];
    if(elapsed<stage.duration)return { ...stage,number:i+1,remaining:stage.duration-elapsed };
    elapsed-=stage.duration;
  }
  return {...TRAINING_STAGES.at(-1),number:5,remaining:Infinity};
}
export function trainingSpeed(time){return Math.min(4,1+Math.max(0,time)/45);}
export function targetPosition(target,time){
  const age=Math.max(0,time-target.born),s=target.speed;
  if(target.kind==='lateral')return {x:target.x+Math.sin(age*1.2*s+target.phase)*target.range,y:target.y,z:target.z};
  if(target.kind==='depth')return {x:target.x,y:target.y,z:target.z+Math.sin(age*1.0*s+target.phase)*target.range};
  return {x:target.x,y:target.y,z:target.z};
}
export function traceTrainingTarget(origin,direction,target,time){
  if(!target||target.hit||target.expired)return null;
  const pos=targetPosition(target,time),len=Math.hypot(direction.x,direction.y,direction.z);
  if(len<1e-5||direction.z>=-.001)return null;
  const t=(pos.z-origin.z)/direction.z;
  if(t<=0)return null;
  const x=origin.x+direction.x*t,y=origin.y+direction.y*t;
  const dist=Math.hypot(x-pos.x,y-pos.y);
  if(dist>target.radius)return null;
  const center=Math.max(0,1-dist/target.radius);
  return {target,position:pos,point:{x,y,z:pos.z},distance:dist,bullseye:center>.76,
    points:center>.76?150:center>.47?100:center>.2?60:30};
}
const noTerrain=Object.freeze({
  routes:[],lifts:[],
  surfaces:()=>[],height:()=>0,routeForSurface:()=>null
});
export class ShootingRangeGame extends ArenaGame {
  constructor(obstacles=[],random=Math.random,initialWeapon=0){
    super(obstacles,random,noTerrain);
    this.mode='training';this.targets=[];this.targetSerial=1;
    this.trainingHits=0;this.trainingShots=0;this.trainingEscapes=0;
    this.trainingCombo=0;this.trainingBestCombo=0;this.targetDelay=.2;
    this.wave=0;this.nextWave=-1;this.toSpawn=0;
    this.player.x=0;this.player.z=22;this.player.yaw=0;
    this.ownedWeapons=new Set(WEAPONS.map((_,i)=>i).filter(i=>!WEAPONS[i].melee));
    this.ammo=WEAPONS.map(w=>w.capacity);
    this.weaponIndex=Number.isInteger(initialWeapon)&&initialWeapon>=0&&initialWeapon<5?initialWeapon:0;
    this.state='playing';
  }
  get trainingAccuracy(){return this.trainingShots?Math.round(this.trainingHits/this.trainingShots*100):100;}
  get trainingLevel(){return trainingStage(this.time);}
  makeTarget(){
    const stage=this.trainingLevel,kinds=['fixed-near','fixed-far','lateral','depth'];
    const kind=stage.kind==='mixed'?kinds[Math.floor(this.random()*kinds.length)]:stage.kind;
    const far=kind==='fixed-far'||kind==='lateral'||kind==='depth';
    const z=kind==='fixed-near'?7:far?(-20-this.random()*22):-18;
    const radius=kind==='fixed-near'?.83:kind==='fixed-far'?.72:.78;
    const x=(this.random()-.5)*11,y=1.5+(this.random()-.5)*.6;
    const target={id:this.targetSerial++,kind,born:this.time,life:Math.max(1.65,5.2/Math.sqrt(trainingSpeed(this.time))),
      x,y,z,radius,range:kind==='lateral'?Math.min(2.6,Math.max(.6,8-Math.abs(x))):kind==='depth'?Math.min(5,Math.max(1.3,Math.abs(z)-9)):0,
      phase:0,speed:trainingSpeed(this.time),hit:false,expired:false};
    this.targets.push(target);this.event('training-appear',{id:target.id,kind});return target;
  }
  shoot(origin,direction,charge=1){
    const result=super.shoot(origin,direction,charge);
    if(!result||this.weapon.melee)return result;
    this.trainingShots++;
    let best=null;
    for(const target of this.targets){
      const hit=traceTrainingTarget(origin,direction,target,this.time);
      if(hit&&(!best||hit.distance<best.distance))best=hit;
    }
    if(best){
      best.target.hit=true;this.trainingHits++;this.trainingCombo++;
      this.trainingBestCombo=Math.max(this.trainingCombo,this.trainingBestCombo);
      const bonus=Math.min(5,this.trainingCombo)*10;
      this.score+=best.points+bonus;
      this.event('training-hit',{id:best.target.id,x:best.point.x,y:best.point.y,z:best.point.z,weapon:this.weapon.id,power:charge,surface:'metal',normal:{x:0,y:0,z:1},points:best.points+bonus,bullseye:best.bullseye,combo:this.trainingCombo});
    }else{this.trainingCombo=0;this.event('training-miss',{});}
    return result;
  }
  step(dt,input={}){
    const beforeStage=this.trainingLevel.number;
    this.nextWave=-1;this.toSpawn=0;this.wave=0;
    super.step(dt,input);
    // Safety officer's firing line: nobody can run or jump into the live lanes.
    // Clamp any movement, including sprint and airborne controller movement.
    if(this.player.z<TRAINING_BARRIER.stopZ){
      this.player.z=TRAINING_BARRIER.stopZ;
      this.player.jumpImpulseZ=Math.max(0,this.player.jumpImpulseZ||0);
      if(this.playerVelocity)this.playerVelocity.z=0;
    }
    this.nextWave=-1;this.toSpawn=0;this.wave=0;
    if(this.trainingLevel.number!==beforeStage){
      this.event('training-stage',{stage:this.trainingLevel.number,label:this.trainingLevel.label});
      this.targetDelay=.05;
    }
    for(let i=this.targets.length-1;i>=0;i--){
      const target=this.targets[i];
      if(target.hit){this.targets.splice(i,1);continue;}
      if(this.time-target.born>target.life){
        target.expired=true;this.targets.splice(i,1);this.trainingEscapes++;this.trainingCombo=0;
        this.event('training-escaped',{id:target.id});
      }
    }
    this.targetDelay-=dt;
    const maxTargets=this.time<45?1:this.time<100?2:3;
    if(this.targetDelay<=0&&this.targets.length<maxTargets){
      this.makeTarget();
      this.targetDelay=Math.max(.22,.95/trainingSpeed(this.time));
    }
  }
  snapshot(){
    return {...super.snapshot(),mode:'training',training:{
      hits:this.trainingHits,shots:this.trainingShots,accuracy:this.trainingAccuracy,escapes:this.trainingEscapes,
      combo:this.trainingCombo,bestCombo:this.trainingBestCombo,stage:this.trainingLevel,
      speed:trainingSpeed(this.time),targets:this.targets.map(t=>({...t,position:targetPosition(t,this.time)}))}};
  }
}
