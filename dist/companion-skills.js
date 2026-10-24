import {segmentBox,traceEnemyHit} from './game-logic.js';

export const COMPANION_INTRO_MISSION=7;
export const PHASE_RECHARGE=30;
const finite=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const center=e=>({x:e.x,y:(e.elevation||0)+(e.aimHeight||1.25),z:e.z});
export const companionIdentity=id=>id==='lylu'?{name:'Cara',hero:'LYLU',color:0x57baff}:{name:'Gaby',hero:'GHJU',color:0xff65b1};
export const companionUnlocked=({mission=1,mode='campaign'}={})=>mode==='lab'||mode==='campaign'&&mission>=COMPANION_INTRO_MISSION;

// Aim is sampled once. Energy spheres have physical flight and never home in on
// a moving/hidden enemy. Both the target and the blast respect real colliders.
export function companionTarget(game,origin,direction,range=36){
 if(!finite(origin)||!finite(direction))return null;
 const n=Math.hypot(direction.x,direction.y,direction.z);if(n<1e-8)return null;
 const end={x:origin.x+direction.x/n*range,y:origin.y+direction.y/n*range,z:origin.z+direction.z/n*range};
 let nearest=1,enemy=null;
 for(const e of game.enemies){const hit=traceEnemyHit(origin,end,e);if(hit&&hit.t<nearest){nearest=hit.t;enemy=e;}}
 for(const b of game.obstacles){const t=segmentBox(origin,end,b);if(t!==null&&t<=nearest){nearest=t;enemy=null;}}
 if(end.y<.08&&origin.y>.08){const t=(origin.y-.08)/(origin.y-end.y);if(t<nearest){nearest=t;enemy=null;}}
 return {point:{x:origin.x+(end.x-origin.x)*nearest,y:origin.y+(end.y-origin.y)*nearest,z:origin.z+(end.z-origin.z)*nearest},enemy};
}

export function createCompanionSkills({characterId='ghju',mission=1,mode='campaign'}={}){
 const identity=companionIdentity(characterId),defensive=characterId!=='lylu';
 const unlocked=companionUnlocked({mission,mode});
 const definitions=defensive?[
  {id:'phase',label:'Impulsion de secours',detail:'Boule rose : détonation de zone et neutralisation brève des machines.',cooldown:30,cost:40},
  {id:'ward',label:'Bouclier local',detail:'Intercepte jusqu’à trois projectiles proches pendant trois secondes.',cooldown:12,cost:30},
  {id:'mend',label:'Réparation de terrain',detail:'Rend 20 points de santé. Ne ressuscite jamais.',cooldown:18,cost:45}
 ]:[
  {id:'phase',label:'Surcharge de phase',detail:'Boule bleue : explosion offensive sur l’ennemi ou la zone visée.',cooldown:30,cost:40},
  {id:'mark',label:'Marquage de faiblesse',detail:'La cible visible subit 20 % de dégâts supplémentaires pendant huit secondes.',cooldown:12,cost:25},
  {id:'amplify',label:'Amplification',detail:'Augmente de 15 % les dégâts des armes pendant cinq secondes.',cooldown:18,cost:40}
 ];
 const used=new Map(),projectiles=[],bursts=[],events=[],ward={until:0,remaining:0,position:{x:0,y:0,z:0}};
 let energy=100,serial=0,gameRef=null;
 const clear=(game,a,b)=>!game.obstacles.some(box=>segmentBox(a,b,box)!==null);
 const remaining=(id,game)=>Math.max(0,(used.get(id)??-Infinity)+(definitions.find(s=>s.id===id)?.cooldown||0)-(game?.time||0));
 function use(id,{game,origin,direction,emitter}={}){
  const skill=definitions.find(s=>s.id===id);
  if(!game||!unlocked||!skill||game.state!=='playing'||game.player.hp<=0||remaining(id,game)>1e-7||energy<skill.cost)return false;
  gameRef=game;
  if(id==='phase'){
   const target=companionTarget(game,origin,direction);if(!target)return false;
   const from=finite(emitter)&&clear(game,origin,emitter)?{...emitter}:{...origin};
   const duration=Math.max(.35,Math.min(1.8,distance(from,target.point)/20)),gravity=4.2;
   projectiles.push({id:++serial,...from,vx:(target.point.x-from.x)/duration,
    vy:(target.point.y-from.y)/duration+gravity*duration/2,vz:(target.point.z-from.z)/duration,
    age:0,life:duration,gravity,radius:defensive?3.2:3.8,damage:defensive?48:120,color:identity.color});
   events.push({type:'companion-phase',name:identity.name,...from,color:identity.color});
  }else if(id==='ward'){ward.until=game.time+3;ward.remaining=3;Object.assign(ward.position,center(game.player));game.companionWard=ward;}
  else if(id==='mend'){
   if(game.player.hp>=100)return false;game.player.hp=Math.min(100,game.player.hp+20);
  }else if(id==='mark'){
   const target=companionTarget(game,origin,direction);if(!target?.enemy)return false;
   target.enemy.companionMarkUntil=game.time+8;
  }else if(id==='amplify')game.companionAmplifyUntil=game.time+5;
  used.set(id,game.time);energy-=skill.cost;
  game.event('companion-assist',{name:identity.name,kind:id});return true;
 }
 function explode(p,game,at){
  const blast={x:at.x,y:Math.max(.08,at.y),z:at.z};
  for(const e of [...game.enemies]){
   const body=center(e),d=distance(blast,body);
   if(d>p.radius||!clear(game,blast,body))continue;
   game.damageEnemy(e,p.damage*(1-.55*d/p.radius),body,'torso',1,{x:blast.x,z:blast.z,elevation:blast.y,companion:true});
   if(defensive&&game.enemies.includes(e))e.stunnedUntil=Math.max(e.stunnedUntil||0,game.time+1.4);
  }
  bursts.push({...blast,age:0,radius:p.radius,color:p.color});
  events.push({type:'companion-explosion',...blast,color:p.color,splash:p.radius,power:defensive?.65:1,name:identity.name});
 }
 function update(dt,{game}={}){
  if(!game)return;gameRef=game;
  if(!unlocked||game.state!=='playing'||game.player.hp<=0)return;
  game.companionHazards=projectiles;
  dt=Math.max(0,Math.min(.05,dt));energy=Math.min(100,energy+dt*4);
  Object.assign(ward.position,center(game.player));
  if(ward.until>game.time&&ward.remaining>0){
   const body=center(game.player);
   for(const b of game.bullets)if(b.hostile&&b.life>0&&distance(b,body)<1.7&&clear(game,b,body)){
    b.life=0;b.damage=0;b.hostile=false;ward.remaining--;if(!ward.remaining)break;
   }
  }
  for(let i=projectiles.length-1;i>=0;i--){
   const p=projectiles[i],step=Math.min(dt,Math.max(0,p.life-p.age)),start={x:p.x,y:p.y,z:p.z};
   const end={x:p.x+p.vx*step,y:p.y+p.vy*step-p.gravity*step*step/2,z:p.z+p.vz*step};
   let t=1,hit=false;
   for(const box of game.obstacles){const h=segmentBox(start,end,box);if(h!==null&&h<=t){t=h;hit=true;}}
   for(const e of game.enemies){const h=traceEnemyHit(start,end,e);if(h&&h.t<t){t=h.t;hit=true;}}
   if(end.y<.08&&start.y>=.08){const h=(start.y-.08)/(start.y-end.y);if(h<=t){t=h;hit=true;}}
   p.x=start.x+(end.x-start.x)*t;p.y=start.y+(end.y-start.y)*t;p.z=start.z+(end.z-start.z)*t;p.vy-=p.gravity*step;p.age+=step;
   if(hit||p.age>=p.life-1e-7){
    // Stay just outside the struck surface so the wall, rather than a tiny
    // numerical penetration into it, decides which side receives the blast.
    const len=distance(start,end)||1;
    explode(p,game,{x:p.x-(end.x-start.x)/len*.012,y:p.y-(end.y-start.y)/len*.012,z:p.z-(end.z-start.z)/len*.012});
    projectiles.splice(i,1);
   }
  }
  for(let i=bursts.length-1;i>=0;i--){bursts[i].age+=dt;if(bursts[i].age>.65)bursts.splice(i,1);}
 }
 return {...identity,definitions,projectiles,bursts,ward,unlocked,use,update,
  drainEvents(){return events.splice(0);},
  snapshot(game=gameRef){return {...identity,unlocked,mission,mode,energy:Math.floor(energy),ward:ward.until>(game?.time||0)&&ward.remaining>0,
   activeProjectiles:projectiles.length,skills:definitions.map(s=>({...s,remaining:remaining(s.id,game),enabled:unlocked&&energy>=s.cost&&remaining(s.id,game)<=1e-7}))};},
  reset(){used.clear();projectiles.length=bursts.length=events.length=0;energy=100;ward.until=ward.remaining=0;if(gameRef){gameRef.companionAmplifyUntil=0;if(gameRef.companionHazards===projectiles)delete gameRef.companionHazards;if(gameRef.companionWard===ward)delete gameRef.companionWard;}gameRef=null;}
 };
}
