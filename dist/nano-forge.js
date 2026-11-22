// Campaign nanofabrication. No renderer, DOM or circular combat imports.
export const NANO_STORAGE_PREFIX='pink-wars-nanoforge-v1-';
export const NANO_BLUEPRINTS=Object.freeze([
 {id:'matrice',level:1,name:'Matrice de manipulation nanométrique',source:'Archives du laboratoire',story:'Les nanites d’ORDRE peuvent réassembler notre matériel. Récupère-les sur les machines détruites.'},
 {id:'nexus',level:1,name:'Plan NEXUS V9',source:'Atelier de maintenance',weapon:1,cost:90},
 {id:'capaciteur',level:2,name:'Condensateur de bouclier',source:'Dispensaire · maintenance',story:'Une matrice médicale pour densifier le bouclier sans alourdir l’armure.'},
 {id:'ares',level:2,name:'Plan ARES X9',source:'Poste de surveillance',weapon:2,cost:180},
 {id:'stabilisateur',level:3,name:'Stabilisateur adaptatif',source:'Atelier du convoi',story:'Reconfigure l’arme entre impact et précision, sans changer de modèle.'},
 {id:'treuil',level:3,name:'Microtreuil renforcé',source:'Atelier logistique',story:'Un moteur plus nerveux pour le grappin. L’ancrage reste limité à 20 mètres.'},
 {id:'aurora',level:3,name:'Plan AURORA',source:'Archives du convoi',weapon:5,cost:200},
 {id:'recycleur',level:4,name:'Recycleur de champ',source:'Station JANUS · serveur',story:'Récupère une partie du flux dissipé pour recharger plus vite le bouclier.'},
 {id:'thorn',level:4,name:'Plan THORN',source:'Hangar de drones JANUS',weapon:3,cost:280},
 {id:'nova',level:5,name:'Plan NOVA',source:'Ligne 9 · relais des Halles',weapon:4,cost:360},
 {id:'blindage',level:6,name:'Tissage d’armure nanocomposite',source:'Fonderie · commande de coulée',story:'Les nanites renforcent les joints de l’armure pour réduire les dégâts à la santé.'},
 {id:'spectral',level:7,name:'Filtre de récupération spectral',source:'Forêt · relais oublié',story:'Un protocole de séparation qui extrait davantage de nanites des carcasses.'},
 {id:'iem',level:10,name:'Plan VOLTIS IEM',source:'Archives électromagnétiques',weapon:9,cost:420}
].map(b=>Object.freeze(b)));
export const NANO_RECIPES=Object.freeze([
 {id:'impact',blueprint:'matrice',name:'Densification de l’arme',detail:'+10 % de dégâts par rang, sur l’arme choisie.',weapon:true,max:3,cost:60},
 {id:'reload',blueprint:'matrice',name:'Recharge accélérée',detail:'−8 % de durée de recharge par rang.',weapon:true,max:3,cost:50},
 {id:'precision',blueprint:'stabilisateur',name:'Configuration de précision',detail:'Déverrouille une configuration : dispersion −40 %, dégâts −5 %. Retour libre à la configuration d’impact.',weapon:true,max:1,cost:80},
 {id:'shield',blueprint:'capaciteur',name:'Capacité du bouclier',detail:'+10 points de bouclier par rang.',max:3,cost:100},
 {id:'regen',blueprint:'recycleur',name:'Récupération du bouclier',detail:'+15 % de vitesse de recharge par rang.',max:3,cost:120},
 {id:'grapple',blueprint:'treuil',name:'Moteur du grappin',detail:'+10 % de vitesse de traction par rang. Portée : 20 m.',max:2,cost:100},
 {id:'armor',blueprint:'blindage',name:'Tissage nanocomposite',detail:'−5 % de dégâts reçus à la santé par rang.',max:3,cost:150},
 {id:'salvage',blueprint:'spectral',name:'Extraction des nanites',detail:'+15 % de nanoparticules récupérées par rang.',max:2,cost:140}
].map(r=>Object.freeze(r)));
const SITE={
 1:[{x:-4,z:59},{x:0,z:47}],2:[{x:20,z:84},{x:34,z:84}],
 3:[{x:8,z:26},{x:10,z:26},{x:-8,z:14}],4:[{x:0,z:30},{x:-18,z:28}],
 5:[{x:0,z:-46}],6:[{x:0,z:44}],7:[{x:6,z:82}],8:[{x:0,z:64}],9:[{x:-94,y:14,z:62}],10:[{x:21,y:12,z:-67}]
};
const integer=(v,max=1e8)=>Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0;
export const nanoCompanion=hero=>hero==='lylu'?'Cara · CAR-14':'Gaby · GAB-1';
export function freshNanoProfile(){return{version:1,revision:0,balance:0,discovered:[],crafted:[],upgrades:{},configurations:{},totalCollected:0};}
export function normaliseNanoProfile(value){
 const p=freshNanoProfile();if(!value||value.version!==1)return p;
 p.balance=integer(value.balance);p.totalCollected=integer(value.totalCollected);p.revision=integer(value.revision);
 p.discovered=NANO_BLUEPRINTS.filter(b=>value.discovered?.includes(b.id)).map(b=>b.id);
 p.crafted=NANO_BLUEPRINTS.filter(b=>Number.isInteger(b.weapon)&&value.crafted?.includes(b.weapon)&&p.discovered.includes(b.id)).map(b=>b.weapon);
 for(const r of NANO_RECIPES)for(const index of r.weapon?Array.from({length:11},(_,i)=>i):[null]){const key=upgradeKey(r,index),rank=integer(value.upgrades?.[key],r.max);if(rank&&p.discovered.includes(r.blueprint))p.upgrades[key]=rank;}
 for(let i=0;i<11;i++)if(value.configurations?.[i]==='precision'&&p.upgrades['precision:'+i])p.configurations[i]='precision';
 return p;
}
function browserStorage(){try{return globalThis.localStorage||null;}catch{return null;}}
export function readNanoProfile(hero,storage=browserStorage()){
 try{return normaliseNanoProfile(JSON.parse(storage?.getItem(NANO_STORAGE_PREFIX+(hero==='lylu'?'lylu':'ghju'))||'null'));}catch{return freshNanoProfile();}
}
const upgradeKey=(r,index)=>r.id+(r.weapon?':'+index:'');
export function nanoYield(enemy,{wave=1,bonus=0}={}){
 const tier=Math.max(1,integer(enemy.tier||wave,20));
 const mass={scuttler:0,probe:1,hunter:2,synth:4,spectre:5,listener:4,brute:7,bulwark:9,sentinel:12}[enemy.form]??2;
 return Math.round((5+tier*2+mass+(enemy.elite?8:0))*(1+Math.max(0,Math.min(.3,bonus))));
}
export function configureNanoForge(game,{storage=browserStorage()}={}){
 const campaign=game.mode==='campaign',hero=game.characterId==='lylu'?'lylu':'ghju',previous=game.nano;
 if(previous?.hero===hero&&previous.campaign===campaign&&previous.level===game.missionLevel)return previous;
 const profile=campaign?readNanoProfile(hero,storage):freshNanoProfile();
 if(!campaign){profile.balance=1500;profile.discovered=NANO_BLUEPRINTS.map(b=>b.id);}
 const level=game.missionLevel||1;
 game.nano={hero,campaign,level,profile,storage:campaign?storage:null,drops:[],plans:[],placed:false,saveOK:true,serial:0,revisionApplied:-1,weaponCache:null};
 applyNanoLoadout(game);return game.nano;
}
function persist(game){
 const n=game.nano;if(!n)return false;n.profile.revision++;
 if(!n.campaign)return true;
 if(!n.storage){n.saveOK=false;return false;}
 try{n.storage.setItem(NANO_STORAGE_PREFIX+n.hero,JSON.stringify(n.profile));n.saveOK=true;return true;}catch{n.saveOK=false;return false;}
}
export function discoverNanoBlueprint(game,id){
 const n=game.nano,b=NANO_BLUEPRINTS.find(b=>b.id===id);if(!n||!b||n.profile.discovered.includes(id)||n.campaign&&b.level>n.level)return false;
 n.profile.discovered.push(id);persist(game);game.event('nano-plan',{id,name:b.name,story:b.story||'Schéma de fabrication enregistré.',companion:nanoCompanion(n.hero)});return true;
}
export function nanoRecipes(game){
 const n=game.nano;if(!n)return[];const p=n.profile,w=game.weaponIndex,alive=game.state==='playing'&&game.player.hp>0;
 const weapons=NANO_BLUEPRINTS.filter(b=>Number.isInteger(b.weapon)).map(b=>{
  const owned=game.ownedWeapons.has(b.weapon),known=p.discovered.includes(b.id),allowed=game.isWeaponAvailable(b.weapon);
  return{id:'create:'+b.id,name:'Fabriquer '+(game.nanoWeapons?.[b.weapon]?.name||b.name.replace('Plan ','')),detail:'Assemblage par '+nanoCompanion(n.hero)+'. Arme ajoutée à l’inventaire.',blueprint:b.id,known,level:b.level,cost:b.cost,rank:owned?1:0,max:1,reason:!known?'Plan à découvrir · niveau '+b.level:!allowed?'Disponible au niveau '+b.level:owned?'Déjà dans l’inventaire':p.balance<b.cost?'Nanoparticules insuffisantes':'',enabled:alive&&known&&allowed&&!owned&&p.balance>=b.cost};
 });
 return[...NANO_RECIPES.filter(r=>!(r.weapon&&game.nanoWeapons?.[w]?.melee&&r.id==='reload')).map(r=>{
  const rank=p.upgrades[upgradeKey(r,w)]||0,known=p.discovered.includes(r.blueprint),cost=r.cost*(rank+1),blueprint=NANO_BLUEPRINTS.find(b=>b.id===r.blueprint),max=rank>=r.max;
  return{...r,rank,cost,known,level:blueprint.level,reason:!known?'Plan à découvrir · niveau '+blueprint.level:max?'Amélioration maximale':p.balance<cost?'Nanoparticules insuffisantes':'',enabled:alive&&known&&!max&&p.balance>=cost};
 }),...weapons];
}
export function fabricateNano(game,id){
 const n=game.nano,recipe=nanoRecipes(game).find(r=>r.id===id);if(!n||!recipe?.enabled)return false;
 // Persist the whole purchase before applying it. A failed write never spends resources.
 const before=structuredClone(n.profile);
 n.profile.balance-=recipe.cost;
 if(id.startsWith('create:')){const b=NANO_BLUEPRINTS.find(b=>b.id===recipe.blueprint);n.profile.crafted.push(b.weapon);}
 else{const r=NANO_RECIPES.find(r=>r.id===id);n.profile.upgrades[upgradeKey(r,game.weaponIndex)]=(n.profile.upgrades[upgradeKey(r,game.weaponIndex)]||0)+1;}
 if(!persist(game)){n.profile=before;game.event('nano-error',{message:'Sauvegarde indisponible : fabrication annulée, nanoparticules conservées.'});return false;}
 applyNanoLoadout(game);game.nanoCraftAt=game.time;game.event('nano-crafted',{name:recipe.name,cost:recipe.cost,companion:nanoCompanion(n.hero),weaponIndex:game.weaponIndex});return true;
}
export function setNanoConfiguration(game,mode){
 const n=game.nano,index=game.weaponIndex;if(!n||game.state!=='playing'||game.player.hp<=0||!['impact','precision'].includes(mode)||mode==='precision'&&!n.profile.upgrades['precision:'+index]||(n.profile.configurations[index]||'impact')===mode)return false;
 const before=structuredClone(n.profile);n.profile.configurations[index]=mode;
 if(!persist(game)){n.profile=before;return false;}
 n.weaponCache=null;game.nanoCraftAt=game.time;game.event('nano-crafted',{name:'Configuration '+(mode==='precision'?'précision':'impact'),companion:nanoCompanion(n.hero)});return true;
}
export function applyNanoLoadout(game){
 const n=game.nano;if(!n)return;
 for(const i of n.profile.crafted)if(game.isWeaponAvailable(i)&&game.nanoWeaponAllowed?.(i)!==false)game.ownedWeapons.add(i);
 if(n.revisionApplied===n.profile.revision)return;n.revisionApplied=n.profile.revision;n.weaponCache=null;
 const u=n.profile.upgrades;
 game.nanoStats={shieldBonus:10*(u.shield||0),shieldRate:1+.15*(u.regen||0),grappleSpeed:1+.1*(u.grapple||0),armor:1-.05*(u.armor||0),salvage:.15*(u.salvage||0)};
 if(game.shieldCapacity>0)game.shieldCapacity=(game.baseShieldCapacity||60)+game.nanoStats.shieldBonus;
}
export function nanoWeapon(game,base){
 const n=game.nano;if(!n)return base;const key=game.weaponIndex+':'+n.profile.revision;if(n.weaponCache?.key===key)return n.weaponCache.value;
 const u=n.profile.upgrades,i=game.weaponIndex,precision=n.profile.configurations[i]==='precision';
 if(!u['impact:'+i]&&!u['reload:'+i]&&!precision)return base;
 const value={...base,damage:base.damage*(1+.1*(u['impact:'+i]||0))*(precision?.95:1),reload:base.reload*(1-.08*(u['reload:'+i]||0)),spread:base.spread*(precision?.6:1)};
 n.weaponCache={key,value};return value;
}
export function dropNanoSalvage(game,enemy){
 const n=game.nano;if(!n||game.mode==='training')return;
 const value=nanoYield(enemy,{wave:game.wave,bonus:game.nanoStats?.salvage});
 if(n.drops.length>=64)n.drops.shift();
 const d={id:++n.serial,x:enemy.x,y:enemy.elevation||0,z:enemy.z,value,form:enemy.form,until:game.time+180};
 n.drops.push(d);game.event('nano-drop',{...d});
}
export function placeNanoPlan(game,point){
 // Try a small ring around the authored spot; reject walls and overhanging ceilings.
 const y0=point.y??game.surfaceHeight(point.x,point.z,game.time,.4);
 for(let ring=0;ring<4;ring++)for(let i=0;i<(ring?16:1);i++){
  const x=point.x+Math.sin(i/16*Math.PI*2)*ring*.75,z=point.z+Math.cos(i/16*Math.PI*2)*ring*.75;
  const y=game.surfaceHeight(x,z,game.time,y0+.3);if(!Number.isFinite(y)||Math.abs(y-y0)>.35)continue;
  if(game.obstacles.some(b=>!b.noCollision&&!b.trigger&&Math.abs(x-b.x)<b.hx+.45&&Math.abs(z-b.z)<b.hz+.45&&y+.03<(b.y||0)+b.height&&y+1.6>(b.y||0)))continue;
  return{x,y,z};
 }
 return null;
}
function preparePlans(game){
 const n=game.nano;if(n.placed||!n.campaign)return;n.placed=true;
 const sites=SITE[n.level]||[{x:game.player.x,z:game.player.z-5}];
 const current=NANO_BLUEPRINTS.filter(b=>b.level===n.level&&!n.profile.discovered.includes(b.id));
 const older=NANO_BLUEPRINTS.filter(b=>b.level<n.level&&!n.profile.discovered.includes(b.id));
 const groups=current.map(b=>[b]);
 // Returning saves can recover missed schematics through one archive, never free unlocks.
 if(older.length)groups.unshift(older);
 for(let i=0;i<groups.length;i++){
   const atIndex=i-(older.length?1:0),site=sites[Math.max(0,atIndex)%sites.length],candidate={...site,x:site.x+(atIndex<0?2.7:Math.floor(atIndex/sites.length)*1.35)};
  const at=placeNanoPlan(game,candidate);if(at)n.plans.push({id:groups[i].map(b=>b.id).join('+'),blueprints:groups[i].map(b=>b.id),name:groups[i].length>1?'Archive de plans récupérables':groups[i][0].name,...at});
 }
}
export function updateNanoForge(game,trace){
 const n=game.nano;if(!n)return;applyNanoLoadout(game);preparePlans(game);
 const p=game.player,eye={x:p.x,y:(p.elevation||0)+1.3,z:p.z};
 const reachable=(d,r)=>Math.hypot(p.x-d.x,p.z-d.z)<=r&&Math.abs((p.elevation||0)-d.y)<1.1&&!game.obstacles.some(b=>!b.noCollision&&!b.trigger&&trace(eye,{x:d.x,y:d.y+.4,z:d.z},b)!==null);
 let recovered=0,lastDrop=null;
 for(let i=n.drops.length-1;i>=0;i--){const d=n.drops[i];if(game.time>d.until){n.drops.splice(i,1);continue;}if(!reachable(d,1.6))continue;recovered+=d.value;lastDrop=d;n.drops.splice(i,1);}
 if(recovered){n.profile.balance+=recovered;n.profile.totalCollected+=recovered;persist(game);game.event('nano-collected',{value:recovered,balance:n.profile.balance,x:lastDrop.x,y:lastDrop.y+.5,z:lastDrop.z});}
 for(let i=n.plans.length-1;i>=0;i--){const d=n.plans[i];d.blueprints=d.blueprints.filter(id=>!n.profile.discovered.includes(id));if(!d.blueprints.length){n.plans.splice(i,1);continue;}if(!reachable(d,1.8))continue;
  for(const id of d.blueprints)discoverNanoBlueprint(game,id);n.plans.splice(i,1);
 }
}
export function nanoSnapshot(game){
 const n=game?.nano;return n?{hero:n.hero,companion:nanoCompanion(n.hero),campaign:n.campaign,saveOK:n.saveOK,balance:n.profile.balance,totalCollected:n.profile.totalCollected,discovered:[...n.profile.discovered],crafted:[...n.profile.crafted],upgrades:{...n.profile.upgrades},configurations:{...n.profile.configurations},plans:n.plans.map(p=>({...p,blueprints:[...p.blueprints]})),drops:n.drops.map(d=>({...d})),stats:{...game.nanoStats}}:null;
}
