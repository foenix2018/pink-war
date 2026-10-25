import { ArenaGame, WEAPONS, segmentBox,weaponAllowedForCharacter } from './game-logic.js';
import { CHARGE_MAX } from './armor-combat.js';

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
  constructor(obstacles=[],random=Math.random,initialWeapon=0,characterId='ghju'){
    super(obstacles,random,noTerrain,characterId);
    this.mode='training';this.targets=[];this.targetSerial=1;
    this.trainingHits=0;this.trainingShots=0;this.trainingEscapes=0;
    this.trainingCombo=0;this.trainingBestCombo=0;this.targetDelay=.2;
    this.targetTransition=.46;
    this.pendingHits=[];
    this.wave=0;this.nextWave=-1;this.toSpawn=0;
    this.player.x=0;this.player.z=22;this.player.yaw=0;
    this.ownedWeapons=new Set(WEAPONS.map((_,i)=>i).filter(i=>!WEAPONS[i].melee&&weaponAllowedForCharacter(i,characterId)));
    this.ammo=WEAPONS.map(w=>w.capacity);
    this.weaponIndex=Number.isInteger(initialWeapon)&&initialWeapon>=0&&this.ownedWeapons.has(initialWeapon)?initialWeapon:0;
    this.state='playing';
  }
  // The range is for practice: impulse charges come back as soon as one is thrown.
  throwCharge(origin,direction){const thrown=super.throwCharge(origin,direction);if(thrown)this.charges=CHARGE_MAX;return thrown;}
  get trainingAccuracy(){return this.trainingShots?Math.round(this.trainingHits/this.trainingShots*100):100;}
  get trainingLevel(){return trainingStage(this.time);}
  makeTarget(){
    const stage=this.trainingLevel,kinds=['fixed-near','fixed-far','lateral','depth'];
    const kind=stage.kind==='mixed'?kinds[Math.floor(this.random()*kinds.length)]:stage.kind;
    const far=kind==='fixed-far'||kind==='lateral'||kind==='depth';
    const z=kind==='fixed-near'?7:far?(-20-this.random()*22):-18;
    const radius=kind==='fixed-near'?.83:kind==='fixed-far'?.72:.78;
    const x=(this.random()-.5)*11,y=1.5+(this.random()-.5)*.6;
    // Do not retract a target merely because the shooter needs time to aim.
    // Targets remain until a confirmed impact or a clearly announced drill change.
    const target={id:this.targetSerial++,kind,born:this.time,life:Infinity,
      x,y,z,radius,range:kind==='lateral'?Math.min(2.6,Math.max(.6,8-Math.abs(x))):kind==='depth'?Math.min(5,Math.max(1.3,Math.abs(z)-9)):0,
      phase:0,speed:trainingSpeed(this.time),hit:false,expired:false};
    this.targets.push(target);this.event('training-appear',{id:target.id,kind});return target;
  }
  shoot(origin,direction,charge=1,hand=null){
    const before=this.bullets.length;
    const result=super.shoot(origin,direction,charge,hand);
    if(!result||this.weapon.melee)return result;
    this.trainingShots++;
    // Pink War fires finite-speed laser projectiles. Predict where moving
    // plates will be at the actual projectile arrival, not at trigger time.
    let best=null;
    const spawned=this.bullets.slice(before);
    for(const b of spawned)for(const target of this.targets){
      if(target.hit)continue;
      if(b.vz>=-.0001)continue;
      let travel=(target.z-b.z)/b.vz;
      if(travel<=0||travel>b.life)continue;
      for(let i=0;i<4;i++){
        const predicted=targetPosition(target,this.time+travel);
        travel=(predicted.z-b.z)/b.vz;
      }
      if(travel<=0||travel>b.life)continue;
      const start={x:b.x,y:b.y,z:b.z};
      const hit=traceTrainingTarget(start,{x:b.vx,y:b.vy,z:b.vz},target,this.time+travel);
      if(!hit)continue;
      // A hard partition, safety rail or wall takes precedence over a target.
      if(this.obstacles.some(obstacle=>{
        const t=segmentBox(start,hit.point,obstacle);
        return t!==null&&t<.999;
      }))continue;
      if(!best||travel<best.travel)best={hit,travel,bulletId:b.id};
    }
    if(best){
      this.pendingHits.push({id:best.hit.target.id,due:this.time+best.travel,
        bulletId:best.bulletId,hit:best.hit,weapon:this.weapon.id,power:charge});
    }else{this.trainingCombo=0;this.event('training-miss',{});}
    return result;
  }
  step(dt,input={}){
    const beforeStage=this.trainingLevel.number;
    this.nextWave=-1;this.toSpawn=0;this.wave=0;
    const arriving=[];
    const nextTime=this.time+Math.max(0,Math.min(.05,dt));
    for(let i=this.pendingHits.length-1;i>=0;i--){
      const pending=this.pendingHits[i];
      if(pending.due>nextTime+1e-7)continue;
      this.pendingHits.splice(i,1);
      const target=this.targets.find(t=>t.id===pending.id&&!t.hit);
      if(!target)continue;
      const bulletIndex=this.bullets.findIndex(b=>b.id===pending.bulletId);
      if(bulletIndex>=0)this.bullets.splice(bulletIndex,1);
      arriving.push({pending,target});
    }
    super.step(dt,input);
    for(const {pending,target} of arriving){
      if(!this.targets.includes(target)||target.hit)continue;
      target.hit=true;target.hitAt=this.time;this.trainingHits++;this.trainingCombo++;
      this.trainingBestCombo=Math.max(this.trainingCombo,this.trainingBestCombo);
      const bonus=Math.min(5,this.trainingCombo)*10;
      this.score+=pending.hit.points+bonus;
      const hit=pending.hit;
      this.event('training-hit',{id:target.id,x:hit.point.x,y:hit.point.y,z:hit.point.z,
        weapon:pending.weapon,power:pending.power,surface:'metal',normal:{x:0,y:0,z:1},
        points:hit.points+bonus,bullseye:hit.bullseye,combo:this.trainingCombo});
    }
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
      // A timed drill transition is explicitly announced; old targets
      // are replaced only here, not spontaneously while the player aims.
      this.targets=this.targets.filter(target=>target.hit);
      this.targetDelay=.05;
      this.trainingCombo=0;
    }
    for(let i=this.targets.length-1;i>=0;i--){
      const target=this.targets[i];
      // Keep the struck plate in the scene long enough to visibly fold down.
      if(target.hit&&this.time-(target.hitAt??this.time)>.48)this.targets.splice(i,1);
    }
    this.targetDelay-=dt;
    const live=this.targets.filter(t=>!t.hit).length;
    const maxTargets=this.time<45?1:this.time<100?2:3;
    if(this.targetDelay<=0&&live<maxTargets){
      this.makeTarget();
      this.targetDelay=Math.max(.24,1.12/trainingSpeed(this.time));
    }
  }
  snapshot(){
    return {...super.snapshot(),mode:'training',training:{
      hits:this.trainingHits,shots:this.trainingShots,accuracy:this.trainingAccuracy,escapes:this.trainingEscapes,
      combo:this.trainingCombo,bestCombo:this.trainingBestCombo,stage:this.trainingLevel,
      speed:trainingSpeed(this.time),targets:this.targets.map(t=>({...t,position:targetPosition(t,this.time)}))}};
  }
}
