import {WEAPONS,weaponAllowedForCharacter} from './game-logic.js';
import {configureUnit} from './ligne9-mission.js';
import * as L from './m10-layout.js';
const noop=()=>{};
export function createM10Mission({game,characterId='ghju',hooks={},storage=globalThis.localStorage}={}){
 const h={setObstacles:noop,setDoor:noop,setLine:noop,openPortal:noop,say:noop,stage:noop,cue:noop,notice:noop,finish:noop,clear:noop,...hooks};
 const done=new Set(),groups=new Map();let stage=0,completed=false,hold=null,serial=10000;
 const key='pink-wars-m10-checkpoint-v1-'+characterId;
 function save(){try{storage?.setItem(key,JSON.stringify({version:1,stage,done:[...done]}));}catch{}}
 function world(){const opened=[...done].flatMap(id=>L.OPEN_FOR[id]||[]),cols=L.buildCollisions({open:opened});game.replaceObstacles(cols);h.setObstacles(cols);for(const id of ['security',...L.DOORS.map(d=>d.id)])h.setDoor(id,opened.includes(id));h.setLine(!done.has('confinement'));}
 function place(p){Object.assign(game.player,{x:p.x,z:p.z,elevation:game.surfaceHeight(p.x,p.z),grounded:true,verticalSpeed:0,yaw:p.yaw||0});}
 function fresh(cp){
  game.reset(characterId);game.configureWeaponAccess({mode:'campaign',level:10});game.enableArmorShield();game.enableProjectedShields();
  game.ownedWeapons=new Set([game.weaponIndex,0,1,2,3,4,9,10].filter(i=>weaponAllowedForCharacter(i,characterId)));game.ammo=WEAPONS.map(w=>w.capacity);
  game.spawned=0;game.nextWave=Infinity;game.toSpawn=0;game.spawnTimer=Infinity;groups.clear();hold=null;h.clear();world();place(cp);
  for(const p of L.SUPPLIES){const y=L.createTraversal().height(p.x,p.z);if(y>=0)game.pickups.push({...p,y,id:game.nextId++,until:Infinity});}
 }
 const alive=id=>(groups.get(id)||[]).filter(id=>game.enemies.some(e=>e.id===id&&e.hp>0)).length;
 function deploy(id){
  if(groups.has(id))return;const ids=[];game.wave=10;if(!Number.isFinite(game.spawned))game.spawned=0;
  for(const u of L.ENCOUNTERS[id]||[]){
   game.toSpawn=1;game.activePortals=[{id:serial++,x:u.x,z:u.z,yaw:0,openedAt:game.time}];game.spawnEnemy();const e=game.enemies.at(-1);if(!e)continue;
   configureUnit(e,u,10);const floor=game.surfaceHeight(u.x,u.z);e.elevation=floor+(u.form==='probe'?3.2:0);e.homeHeight=floor;e.lastKnownHeight=game.player.elevation;e.awareness='search';e.alertedUntil=game.time+10;e.m10Group=id;ids.push(e.id);
  }
  game.toSpawn=0;groups.set(id,ids);
 }
 function setStage(i){stage=i;const s=L.STAGES[i];game.checkpointPosition={...s.checkpoint,id:s.id,label:s.label};h.stage(i,s);if(i<L.INTERACTIONS.length){deploy(s.id);}save();}
 function advance(){const id=L.STAGES[stage].id;done.add(id);if(!L.HOLDS[id])h.say(id);if(id==='archives')h.say('capture');if(L.OPEN_FOR[id])h.cue('door');world();if(stage===L.INTERACTIONS.length-1){completed=true;setStage(L.INTERACTIONS.length);try{storage?.removeItem(key);}catch{}h.say('fin');h.finish();}else setStage(stage+1);}
 const api={
  get stage(){return stage;},get stageId(){return L.STAGES[stage].id;},get completed(){return completed;},get done(){return[...done];},get reads(){return[];},get opened(){return [...done].flatMap(id=>L.OPEN_FOR[id]||[]);},get pending(){return[];},get n08(){return null;},
  get hold(){return hold&&{name:hold.id,remaining:Math.max(0,hold.until-game.time),total:L.HOLDS[hold.id]};},
  groups:()=>Object.fromEntries([...groups].map(([id,units])=>[id,{deployed:units.length,alive:alive(id)}])),alive,
  start({resume=false}={}){
   done.clear();stage=0;completed=false;
   if(resume)try{const p=JSON.parse(storage?.getItem(key)||'null');if(p?.version===1&&Number.isInteger(p.stage)&&p.stage>0&&p.stage<L.INTERACTIONS.length&&p.done?.length===p.stage&&p.done.every((id,i)=>id===L.INTERACTIONS[i].id)){stage=p.stage;for(const id of p.done)done.add(id);}}catch{}
   fresh(L.STAGES[stage].checkpoint);setStage(stage);h.say('intro');
  },
  restoreCheckpoint(){completed=false;fresh(L.STAGES[Math.min(stage,L.INTERACTIONS.length-1)].checkpoint);setStage(Math.min(stage,L.INTERACTIONS.length-1));h.notice('POINT DE CONTRÔLE · '+L.STAGES[stage].label);},
  available(id){return !completed&&!hold&&id===L.STAGES[stage].id&&!done.has(id)&&(id==='access'||id==='kessler'||alive(id)===0);},
  nearInteraction(){const p=game.player;return L.INTERACTIONS.find(i=>api.available(i.id)&&Math.abs(p.elevation-i.y)<1.2&&Math.hypot(p.x-i.x,p.z-i.z)<i.radius)||null;},
  interact(){if(game.state!=='playing')return null;const it=api.nearInteraction();if(!it)return null;if(L.HOLDS[it.id]){hold={id:it.id,until:game.time+L.HOLDS[it.id]};h.say(it.id);h.cue('hold');}else advance();return it;},
  update(){
   if(completed||game.state!=='playing')return;
   if(hold){const it=L.INTERACTIONS.find(i=>i.id===hold.id);if(Math.hypot(game.player.x-it.x,game.player.z-it.z)>it.radius+1||Math.abs(game.player.elevation-it.y)>1.2){hold=null;h.notice('REVIENS AU TERMINAL POUR TERMINER LA LIAISON');}else if(game.time>=hold.until){hold=null;advance();}}
   if(game.player.elevation<-48){game.damagePlayer(18,null,{kind:'fall'});place(L.STAGES[stage].checkpoint);h.notice('QUAI · RETOUR AU POINT DE CONTRÔLE');}
   // A machine falling into the ravine cannot make the current objective impossible.
   for(const e of [...game.enemies])if(e.m10Group&&e.elevation<-40)game.enemies=game.enemies.filter(v=>v.id!==e.id);
  }
 };return api;
}
