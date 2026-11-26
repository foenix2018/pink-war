// Contenu des menus VR de la planque. Fonctions pures : le contexte (jeu, profil, actions) est injecté par planque.js,
// ce qui permet de les tester sans WebGL. Les mêmes règles que les panneaux HTML : aucune fabrication sans plan ni
// nanoparticules, aucun chapitre à venir révélé, aucune arme hors inventaire.
const STATION_ROOMS=Object.freeze({weapons:'Armes',workshop:'Atelier nano',rest:'Repos',outfits:'Tenues',archive:'Archives',mission:'Départ en mission'});

export const stationLabel=(id,fallback)=>STATION_ROOMS[id]||fallback||id;

export function weaponsMenu(ctx){
  const {game,weapons}=ctx,buttons=[];
  weapons.forEach((w,i)=>{
    if(!game.nanoWeaponAllowed(i))return;
    const owned=game.ownedWeapons.has(i)&&game.isWeaponAvailable(i)&&game.nanoWeaponAllowed(i),current=i===game.weaponIndex;
    buttons.push({label:w.name,sub:owned?(current?'ARME PRÉPARÉE':'Préparer cette arme'):i===9&&game.missionLevel<10?'À partir du chapitre 10':'Plan et fabrication requis',
      disabled:!owned,active:current,onSelect:()=>ctx.actions.selectWeapon(i)});
  });
  return{title:'Armes',body:['Prépare une arme de ton inventaire pour la prochaine mission.'],buttons};
}

export function outfitsMenu(ctx){
  const {game,tiers,stages,recipes}=ctx,p=game.nano.profile,buttons=[];
  for(const t of tiers){
    const owned=t.tier<=p.suitStage,worn=p.equippedSuit===t.gameLevel,recipe=recipes.find(r=>r.id==='suit:'+t.tier);
    let sub,disabled=false;
    if(worn)sub='TENUE PORTÉE';
    else if(owned)sub='Fabriquée · équiper';
    else{sub=recipe?.enabled?'Fabriquer · '+t.cost+' NP':(recipe?.reason||'Plan et nanoparticules requis');disabled=!recipe?.enabled;}
    buttons.push({label:String(t.tier).padStart(2,'0')+' · '+t.name,sub,disabled:disabled||worn,active:worn,
      onSelect:()=>owned?ctx.actions.equipTier(t.tier):ctx.actions.fabricateTier(t.tier)});
  }
  const worn=tiers.find(t=>t.gameLevel===p.equippedSuit);
  return{title:'Tenues',kicker:'ATELIER · '+p.balance+' NP',body:[worn?stages[worn.tier-1].description:'Choisis une tenue.'],buttons};
}

export function archiveMenu(ctx){
  const past=ctx.history,buttons=past.map(e=>({label:String(e.level).padStart(2,'0')+' · '+e.title,sub:'Lire dans la planque (aucun spoiler)',disabled:false,onSelect:()=>ctx.actions.readArchive(e)}));
  return{title:'Archives',body:[past.length?'Le livre conserve les événements déjà vécus.':'Aucun chapitre terminé pour le moment. Le premier récit sera archivé à ton retour de mission.'],buttons};
}
export function archiveEntryMenu(entry,back){
  return{title:String(entry.level).padStart(2,'0')+' · '+entry.title,kicker:'ARCHIVES',body:[entry.text],buttons:[{label:'Retour aux archives',sub:'',disabled:false,onSelect:back}]};
}

export function missionMenu(ctx){
  const {profile,chapters,next}=ctx,buttons=[];
  if(next){const c=chapters.find(c=>c.level===next);buttons.push({label:'PARTIR · '+c.title,sub:'Chapitre '+String(next).padStart(2,'0')+' · suite de l’histoire',disabled:false,active:true,onSelect:()=>ctx.actions.depart(next)});}
  for(const c of chapters){
    if(c.level===next)continue;
    const done=profile.completed.includes(c.level);
    buttons.push({label:String(c.level).padStart(2,'0')+' · '+c.title,sub:done?'Terminé · rejouer':'Indisponible',disabled:!done,onSelect:()=>ctx.actions.depart(c.level)});
  }
  return{title:'Départ en mission',body:[next?'Prépare ton équipement, puis rejoins le chapitre suivant.':'Les chapitres disponibles sont archivés. Tu peux en rejouer un.'],buttons};
}

export function restMenu(ctx){
  const {game,id}=ctx,rest=id==='rest'||id==='bath';
  return{title:rest?'Repos':'Recharge',body:['Santé '+Math.ceil(game.player.hp)+' / 100 · Bouclier '+Math.ceil(game.player.shield)+' / '+game.shieldCapacity],
    buttons:[{label:rest?'Se reposer et régénérer':'Recharger l’équipement',sub:rest?'Santé et bouclier':'Bouclier, cellules des armes, charges',disabled:false,onSelect:()=>ctx.actions.heal(rest)}]};
}

export function stationMenu(id,ctx){
  const c={...ctx,id};
  if(id==='weapons')return weaponsMenu(c);
  if(id==='workshop'||id==='outfits')return outfitsMenu(c);
  if(id==='archive')return archiveMenu(c);
  if(id==='mission')return missionMenu(c);
  return restMenu(c);
}

// Menu de pause (X gauche) : reprise, déplacement rapide vers une pièce, rotation, sortie.
export function pauseMenu(ctx){
  const {actions,stations,settings}=ctx,buttons=[
    {label:'Reprendre',sub:'',disabled:false,onSelect:actions.resume},
    {label:'Rotation : '+(settings.snapTurn?'par à-coups de 30°':'fluide'),sub:'Stick droit',disabled:false,onSelect:actions.toggleTurn}
  ];
  for(const s of stations)buttons.push({label:'Aller à : '+stationLabel(s.id,s.name),sub:'Se placer devant la station',disabled:false,onSelect:()=>actions.goTo(s)});
  buttons.push({label:'Retour à l’accueil',sub:'Quitte la VR',disabled:false,onSelect:actions.home},{label:'Quitter la VR',sub:'Reste dans la planque à l’écran',disabled:false,onSelect:actions.exit});
  return{title:'En pause',kicker:'LA PLANQUE · VR',body:['Stick gauche : marcher · stick droit : tourner · A : interagir'],buttons};
}

// Ce qui est affiché dans le champ de vision : l'action de la station proche, sinon rien.
export const stationHint=near=>near?'A · '+stationLabel(near.id,near.action):'';

// Station la plus proche utilisable en VR (les appareils de sport sont réservés à l'écran).
export function nearestStation(stations,player,inRoom){
  let best=null,bestDistance=Infinity;
  for(const s of stations){
    if(String(s.id).startsWith('fitness-'))continue;
    const d=Math.hypot(player.x-s.x,player.z-s.z);
    if(d<s.radius&&d<bestDistance&&inRoom(player,s.room)){best=s;bestDistance=d;}
  }
  return best;
}

// Cap pour regarder un point depuis une position (même convention que le déplacement à l'écran : yaw = -atan2(dx, -dz)).
export const faceYaw=(from,to)=>-Math.atan2(to.x-from.x,-(to.z-from.z));
// Premier point d'un itinéraire qui entre dans le rayon de la station (sinon le dernier) : on s'arrête devant, pas dedans.
export function arrivalSpot(route,station){return route.find(p=>Math.hypot(p.x-station.x,p.z-station.z)<station.radius*.85)||route[route.length-1];}

// Entrées de la manette : seuil de stick, rotation par à-coups, bords de boutons.
export const stickAxis=(v,dead=.16)=>Math.abs(v||0)>dead?v:0;
export function turnStep({value=0,yaw=0,dt=0,snap=false,state={held:false}}){
  const v=stickAxis(value);
  if(!snap)return yaw-v*1.8*dt;
  if(Math.abs(v)>.7){if(!state.held){state.held=true;return yaw-Math.sign(v)*Math.PI/6;}}else if(Math.abs(v)<.4)state.held=false;
  return yaw;
}
