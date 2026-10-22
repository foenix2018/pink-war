// M02 official Pink Wars controls adapter.
// Input mappings are imported from the game's production desktop-input module
// instead of copying arbitrary button values.
import {DesktopGamepadInput,DESKTOP_BUTTONS,desktopAxis} from './desktop-input.js';
export const PINK_WARS_KEYS=Object.freeze({
  forward:['KeyW','KeyZ'],back:'KeyS',left:['KeyA','KeyQ'],right:'KeyD',
  fire:'Space',jump:'KeyJ',interact:'KeyF',next:'KeyE',reload:'KeyR',
  crouch:'KeyC',view:'KeyV',pause:'Escape',sprint:['ShiftLeft','ShiftRight']
});
export function createPinkWarsInput(){
 const input=new DesktopGamepadInput(),previous=new Set();
 const pressed=(p,n)=>!!p?.buttons[n]?.pressed||Number(p?.buttons[n]?.value||0)>.15;
 const held=(keys,...codes)=>codes.some(k=>keys.has(k));
 function read(dt,keys,devices,{focused=true}={}){
  const pad=input.select(devices||[],{focused});
  const normalized=pad?pad.axes:[0,0,0,0];
  const actions={};const edges=new Set();
  for(const [action,index] of Object.entries(DESKTOP_BUTTONS)){
    const state=pad&&pressed(pad,index);
    const token='gamepad:'+action;
    if(state&&!previous.has(token))edges.add(action);
    if(state)previous.add(token);else previous.delete(token);
    actions[action]=!!state;
  }
  return {
   moveX:desktopAxis(normalized[0])+(held(keys,...PINK_WARS_KEYS.right)?1:0)-(held(keys,...PINK_WARS_KEYS.left)?1:0),
   moveZ:desktopAxis(normalized[1])+(keys.has(PINK_WARS_KEYS.back)?1:0)-(held(keys,...PINK_WARS_KEYS.forward)?1:0),
   lookX:desktopAxis(normalized[2])*1.6+(keys.has('ArrowRight')?1.4:0)-(keys.has('ArrowLeft')?1.4:0),
   lookY:desktopAxis(normalized[3])*1.35+(keys.has('ArrowDown')?1.15:0)-(keys.has('ArrowUp')?1.15:0),
   fire:actions.fire||keys.has(PINK_WARS_KEYS.fire),
   aim:actions.aim,
   sprint:actions.sprint||held(keys,...PINK_WARS_KEYS.sprint),
   jump:edges.has('jump')||keys.has(PINK_WARS_KEYS.jump),
   crouchToggle:edges.has('crouch'),
   interact:edges.has('interact'),next:edges.has('next'),reload:edges.has('reload'),pause:edges.has('pause')
  };
 }
 return {read,reset(){input.reset();previous.clear();}};
}
// An actual two-stick mobile input, matching Pink Wars' original touch control
// direction and pointer capture semantics.
export function createPinkWarsTouch(host,{onFire,onJump,onInteract,onNext,onReload,onCrouch,onView,onPause,onAim}={}){
 const touch=('ontouchstart' in window)||navigator.maxTouchPoints>0;
 if(!touch)return {state:{x:0,z:0,lookX:0,lookY:0,fire:false,aim:false},reset(){}};
 const root=document.createElement('div');root.id='m02-touch-controls';
 root.innerHTML='<div class="m02-stick" id="m02-move" aria-label="Déplacement"><div class="m02-stick-ring"><span class="m02-stick-knob"></span></div><small>SE DÉPLACER</small></div>'+
   '<div class="m02-stick" id="m02-look" aria-label="Regarder"><div class="m02-stick-ring"><span class="m02-stick-knob"></span></div><small>REGARDER</small></div>'+
   '<div class="m02-actions"><button data-m02="aim">VISER</button><button data-m02="fire">TIR</button><button data-m02="jump">↑ SAUT</button><button data-m02="interact">F · ACTION</button><button data-m02="next">ARME</button><button data-m02="reload">↻</button><button data-m02="crouch">ACCROUPI</button><button data-m02="view">VUE</button><button data-m02="pause">Ⅱ</button></div>';
 document.body.append(root);
 const state={x:0,z:0,lookX:0,lookY:0,fire:false,aim:false};
 const bindStick=(id,ax,az)=>{
  const element=root.querySelector(id),ring=element.querySelector('.m02-stick-ring'),knob=element.querySelector('.m02-stick-knob');
  let pointer=null;
  function set(e){
   const box=ring.getBoundingClientRect(),r=box.width*.32;
   const dx=e.clientX-(box.left+box.width/2),dy=e.clientY-(box.top+box.height/2),norm=Math.min(1,r/(Math.hypot(dx,dy)||1));
   const x=dx*norm/r,y=dy*norm/r;
   state[ax]=Math.abs(x)<.08?0:x;state[az]=Math.abs(y)<.08?0:y;
   knob.style.transform='translate('+dx*norm+'px,'+dy*norm+'px)';
  }
  const release=e=>{if(pointer!==e.pointerId)return;pointer=null;state[ax]=state[az]=0;knob.style.transform='';};
  element.addEventListener('pointerdown',e=>{if(pointer!==null)return;e.preventDefault();pointer=e.pointerId;try{element.setPointerCapture(e.pointerId);}catch{}set(e);});
  element.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;e.preventDefault();set(e);});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(name,release);
 };
 bindStick('#m02-move','x','z');bindStick('#m02-look','lookX','lookY');
 const actions={jump:onJump,interact:onInteract,next:onNext,reload:onReload,crouch:onCrouch,view:onView,pause:onPause};
 for(const b of root.querySelectorAll('button')){
  const name=b.dataset.m02;
  b.addEventListener('pointerdown',e=>{
   e.preventDefault();e.stopPropagation();
   try{b.setPointerCapture(e.pointerId);}catch{}
   if(name==='fire'){state.fire=true;onFire?.(true);}
   else if(name==='aim'){state.aim=true;onAim?.(true);}
   else actions[name]?.();
  });
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>{
   if(name==='fire'){state.fire=false;onFire?.(false);}
   else if(name==='aim'){state.aim=false;onAim?.(false);}
  });
 }
 return {state,root,reset(){state.x=state.z=state.lookX=state.lookY=0;state.aim=state.fire=false;onFire?.(false);onAim?.(false);}};
}
