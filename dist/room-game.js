import { ArenaGame, WEAPONS, MAX_LEVEL, REGEN_DELAY, levelCount, traceEnemyHit, segmentSphere,projectileDamage } from './game-logic.js';
import {tacticalOrder,grenadeAvoidance} from './tactical-enemies.js';
import {squadOrder,relayVisualContact,clearSquadFiringLane} from './enemy-squads.js';
import {segmentBox} from './game-logic.js';
import { enemyDurability, enemyVolley, rangedMuzzle, enemyScale } from './enemy-combat.js';
import { bladeBulletContact, reflectedVelocity, sweepBlade } from './blade-combat.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});

// The same weapon, battery, recoil-event and damage rules as the arena, with
// native player tracking and enemy spawning supplied by the room/field adapter.
export class RoomGame extends ArenaGame {
  constructor(room,random=Math.random,characterId='ghju'){super([],random,null,characterId);this.room=room;this.running=false;this.pendingOffers=new Set();this.maxActive=3;this.head={x:0,y:1.65,z:0};this.roomPhase='ready';}
  start(head){
    if(!this.room.hasFloor())return false;
    super.reset();this.pendingOffers.clear();this.running=true;this.roomPhase='between';this.nextWave=1.5;
    this.head={...head};this.player.x=head.x;this.player.z=head.z;this.player.elevation=this.room.floorAt(head)??0;
    this.maxActive=clamp(Math.floor((this.room.freeArea?.()||12)/5),1,6);return true;
  }
  stop(){this.running=false;this.triggerHeld=false;this.charge=0;this.bladePrevious=null;}
  setHead(head,dt){
    if(![head?.x,head?.y,head?.z].every(Number.isFinite))return;
    const old=this.head;this.head={...head};this.player.x=head.x;this.player.z=head.z;this.player.elevation=this.room.floorAt(head)??this.player.elevation;
    if(dt>0)this.playerVelocity={x:clamp((head.x-old.x)/dt,-4,4),y:clamp((head.y-old.y)/dt,-4,4),z:clamp((head.z-old.z)/dt,-4,4)};
    this.footstepDistance+=Math.hypot(head.x-old.x,head.z-old.z);
    if(this.footstepDistance>.95){this.footstepDistance=0;this.emitNoise('step',6);}
  }
  blocked(a,b){return !!this.room?.trace(a,b);}
  shoot(origin,direction,charge=1,hand=null){if(!this.running||this.roomPhase==='scan'||this.blocked(this.head,origin))return false;return super.shoot(origin,direction,charge,hand);}
  trigger(held,dt,origin,direction){if(!this.running||!this.room.hasFloor()||this.roomPhase==='scan'){this.triggerHeld=false;this.semiPending=false;this.charge=0;return;}return super.trigger(held,dt,origin,direction);}
  emitNoise(kind,radius,position=this.head){
    if(!this.room)return [];
    const heard=[];for(const e of this.enemies){const ear={x:e.x,y:e.elevation+e.aimHeight,z:e.z};
      const reach=Math.min(12,radius)*(e.form==='listener'?1.5:1)*(this.blocked(position,ear)?.4:1);
      if(Math.hypot(ear.x-position.x,ear.y-position.y,ear.z-position.z)<reach){e.lastKnownX=position.x;e.lastKnownZ=position.z;e.alertedUntil=this.time+6;heard.push(e.id);}}
    return heard;
  }
  beginWave(){
    if(!this.running||this.state!=='playing'||this.wave>=MAX_LEVEL)return;
    this.wave++;this.toSpawn=levelCount(this.wave);this.spawned=0;this.nextWave=-1;this.spawnTimer=2.3;this.roomPhase='wave';
    if(!this.openRoomPortals()){this.roomPhase='scan';this.event('room-blocked');return;}
    this.activateWave();
  }
  openRoomPortals(){
    this.activePortals=[];const count=Math.min(this.wave<4?1:this.wave<10?2:3,this.maxActive);
    for(let i=0;i<count;i++){const point=this.room.findPoint({purpose:'portal',head:this.head,avoid:this.activePortals});if(!point)break;
      this.activePortals.push({id:this.wave*10+i,x:point.x,z:point.z,elevation:point.y,yaw:Math.atan2(this.head.x-point.x,this.head.z-point.z),openedAt:this.time+1+i*.55});}
    return this.activePortals.length>0;
  }
  activateWave(){
    this.roomPhase='wave';this.spawnTimer=2.3;
    this.ammo=WEAPONS.map(w=>w.capacity);this.reloadRemaining=0;this.charge=0;
    this.dual.ammo={left:12,right:12};
    const offered=WEAPONS.findIndex(w=>w.level===this.wave);if(offered>0)this.offerWeapon(offered);
    this.event('portals',{sites:this.activePortals.map(p=>({...p}))});this.event('wave',{wave:this.wave,count:this.toSpawn});this.event('equipment',this.equipment);
  }
  offerWeapon(index){
    if(this.ownedWeapons.has(index)||this.weaponOffers.some(o=>o.index===index))return;
    const point=this.room.findPoint({purpose:'weapon',head:this.head,avoid:this.weaponOffers});
    if(!point){this.pendingOffers.add(index);return;}
    this.pendingOffers.delete(index);const offer={index,x:point.x,z:point.z,elevation:point.y,createdAt:this.time};this.weaponOffers.push(offer);this.event('weapon-offer',{...offer,name:WEAPONS[index].name});
  }
  nearbyWeapon(distance=1.65){return this.weaponOffers.find(o=>Math.hypot(this.player.x-o.x,this.player.z-o.z)<distance&&!this.blocked(this.head,{x:o.x,y:o.elevation+1,z:o.z}))||null;}
  spawnEnemy(){
    const ordinal=this.spawned,site=this.activePortals[ordinal%this.activePortals.length];if(!site||site.openedAt>this.time)return false;
    const point=this.room.findPoint({purpose:'enemy',head:this.head,portal:site,avoid:this.enemies});if(!point)return false;
    const special=this.room.outdoor&&this.wave>=3&&ordinal%7===1?'synth':this.wave>=11&&ordinal%7===5?'bulwark':this.wave>=6&&ordinal%7===4?'listener':null;
    const elite=!special&&this.wave>=3&&ordinal%5===2,probe=!special&&!elite&&this.wave>=3&&ordinal%6===3;
    const form=special||(probe?'probe':elite?'brute':['stalker','scuttler','seer','brute'][(ordinal+this.wave-1)%4]);
    const ranged=['seer','probe','listener','bulwark','synth'].includes(form)||(this.wave>=5&&form==='brute');
    const roomScale=Math.min(1,Math.max(.6,((this.room.ceilingAt?.(point)??2.6)-point.y-.15)/((probe?1.95:form==='scuttler'?1.1:2.32)*enemyScale(form,elite))));
    const e={id:this.nextId++,x:point.x,z:point.z,elevation:point.y+(probe?.85:0),groundY:point.y,form,elite,ranged,
      hp:Math.round(enemyDurability(this.wave,form,elite)*.72),speed:(this.room.outdoor?Math.min(2.6,1.6+this.wave*.05):Math.min(.75,.32+this.wave*.021))*(form==='scuttler'?1.12:form==='bulwark'?.65:1),
      roomScale,radius:(probe?.38:elite?.44:.33)*roomScale,aimHeight:(probe?.55:form==='scuttler'?.85:1.88)*enemyScale(form,elite)*roomScale,tier:Math.ceil(this.wave/2),
      yaw:Math.atan2(this.head.x-point.x,this.head.z-point.z)+Math.PI,attackTimer:1.5,stunnedUntil:0,limpUntil:0,phase:this.random()*6.28,awareness:'engaged',portalId:site.id};
    this.enemies.push(e);this.toSpawn--;this.spawned++;this.event('spawn',{id:e.id,x:e.x,y:e.elevation+e.aimHeight,z:e.z});return true;
  }
  updateBlade(segment,dt,guard=false,head=this.head){
    this.bladeGuard=guard;if(!this.weapon.melee||!this.running||!this.room.hasFloor()||!segment||segment.extension<.95){this.bladePrevious=null;this.bladeSpeed=0;return;}
    this.bladeEye={...head};const previous=this.bladePrevious;
    this.bladeSpeed=previous&&dt>0?Math.min(12,Math.hypot(segment.tip.x-previous.tip.x-this.playerVelocity.x*dt,segment.tip.y-previous.tip.y-this.playerVelocity.y*dt,segment.tip.z-previous.tip.z-this.playerVelocity.z*dt)/dt):0;
    if(!this.blocked(head,segment.base)&&(this.bladeSpeed>.65||this.bladePhase<1)){
      const trace=(a,b,e)=>{const hit=traceEnemyHit(a,b,e),wall=this.room.trace(a,b);return hit&&(!wall||hit.t<wall.t)?hit:null;};
      for(const hit of sweepBlade(previous,segment,this.enemies,[],head,()=>null,trace)){
        if(this.time-(this.bladeHitTimes.get(hit.enemy.id)??-99)<.48)continue;
        this.bladeHitTimes.set(hit.enemy.id,this.time);this.damageEnemy(hit.enemy,this.weapon.damage,hit.point,hit.zone,hit.multiplier);this.event('blade-hit',{...hit.point,surface:'robot',weapon:'aurora'});
      }
    }
    this.bladePrevious={base:{...segment.base},tip:{...segment.tip},extension:segment.extension};
    for(const [id,t] of this.bladeHitTimes)if(this.time-t>3)this.bladeHitTimes.delete(id);
  }
  step(dt){
    if(!this.running||this.state!=='playing')return;
    if(!this.room.hasFloor()){this.roomPhase='scan';this.triggerHeld=false;this.bladePrevious=null;return;}
    this.autoReload();
    dt=clamp(dt,0,.05);this.time+=dt;this.cooldown=Math.max(0,this.cooldown-dt);this.invulnerable=Math.max(0,this.invulnerable-dt);
    if(this.reloadRemaining>0){this.reloadRemaining=Math.max(0,this.reloadRemaining-dt);if(!this.reloadRemaining){this.refillWeapon();this.event('reloaded');}}
    this.regenerating=this.player.hp<100&&this.time-this.lastDamage>=REGEN_DELAY;if(this.regenerating)this.player.hp=Math.min(100,this.player.hp+18*dt);
    for(const index of this.pendingOffers)if(Math.floor(this.time)!==Math.floor(this.time-dt))this.offerWeapon(index);
    if(this.roomPhase==='scan'&&this.activePortals.length)this.roomPhase=this.toSpawn||this.enemies.length?'wave':'between';
    if(this.roomPhase==='scan'&&!this.activePortals.length&&this.wave>0&&this.nextWave<0&&Math.floor(this.time)!==Math.floor(this.time-dt)){if(this.openRoomPortals())this.activateWave();}
    if(this.nextWave>=0){this.nextWave-=dt;this.roomPhase='between';if(this.nextWave<=0)this.beginWave();}
    if(this.toSpawn>0){this.spawnTimer-=dt;if(this.spawnTimer<=0&&this.enemies.length<this.maxActive)this.spawnTimer=this.spawnEnemy()?Math.max(.7,2-this.wave*.055):.7;}
    this.moveEnemies(dt);this.moveBullets(dt);
    if(this.roomPhase==='wave'&&!this.toSpawn&&!this.enemies.length&&this.state==='playing'){
      if(this.wave===MAX_LEVEL){this.state='won';this.roomPhase='won';this.event('won');}
      else{this.nextWave=6;this.roomPhase='between';this.event('wave-clear',{wave:this.wave});}
    }
  }
  moveEnemies(dt){
    const coverBoxes=this.room.coverBoxes?.()||[];
    for(const e of this.enemies){
      const eye={x:e.x,y:e.elevation+e.aimHeight-.52*(e.coverCrouch||0)*enemyScale(e.form,e.elite)*(e.roomScale||1),z:e.z},seen=!this.blocked(eye,this.head),distance=Math.hypot(this.head.x-e.x,this.head.z-e.z);
      e.awareness=seen?'engaged':e.alertedUntil>this.time?'search':'patrol';
      if(seen){e.lastKnownX=this.head.x;e.lastKnownZ=this.head.z;e.lastKnownHeight=this.player.elevation;e.alertedUntil=this.time+10;}
      let target=seen?this.head:e.alertedUntil>this.time?{x:e.lastKnownX,z:e.lastKnownZ}:null;
      const tacticContext={time:this.time,seen,threat:{x:e.lastKnownX,y:(e.lastKnownHeight||0)+1.25,z:e.lastKnownZ},obstacles:coverBoxes,allies:this.enemies,hazards:this.companionHazards,segmentBox};
      relayVisualContact(e,tacticContext);const order=grenadeAvoidance(e,tacticContext)||tacticalOrder(e,tacticContext)||squadOrder(e,tacticContext);e.combatPose=order?.state||'advance';
      e.coverCrouch=(e.coverCrouch||0)+(Number(!!order?.crouched)-(e.coverCrouch||0))*(1-Math.exp(-dt*12));
      if(order)target={...order.point,y:e.groundY};
      e.moving=false;
      if(target){
        const waypoint=this.room.waypoint?.(e,target)||target,dx=waypoint.x-e.x,dz=waypoint.z-e.z,n=Math.hypot(dx,dz)||1;
        if((order?Math.hypot(target.x-e.x,target.z-e.z)>order.stopDistance:distance>(e.ranged?(this.room.outdoor?7:2.0):.92))&&e.stunnedUntil<=this.time){const speed=e.speed*(e.limpUntil>this.time?.6:1)*(order?.speedScale??1),p={x:e.x+dx/n*speed*dt,y:e.groundY,z:e.z+dz/n*speed*dt};
          if(this.room.canStand(p,e.radius)&&!this.blocked(eye,{x:p.x,y:eye.y,z:p.z})){e.x=p.x;e.z=p.z;e.moving=true;}}
        e.yaw=Math.atan2((order?e.lastKnownX:target.x)-e.x,(order?e.lastKnownZ:target.z)-e.z)+Math.PI;
      }
      if(e.form==='probe')e.elevation=e.groundY+.85+Math.sin(this.time*1.4+e.phase)*.09;
      if(e.stunnedUntil>this.time){e.chargeProgress=0;e.lockedTarget=null;e.burstRemaining=0;continue;}
      e.attackTimer-=dt;
      if(!seen||order&&!order.canFire){e.chargeProgress=0;e.lockedTarget=null;e.burstRemaining=0;continue;}
      if(!e.ranged&&distance<1&&e.attackTimer<=0){this.damage(7+Math.floor(this.wave*.5));e.attackTimer=1.4;}
      if(e.ranged&&e.attackTimer<.65){e.lockedTarget||={...this.head};e.chargeProgress=clamp(1-e.attackTimer/.65,0,1);}
      if(e.ranged&&e.attackTimer<=0){
        const muzzle=e.form==='probe'?{...eye}:rangedMuzzle(e),target=e.lockedTarget||this.head;
        if(!this.blocked(muzzle,target)&&clearSquadFiringLane(e,muzzle,target,this.enemies)){
          const speed=Math.min(14,8+this.wave*.25),dx=target.x-muzzle.x,dy=target.y-.15-muzzle.y,dz=target.z-muzzle.z,n=Math.hypot(dx,dy,dz)||1;
          this.bullets.push({id:this.nextId++,...muzzle,vx:dx/n*speed,vy:dy/n*speed,vz:dz/n*speed,life:2.5,damage:6+Math.floor(this.wave*.55),hostile:true,weapon:'enemy',splash:0});
          e.lastShotAt=this.time;if(e.tactics)e.tactics.shots++;e.aimPitch=Math.atan2(dy,Math.hypot(dx,dz));this.event('enemy-shot',{...muzzle,form:e.form});
          const volley=enemyVolley(this.wave,e.form);e.burstRemaining=e.burstRemaining>0?e.burstRemaining-1:volley.count-1;
          e.attackTimer=e.burstRemaining>0?.18:Math.max(1.35,3.1-this.wave*.06);
        }else e.attackTimer=.5;
        e.chargeProgress=0;e.lockedTarget=null;
      }
    }
  }
  moveBullets(dt){
    const playerBody={x:this.head.x,y:this.head.y-.22,z:this.head.z};
    for(let i=this.bullets.length-1;i>=0;i--){
      const b=this.bullets[i],a={x:b.x,y:b.y,z:b.z},end={x:b.x+b.vx*dt,y:b.y+b.vy*dt,z:b.z+b.vz*dt},wall=this.room.trace(a,end);
      const playerHit=b.hostile?segmentSphere(a,end,playerBody,.32):null;
      if(b.hostile&&this.companionWard?.until>this.time&&this.companionWard.remaining>0){
        const shieldHit=segmentSphere(a,end,playerBody,1.7);
        if(shieldHit!==null&&(!wall||shieldHit<wall.t)){
          this.companionWard.remaining--;this.bullets.splice(i,1);this.event('companion-assist',{name:'Gaby',kind:'ward'});continue;
        }
      }
      if(b.hostile&&this.bladePrevious?.extension>.95){const contact=bladeBulletContact(a,end,this.bladePrevious.base,this.bladePrevious.tip,this.bladeGuard?.10:.075);
        if(contact&&(!wall||contact.t<wall.t)&&(playerHit===null||contact.t<playerHit)&&!this.blocked(this.head,contact.point)){
          const v=reflectedVelocity({x:b.vx,y:b.vy,z:b.vz},this.bladePrevious,contact),n=Math.hypot(v.x,v.y,v.z)||1;
          Object.assign(b,{x:contact.point.x+v.x/n*.04,y:contact.point.y+v.y/n*.04,z:contact.point.z+v.z/n*.04,vx:v.x,vy:v.y,vz:v.z,hostile:false,reflected:true,weapon:'aurora',power:1,life:Math.max(b.life,1)});
          this.event('blade-parry',{...contact.point,normal:v.normal});continue;
        }
      }
      let nearest=wall?.t??1.01,target=null,zone='torso',multiplier=1;
      if(b.hostile&&playerHit!==null&&playerHit<nearest){nearest=playerHit;target=this.player;}
      if(!b.hostile)for(const e of this.enemies){const hit=traceEnemyHit(a,end,e);if(hit&&hit.t<nearest){nearest=hit.t;target=e;zone=hit.zone;multiplier=hit.multiplier;}}
      if(nearest<=1){const at=mix(a,end,nearest);this.event('impact',{...at,bulletId:b.id,weapon:b.weapon,hostile:b.hostile,enemy:!!target,splash:b.splash||0,power:b.power||1,surface:target?'robot':wall?.surface||'concrete',normal:wall?.normal||{x:0,y:1,z:0}});
        if(target===this.player)this.damage(b.damage);else if(target)this.damageEnemy(target,projectileDamage(b,at),at,zone,multiplier);
        if(!b.hostile&&b.splash>0)for(const e of [...this.enemies])if(e!==target){const c={x:e.x,y:e.elevation+e.aimHeight,z:e.z},d=Math.hypot(c.x-at.x,c.y-at.y,c.z-at.z);if(d<b.splash&&!this.blocked(a,c))this.damageEnemy(e,b.damage*(1-d/b.splash*.65),c);}
        this.bullets.splice(i,1);
      }else{Object.assign(b,end);b.life-=dt;if(b.life<=0)this.bullets.splice(i,1);}
    }
  }
  snapshot(){return {...super.snapshot(),roomPhase:this.roomPhase,maxActive:this.maxActive,pendingOffers:[...this.pendingOffers],physicalHead:{...this.head}};}
}
