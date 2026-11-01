// Shared left-side skill drawer. The shortcut stays out of the combat HUD before M07;
// unlocking is owned by the simulation, never a DOM button or URL parameter.
import {companionPictogram,paintCompanionPictogram} from './companion-pictograms.js';
import {getActiveCombatHud} from './combat-hud.js';
import {paintCompanionPortrait} from './companion-portrait.js';
// Names shown to the player (canon « Les Héritiers du Silence »); the code keeps its internal keys.
const LABEL={Gaby:'GAB-1',Cara:'CAR-14'};
export function createCompanionMenu({getStatus,onUse,onChange=()=>{}}){
 if(!document.querySelector('[data-companion-style]')){
  const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./companion-menu.css?v=3.59',import.meta.url).href;style.dataset.companionStyle='';document.head.append(style);
 }
 const root=document.createElement('div');root.className='pw-companion';root.hidden=true;
 const toggle=document.createElement('button');toggle.className='pw-companion-toggle';toggle.type='button';toggle.setAttribute('aria-expanded','false');
 const panel=document.createElement('section');panel.className='pw-companion-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Compétences du partenaire');
 panel.innerHTML='<header><h2></h2><button type="button" aria-label="Fermer les compétences">×</button></header><p class="pw-companion-status"></p><div class="pw-companion-skills"></div><p class="pw-companion-note">G : ouvrir / fermer · choisir une compétence puis reprendre la visée.</p>';
 root.append(toggle,panel);document.body.append(root);
 let open=false,signature='',visible=false,disposed=false;
 const buttons=new Map();
 function refresh(){
  const status=getStatus();if(!status)return;root.dataset.unlocked=String(!!status.unlocked);
  const key=JSON.stringify([status.name,status.unlocked,status.energy,status.skills.map(s=>[s.id,Math.ceil(s.remaining),s.enabled])]);
  if(key===signature)return;signature=key;
  const color='#'+status.color.toString(16).padStart(6,'0');root.style.setProperty('--partner',color);
  if(toggle.dataset.hero!==status.hero){toggle.innerHTML=companionPictogram(status.hero);toggle.dataset.hero=status.hero;}
  const label=LABEL[status.name]||status.name;toggle.setAttribute('aria-label','Compétences de '+label);toggle.title=status.unlocked?label+' · compétences (G)':label+' · escorte : protection sous 50 % de santé et torche automatique';
  panel.querySelector('h2').textContent=label;
  panel.querySelector('.pw-companion-status').textContent=status.unlocked?'Liaison locale · énergie '+status.energy+' / 100':'Escorte active · protection sous 50 % de santé et torche automatique. Compétences avancées à la mission 7.';
  for(const s of status.skills){
   let button=buttons.get(s.id);
   if(!button){button=document.createElement('button');button.type='button';button.className='pw-companion-skill';button.dataset.skill=s.id;button.innerHTML='<strong></strong><small></small>';button.onclick=()=>use(s.id);buttons.set(s.id,button);panel.querySelector('.pw-companion-skills').append(button);}
   button.querySelector('strong').textContent=s.label+(status.unlocked&&s.remaining>0?' · '+Math.ceil(s.remaining)+' s':'');
   button.querySelector('small').textContent=s.detail+' Recharge : '+s.cooldown+' s · '+s.cost+' énergie.';
   button.disabled=!s.enabled;button.setAttribute('aria-disabled',String(!s.enabled));
  }
  if(xr)xr.dirty=true;
 }
 function setOpen(value){
  if(disposed||value&&(!visible||(!getStatus()?.unlocked&&!getActiveCombatHud())))return;open=!!value;panel.hidden=!open;toggle.hidden=open;
  toggle.setAttribute('aria-expanded',String(open));refresh();if(xr)xr.dirty=true;onChange(open);
  if(open)panel.querySelector('header button').focus({preventScroll:true});else if(!root.hidden)toggle.focus({preventScroll:true});
 }
 function use(id){if(onUse(id)){setOpen(false);return true;}signature='';refresh();return false;}
 toggle.onclick=()=>setOpen(!open);panel.querySelector('header button').onclick=()=>setOpen(false);
 const openFromGear=()=>{if(visible&&getStatus()?.unlocked)setOpen(true);};
 document.addEventListener('pw-hud-open-skills',openFromGear);
 const key=e=>{
  if(!visible||e.target?.closest?.('input,textarea,select'))return;
  if(e.code==='KeyG'||open&&e.code==='Escape'){
   e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)setOpen(!open);
  }else if(open)e.stopImmediatePropagation();
 };
 const outside=e=>{if(open&&!root.contains(e.target)){e.preventDefault();e.stopImmediatePropagation();setOpen(false);}};
 document.addEventListener('keydown',key,true);document.addEventListener('pointerdown',outside,true);
 let xr=null;
 function xrInput({T,scene,camera,left,right,trigger=false,enabled=false}={}){
  if(!xr&&enabled){
   const canvas=document.createElement('canvas');canvas.width=768;canvas.height=640;
   const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
   const material=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide,transparent:true,toneMapped:false});
   const mesh=new T.Mesh(new T.PlaneGeometry(1,1),material);mesh.name='GAB-1 CAR-14 / équipement au poignet gauche';mesh.frustumCulled=false;scene.add(mesh);
   const portrait=document.createElement('canvas');xr={canvas,texture,mesh,portrait,portraitHero:'',tab:'equipment',page:0,lastGearKey:'',dirty:true,pressed:!!trigger,enabled:false,ray:new T.Raycaster(),origin:new T.Vector3(),direction:new T.Vector3(),q:new T.Quaternion()};
  }
  if(!xr)return false;
  if(xr.mesh.parent!==scene&&scene)scene.add(xr.mesh);
  const wasXR=xr.enabled;xr.enabled=enabled;
  xr.mesh.visible=enabled&&visible&&!!(getActiveCombatHud()||getStatus()?.unlocked)&&!!left&&!!right;
  if(!xr.mesh.visible){xr.pressed=!!trigger;if(open&&(enabled||wasXR))setOpen(false);return false;}
  const {mesh}=xr;left.updateWorldMatrix(true,false);right.updateWorldMatrix(true,false);
  left.getWorldPosition(mesh.position);mesh.position.y+=.12;
  camera.getWorldQuaternion(mesh.quaternion);
  mesh.scale.set(open?.35:.066,open?.29:.055,1);mesh.updateMatrixWorld(true);
  right.getWorldPosition(xr.origin);right.getWorldQuaternion(xr.q);xr.direction.set(0,0,-1).applyQuaternion(xr.q);
  xr.ray.set(xr.origin,xr.direction);xr.ray.near=.025;xr.ray.far=2;
  const hit=xr.ray.intersectObject(mesh)[0],down=trigger&&!xr.pressed;xr.pressed=!!trigger;
  const hud=getActiveCombatHud(),equip=hud?.equipmentState(),weapons=equip?.weapons||[],status=getStatus(),pages=Math.max(1,Math.ceil(weapons.length/4));
  xr.page=Math.min(xr.page,pages-1);
  const signature=JSON.stringify([equip?.hero,equip?.weaponIndex,equip?.charges,weapons.map(w=>[w.index,w.ammo]),xr.tab,xr.page,status?.unlocked]);
  if(xr.lastGearKey!==signature){xr.lastGearKey=signature;xr.dirty=true;}
  if(hit&&down){
   if(!open){xr.tab='equipment';xr.page=0;setOpen(true);}
   else{
    const x=hit.uv.x*768,y=(1-hit.uv.y)*640;
    if(y<94){if(x>=670)setOpen(false);else if(x>=330&&status?.unlocked)xr.tab='skills';else xr.tab='equipment';}
    else if(xr.tab==='equipment'){
     if(y>=110&&y<195&&equip?.charges>0){if(hud?.throwGrenade())setOpen(false);}
     else if(y>=232&&y<515){const i=Math.floor((y-232)/70),w=weapons[xr.page*4+i];if(i>=0&&i<4&&w&&hud?.chooseWeapon(w.index))setOpen(false);}
     else if(y>=540){xr.page=x<345?Math.max(0,xr.page-1):Math.min(pages-1,xr.page+1);}
    }else if(xr.tab==='skills'&&status?.unlocked){
     const i=Math.floor((y-178)/126),skill=status.skills[i];if(i>=0&&i<3&&skill?.enabled)use(skill.id);
    }
   }
   xr.dirty=true;
  }
  if(xr.dirty){
   const c=xr.canvas.getContext('2d'),tint='#'+status.color.toString(16).padStart(6,'0');
   c.clearRect(0,0,768,640);c.fillStyle='#101c29';c.beginPath();c.roundRect(0,0,768,640,40);c.fill();
   if(xr.portraitHero!==status.hero){paintCompanionPortrait(xr.portrait.getContext('2d'),status.hero==='LYLU'?'lylu':'ghju',128);xr.portraitHero=status.hero;}
   if(!open){
    c.drawImage(xr.portrait,274,55,220,220);c.textAlign='center';c.fillStyle=tint;c.font='bold 50px sans-serif';c.fillText(LABEL[status.name]||status.name.toUpperCase(),384,352);
    c.font='28px sans-serif';c.fillText('ÉQUIPEMENT',384,413);c.textAlign='left';
   }else{
    c.fillStyle=tint;c.fillRect(0,0,12,640);c.font='bold 30px sans-serif';
    c.fillStyle=xr.tab==='equipment'?tint:'#9cabc2';c.fillText('ÉQUIPEMENT',35,60);
    c.fillStyle=xr.tab==='skills'?tint:'#9cabc2';c.fillText(status.unlocked?'COMPÉTENCES':'VERROUILLÉ',347,60);
    c.fillStyle='#eaf1ff';c.font='bold 35px sans-serif';c.fillText('×',704,61);
    if(xr.tab==='equipment'){
     c.fillStyle=equip?.charges>0?'#584739':'#28313c';c.beginPath();c.roundRect(28,110,712,85,22);c.fill();
     c.fillStyle='#ffd0a3';c.font='bold 27px sans-serif';c.fillText('GRENADE · CHARGE À IMPULSION',48,162);
     c.textAlign='right';c.fillText(String(equip?.charges??0),704,162);c.textAlign='left';
     c.fillStyle='#c6d7e9';c.font='22px sans-serif';c.fillText('ARMES DÉBLOQUÉES',36,225);
     weapons.slice(xr.page*4,xr.page*4+4).forEach((w,i)=>{const y=234+i*70,selected=w.index===equip.weaponIndex;
      c.fillStyle=selected?'#395874':'#24394b';c.beginPath();c.roundRect(28,y,712,62,17);c.fill();
      if(selected){c.strokeStyle=tint;c.lineWidth=2;c.stroke();}
      c.fillStyle='#edf5ff';c.font='bold 27px sans-serif';c.fillText(w.name,48,y+41);
      c.textAlign='right';c.font='24px sans-serif';c.fillText(w.melee?'LAME':w.ammo+' / '+w.capacity,713,y+41);c.textAlign='left';});
     c.fillStyle='#c6d7e9';c.font='22px sans-serif';
     if(pages>1){c.fillText('‹ PRÉCÉDENT',36,597);c.textAlign='center';c.fillText((xr.page+1)+' / '+pages,384,597);c.textAlign='right';c.fillText('SUIVANT ›',720,597);c.textAlign='left';}
     else c.fillText('Index droit : sélectionner · main gauche : panneau',36,597);
    }else{
     c.fillStyle='#d0dedb';c.font='25px sans-serif';c.fillText('ÉNERGIE '+status.energy+' / 100',36,128);
     status.skills.forEach((skill,i)=>{const y=178+i*126;c.fillStyle=skill.enabled?'#344b50':'#222e32';c.beginPath();c.roundRect(28,y,712,112,30);c.fill();
      c.fillStyle=skill.enabled?'#e8f1eb':'#a1b2af';c.font='bold 27px sans-serif';c.fillText(skill.label,48,y+43,655);
      c.font='23px sans-serif';c.fillText(status.unlocked?(skill.remaining>0?Math.ceil(skill.remaining)+' s':'PRÊT'):'EN SOMMEIL',48,y+82);});
    }
   }
   xr.texture.needsUpdate=true;xr.dirty=false;
  }
  return !!hit&&!!trigger||open;
 }
 return {root,refresh,xrInput,get isOpen(){return open;},setOpen,
  setVisible(value){visible=!!value;root.hidden=!visible;if(xr&&!visible)xr.mesh.visible=false;if(!visible&&open)setOpen(false);if(visible)refresh();},
  dispose(){disposed=true;document.removeEventListener('pw-hud-open-skills',openFromGear);document.removeEventListener('keydown',key,true);document.removeEventListener('pointerdown',outside,true);root.remove();if(xr){xr.mesh.removeFromParent();xr.mesh.geometry.dispose();xr.mesh.material.dispose();xr.texture.dispose();}}
 };
}
