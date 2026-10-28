import {WEAPONS} from './game-logic.js';
import {rangeSessionTime} from './shooting-range.js';

export function armoryRegions(indices){return [...indices.map((index,i)=>({index,x:48+i%3*318,y:184+Math.floor(i/3)*148,w:292,h:124})),{index:-1,x:48,y:746,w:928,h:96}];}
export function armoryChoiceAt(indices,x,y){return armoryRegions(indices).find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)?.index??null;}

export function createRangeArmoryMenu({getGame,onChoose,onChange=()=>{}}){
 if(!document.querySelector('[data-range-armory-style]')){const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./range-armory.css?v=3.66.0',import.meta.url).href;css.dataset.rangeArmoryStyle='';document.head.append(css);}
 const root=document.createElement('section');root.className='pw-range-armory';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Armurerie du stand');
 root.innerHTML='<div class="pw-range-armory-panel"><header><div><small>STAND DE TIR</small><h2>Armurerie</h2></div><button type="button" data-armory-close aria-label="Fermer l’armoire">×</button></header><p>Choisissez une arme. Le chronomètre et les points repartent à zéro.</p><div class="pw-range-armory-grid"></div><footer>Relancez ensuite les cibles depuis l’interrupteur de votre box.</footer></div>';
 const readout=document.createElement('aside');readout.className='pw-range-session';readout.hidden=true;readout.setAttribute('aria-label','Résultats de l’exercice');readout.innerHTML='<span><small>TEMPS</small><b data-range-time>00:00</b></span><i></i><span><small>POINTS</small><b data-range-points>00000</b></span>';
 document.body.append(root,readout);
 const grid=root.querySelector('.pw-range-armory-grid'),timer=readout.querySelector('[data-range-time]'),score=readout.querySelector('[data-range-points]');
 let active=false,xrMode=false,shown=false,signature='',focused=0,previousFocus=null,previousGame=null,xr=null,disposed=false,padPressed=false,padBack=false,padDirection=0;
 const buttons=()=>[...grid.querySelectorAll('button')],close=()=>{getGame()?.closeRangeArmory?.();sync({active,xrMode});};
 const columns=()=>Math.max(1,getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length);
 function choose(index,direct=false){if(onChoose(index,{direct})){sync({active,xrMode});return true;}return false;}
 function refresh(){const game=getGame(),indices=game?.rangeWeapons||[],key=indices.join(',')+':'+game?.weaponIndex;
  if(key!==signature){signature=key;grid.replaceChildren();for(const index of indices){const w=WEAPONS[index],b=document.createElement('button');b.type='button';b.dataset.rangeChoose=String(index);b.setAttribute('aria-pressed',String(index===game.weaponIndex));b.innerHTML='<strong></strong><span></span><small></small>';b.querySelector('strong').textContent=w.name;b.querySelector('span').textContent=w.label;b.querySelector('small').textContent=index===game.weaponIndex?'ÉQUIPÉE':w.capacity+' CELLULES';b.onclick=()=>choose(index);grid.append(b);}focused=Math.max(0,indices.indexOf(game.weaponIndex));if(xr)xr.dirty=true;}
 }
 function focusStep(offset){const all=buttons();focused=(focused+offset+all.length)%all.length;all[focused]?.focus({preventScroll:true});if(xr)xr.dirty=true;}
 function sync(state={}){
  if(disposed)return;active=!!state.active;xrMode=!!state.xrMode;const game=getGame();
  if(previousGame&&previousGame!==game){previousGame.closeRangeArmory?.();previousGame.setInteractionPosition?.();}previousGame=game;
  if(!active||!xrMode){game?.setInteractionPosition?.();game&&(game.armoryHover=null);xr?.world?.rangeArt?.setArmoryHover?.();}
  if(!xrMode)xr?.blockedTriggers.clear();
  if(!active)game?.closeRangeArmory?.();const open=active&&game?.mode==='training'&&!!game.rangeArmoryOpen;
  if(open)refresh();root.hidden=!open||xrMode;readout.hidden=!active||game?.mode!=='training'||open;
  if(!readout.hidden){const time=rangeSessionTime(game.trainingElapsed),points=String(game.score).padStart(5,'0');if(timer.textContent!==time)timer.textContent=time;if(score.textContent!==points)score.textContent=points;}
  if(open!==shown){shown=open;onChange(open);padPressed=true;padBack=true;padDirection=0;if(xr){for(const h of Object.values(xr.hands))Object.assign(h,{trigger:true,grip:true,stick:true,confirm:true,back:true,navDirection:0});xr.navigation=false;xr.placed=false;xr.dirty=true;}if(open){previousFocus=document.activeElement;if(!xrMode)buttons()[focused]?.focus({preventScroll:true});}else if(!xrMode)previousFocus?.focus?.({preventScroll:true});}
  if(xr&&(!open||!xrMode)){xr.mesh.visible=false;xr.beam.visible=false;}
 }
 const key=event=>{
  if(!shown)return;event.stopImmediatePropagation();event.preventDefault();if(event.repeat)return;
  if(event.code==='Escape'||event.code==='KeyF')close();
  else if(event.code==='Tab'){const all=[...buttons(),root.querySelector('[data-armory-close]')],i=all.indexOf(document.activeElement);all[(i+(event.shiftKey?-1:1)+all.length)%all.length]?.focus({preventScroll:true});}
  else if(event.code==='ArrowRight')focusStep(1);
  else if(event.code==='ArrowLeft')focusStep(-1);
  else if(event.code==='ArrowDown')focusStep(xrMode?3:columns());
  else if(event.code==='ArrowUp')focusStep(xrMode?-3:-columns());
  else if(event.code==='Enter'||event.code==='Space'){if(document.activeElement===root.querySelector('[data-armory-close]'))close();else buttons()[focused]?.click();}
 };
 root.querySelector('[data-armory-close]').onclick=close;root.addEventListener('pointerdown',e=>e.stopPropagation());
 grid.addEventListener('focusin',event=>{const index=buttons().indexOf(event.target.closest('button'));if(index>=0)focused=index;});
 document.addEventListener('keydown',key,true);
 function paint(){
  const g=getGame(),indices=g.rangeWeapons,c=xr.canvas.getContext('2d');c.clearRect(0,0,1024,900);c.fillStyle='#1b211f';c.beginPath();c.roundRect(0,0,1024,900,38);c.fill();c.strokeStyle='#9e9276';c.lineWidth=3;c.stroke();c.fillStyle='#d9c397';c.font='600 24px sans-serif';c.fillText('STAND DE TIR',48,56);c.fillStyle='#f0eee5';c.font='600 51px sans-serif';c.fillText('Armurerie',48,122);c.font='22px sans-serif';c.fillStyle='#ccc6b5';c.fillText('Chaque nouvelle arme remet le temps et les points à zéro.',48,162);
  for(const r of armoryRegions(indices)){const hover=xr.hover===r.index;c.fillStyle=hover?'#aa976b':r.index===g.weaponIndex?'#4a5140':'#303a35';c.beginPath();c.roundRect(r.x,r.y,r.w,r.h,22);c.fill();c.fillStyle=hover?'#151b18':'#f0eee6';c.font='600 31px sans-serif';c.fillText(r.index<0?'FERMER':WEAPONS[r.index].name,r.x+20,r.y+46,r.w-40);if(r.index>=0){c.font='21px sans-serif';c.fillText(WEAPONS[r.index].label,r.x+20,r.y+82,r.w-40);c.font='17px sans-serif';c.fillText(r.index===g.weaponIndex?'ÉQUIPÉE':WEAPONS[r.index].capacity+' CELLULES',r.x+20,r.y+108,r.w-40);}}
  c.fillStyle='#d1c8b5';c.font='21px sans-serif';c.fillText('Deux mains · gâchette / prise · stick + A : équiper · B : fermer',48,698,928);xr.texture.needsUpdate=true;xr.dirty=false;
 }
 function prepareXR(controller){
  // WebXR's ArrayCamera contains raw reference-space poses at input time.
  // First update the rig, then read the parented game camera. Never rewrite
  // the ArrayCamera / per-eye matrices through getWorldPosition().
  controller.positionRig?.();
  const world=controller.hooks.world(),T=world.T,scene=world.scene,camera=world.camera;
  if(!xr){
   const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=900;const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
   const mesh=new T.Mesh(new T.PlaneGeometry(1.14,1.001953125),new T.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,side:T.DoubleSide,toneMapped:false}));mesh.name='Stand / choix des armes immersif';mesh.renderOrder=205;mesh.frustumCulled=false;
   const geometry=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),beam=new T.Line(geometry,new T.LineBasicMaterial({color:0xe5c88e,depthTest:false}));beam.renderOrder=206;beam.frustumCulled=false;
   const hands={};for(const name of ['left','right'])hands[name]={name,origin:new T.Vector3(),direction:new T.Vector3(),q:new T.Quaternion(),point:new T.Vector3(),trigger:true,grip:true,stick:true,confirm:true,back:true,navDirection:0};
   xr={canvas,texture,mesh,beam,geometry,hands,blockedTriggers:new Set(),head:new T.Vector3(),facing:new T.Quaternion(),up:new T.Vector3(0,1,0),caster:new T.Raycaster(),dirty:true,placed:false,hover:null,navigation:false};
  }
  if(xr.mesh.parent!==scene){scene.add(xr.mesh,xr.beam);xr.placed=false;}xr.world=world;xr.beam.visible=false;
  camera.getWorldPosition(xr.head);camera.getWorldQuaternion(xr.facing);getGame().setInteractionPosition?.(xr.head);
  const hand=controller.settings?.hand==='left'?'left':'right';if(hand!==xr.hand){xr.hand=hand;xr.dirty=true;}
  return [hand,hand==='left'?'right':'left'].map(name=>{
   const h=xr.hands[name],entry=controller.controllers.find(c=>c.tracked&&c.ray.userData.source?.handedness===name),pad=entry?.ray.userData.source?.gamepad;
   if(!entry){Object.assign(h,{trigger:true,grip:true,stick:true,confirm:true,back:true,navDirection:0});return {h,tracked:false};}
   const down=i=>!!pad?.buttons?.[i]?.pressed||(pad?.buttons?.[i]?.value||0)>.15,trigger=down(0),grip=down(1),stick=down(3),confirm=name==='right'&&down(4),back=name==='right'&&down(5),axis=pad?.axes?.length>=4?2:0;
   const direction=(pad?.axes?.[axis+1]||0)<-.55?-3:(pad?.axes?.[axis+1]||0)>.55?3:(pad?.axes?.[axis]||0)<-.55?-1:(pad?.axes?.[axis]||0)>.55?1:0;
   const input={h,tracked:true,trigger,grip,press:trigger&&!h.trigger||grip&&!h.grip,confirm:confirm&&!h.confirm,back:back&&!h.back,close:name!==hand&&stick&&!h.stick,navigate:direction&&direction!==h.navDirection?direction:0};
   Object.assign(h,{trigger,grip,stick,confirm,back,navDirection:direction});
   entry.ray.updateWorldMatrix(true,false);entry.ray.getWorldPosition(h.origin);entry.ray.getWorldQuaternion(h.q);h.direction.set(0,0,-1).applyQuaternion(h.q);(entry.anchor||entry.ray).getWorldPosition(h.point);return input;
  });
 }
 function beamTo(point,origin){const points=xr.geometry.attributes.position;points.setXYZ(0,origin.x,origin.y,origin.z);points.setXYZ(1,point.x,point.y,point.z);points.needsUpdate=true;xr.beam.visible=true;}
 function xrInput(controller){
  const inputs=prepareXR(controller),g=getGame();
  for(const input of inputs)if(input.tracked&&!input.trigger)xr.blockedTriggers.delete(input.h.name);
  const blockTriggers=()=>{for(const input of inputs)if(input.trigger)xr.blockedTriggers.add(input.h.name);};
  xr.world.rangeArt?.setArmoryHover?.();g.armoryHover=null;
  if(!shown){
   xr.mesh.visible=false;
   const targets=inputs.filter(i=>i.tracked).map(input=>{const pointed=g.armoryTarget?.(input.h.origin,input.h.direction),reach=g.armoryHandTarget?.(input.h.point);return {input,target:input.grip&&reach?reach:pointed||reach};}).filter(t=>t.target);
   const candidate=targets.find(t=>t.input.press)||targets[0];
   if(candidate){const {input,target}=candidate;g.armoryHover=target.index;xr.world.rangeArt?.setArmoryHover?.(target.index);beamTo(target.point,input.h.origin);if(input.press&&choose(target.index,true))blockTriggers();}
   return xr.blockedTriggers.size>0||targets.some(t=>t.input.trigger||t.input.grip);
  }
  if(!g.nearRangeArmory()){close();return true;}
  if(inputs.some(i=>i.back||i.close)){close();return true;}
  xr.mesh.visible=true;
  if(!xr.placed){
   xr.mesh.position.copy(xr.head);const direction=new (xr.world.T.Vector3)(0,0,-1).applyQuaternion(xr.facing);direction.y=0;
   if(direction.lengthSq()<.01)direction.set(0,0,1);direction.normalize();
   xr.mesh.position.addScaledVector(direction,1.6);xr.mesh.position.y-=.08;xr.mesh.quaternion.setFromAxisAngle(xr.up,Math.atan2(-direction.x,-direction.z));xr.placed=true;
  }
  xr.mesh.updateMatrixWorld(true);
  const navigation=inputs.find(i=>i.navigate);if(navigation){focused=(focused+navigation.navigate+g.rangeWeapons.length)%g.rangeWeapons.length;xr.navigation=true;xr.dirty=true;}
  const pointed=[];
  for(const input of inputs){if(!input.tracked)continue;xr.caster.set(input.h.origin,input.h.direction);xr.caster.near=.02;xr.caster.far=5;const hit=xr.caster.intersectObject(xr.mesh)[0];if(hit){const index=armoryChoiceAt(g.rangeWeapons,hit.uv.x*1024,(1-hit.uv.y)*900);if(index!==null)pointed.push({input,hit,index});}}
  const selection=pointed.find(p=>p.input.press),pointer=selection||pointed[0];
  if(pointer)beamTo(pointer.hit.point,pointer.input.h.origin);
  if(selection){xr.navigation=false;if(selection.index<0)close();else if(choose(selection.index))blockTriggers();return true;}
  if(inputs.some(i=>i.confirm)||xr.navigation&&inputs.some(i=>i.press)){const index=!xr.navigation&&pointer?pointer.index:g.rangeWeapons[focused];if(index<0)close();else if(choose(index))blockTriggers();return true;}
  const hover=xr.navigation?g.rangeWeapons[focused]:pointer?.index??null;
  if(!xr.navigation&&hover!==null&&hover>=0)focused=g.rangeWeapons.indexOf(hover);
  if(hover!==xr.hover){xr.hover=hover;xr.dirty=true;}
  if(shown&&xr.dirty)paint();return true;
 }
 return {root,readout,sync,get isOpen(){return shown;},
  input({controller,desktop,xr:immersive}){
   if(immersive&&active&&getGame()?.mode==='training')return xrInput(controller);
   if(!shown)return false;
   if(desktop){const down=i=>!!desktop.buttons[i]?.pressed||(desktop.buttons[i]?.value||0)>.5,axis=i=>Number(desktop.axes[i])||0;
    const direction=down(12)||axis(1)<-.55?-columns():down(13)||axis(1)>.55?columns():down(14)||axis(0)<-.55?-1:down(15)||axis(0)>.55?1:0;
    if(direction&&!padDirection)focusStep(direction);if(down(0)&&!padPressed)buttons()[focused]?.click();if(down(1)&&!padBack)close();padPressed=down(0);padBack=down(1);padDirection=direction;
   }return true;
  },
  dispose(){disposed=true;previousGame?.closeRangeArmory?.();previousGame?.setInteractionPosition?.();xr?.world?.rangeArt?.setArmoryHover?.();root.remove();readout.remove();document.removeEventListener('keydown',key,true);if(xr){xr.mesh.removeFromParent();xr.beam.removeFromParent();xr.mesh.geometry.dispose();xr.mesh.material.dispose();xr.texture.dispose();xr.geometry.dispose();xr.beam.material.dispose();}}
 };
}
