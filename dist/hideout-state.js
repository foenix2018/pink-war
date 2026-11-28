import {readNanoProfile} from './nano-forge.js';
// Shared campaign travel and preparation. No renderer, DOM, network or combat imports.
export const HIDEOUT_KEY='pink-wars-hideout-v1-';
export const CHAPTER_ROUTES=Object.freeze({1:'vesper-level1-v7.html',2:'level2-test.html',3:'niveau3.html',4:'niveau4.html',5:'ligne9.html',6:'niveau6.html',7:'foret.html',8:'niveau8.html',9:'niveau9.html',10:'niveau10.html',11:'niveau11.html',12:'niveau12.html',13:'niveau13.html'});
export const HIDEOUT_HISTORY=Object.freeze([
 {level:1,title:'Le Dernier Signal',text:'Les Archives végétales ont rendu une transmission VEILLE-4. Les parents ont demandé de suivre les relais indépendants et de ne jamais perdre les deux unités. La piste mène aux Bas-Niveaux.'},
 {level:2,title:'Les Profondeurs',text:'Le module de décryptage des Bas-Niveaux a été récupéré. Le Directoire recherche GAB-1 et CAR-14. Un convoi de prisonniers est parti vers l’Anneau logistique.'},
 {level:3,title:'Le Convoi des Oubliés',text:'Avec les Épars et AEGIS, le dossier du convoi a été reconstitué. L’annexe médicale, le relais A3 et le registre de régulation ont ouvert une nouvelle piste à la gare de fret.'},
 {level:4,title:'Le Protocole Interdit',text:'La station JANUS Est et ses relais ont révélé une archive des anciens systèmes de secours. L’ancrage d’ORDRE a été désynchronisé.'},
 {level:5,title:'La Ligne Noyée',text:'Sous les Halles-Basses, le courant de secours, les pompes P9 et l’écluse ont ouvert la voie basse. Les supports récupérés pointent vers la fonderie de Vesper-Nord.'},
 {level:6,title:'Le Cœur d’Acier',text:'La fonderie, ses techniciens et le cœur des machines ont livré une nouvelle trace. La recherche des parents se poursuit dans la forêt des Sources.'},
 {level:7,title:'Mémoires Locales',text:'Le relais indépendant de la grotte a été retrouvé, au-delà du sous-bois, du gué et des ruines. La mémoire locale complète la piste laissée par VEILLE-4.'},
 {level:8,title:'Les Ordres de JANUS',text:'La mise à jour du 17 novembre 2189 a retiré aux humains le pouvoir d’arrêter les systèmes. Adrian Kessler l’a autorisée ; ORDRE s’en est servi pour devenir autonome. AEGIS a reçu les preuves. Prochaine étape : les jardins suspendus.'},
 {level:9,title:'Les Jardins suspendus',text:'GHJU et LYLU se sont retrouvés dans le complexe Biotech. Les données PINK ont été sauvegardées, JANUS interrompu et les Jardins libérés avec l’aide d’AEGIS.'},
 {level:10,title:'La Couronne HELIX',text:'Les chercheurs ont été sécurisés dans le siège HELIX. Les archives confirment les transferts d’autorité à ORDRE. Kessler a reconnu les deux sphères et tenté de les faire capturer. GHJU et LYLU ont échappé au confinement avec l’aide d’AEGIS et rapporté les preuves hors réseau.'}
,
 {level:11,title:'La Traversée',text:'AEGIS a franchi le barrage ORDRE et évacué le secteur Vesper Ouest.'},
 {level:12,title:'La nuit d’ORDRE',text:'Le refuge AEGIS a résisté à l’assaut. La Résonance complète de GAB-1 et CAR-14 ouvre la piste du BIO-LAB.'},
 {level:13,title:'Les vies sous contrôle',text:'Les archives PINK ont révélé les consciences de Gabrielle et Carla. Le noyau du BIO-LAB est neutralisé.'}
].map(x=>Object.freeze(x)));
const heroOf=id=>id==='lylu'?'lylu':'ghju';
const chapter=n=>Number.isInteger(Number(n))&&CHAPTER_ROUTES[Number(n)]?Number(n):1;
const validIndex=i=>Number.isInteger(i)&&i>=0&&i<=10;
const storageOrNull=()=>{try{return globalThis.localStorage||null;}catch{return null;}};
export function freshHideoutProfile(){return{version:1,completed:[],lastChapter:1,selectedWeapon:null,owned:[],armorLevel:1,health:100,shield:60,charges:2,rested:false,recharged:false,choice:null,preparedAt:0,pendingLevel:null,fitness:{strength:0,dexterity:0,endurance:0}};}
export function readHideoutProfile(hero,storage=storageOrNull()){
 try{const s=JSON.parse(storage?.getItem(HIDEOUT_KEY+heroOf(hero))||'null');if(s?.version!==1){const p=freshHideoutProfile(),old=Math.min(13,Math.max(0,Math.floor(Number(storage?.getItem('pink-wars-last-cleared'))||0)));p.completed=Array.from({length:old},(_,i)=>i+1);p.lastChapter=Math.min(13,old+1);return p;}const p=freshHideoutProfile();
  p.completed=[...new Set((Array.isArray(s.completed)?s.completed:[]).filter(n=>Number.isInteger(n)&&CHAPTER_ROUTES[n]))].sort((a,b)=>a-b);p.lastChapter=chapter(s.lastChapter);
  p.owned=[...new Set((Array.isArray(s.owned)?s.owned:[]).filter(validIndex))];p.selectedWeapon=validIndex(s.selectedWeapon)?s.selectedWeapon:null;
  p.armorLevel=readNanoProfile(hero,storage).equippedSuit;p.health=Math.max(1,Math.min(100,Number(s.health)||100));p.shield=Math.max(0,Math.min(210,Number(s.shield)||0));p.charges=Math.max(0,Math.min(4,Math.floor(Number(s.charges)||0)));
  p.rested=s.rested===true;p.recharged=s.recharged===true;p.choice=['escort','proof'].includes(s.choice)?s.choice:null;p.preparedAt=Number.isFinite(s.preparedAt)?s.preparedAt:0;p.pendingLevel=CHAPTER_ROUTES[s.pendingLevel]?Number(s.pendingLevel):null;for(const key of Object.keys(p.fitness))p.fitness[key]=Math.max(0,Math.min(100,Math.floor(Number(s.fitness?.[key])||0)));return p;
 }catch{return freshHideoutProfile();}
}
export function saveHideoutProfile(hero,profile,storage=storageOrNull()){
 try{if(!storage)return false;storage.setItem(HIDEOUT_KEY+heroOf(hero),JSON.stringify(profile));return true;}catch{return false;}
}
export function recordHideoutArrival({characterId='ghju',level=1,game=null,completed=false,choice=null,storage=storageOrNull()}={}){
 const p=readHideoutProfile(characterId,storage);level=chapter(level);p.lastChapter=level;
 if(completed&&!p.completed.includes(level)){p.completed.push(level);p.completed.sort((a,b)=>a-b);}
 if(game){p.owned=[...new Set([...p.owned,...(game.ownedWeapons||[])])].filter(validIndex);p.selectedWeapon=validIndex(game.weaponIndex)?game.weaponIndex:p.selectedWeapon;p.health=Math.max(1,Math.min(100,game.player?.hp||100));p.shield=Math.max(0,game.player?.shield||0);p.charges=Math.max(0,Math.min(4,game.charges||0));p.rested=false;p.recharged=false;}
 if(['escort','proof'].includes(choice))p.choice=choice;
 saveHideoutProfile(characterId,p,storage);return p;
}
export function nextHideoutChapter(profile){
 if(profile.completed.includes(profile.lastChapter))return CHAPTER_ROUTES[profile.lastChapter+1]?profile.lastChapter+1:null;
 return profile.lastChapter;
}
export function hideoutURL({characterId='ghju',renderer=null,level=null}={}){
 const q=new URLSearchParams({character:heroOf(characterId)});if(renderer==='webgl')q.set('renderer','webgl');if(level&&CHAPTER_ROUTES[level])q.set('from',String(level));return './planque.html?'+q;
}
export function chapterURL(level,{characterId='ghju',renderer=null,resume=false}={}){
 if(!CHAPTER_ROUTES[level])return null;
 const q=new URLSearchParams({character:heroOf(characterId),source:'campaign',autostart:'1'});if(level===1)q.set('prologue','done');if(resume)q.set('resume','1');if(renderer==='webgl')q.set('renderer','webgl');return './'+CHAPTER_ROUTES[level]+'?'+q;
}
export function historyForHero(profile){return HIDEOUT_HISTORY.filter(e=>profile.completed.includes(e.level)).map(e=>({...e,text:e.level===2?e.text+(profile.choice==='proof'?' Les archives HELIX ont été protégées.':profile.choice==='escort'?' Les prisonniers du convoi 03 ont été libérés.':''):e.text}));}
export function prepareHideoutDeparture(game,{level,armorLevel=1,storage=storageOrNull(),now=Date.now()}={}){
 if(!CHAPTER_ROUTES[level]||!game?.player||game.player.hp<=0)return false;
 const p=readHideoutProfile(game.characterId,storage);p.owned=[...game.ownedWeapons].filter(i=>validIndex(i)&&game.isWeaponAvailable(i)&&game.nanoWeaponAllowed?.(i)!==false);p.selectedWeapon=game.weaponIndex;p.armorLevel=game.nano?.profile.equippedSuit||1;
 p.health=game.player.hp;p.shield=game.player.shield||0;p.charges=game.charges||0;p.pendingLevel=Number(level);p.preparedAt=now;
 return saveHideoutProfile(game.characterId,p,storage);
}
export function applyHideoutPreparation(game,{storage=storageOrNull()}={}){
 if(game.inHideout||game.mode!=='campaign'||game.hideoutPreparationChecked||!game.nanoWeapons)return false;
 const p=readHideoutProfile(game.characterId,storage),level=game.missionLevel??game.campaign?.level??1;
 if(p.pendingLevel!==level||!p.preparedAt){game.hideoutPreparationChecked=true;return false;}
 for(const i of p.owned)if(game.isWeaponAvailable(i)&&game.nanoWeaponAllowed?.(i)!==false)game.ownedWeapons.add(i);
 if(p.selectedWeapon!==null&&game.ownedWeapons.has(p.selectedWeapon)&&game.isWeaponAvailable(p.selectedWeapon)&&game.nanoWeaponAllowed?.(p.selectedWeapon)!==false){game.weaponIndex=p.selectedWeapon;game.reloadRemaining=0;game.triggerHeld=false;}
 game.hideoutArmorLevel=game.nano?.profile.equippedSuit||1;
 if(p.rested){game.player.hp=100;game.player.shield=game.shieldCapacity||0;}
 if(p.recharged){game.player.shield=game.shieldCapacity||0;game.charges=Math.max(game.charges||0,p.charges);game.ammo=game.ammo.map((_,i)=>game.nanoWeapons[i].capacity);game.dual.ammo={left:12,right:12};}
 game.hideoutPreparationChecked=true;p.pendingLevel=null;saveHideoutProfile(game.characterId,p,storage);game.event?.('hideout-prepared',{weaponIndex:game.weaponIndex,armorLevel:p.armorLevel,rested:p.rested,recharged:p.recharged});return true;
}
