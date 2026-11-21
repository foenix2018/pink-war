// Shared campaign travel and preparation. No renderer, DOM, network or combat imports.
export const HIDEOUT_KEY='pink-wars-hideout-v1-';
export const CHAPTER_ROUTES=Object.freeze({1:'vesper-level1-v7.html',2:'level2-test.html',3:'niveau3.html',4:'niveau4.html',5:'ligne9.html',6:'niveau6.html',7:'foret.html'});
export const HIDEOUT_HISTORY=Object.freeze([
 {level:1,title:'Le Dernier Signal',text:'Les Archives végétales ont rendu une transmission VEILLE-4. Les parents ont demandé de suivre les relais indépendants et de ne jamais perdre les deux unités. La piste mène aux Bas-Niveaux.'},
 {level:2,title:'Les Profondeurs',text:'Le module de décryptage des Bas-Niveaux a été récupéré. Le Directoire recherche GAB-1 et CAR-14. Un convoi de prisonniers est parti vers l’Anneau logistique.'},
 {level:3,title:'Le Convoi des Oubliés',text:'Avec les Épars et AEGIS, le dossier du convoi a été reconstitué. L’annexe médicale, le relais A3 et le registre de régulation ont ouvert une nouvelle piste à la gare de fret.'},
 {level:4,title:'Le Protocole Interdit',text:'La station JANUS Est et ses relais ont révélé une archive des anciens systèmes de secours. L’ancrage d’ORDRE a été désynchronisé.'},
 {level:5,title:'La Ligne Noyée',text:'Sous les Halles-Basses, le courant de secours, les pompes P9 et l’écluse ont ouvert la voie basse. Les supports récupérés pointent vers la fonderie de Vesper-Nord.'},
 {level:6,title:'Le Cœur d’Acier',text:'La fonderie, ses techniciens et le cœur des machines ont livré une nouvelle trace. La recherche des parents se poursuit dans la forêt des Sources.'},
 {level:7,title:'Mémoires Locales',text:'Le relais indépendant de la grotte a été retrouvé, au-delà du sous-bois, du gué et des ruines. La mémoire locale complète la piste laissée par VEILLE-4.'}
].map(x=>Object.freeze(x)));
const heroOf=id=>id==='lylu'?'lylu':'ghju';
const chapter=n=>Number.isInteger(Number(n))&&CHAPTER_ROUTES[Number(n)]?Number(n):1;
const validIndex=i=>Number.isInteger(i)&&i>=0&&i<=10;
const storageOrNull=()=>{try{return globalThis.localStorage||null;}catch{return null;}};
export function freshHideoutProfile(){return{version:1,completed:[],lastChapter:1,selectedWeapon:null,owned:[],armorLevel:1,health:100,shield:60,charges:2,rested:false,recharged:false,choice:null,preparedAt:0,pendingLevel:null};}
export function readHideoutProfile(hero,storage=storageOrNull()){
 try{const s=JSON.parse(storage?.getItem(HIDEOUT_KEY+heroOf(hero))||'null');if(s?.version!==1){const p=freshHideoutProfile(),old=Math.min(7,Math.max(0,Math.floor(Number(storage?.getItem('pink-wars-last-cleared'))||0)));p.completed=Array.from({length:old},(_,i)=>i+1);p.lastChapter=Math.min(7,old+1);return p;}const p=freshHideoutProfile();
  p.completed=[...new Set((Array.isArray(s.completed)?s.completed:[]).filter(n=>Number.isInteger(n)&&CHAPTER_ROUTES[n]))].sort((a,b)=>a-b);p.lastChapter=chapter(s.lastChapter);
  p.owned=[...new Set((Array.isArray(s.owned)?s.owned:[]).filter(validIndex))];p.selectedWeapon=validIndex(s.selectedWeapon)?s.selectedWeapon:null;
  p.armorLevel=Math.max(1,Math.min(10,Math.floor(Number(s.armorLevel)||1)));p.health=Math.max(1,Math.min(100,Number(s.health)||100));p.shield=Math.max(0,Math.min(200,Number(s.shield)||0));p.charges=Math.max(0,Math.min(4,Math.floor(Number(s.charges)||0)));
  p.rested=s.rested===true;p.recharged=s.recharged===true;p.choice=['escort','proof'].includes(s.choice)?s.choice:null;p.preparedAt=Number.isFinite(s.preparedAt)?s.preparedAt:0;p.pendingLevel=CHAPTER_ROUTES[s.pendingLevel]?Number(s.pendingLevel):null;return p;
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
 const p=readHideoutProfile(game.characterId,storage);p.owned=[...game.ownedWeapons].filter(i=>validIndex(i)&&game.isWeaponAvailable(i)&&game.nanoWeaponAllowed?.(i)!==false);p.selectedWeapon=game.weaponIndex;p.armorLevel=Math.min(Math.max(1,Math.floor(armorLevel)),Math.min(10,Math.max(1,...p.completed)+1));
 p.health=game.player.hp;p.shield=game.player.shield||0;p.charges=game.charges||0;p.pendingLevel=Number(level);p.preparedAt=now;
 return saveHideoutProfile(game.characterId,p,storage);
}
export function applyHideoutPreparation(game,{storage=storageOrNull()}={}){
 if(game.inHideout||game.mode!=='campaign'||game.hideoutPreparationChecked||!game.nanoWeapons)return false;
 const p=readHideoutProfile(game.characterId,storage),level=game.missionLevel??game.campaign?.level??1;
 if(p.pendingLevel!==level||!p.preparedAt){game.hideoutPreparationChecked=true;return false;}
 for(const i of p.owned)if(game.isWeaponAvailable(i)&&game.nanoWeaponAllowed?.(i)!==false)game.ownedWeapons.add(i);
 if(p.selectedWeapon!==null&&game.ownedWeapons.has(p.selectedWeapon)&&game.isWeaponAvailable(p.selectedWeapon)&&game.nanoWeaponAllowed?.(p.selectedWeapon)!==false){game.weaponIndex=p.selectedWeapon;game.reloadRemaining=0;game.triggerHeld=false;}
 game.hideoutArmorLevel=p.armorLevel;
 if(p.rested){game.player.hp=100;game.player.shield=game.shieldCapacity||0;}
 if(p.recharged){game.player.shield=game.shieldCapacity||0;game.charges=Math.max(game.charges||0,p.charges);game.ammo=game.ammo.map((_,i)=>game.nanoWeapons[i].capacity);game.dual.ammo={left:12,right:12};}
 game.hideoutPreparationChecked=true;p.pendingLevel=null;saveHideoutProfile(game.characterId,p,storage);game.event?.('hideout-prepared',{weaponIndex:game.weaponIndex,armorLevel:p.armorLevel,rested:p.rested,recharged:p.recharged});return true;
}
