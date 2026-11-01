// Shared combat HUD for M01, M02, the Arena and the Range (book §11: health and ammunition always on screen,
// everything else contextual). One DOM, one stylesheet: each engine mounts it and feeds it its game state.
// The legacy readouts of each engine stay in the page, hidden by `body.pw-unified-hud`, so their logic is untouched.
import {hudIcon,restoreHudContrast,skinCombatControls} from './hud-appearance.js';
import {WEAPONS,weaponCycleOrder} from './game-logic.js';
import {paintCompanionPortrait} from './companion-portrait.js';
let activeCombatHud = null;
export const getActiveCombatHud = () => activeCombatHud;
const STYLESHEET = 'combat-hud.css?v=3.80-gear-1';
const HEROES = Object.freeze({ ghju: 'GHJU', lylu: 'LYLU' });
export const HUD_SEGMENTS = 10;

// Pure reading of an ArenaGame-like state (the three engines share these fields).
export function combatHudState(game) {
  const player = game?.player || {}, weapon = game?.weapon || {};
  const hp = Math.max(0, Math.min(100, Number(player.hp) || 0));
  const capacity = weapon.melee ? 0 : Math.max(0, Number(weapon.capacity) || 0);
  const ammo = weapon.melee ? 0 : Math.max(0, Number(game?.ammo?.[game?.weaponIndex]) || 0);
  const reloadTime = Math.max(.001, Number(weapon.reload) || 1), reloading = (Number(game?.reloadRemaining) || 0) > 0;
  return {
    hp, critical: hp > 0 && hp < 30, regenerating: !!game?.regenerating && hp < 100,
    weapon: weapon.name || weapon.id || '', melee: !!weapon.melee, ammo, capacity,
    reloading, reloadProgress: reloading ? Math.max(0, Math.min(1, 1 - game.reloadRemaining / reloadTime)) : 0,
    empty: !weapon.melee && capacity > 0 && ammo === 0 && !reloading,
    // Armour layer (3.63): shield over health, impulse charges, and the direction of the last hit.
    shieldCapacity: Math.max(0, Number(game?.shieldCapacity) || 0), shield: Math.max(0, Number(player.shield) || 0),
    shieldCharging: !!game?.shieldCharging, charges: Math.max(0, Number(game?.charges) || 0),
    hit: hitBearing(game)
  };
}

// Where the last hit came from, relative to where the player looks: 0 = ahead (top of the screen), PI/2 = right.
// Fades over HIT_MEMORY seconds of game time.
export const HIT_MEMORY = 1.1;
export function hitBearing(game) {
  const hit = game?.lastHit, p = game?.player;
  if (!hit || !p || !Number.isFinite(game.time) || game.time - hit.time > HIT_MEMORY) return null;
  const vx = hit.x - p.x, vz = hit.z - p.z, yaw = p.yaw || 0;
  if (Math.hypot(vx, vz) < .05) return null;
  const ahead = -Math.sin(yaw) * vx - Math.cos(yaw) * vz, right = Math.cos(yaw) * vx - Math.sin(yaw) * vz;
  return { angle: Math.atan2(right, ahead), strength: 1 - (game.time - hit.time) / HIT_MEMORY };
}

function ensureStylesheet(doc) {
  if (doc.querySelector('link[data-pw-hud]')) return;
  const link = doc.createElement('link'); link.rel = 'stylesheet'; link.href = new URL(STYLESHEET, import.meta.url).href; link.dataset.pwHud = '';
  doc.head.append(link);
}

export function mountCombatHud({ characterId = 'ghju', parent = null, lobbyPage = false, onAction = null } = {}) {
  const doc=document;ensureStylesheet(doc);restoreHudContrast(doc);skinCombatControls(doc);
  const root=doc.createElement('section');root.className='pw-hud';root.dataset.layout='immersion';root.setAttribute('aria-label','État de combat');
  root.innerHTML=`<button type="button" class="pw-hud-mission pw-glass" aria-expanded="false" aria-label="Afficher l’objectif">${hudIcon('objective')}<span></span></button>
    <section class="pw-hud-objective pw-glass" hidden aria-label="Objectif actuel"><small></small><p></p></section>
    <div class="pw-hud-vitals pw-glass" role="status" aria-label="Santé et bouclier"><span class="pw-hud-tag" hidden></span><div class="pw-hud-numbers"><span class="pw-shield-number">${hudIcon('shield')}<b class="pw-hud-shield-value">60</b></span><span>${hudIcon('health')}<b class="pw-hud-value">100</b></span></div><div class="pw-hud-shield" hidden><i></i></div><div class="pw-hud-bar"><i></i></div><span class="pw-hud-note"></span></div>
    <div class="pw-hud-arms pw-glass"><button type="button" class="pw-hud-reload" data-hud-action="reload" aria-label="Recharger l’arme"><span class="pw-hud-weapon"></span><span><b class="pw-hud-ammo">0</b><small class="pw-hud-capacity"></small></span><span class="pw-hud-reload-track"><i></i></span></button><button type="button" class="pw-hud-swap" data-hud-action="next" aria-label="Arme suivante">${hudIcon('swap')}</button><span class="pw-hud-note" role="status"></span></div>
    <button type="button" class="pw-hud-companion pw-glass" aria-label="Équipement GAB-1" aria-expanded="false" aria-controls="pw-tactical-gear"><canvas width="128" height="128" aria-hidden="true"></canvas><span class="pw-hud-companion-name">GAB-1</span><span class="pw-hud-companion-chevron">›</span></button>
    <section class="pw-hud-gear pw-glass" id="pw-tactical-gear" role="dialog" aria-label="Équipement tactique" hidden><header><strong>ÉQUIPEMENT</strong><button type="button" class="pw-hud-gear-close" aria-label="Fermer l'équipement">×</button></header><small class="pw-hud-gear-hint">Sélectionner une arme débloquée</small><div class="pw-hud-weapon-list" role="group" aria-label="Armes disponibles"></div><button type="button" class="pw-hud-gear-grenade"><span>GRENADE · CHARGE À IMPULSION</span><b class="pw-hud-gear-charges">0</b></button><button type="button" class="pw-hud-gear-skills" hidden>COMPÉTENCES DU COMPAGNON</button></section>
    <div class="pw-hud-hit" aria-hidden="true"><i></i></div>
    <div class="pw-hud-touch"><button type="button" class="pw-hud-more" aria-label="Actions secondaires" aria-expanded="false">${hudIcon('more')}</button><div class="pw-hud-palette pw-glass" hidden role="group" aria-label="Actions secondaires"><button type="button" data-armor="charge" aria-label="Lancer une charge à impulsion">${hudIcon('charge')}<span>Charge <b class="pw-hud-charges">2</b></span></button><button type="button" data-armor="melee" aria-label="Frappe de mêlée">${hudIcon('melee')}<span>Mêlée</span></button><button type="button" data-hud-action="crouch" aria-pressed="false">${hudIcon('crouch')}<span>Accroupi</span></button><button type="button" data-hud-action="sprint" aria-pressed="false">${hudIcon('sprint')}<span>Course</span></button></div></div>
    <button type="button" class="pw-hud-context pw-glass" data-hud-action="interact" hidden>${hudIcon('interact')}<span></span><kbd>F</kbd></button>`;
  (parent||doc.body).append(root);doc.body.classList.add('pw-unified-hud','pw-immersion-hud');if(lobbyPage)doc.body.classList.add('pw-hud-lobby-page');
  const $=s=>root.querySelector(s),vitals=$('.pw-hud-vitals'),arms=$('.pw-hud-arms'),palette=$('.pw-hud-palette'),more=$('.pw-hud-more'),mission=$('.pw-hud-mission'),objective=$('.pw-hud-objective'),context=$('.pw-hud-context');
  const nodes={tag:$('.pw-hud-tag'),hp:$('.pw-hud-value'),shield:$('.pw-hud-shield-value'),vitalNote:$('.pw-hud-vitals .pw-hud-note'),weapon:$('.pw-hud-weapon'),ammo:$('.pw-hud-ammo'),capacity:$('.pw-hud-capacity'),armsNote:$('.pw-hud-arms .pw-hud-note'),charges:$('.pw-hud-charges')};
  const shieldBar=$('.pw-hud-shield'),shieldNumber=$('.pw-shield-number'),hitRing=$('.pw-hud-hit'),chargeButton=$('[data-armor=charge]'),crouchButton=$('[data-hud-action=crouch]'),sprintButton=$('[data-hud-action=sprint]');
  const gear=$('.pw-hud-gear'),portrait=$('.pw-hud-companion'),gearList=$('.pw-hud-weapon-list'),gearGrenade=$('.pw-hud-gear-grenade'),gearSkills=$('.pw-hud-gear-skills');
  let gearOpen=false,currentGame=null,gearSignature='',portraitHero=null;
  function equipmentState(){
    const game=currentGame;
    const owned=game?.ownedWeapons instanceof Set?game.ownedWeapons:new Set();
    return {hero:root.dataset.hero||'ghju',weaponIndex:game?.weaponIndex??-1,
      charges:Math.max(0,Number(game?.charges)||0),
      weapons:weaponCycleOrder(owned,game?.characterId||root.dataset.hero).map(index=>({index,name:WEAPONS[index].name,
        ammo:game?.ammo?.[index]??0,capacity:WEAPONS[index].capacity,melee:!!WEAPONS[index].melee}))};
  }
  function setGearOpen(value){
    gearOpen=!!value&&!root.hidden&&active;
    if(gearOpen)setOpen(false);
    gear.hidden=!gearOpen;portrait.setAttribute('aria-expanded',String(gearOpen));root.classList.toggle('pw-gear-open',gearOpen);
    if(gearOpen){objective.hidden=true;mission.setAttribute('aria-expanded','false');doc.exitPointerLock?.();refreshEquipment();gear.querySelector('.pw-hud-gear-close').focus({preventScroll:true});}
    else if(!root.hidden&&doc.activeElement?.closest?.('.pw-hud-gear'))portrait.focus({preventScroll:true});
  }
  function chooseWeapon(index){
    const game=currentGame;if(!game||game.state!=='playing')return false;
    if(index===game.weaponIndex){setGearOpen(false);return true;}
    if(!game.selectWeapon(index))return false;
    setGearOpen(false);refreshEquipment();return true;
  }
  function refreshEquipment(){
    const s=equipmentState(),game=currentGame,unlocked=doc.querySelector('.pw-companion')?.dataset.unlocked==='true';
    const signature=JSON.stringify([s.hero,s.weaponIndex,s.charges,s.weapons.map(w=>[w.index,w.ammo]),unlocked]);
    if(signature===gearSignature)return;gearSignature=signature;
    gearList.replaceChildren();
    for(const w of s.weapons){
      const b=doc.createElement('button');b.type='button';b.className='pw-hud-gear-weapon';b.dataset.weaponIndex=String(w.index);
      b.setAttribute('aria-pressed',String(w.index===s.weaponIndex));
      const name=doc.createElement('strong'),amount=doc.createElement('span');
      name.textContent=w.name;amount.textContent=w.melee?'LAME':w.ammo+' / '+w.capacity;
      b.append(name,amount);b.onclick=()=>chooseWeapon(w.index);gearList.append(b);
    }
    $('.pw-hud-gear-charges').textContent=String(s.charges);gearGrenade.disabled=s.charges<=0||game?.state!=='playing';
    gearSkills.hidden=!unlocked;
  }
  portrait.addEventListener('pointerdown',e=>e.stopPropagation());
  portrait.onclick=e=>{e.preventDefault();e.stopPropagation();setGearOpen(!gearOpen);};
  gear.addEventListener('pointerdown',e=>e.stopPropagation());
  $('.pw-hud-gear-close').onclick=()=>setGearOpen(false);
  gearGrenade.onclick=()=>{if(currentGame?.charges>0){setGearOpen(false);command('charge');}};
  gearSkills.onclick=()=>{setGearOpen(false);doc.dispatchEvent(new CustomEvent('pw-hud-open-skills'));};
  let open=false,sprinting=false,disposed=false,active=true,objectiveKey='',contextLabel='';
  const last=new Map(),text=(k,v)=>{if(last.get(k)!==v){last.set(k,v);nodes[k].textContent=v;}};
  const prop=(element,k,v)=>{if(element.style.getPropertyValue(k)!==v)element.style.setProperty(k,v);};
  const flag=(element,name,on)=>{if(element.classList.contains(name)!==on)element.classList.toggle(name,on);};
  function setOpen(value){open=!!value&&!root.hidden&&active;palette.hidden=!open;more.setAttribute('aria-expanded',String(open));root.classList.toggle('pw-actions-open',open);if(open){objective.hidden=true;mission.setAttribute('aria-expanded','false');}}
  function reset(){setGearOpen(false);setOpen(false);objective.hidden=true;mission.setAttribute('aria-expanded','false');if(sprinting){sprinting=false;onAction?.('sprint',false);}sprintButton.setAttribute('aria-pressed','false');root.classList.remove('pw-sprinting');}
  function command(kind){if(!active||root.hidden||disposed)return;setOpen(false);if(kind==='sprint'){sprinting=!sprinting;sprintButton.setAttribute('aria-pressed',String(sprinting));root.classList.toggle('pw-sprinting',sprinting);onAction?.(kind,sprinting);}else onAction?.(kind);}
  // Native click provides one command per tap and keyboard/screen-reader activation.
  // Held fire/aim keep their original captured pointer handlers in each engine.
  for(const button of root.querySelectorAll('[data-armor],[data-hud-action]')){
    button.addEventListener('pointerdown',e=>{e.stopPropagation();});
    button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();command(button.dataset.armor||button.dataset.hudAction);if(e.detail>0)button.blur();});
  }
  root.addEventListener('keydown',e=>{if(['Space','Enter'].includes(e.code))e.stopPropagation();});
  more.onclick=e=>{e.stopPropagation();setOpen(!open);};
  mission.onclick=e=>{e.stopPropagation();setOpen(false);objective.hidden=!objective.hidden;mission.setAttribute('aria-expanded',String(!objective.hidden));};
  const outside=e=>{if(root.contains(e.target))return;const wasOpen=open||gearOpen;setGearOpen(false);setOpen(false);objective.hidden=true;mission.setAttribute('aria-expanded','false');if(wasOpen&&e.target.tagName==='CANVAS'){e.preventDefault();e.stopImmediatePropagation();}};
  const key=e=>{if(e.code==='Escape'&&(open||gearOpen||!objective.hidden)){e.preventDefault();e.stopImmediatePropagation();setGearOpen(false);setOpen(false);objective.hidden=true;mission.setAttribute('aria-expanded','false');portrait.focus({preventScroll:true});}};
  const blur=()=>reset(),visibility=()=>{if(doc.hidden)reset();};
  doc.addEventListener('pointerdown',outside,true);doc.addEventListener('keydown',key,true);doc.addEventListener('pw-hud-overlay',blur);doc.defaultView.addEventListener('blur',blur);doc.addEventListener('visibilitychange',visibility);
  const api={root,setOpen,setGearOpen,reset,equipmentState,chooseWeapon,throwGrenade(){if(currentGame?.charges>0&&active){command('charge');return true;}return false;},get isOpen(){return open||gearOpen;},
    setCharacter(id){const hero=id==='lylu'?'lylu':'ghju';root.dataset.hero=hero;doc.body.dataset.pwHero=hero;text('tag',HEROES[hero]);
      if(portraitHero!==hero){portraitHero=hero;paintCompanionPortrait(portrait.querySelector('canvas').getContext('2d'),hero,128);
        const label=hero==='lylu'?'CAR-14':'GAB-1';$('.pw-hud-companion-name').textContent=label;portrait.setAttribute('aria-label','Ouvrir les armes et grenades de '+label);gearSignature='';}
    },
    setObjective({label='',detail=''}={}){const signature=label+'|'+detail;mission.hidden=!label;if(signature===objectiveKey)return;objectiveKey=signature;mission.querySelector('span').textContent=label;objective.querySelector('small').textContent=label;objective.querySelector('p').textContent=detail;mission.setAttribute('aria-label',label+' : afficher l’objectif');objective.hidden=true;mission.setAttribute('aria-expanded','false');},
    setContext(label){label=label||'';if(contextLabel===label)return;contextLabel=label;context.hidden=!label;context.querySelector('span').textContent=label;context.setAttribute('aria-label',label||'Interagir');},
    update(game){
      currentGame=game;const s=combatHudState(game);active=game.state!=='paused'&&game.state!=='lost'&&game.state!=='won'&&s.hp>0;if(!active)reset();
      text('hp',String(Math.ceil(s.hp)));text('shield',String(Math.ceil(s.shield)));prop(vitals,'--fill',(s.hp/100).toFixed(3));
      flag(vitals,'critical',s.critical);flag(vitals,'regenerating',s.regenerating);
      const shielded=s.shieldCapacity>0,broken=shielded&&s.shield<=0;shieldBar.hidden=shieldNumber.hidden=!shielded;
      if(shielded)prop(shieldBar,'--fill',(s.shield/s.shieldCapacity).toFixed(3));
      flag(vitals,'shield-broken',broken);flag(vitals,'shield-charging',s.shieldCharging);
      text('vitalNote',s.critical?'CRITIQUE':broken?'BOUCLIER ROMPU':'');text('charges',String(s.charges));chargeButton.disabled=s.charges<=0;chargeButton.setAttribute('aria-label','Lancer une charge à impulsion · '+s.charges+' disponible'+(s.charges>1?'s':''));
      crouchButton.setAttribute('aria-pressed',String(!!game.player?.crouched));
      const arc=s.hit?(s.hit.angle*180/Math.PI).toFixed(0)+'|'+s.hit.strength.toFixed(2):'';
      if(last.get('arc')!==arc){last.set('arc',arc);hitRing.style.opacity=s.hit?s.hit.strength.toFixed(2):'0';if(s.hit)hitRing.style.setProperty('--angle',(s.hit.angle*180/Math.PI).toFixed(1)+'deg');}
      text('weapon',s.weapon.toUpperCase());text('ammo',s.melee?'LAME':String(s.ammo));text('capacity',s.melee?'':'/ '+s.capacity);
      prop(arms,'--fill',(s.reloading?s.reloadProgress:s.melee?1:s.capacity?s.ammo/s.capacity:0).toFixed(3));
      flag(arms,'reloading',s.reloading);flag(arms,'empty',s.empty);flag(arms,'low',!s.melee&&!s.reloading&&s.capacity>0&&s.ammo>0&&s.ammo<=s.capacity*.25);
      text('armsNote',s.reloading?'RECHARGE':s.empty?'VIDE':'');$('.pw-hud-reload').disabled=s.melee||s.reloading;refreshEquipment();
      return s;
    },
    setVisible(visible){if(!visible)reset();root.hidden=!visible;},
    dispose(){if(disposed)return;reset();disposed=true;doc.removeEventListener('pointerdown',outside,true);doc.removeEventListener('keydown',key,true);doc.removeEventListener('pw-hud-overlay',blur);doc.defaultView.removeEventListener('blur',blur);doc.removeEventListener('visibilitychange',visibility);root.remove();if(activeCombatHud===api)activeCombatHud=null;doc.body.classList.remove('pw-unified-hud','pw-immersion-hud','pw-hud-lobby-page');}
  };api.setCharacter(characterId);activeCombatHud=api;return api;
}
