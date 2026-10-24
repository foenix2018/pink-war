// Shared left-side skill drawer. Locked entries remain informative before M07;
// unlocking is owned by the simulation, never a DOM button or URL parameter.
export function createCompanionMenu({getStatus,onUse,onChange=()=>{}}){
 if(!document.querySelector('[data-companion-style]')){
  const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./companion-menu.css?v=3.57',import.meta.url).href;style.dataset.companionStyle='';document.head.append(style);
 }
 const root=document.createElement('div');root.className='pw-companion';root.hidden=true;
 const toggle=document.createElement('button');toggle.className='pw-companion-toggle';toggle.type='button';toggle.setAttribute('aria-expanded','false');toggle.innerHTML='<span aria-hidden="true"></span><b></b>';
 const panel=document.createElement('section');panel.className='pw-companion-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Compétences du partenaire');
 panel.innerHTML='<header><h2></h2><button type="button" aria-label="Fermer les compétences">×</button></header><p class="pw-companion-status"></p><div class="pw-companion-skills"></div><p class="pw-companion-note">G : ouvrir / fermer · choisir une compétence puis reprendre la visée.</p>';
 root.append(toggle,panel);document.body.append(root);
 let open=false,signature='',visible=false,disposed=false;
 const buttons=new Map();
 function refresh(){
  const status=getStatus();if(!status)return;
  const key=JSON.stringify([status.name,status.unlocked,status.energy,status.skills.map(s=>[s.id,Math.ceil(s.remaining),s.enabled])]);
  if(key===signature)return;signature=key;
  const color='#'+status.color.toString(16).padStart(6,'0');root.style.setProperty('--partner',color);
  toggle.querySelector('b').textContent=status.name.toUpperCase();toggle.setAttribute('aria-label','Compétences de '+status.name);
  panel.querySelector('h2').textContent=status.name.toUpperCase();
  panel.querySelector('.pw-companion-status').textContent=status.unlocked?'Liaison locale · énergie '+status.energy+' / 100':'Liaison en sommeil. Rencontre dans « Mémoires locales », mission 7.';
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
  if(disposed||!visible&&value)return;open=!!value;panel.hidden=!open;toggle.hidden=open;
  toggle.setAttribute('aria-expanded',String(open));refresh();if(xr)xr.dirty=true;onChange(open);
  if(open)panel.querySelector('header button').focus({preventScroll:true});else if(!root.hidden)toggle.focus({preventScroll:true});
 }
 function use(id){if(onUse(id)){setOpen(false);return true;}signature='';refresh();return false;}
 toggle.onclick=()=>setOpen(!open);panel.querySelector('header button').onclick=()=>setOpen(false);
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
   const material=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide,toneMapped:false});
   const mesh=new T.Mesh(new T.PlaneGeometry(1,1),material);mesh.name='Compétences / pupitre au poignet gauche';mesh.frustumCulled=false;scene.add(mesh);
   xr={canvas,texture,mesh,dirty:true,pressed:!!trigger,enabled:false,ray:new T.Raycaster(),origin:new T.Vector3(),direction:new T.Vector3(),q:new T.Quaternion()};
  }
  if(!xr)return false;
  if(xr.mesh.parent!==scene&&scene)scene.add(xr.mesh);
  const wasXR=xr.enabled;xr.enabled=enabled;
  xr.mesh.visible=enabled&&visible&&!!left&&!!right;
  if(!xr.mesh.visible){xr.pressed=!!trigger;if(open&&(enabled||wasXR))setOpen(false);return false;}
  const {mesh}=xr;left.updateWorldMatrix(true,false);right.updateWorldMatrix(true,false);
  left.getWorldPosition(mesh.position);mesh.position.y+=.12;
  camera.getWorldQuaternion(mesh.quaternion);
  mesh.scale.set(open?.35:.13,open?.29:.055,1);mesh.updateMatrixWorld(true);
  right.getWorldPosition(xr.origin);right.getWorldQuaternion(xr.q);xr.direction.set(0,0,-1).applyQuaternion(xr.q);
  xr.ray.set(xr.origin,xr.direction);xr.ray.near=.025;xr.ray.far=2;
  const hit=xr.ray.intersectObject(mesh)[0];const down=trigger&&!xr.pressed;xr.pressed=!!trigger;
  if(hit&&down){
   if(!open)setOpen(true);
   else{
    const y=(1-hit.uv.y)*640;
    if(y<94)setOpen(false);
    else{const index=Math.floor((y-178)/126),skill=getStatus().skills[index];if(index>=0&&index<3&&skill?.enabled)use(skill.id);}
   }
   xr.dirty=true;
  }
  if(xr.dirty){
   const c=xr.canvas.getContext('2d'),s=getStatus();c.fillStyle='#111c20';c.fillRect(0,0,768,640);
   c.fillStyle='#'+s.color.toString(16).padStart(6,'0');c.fillRect(0,0,12,640);c.font='bold 46px sans-serif';c.fillText(s.name.toUpperCase(),38,open?66:354);
   if(open){
    c.fillStyle='#d0dedb';c.font='25px sans-serif';c.fillText('FERMER ×',568,58);c.font='24px sans-serif';
    c.fillText(s.unlocked?'ÉNERGIE '+s.energy+' / 100':'RENCONTRE À LA MISSION 7',36,128);
    s.skills.forEach((skill,i)=>{const y=178+i*126;c.fillStyle=skill.enabled?'#344b50':'#222e32';c.fillRect(28,y,712,112);c.fillStyle=skill.enabled?'#e8f1eb':'#a1b2af';c.font='bold 27px sans-serif';c.fillText(skill.label,48,y+43,655);c.font='23px sans-serif';c.fillText(s.unlocked?(skill.remaining>0?Math.ceil(skill.remaining)+' s':'PRÊT'):'EN SOMMEIL',48,y+82);});
   }
   xr.texture.needsUpdate=true;xr.dirty=false;
  }
  return !!hit&&!!trigger||open;
 }
 return {root,refresh,xrInput,get isOpen(){return open;},setOpen,
  setVisible(value){visible=!!value;root.hidden=!visible;if(xr&&!visible)xr.mesh.visible=false;if(!visible&&open)setOpen(false);if(visible)refresh();},
  dispose(){disposed=true;document.removeEventListener('keydown',key,true);document.removeEventListener('pointerdown',outside,true);root.remove();if(xr){xr.mesh.removeFromParent();xr.mesh.geometry.dispose();xr.mesh.material.dispose();xr.texture.dispose();}}
 };
}
