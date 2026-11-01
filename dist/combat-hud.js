// Shared combat HUD for M01, M02, the Arena and the Range (book §11: health and ammunition always on screen,
// everything else contextual). One DOM, one stylesheet: each engine mounts it and feeds it its game state.
// The legacy readouts of each engine stay in the page, hidden by `body.pw-unified-hud`, so their logic is untouched.
import {hudIcon,restoreHudContrast,skinCombatControls} from './hud-appearance.js';
import {WEAPONS,weaponCycleOrder} from './game-logic.js';
import {normalizeDesktopGamepad} from './desktop-input.js';
const STYLESHEET = 'combat-hud.css?v=3.82-arsenal';
const PARTNER_IMAGES={ghju:new URL('./art/updates/3664/gaby-front.webp',import.meta.url).href,lylu:new URL('./art/updates/3664/cara-front.webp',import.meta.url).href};
const PARTNER_LABEL={ghju:'GAB-1',lylu:'CAR-14'};
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
    <div class="pw-hud-arms pw-glass"><button type="button" class="pw-hud-reload" data-hud-action="reload" aria-label="Recharger l’arme"><span class="pw-hud-weapon"></span><span><b class="pw-hud-ammo">0</b><small class="pw-hud-capacity"></small></span><span class="pw-hud-reload-track"><i></i></span></button><span class="pw-hud-note" role="status"></span></div>
    <div class="pw-hud-arsenal"><button type="button" class="pw-hud-companion pw-glass" aria-expanded="false" aria-controls="pw-hud-arsenal-list" aria-label="Ouvrir armes et grenades"><img class="pw-hud-companion-photo" alt="" decoding="async"/><span class="pw-hud-companion-name">GAB-1</span></button>
      <section id="pw-hud-arsenal-list" class="pw-hud-arsenal-panel pw-glass" role="dialog" aria-label="Armes et grenades" hidden><header><div><small>ÉQUIPEMENT</small><strong>ARSENAL TACTIQUE</strong></div><button type="button" class="pw-hud-arsenal-close" aria-label="Fermer le sélecteur">×</button></header><div class="pw-hud-weapon-grid" role="group" aria-label="Armes disponibles"></div><button type="button" class="pw-hud-grenade" data-hud-action="charge">${hudIcon('charge')}<span><strong>GRENADE À IMPULSION</strong><small>Charges disponibles : <b class="pw-hud-arsenal-charges">2</b></small></span></button><button type="button" class="pw-hud-partner-skill">COMPÉTENCES DU PARTENAIRE</button><p class="pw-hud-arsenal-hint">Touche △ : ouvrir · ↑↓ : choisir · × : équiper · ○ : fermer</p></section></div>
    <div class="pw-hud-hit" aria-hidden="true"><i></i></div>
    <div class="pw-hud-touch"><button type="button" class="pw-hud-more" aria-label="Actions secondaires" aria-expanded="false">${hudIcon('more')}</button><div class="pw-hud-palette pw-glass" hidden role="group" aria-label="Actions secondaires"><button type="button" data-armor="melee" aria-label="Frappe de mêlée">${hudIcon('melee')}<span>Mêlée</span></button><button type="button" data-hud-action="crouch" aria-pressed="false">${hudIcon('crouch')}<span>Accroupi</span></button><button type="button" data-hud-action="sprint" aria-pressed="false">${hudIcon('sprint')}<span>Course</span></button></div></div>
    <button type="button" class="pw-hud-context pw-glass" data-hud-action="interact" hidden>${hudIcon('interact')}<span></span><kbd>F</kbd></button>`;
  (parent||doc.body).append(root);doc.body.classList.add('pw-unified-hud','pw-immersion-hud');if(lobbyPage)doc.body.classList.add('pw-hud-lobby-page');
  const $=s=>root.querySelector(s),vitals=$('.pw-hud-vitals'),arms=$('.pw-hud-arms'),palette=$('.pw-hud-palette'),more=$('.pw-hud-more'),mission=$('.pw-hud-mission'),objective=$('.pw-hud-objective'),context=$('.pw-hud-context');
  const nodes={tag:$('.pw-hud-tag'),hp:$('.pw-hud-value'),shield:$('.pw-hud-shield-value'),vitalNote:$('.pw-hud-vitals .pw-hud-note'),weapon:$('.pw-hud-weapon'),ammo:$('.pw-hud-ammo'),capacity:$('.pw-hud-capacity'),armsNote:$('.pw-hud-arms .pw-hud-note'),charges:$('.pw-hud-charges')};
  const shieldBar=$('.pw-hud-shield'),shieldNumber=$('.pw-shield-number'),hitRing=$('.pw-hud-hit'),chargeButton=$('.pw-hud-grenade'),crouchButton=$('[data-hud-action=crouch]'),sprintButton=$('[data-hud-action=sprint]');
  const partner=$('.pw-hud-companion'),partnerPhoto=$('.pw-hud-companion-photo'),partnerName=$('.pw-hud-companion-name'),arsenal=$('.pw-hud-arsenal-panel'),weaponsList=$('.pw-hud-weapon-grid'),closeArsenal=$('.pw-hud-arsenal-close'),partnerSkill=$('.pw-hud-partner-skill');
  let arsenalOpen=false,armedWeapons='',padButtons=[],selection=0;
  let open=false,sprinting=false,disposed=false,active=true,objectiveKey='',contextLabel='';
  const last=new Map(),text=(k,v)=>{if(last.get(k)!==v){last.set(k,v);nodes[k].textContent=v;}};
  const prop=(element,k,v)=>{if(element.style.getPropertyValue(k)!==v)element.style.setProperty(k,v);};
  const flag=(element,name,on)=>{if(element.classList.contains(name)!==on)element.classList.toggle(name,on);};
  function setOpen(value){open=!!value&&!root.hidden&&active;if(open&&arsenalOpen)setArsenalOpen(false);palette.hidden=!open;more.setAttribute('aria-expanded',String(open));root.classList.toggle('pw-actions-open',open);if(open){objective.hidden=true;mission.setAttribute('aria-expanded','false');}}
  function reset(){setArsenalOpen(false);setOpen(false);objective.hidden=true;mission.setAttribute('aria-expanded','false');if(sprinting){sprinting=false;onAction?.('sprint',false);}sprintButton.setAttribute('aria-pressed','false');root.classList.remove('pw-sprinting');}
  function command(kind,value){if(!active||root.hidden||disposed)return;setOpen(false);setArsenalOpen(false);if(kind==='sprint'){sprinting=!sprinting;sprintButton.setAttribute('aria-pressed',String(sprinting));root.classList.toggle('pw-sprinting',sprinting);onAction?.(kind,sprinting);}else onAction?.(kind,value);}
  function setArsenalOpen(value){
    arsenalOpen=!!value&&!root.hidden&&active;
    arsenal.hidden=!arsenalOpen;partner.setAttribute('aria-expanded',String(arsenalOpen));
    root.classList.toggle('pw-arsenal-open',arsenalOpen);
    if(arsenalOpen){
      setOpen(false);objective.hidden=true;mission.setAttribute('aria-expanded','false');
      selection=0;markSelection();closeArsenal.focus({preventScroll:true});
    }else partner.blur();
  }
  function markSelection(){
    const options=[...arsenal.querySelectorAll('.pw-hud-weapon-option:not(:disabled),.pw-hud-grenade:not(:disabled),.pw-hud-partner-skill:not(:disabled)')];
    selection=Math.max(0,Math.min(selection,options.length-1));
    options.forEach((button,i)=>button.classList.toggle('pw-hud-selected',i===selection));
    return options;
  }
  function updateArsenal(game){
    const owned=game?.ownedWeapons instanceof Set?game.ownedWeapons:new Set(game?.ownedWeapons||[]);
    const hero=game?.characterId||root.dataset.hero||'ghju';
    const order=weaponCycleOrder(owned,hero);
    const signature=hero+'|'+order.join(',');
    if(armedWeapons!==signature){
      armedWeapons=signature;weaponsList.replaceChildren();
      for(const index of order){
        const weapon=WEAPONS[index];if(!weapon)continue;
        const button=doc.createElement('button');button.type='button';
        button.className='pw-hud-weapon-option';button.dataset.weaponIndex=String(index);
        button.innerHTML='<b></b><small></small><span aria-hidden="true">✓</span>';
        button.querySelector('b').textContent=weapon.name;
        button.querySelector('small').textContent=weapon.melee?'LAME / CORPS À CORPS':weapon.label;
        button.addEventListener('pointerdown',e=>e.stopPropagation());
        button.onclick=e=>{e.stopPropagation();command('weapon',index);};
        weaponsList.append(button);
      }
      markSelection();
    }
    for(const button of weaponsList.children){
      const current=Number(button.dataset.weaponIndex)===game?.weaponIndex;
      button.classList.toggle('equipped',current);
      button.setAttribute('aria-pressed',String(current));
    }
    partnerSkill.hidden=!doc.querySelector('.pw-companion[data-unlocked="true"]');
    const charges=Math.max(0,Number(game?.charges)||0);
    $('.pw-hud-arsenal-charges').textContent=String(charges);
    chargeButton.disabled=charges<=0;
  }
  function gamepadMenu(){
    // Navigation only while the flat-screen selector is open; the game engine
    // keeps ownership of controller mapping and in-headset XR input.
    let pad;try{pad=Array.from(navigator.getGamepads?.()||[]).map(normalizeDesktopGamepad).find(Boolean);}catch{}
    const states=pad?.buttons?.map(x=>!!x?.pressed)||[];
    const edge=index=>!!states[index]&&!padButtons[index];
    if(arsenalOpen&&pad){
      const options=markSelection();
      if(edge(12))selection=(selection+options.length-1)%Math.max(1,options.length);
      if(edge(13))selection=(selection+1)%Math.max(1,options.length);
      if(edge(0))options[selection]?.click();
      if(edge(1)||edge(3))setArsenalOpen(false);
      markSelection();
    }
    padButtons=states;
  }
  partner.addEventListener('pointerdown',e=>e.stopPropagation());
  partner.onclick=e=>{e.preventDefault();e.stopPropagation();setArsenalOpen(!arsenalOpen);};
  closeArsenal.onclick=e=>{e.stopPropagation();setArsenalOpen(false);};
  partnerSkill.onclick=e=>{e.stopPropagation();setArsenalOpen(false);onAction?.('companion');};
  arsenal.addEventListener('pointerdown',e=>e.stopPropagation());
  arsenal.addEventListener('keydown',e=>{
    if(e.code==='ArrowDown'||e.code==='ArrowUp'){
      e.preventDefault();e.stopPropagation();const options=markSelection();
      selection=(selection+(e.code==='ArrowDown'?1:options.length-1))%Math.max(1,options.length);
      options[selection]?.focus({preventScroll:true});markSelection();
    }else if(e.code==='Enter'&&e.target===arsenal){e.preventDefault();markSelection()[selection]?.click();}
  });
  // Native click provides one command per tap and keyboard/screen-reader activation.
  // Held fire/aim keep their original captured pointer handlers in each engine.
  for(const button of root.querySelectorAll('[data-armor],[data-hud-action]')){
    button.addEventListener('pointerdown',e=>{e.stopPropagation();});
    button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();command(button.dataset.armor||button.dataset.hudAction);if(e.detail>0)button.blur();});
  }
  root.addEventListener('keydown',e=>{if(['Space','Enter'].includes(e.code))e.stopPropagation();});
  more.onclick=e=>{e.stopPropagation();setOpen(!open);};
  mission.onclick=e=>{e.stopPropagation();setOpen(false);objective.hidden=!objective.hidden;mission.setAttribute('aria-expanded',String(!objective.hidden));};
  const outside=e=>{if(root.contains(e.target))return;const wasOpen=open||arsenalOpen;setArsenalOpen(false);setOpen(false);objective.hidden=true;mission.setAttribute('aria-expanded','false');if(wasOpen&&e.target.tagName==='CANVAS'){e.preventDefault();e.stopImmediatePropagation();}};
  const key=e=>{if(e.code==='Escape'&&(open||arsenalOpen||!objective.hidden)){e.preventDefault();e.stopImmediatePropagation();setArsenalOpen(false);setOpen(false);objective.hidden=true;mission.setAttribute('aria-expanded','false');partner.focus({preventScroll:true});}};
  const blur=()=>reset(),visibility=()=>{if(doc.hidden)reset();};
  doc.addEventListener('pointerdown',outside,true);doc.addEventListener('keydown',key,true);doc.addEventListener('pw-hud-overlay',blur);doc.defaultView.addEventListener('blur',blur);doc.addEventListener('visibilitychange',visibility);
  const api={root,setOpen,reset,setArsenalOpen,pollGamepad:gamepadMenu,toggleArsenal(){setArsenalOpen(!arsenalOpen);},get isOpen(){return open||arsenalOpen;},get isArsenalOpen(){return arsenalOpen;},
    setCharacter(id){const hero=id==='lylu'?'lylu':'ghju';root.dataset.hero=hero;doc.body.dataset.pwHero=hero;text('tag',HEROES[hero]);partnerName.textContent=PARTNER_LABEL[hero];partnerPhoto.src=PARTNER_IMAGES[hero];partnerPhoto.alt='Portrait de '+PARTNER_LABEL[hero];partner.setAttribute('aria-label','Armes et grenades · '+PARTNER_LABEL[hero]);},
    setObjective({label='',detail=''}={}){const signature=label+'|'+detail;mission.hidden=!label;if(signature===objectiveKey)return;objectiveKey=signature;mission.querySelector('span').textContent=label;objective.querySelector('small').textContent=label;objective.querySelector('p').textContent=detail;mission.setAttribute('aria-label',label+' : afficher l’objectif');objective.hidden=true;mission.setAttribute('aria-expanded','false');},
    setContext(label){label=label||'';if(contextLabel===label)return;contextLabel=label;context.hidden=!label;context.querySelector('span').textContent=label;context.setAttribute('aria-label',label||'Interagir');},
    update(game){
      const s=combatHudState(game);active=game.state!=='paused'&&game.state!=='lost'&&game.state!=='won'&&s.hp>0;if(!active)reset();
      text('hp',String(Math.ceil(s.hp)));text('shield',String(Math.ceil(s.shield)));prop(vitals,'--fill',(s.hp/100).toFixed(3));
      flag(vitals,'critical',s.critical);flag(vitals,'regenerating',s.regenerating);
      const shielded=s.shieldCapacity>0,broken=shielded&&s.shield<=0;shieldBar.hidden=shieldNumber.hidden=!shielded;
      if(shielded)prop(shieldBar,'--fill',(s.shield/s.shieldCapacity).toFixed(3));
      flag(vitals,'shield-broken',broken);flag(vitals,'shield-charging',s.shieldCharging);
      text('vitalNote',s.critical?'CRITIQUE':broken?'BOUCLIER ROMPU':'');updateArsenal(game);chargeButton.setAttribute('aria-label','Lancer une grenade à impulsion · '+s.charges+' disponible'+(s.charges>1?'s':''));
      crouchButton.setAttribute('aria-pressed',String(!!game.player?.crouched));
      const arc=s.hit?(s.hit.angle*180/Math.PI).toFixed(0)+'|'+s.hit.strength.toFixed(2):'';
      if(last.get('arc')!==arc){last.set('arc',arc);hitRing.style.opacity=s.hit?s.hit.strength.toFixed(2):'0';if(s.hit)hitRing.style.setProperty('--angle',(s.hit.angle*180/Math.PI).toFixed(1)+'deg');}
      text('weapon',s.weapon.toUpperCase());text('ammo',s.melee?'LAME':String(s.ammo));text('capacity',s.melee?'':'/ '+s.capacity);
      prop(arms,'--fill',(s.reloading?s.reloadProgress:s.melee?1:s.capacity?s.ammo/s.capacity:0).toFixed(3));
      flag(arms,'reloading',s.reloading);flag(arms,'empty',s.empty);flag(arms,'low',!s.melee&&!s.reloading&&s.capacity>0&&s.ammo>0&&s.ammo<=s.capacity*.25);
      text('armsNote',s.reloading?'RECHARGE':s.empty?'VIDE':'');$('.pw-hud-reload').disabled=s.melee||s.reloading;
      return s;
    },
    setVisible(visible){if(!visible)reset();root.hidden=!visible;},
    dispose(){if(disposed)return;reset();disposed=true;doc.removeEventListener('pointerdown',outside,true);doc.removeEventListener('keydown',key,true);doc.removeEventListener('pw-hud-overlay',blur);doc.defaultView.removeEventListener('blur',blur);doc.removeEventListener('visibilitychange',visibility);root.remove();doc.body.classList.remove('pw-unified-hud','pw-immersion-hud','pw-hud-lobby-page');}
  };api.setCharacter(characterId);return api;
}
