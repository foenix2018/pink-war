import {WEAPONS,weaponAllowedForCharacter} from './game-logic.js';
import {configureUnit} from './ligne9-mission.js';
import * as L from './m18-layout.js';
const noop=()=>{};
export function createM18Mission({game,characterId='ghju',hooks={},storage=globalThis.localStorage,campaign=false}={}){
 const h={setObstacles:noop,setDoor:noop,setLine:noop,openPortal:noop,say:noop,stage:noop,cue:noop,notice:noop,finish:noop,clear:noop,resonance:noop,...hooks};
 const done=new Set(),reads=new Set(),groups=new Map();let stage=0,completed=false,hold=null,serial=18000,resonance=false;
 const key=(campaign?'pink-wars-m18-checkpoint-v1-':'pink-wars-preview-m18-checkpoint-v1-')+characterId;
 const save=()=>{try{storage?.setItem(key,JSON.stringify({version:1,stage,done:[...done],reads:[...reads]}));}catch{}};
 function world(){const cols=L.buildCollisions();game.replaceObstacles(cols);h.setObstacles(cols);h.setLine(!done.has('truth'));}
 function place(p){Object.assign(game.player,{x:p.x,z:p.z,elevation:game.surfaceHeight(p.x,p.z,game.time,p.y+.3),grounded:true,verticalSpeed:0,yaw:p.yaw||0});}
 function setResonance(on){if(resonance===on)return;resonance=on;h.resonance(on);if(!on){if(game.companionWard?.resonance)game.companionWard=null;game.companionAmplifyUntil=Math.min(game.companionAmplifyUntil||0,game.time);}}
 function fresh(cp){game.reset(characterId);game.configureWeaponAccess({mode:'campaign',level:18});game.enableArmorShield();game.enableProjectedShields();game.ownedWeapons=new Set([game.weaponIndex,0,1,2,3,4,9,10].filter(i=>weaponAllowedForCharacter(i,characterId)));game.ammo=WEAPONS.map(w=>w.capacity);game.spawned=0;game.nextWave=Infinity;game.toSpawn=0;game.spawnTimer=Infinity;groups.clear();hold=null;setResonance(false);h.clear();world();place(cp);for(const p of L.SUPPLIES){const y=L.createTraversal().height(p.x,p.z,0,p.y+.3);if(y>=0)game.pickups.push({...p,y,id:game.nextId++,until:Infinity});}}
 const alive=id=>(groups.get(id)||[]).filter(i=>game.enemies.some(e=>e.id===i&&e.hp>0)).length;
 function deploy(id,units=L.ENCOUNTERS[id]||[],extra=false){if(groups.has(id)&&!extra)return;const ids=extra?[...(groups.get(id)||[])]:[];game.wave=18;if(!Number.isFinite(game.spawned))game.spawned=0;
  for(const u of units){game.toSpawn=1;game.activePortals=[{id:serial++,x:u.x,z:u.z,yaw:0,openedAt:game.time}];const old=game.enemies.length;game.spawnEnemy();const e=game.enemies.at(-1);if(!e||game.enemies.length===old)continue;configureUnit(e,u,18);const floor=game.surfaceHeight(u.x,u.z,game.time,u.y+.3);e.x=u.x;e.z=u.z;e.elevation=floor+(u.form==='probe'?3.2:0);e.homeHeight=floor;e.lastKnownHeight=game.player.elevation;e.awareness='search';e.alertedUntil=game.time+10;e.m18Group=id;ids.push(e.id);}
  game.toSpawn=0;groups.set(id,ids);
 }
 function setStage(i){stage=i;const s=L.STAGES[i];game.checkpointPosition={...s.checkpoint,id:s.id,label:s.label};h.stage(i,s);if(i<L.INTERACTIONS.length)deploy(s.id);setResonance(false);save();}
 function advance(){const id=L.STAGES[stage].id;done.add(id);if(!L.HOLDS[id])h.say(id);world();if(stage===L.INTERACTIONS.length-1){completed=true;setStage(L.INTERACTIONS.length);try{storage?.removeItem(key);}catch{}h.say('fin');h.finish();}else setStage(stage+1);}
 function begin(it){if(L.HOLDS[it.id]){hold={id:it.id,until:game.time+L.HOLDS[it.id],reinforced:false};h.say(it.id);h.cue('hold');if(it.id==='truth')setResonance(true);}else advance();}
 const api={get stage(){return stage;},get stageId(){return L.STAGES[stage].id;},get completed(){return completed;},get done(){return[...done];},get reads(){return[...reads];},get opened(){return[];},get pending(){return[];},get n08(){return null;},get resonance(){return resonance;},get hold(){return hold&&{name:hold.id,remaining:Math.max(0,hold.until-game.time),total:L.HOLDS[hold.id]};},groups:()=>Object.fromEntries([...groups].map(([id,units])=>[id,{deployed:units.length,alive:alive(id)}])),alive,
 start({resume=false}={}){done.clear();reads.clear();stage=0;completed=false;if(resume)try{const p=JSON.parse(storage?.getItem(key)||'null');if(p?.version===1&&Number.isInteger(p.stage)&&p.stage>=0&&p.stage<L.INTERACTIONS.length&&p.done?.length===p.stage&&p.done.every((id,i)=>id===L.INTERACTIONS[i].id)){stage=p.stage;for(const id of p.done)done.add(id);for(const id of p.reads||[])if(L.EXPLORATION_LOGS.some(i=>i.log===id))reads.add(id);}}catch{}fresh(L.STAGES[stage].checkpoint);setStage(stage);h.say('intro');},
 restoreCheckpoint(){completed=false;fresh(L.STAGES[Math.min(stage,L.INTERACTIONS.length-1)].checkpoint);setStage(Math.min(stage,L.INTERACTIONS.length-1));h.notice('POINT DE CONTRÔLE · '+L.STAGES[stage].label);},
 available(id){return !completed&&!hold&&id===L.STAGES[stage].id&&!done.has(id)&&alive(id)===0;},
 nearInteraction(){const p=game.player;return L.INTERACTIONS.find(i=>api.available(i.id)&&Math.abs(p.elevation-i.y)<1.2&&Math.hypot(p.x-i.x,p.z-i.z)<i.radius)||(!hold&&!completed?L.EXPLORATION_LOGS.find(i=>!reads.has(i.log)&&Math.abs(p.elevation-L.groundSample(i.x,i.z))<1.5&&Math.hypot(p.x-i.x,p.z-i.z)<i.radius):null)||null;},
 interact(){if(game.state!=='playing')return null;const it=api.nearInteraction();if(!it)return null;if(it.log){reads.add(it.log);save();h.notice('ARCHIVE SECONDAIRE RÉCUPÉRÉE');return it;}begin(it);return it;},
 update(){if(completed||game.state!=='playing')return;
  // Canonical spontaneous synchronisation at the dome; no button is required.
  if(!hold&&api.stageId==='truth'){const it=api.nearInteraction();if(it?.id==='truth')begin(it);}
  if(resonance){game.companionAmplifyUntil=Math.max(game.companionAmplifyUntil||0,game.time+.35);if(!game.companionWard||game.companionWard.remaining<=0||game.companionWard.until<game.time+.12){game.companionWard={until:game.time+1.0,remaining:8,resonance:true};}}
  if(hold){const it=L.INTERACTIONS.find(i=>i.id===hold.id),battle=!!L.REINFORCEMENTS[hold.id];
   if(battle&&!hold.reinforced&&game.time>=hold.until-L.HOLDS[hold.id]*.60){hold.reinforced=true;deploy(hold.id,L.REINFORCEMENTS[hold.id],true);h.notice('RENFORTS ORDRE EN APPROCHE');}
   const dist=Math.hypot(game.player.x-it.x,game.player.z-it.z);if(dist>(battle?13:it.radius+2.5)||Math.abs(game.player.elevation-it.y)>1.6){if(battle&&hold.reinforced){hold.until=Math.max(hold.until,game.time+1);}else hold=null;if(it.id==='truth')setResonance(false);h.notice('REVIENS DANS LA ZONE DE MISSION');}
   else if(game.time>=hold.until&&alive(hold.id)===0&&(!battle||hold.reinforced)){hold=null;advance();}
  }
  if(game.player.elevation<-48){game.damage(18,null,{kind:'fall'});place(L.STAGES[stage].checkpoint);h.notice('RETOUR AU POINT DE CONTRÔLE');}
  for(const e of [...game.enemies])if(e.m18Group&&e.elevation<-40)game.enemies=game.enemies.filter(v=>v.id!==e.id);
 }
 };return api;
}
