import { ArenaGame, WEAPONS, segmentBox,weaponAllowedForCharacter } from './game-logic.js';
import { CHARGE_MAX } from './armor-combat.js';

// Shooting range: target-only simulation with the unchanged Pink War weapon
// handling, audio and VR aiming. Distances are from the firing line z=22.
export const TRAINING_BARRIER=Object.freeze({z:19.12,stopZ:19.80,height:1.13,width:25.5});
export const RANGE_CONTROLS=Object.freeze([-2,-1,0,1,2].map(lane=>Object.freeze({x:lane*4.6+.55,y:1.25,z:20.05})));
export const RANGE_ARMORY=Object.freeze({x:0,y:1.35,z:34.9,frontZ:34.48,width:5.9,height:2.5,depth:.7});
export const RANGE_WEAPON_SLOTS=Object.freeze([0,1,2,3,4,6,7,8]);
export const RANGE_ARMORY_SLOTS=Object.freeze(RANGE_WEAPON_SLOTS.map((index,i)=>Object.freeze({index,x:(i-(RANGE_WEAPON_SLOTS.length-1)/2)*.70,y:1.43,z:RANGE_ARMORY.frontZ,width:.66,height:2.08})));
export function traceRangeArmory(origin,direction,available=RANGE_WEAPON_SLOTS){
  if(!origin||!direction||direction.z<=.001||origin.z>RANGE_ARMORY.frontZ+.01)return null;
  const distance=(RANGE_ARMORY.frontZ-origin.z)/direction.z;if(distance<0||distance>7)return null;
  const point={x:origin.x+direction.x*distance,y:origin.y+direction.y*distance,z:RANGE_ARMORY.frontZ};
  const slot=RANGE_ARMORY_SLOTS.find(s=>available.includes(s.index)&&Math.abs(point.x-s.x)<s.width/2&&Math.abs(point.y-s.y)<s.height/2);
  return slot?{index:slot.index,point,distance}:null;
}
export function rangeSessionTime(time){const seconds=Math.floor(Math.max(0,Number(time)||0));return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');}
// Same outline for the steel mesh and projectile tests, including the empty shoulders.
export const TARGET_OUTLINE=Object.freeze([[-.48,-.94],[.48,-.94],[.52,-.20],[.70,.28],[.62,.43],[.25,.54],[.25,.67],[.29,.78],[.25,1.02],[.15,1.10],[-.15,1.10],[-.25,1.02],[-.29,.78],[-.25,.67],[-.25,.54],[-.62,.43],[-.70,.28],[-.52,-.20]].map(p=>Object.freeze(p)));
export function targetContains(x,y){
  let inside=false;
  for(let i=0,j=TARGET_OUTLINE.length-1;i<TARGET_OUTLINE.length;j=i++){
    const a=TARGET_OUTLINE[i],b=TARGET_OUTLINE[j];
    if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
export const TARGET_IMPULSE=Object.freeze({r9:.32,duor9:.32,bloom:.26,lance:.82,thorn:.85,nova:1,m12:1});
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
export function trainingSpeed(time){return Math.min(1.5,.6+Math.max(0,time)/180);}
export function targetPosition(target,time){
  const age=Math.max(0,Math.min(time,target.hitAt??Infinity)-target.born),s=target.speed;
  if(target.kind==='lateral')return {x:target.x+Math.sin(age*1.2*s+target.phase)*target.range,y:target.y,z:target.z};
  if(target.kind==='depth')return {x:target.x,y:target.y,z:target.z+Math.sin(age*1.0*s+target.phase)*target.range};
  return {x:target.x,y:target.y,z:target.z};
}
export function traceTrainingTarget(origin,direction,target,time){
  if(!target||target.hit||target.expired||time<(target.readyAt??-Infinity))return null;
  const pos=targetPosition(target,time),len=Math.hypot(direction.x,direction.y,direction.z);
  if(len<1e-5||direction.z>=-.001)return null;
  const t=(pos.z-origin.z)/direction.z;
  if(t<=0)return null;
  const x=origin.x+direction.x*t,y=origin.y+direction.y*t;
  const dist=Math.hypot(x-pos.x,y-pos.y);
  if(!targetContains((x-pos.x)/target.radius,(y-pos.y)/target.radius))return null;
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
    this.trainingActive=false;this.trainingElapsed=0;
    this.rangeArmoryOpen=false;
    this.armoryEquippedIndex=null;this.armoryEquippedUntil=0;
    this.wave=0;this.nextWave=-1;this.toSpawn=0;
    this.player.x=0;this.player.z=22;this.player.yaw=0;
    this.ownedWeapons=new Set(WEAPONS.map((_,i)=>i).filter(i=>!WEAPONS[i].melee&&weaponAllowedForCharacter(i,characterId)));
    this.ammo=WEAPONS.map(w=>w.capacity);
    this.weaponIndex=Number.isInteger(initialWeapon)&&initialWeapon>=0&&this.ownedWeapons.has(initialWeapon)?initialWeapon:0;
    this.state='playing';
  }
  // The range is for practice: impulse charges come back as soon as one is thrown.
  throwCharge(origin,direction){if(this.rangeArmoryOpen)return false;const thrown=super.throwCharge(origin,direction);if(thrown)this.charges=CHARGE_MAX;return thrown;}
  get trainingAccuracy(){return this.trainingShots?Math.round(this.trainingHits/this.trainingShots*100):100;}
  get trainingLevel(){return trainingStage(this.trainingElapsed);}
  get trainingMotionSpeed(){return trainingSpeed(this.trainingElapsed);}
  get rangeWeapons(){return RANGE_WEAPON_SLOTS.filter(i=>this.ownedWeapons.has(i)&&weaponAllowedForCharacter(i,this.characterId));}
  setInteractionPosition(p=null){
    this.interactionPosition=p&&[p.x,p.y,p.z].every(Number.isFinite)?{x:p.x,z:p.z,eyeY:p.y,elevation:this.player.elevation||0}:null;
  }
  nearRangeArmory(){
    const p=this.interactionPosition||this.player,c=RANGE_ARMORY;
    const reach=this.interactionPosition?6.5:2.65;
    if(this.state!=='playing'||(p.elevation||0)>1.6||p.z>c.frontZ+.2||Math.hypot(Math.max(0,Math.abs(p.x-c.x)-c.width/2),p.z-c.frontZ)>reach)return false;
    const goal={x:Math.max(c.x-c.width/2,Math.min(c.x+c.width/2,p.x)),y:c.y,z:c.frontZ};
    return !this.obstacles.some(b=>{const hit=segmentBox({x:p.x,y:p.eyeY??(p.elevation||0)+1.5,z:p.z},goal,b);return hit!==null&&hit<.99;});
  }
  armoryTarget(origin,direction){
    if(!this.nearRangeArmory())return null;
    const hit=traceRangeArmory(origin,direction,this.rangeWeapons);
    return hit&&!this.obstacles.some(b=>{const t=segmentBox(origin,hit.point,b);return t!==null&&t<.99;})?hit:null;
  }
  armoryHandTarget(position){
    if(!position||!this.nearRangeArmory()||position.z>RANGE_ARMORY.frontZ+.20)return null;
    const available=this.rangeWeapons;let slot=null,distance=.36;
    for(const s of RANGE_ARMORY_SLOTS){if(!available.includes(s.index))continue;const d=Math.hypot(position.x-s.x,position.y-s.y,position.z-s.z);if(d<distance){slot=s;distance=d;}}
    if(!slot)return null;const point={x:slot.x,y:slot.y,z:slot.z};
    return this.obstacles.some(b=>{const t=segmentBox(position,point,b);return t!==null&&t<.99;})?null:{index:slot.index,point,distance};
  }
  closeRangeArmory(){this.rangeArmoryOpen=false;}
  selectFromArmory(index){
    if(!this.rangeArmoryOpen)return false;
    return this.takeFromArmory(index);
  }
  takeFromArmory(index){
    if(!this.nearRangeArmory()||!this.rangeWeapons.includes(index))return false;
    if(index!==this.weaponIndex&&!this.selectWeapon(index))return false;
    this.armoryEquippedIndex=index;this.armoryEquippedUntil=this.time+1.4;
    this.closeRangeArmory();return true;
  }
  selectWeapon(index){
    if(!super.selectWeapon(index))return false;
    // Reset the drill, never the world clock used by projectiles and animation.
    this.trainingElapsed=0;this.score=0;this.trainingHits=0;this.trainingShots=0;this.trainingEscapes=0;
    this.trainingCombo=0;this.trainingBestCombo=0;this.combo=0;this.bestCombo=0;this.comboUntil=-1;
    this.trainingActive=false;this.targets=[];this.pendingHits=[];this.bullets=[];this.thrownCharges=[];this.targetDelay=.18;
    this.refillWeapon();this.event('training-reset',{weapon:this.weapon.id});return true;
  }
  getInteraction(){
    const p=this.interactionPosition||this.player;
    if(this.state!=='playing'||(p.elevation||0)>1.6)return null;
    if(this.nearRangeArmory())return {x:RANGE_ARMORY.x,y:RANGE_ARMORY.y,z:RANGE_ARMORY.frontZ,kind:'range-armory',label:'Choisir une arme · armoire'};
    const control=[...RANGE_CONTROLS].sort((a,b)=>Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(p.x-b.x,p.z-b.z)).find(c=>
      Math.hypot(p.x-c.x,p.z-c.z)<2.65&&!this.obstacles.some(box=>{
        if(Math.abs(box.x-c.x)<.01&&Math.abs(box.z-c.z)<.01)return false;
        const hit=segmentBox({x:p.x,y:p.eyeY??(p.elevation||0)+1.5,z:p.z},c,box);return hit!==null&&hit<.99;
      }));
    return control?{...control,label:this.trainingActive?'Arrêter les cibles':'Déclencher les cibles',kind:'range-control'}:null;
  }
  collectWeapon(){
    const interaction=this.getInteraction();if(!interaction)return false;
    if(interaction.kind==='range-armory'){this.rangeArmoryOpen=!this.rangeArmoryOpen;return true;}
    this.trainingActive=!this.trainingActive;this.targets=[];this.pendingHits=[];this.targetDelay=.18;
    this.event('training-control',{active:this.trainingActive});return true;
  }
  makeTarget(){
    const stage=this.trainingLevel,kinds=['fixed-near','fixed-far','lateral','depth'];
    const kind=stage.kind==='mixed'?kinds[Math.floor(this.random()*kinds.length)]:stage.kind;
    const far=kind==='fixed-far'||kind==='lateral'||kind==='depth';
    const z=kind==='fixed-near'?7:far?(-20-this.random()*22):-18;
    const radius=kind==='fixed-near'?.62:kind==='fixed-far'?.58:.60;
    const x=(this.random()-.5)*11,y=1.22+(this.random()-.5)*.2;
    // Do not retract a target merely because the shooter needs time to aim.
    // Targets remain until a confirmed impact or a clearly announced drill change.
    const target={id:this.targetSerial++,kind,born:this.time,readyAt:this.time+.45,life:Infinity,
      x,y,z,radius,range:kind==='lateral'?Math.min(2.6,Math.max(.6,8-Math.abs(x))):kind==='depth'?Math.min(5,Math.max(1.3,Math.abs(z)-9)):0,
      phase:0,speed:trainingSpeed(this.trainingElapsed),hit:false,expired:false};
    this.targets.push(target);this.event('training-appear',{id:target.id,kind});return target;
  }
  shoot(origin,direction,charge=1,hand=null){
    if(this.rangeArmoryOpen)return false;
    const before=this.bullets.length;
    const result=super.shoot(origin,direction,charge,hand);
    if(!result||this.weapon.melee)return result;
    this.trainingShots++;
    // Pink War fires finite-speed laser projectiles. Predict where moving
    // plates will be at the actual projectile arrival, not at trigger time.
    let best=null;const contacts=[];
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
      contacts.push({hit,travel,bulletId:b.id});
      if(!best||travel<best.travel)best={hit,travel,bulletId:b.id};
    }
    if(best){
      this.pendingHits.push({id:best.hit.target.id,due:this.time+best.travel,
        bulletId:best.bulletId,hit:best.hit,weapon:this.weapon.id,power:charge,
        contacts:contacts.filter(c=>c.hit.target.id===best.hit.target.id),
        impulse:(TARGET_IMPULSE[this.weapon.id]||.35)*Math.max(.3,charge)});
    }else{this.trainingCombo=0;this.event('training-miss',{});}
    return result;
  }
  step(dt,input={}){
    if(this.state!=='playing'||this.rangeArmoryOpen)return;
    dt=Math.max(0,Math.min(.05,Number(dt)||0));
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
      const struck=new Set(pending.contacts.map(c=>c.bulletId));
      this.bullets=this.bullets.filter(b=>!struck.has(b.id));
      arriving.push({pending,target});
    }
    super.step(dt,input);
    if(this.trainingActive)this.trainingElapsed+=dt;
    for(const {pending,target} of arriving){
      if(!this.targets.includes(target)||target.hit)continue;
      target.hit=true;target.hitAt=pending.due;this.trainingHits++;this.trainingCombo++;
      target.impulse=pending.impulse;
      target.hitOffset={x:(pending.hit.point.x-pending.hit.position.x)/target.radius,y:(pending.hit.point.y-pending.hit.position.y)/target.radius};
      target.impacts=pending.contacts.map(c=>({x:(c.hit.point.x-c.hit.position.x)/target.radius,y:(c.hit.point.y-c.hit.position.y)/target.radius}));
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
      if(target.hit&&this.time-(target.hitAt??this.time)>1.1)this.targets.splice(i,1);
    }
    if(!this.trainingActive)return;
    this.targetDelay-=dt;
    const live=this.targets.filter(t=>!t.hit).length;
    const maxTargets=this.trainingElapsed<45?1:this.trainingElapsed<100?2:3;
    if(this.targetDelay<=0&&live<maxTargets){
      this.makeTarget();
      this.targetDelay=Math.max(.24,1.12/trainingSpeed(this.trainingElapsed));
    }
  }
  snapshot(){
    return {...super.snapshot(),mode:'training',training:{
      hits:this.trainingHits,shots:this.trainingShots,accuracy:this.trainingAccuracy,escapes:this.trainingEscapes,
      combo:this.trainingCombo,bestCombo:this.trainingBestCombo,stage:this.trainingLevel,
      active:this.trainingActive,elapsed:this.trainingElapsed,control:this.getInteraction(),
      armoryOpen:this.rangeArmoryOpen,clock:rangeSessionTime(this.trainingElapsed),
      speed:trainingSpeed(this.trainingElapsed),targets:this.targets.map(t=>({...t,position:targetPosition(t,this.time)}))}};
  }
}
