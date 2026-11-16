/* Aerin — commandes inspirées du HUD de foenix2018/pink-war.
 * Scène autonome : déplacement, combat au contact, endurance et double joystick.
 * Le modèle et les clips sont les exports du squelette RLH/Mixamo. */
export async function startAerin(options) {
'use strict';
const signal = options?.signal;
const T=THREE,$=s=>document.querySelector(s),clamp=T.MathUtils.clamp;
const mount=$('#world'),scene=new T.Scene();scene.background=new T.Color(0x718571);scene.fog=new T.FogExp2(0x718571,.021);
let renderer;
renderer=new T.WebGPURenderer({antialias:true,powerPreference:'high-performance',alpha:false});
try { await renderer.init(); } catch (error) { renderer.dispose(); throw error; }
if (signal?.aborted) { renderer.dispose(); throw new Error('Initialisation WebGPU annulée'); }
renderer.setPixelRatio(Math.min(devicePixelRatio,window.aerinDevice?.quality==='mobile'?1:window.aerinDevice?.quality==='ultra'?1.65:1.3));
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
mount.appendChild(renderer.domElement);
const actualBackend = renderer.backend?.constructor?.name||'WebGPURenderer';
const isGPU = /webgpu/i.test(actualBackend) && !/webgl/i.test(actualBackend);
window.aerinRenderMode = isGPU?'WebGPU':'WebGL2 (repli)';
document.querySelector('#renderer-status').textContent='RENDU · '+window.aerinRenderMode;

const camera=new T.PerspectiveCamera(48,1,.045,120);
scene.add(new T.HemisphereLight(0xe9eed1,0x3d5541,1.25));const sun=new T.DirectionalLight(0xffecc5,3.05);sun.position.set(-9,16,8);sun.castShadow=true;sun.shadow.mapSize.set(window.aerinDevice?.quality==='mobile'?512:window.aerinDevice?.quality==='ultra'?2048:1536,window.aerinDevice?.quality==='mobile'?512:window.aerinDevice?.quality==='ultra'?2048:1536);Object.assign(sun.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:1,far:55});sun.shadow.normalBias=.025;scene.add(sun);scene.add(sun.target);
const rim=new T.DirectionalLight(0xc8dfd6,1.0);rim.position.set(7,4,-10);scene.add(rim);
// Procedural high-frequency PBR albedo, authored locally for offline textures.
function naturalTexture(kind,base,contrast=36){
 const c=document.createElement('canvas');c.width=c.height=256;const cx=c.getContext('2d');
 let seed=kind==='grass'?7718:kind==='bark'?3981:5183;
 const rng=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const pix=cx.createImageData(256,256),r=(base>>16)&255,g=(base>>8)&255,b=base&255;
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){const ix=(y*256+x)*4;const fleck=(rng()-.5)*contrast*2;
 const band=kind==='bark'?Math.sin(x*.51+y*.037)*15:kind==='stone'?Math.sin(x*.07+y*.12)*7:Math.sin(x*.29+y*.21)*8;
 const wet=kind==='grass'?(rng()>.985?-34:0):0;
 pix.data[ix]=Math.max(0,Math.min(255,r+fleck+band+wet));pix.data[ix+1]=Math.max(0,Math.min(255,g+fleck+band+wet));pix.data[ix+2]=Math.max(0,Math.min(255,b+fleck+band+wet));pix.data[ix+3]=255;}
 cx.putImageData(pix,0,0);const tex=new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;tex.repeat.set(kind==='grass'?15:kind==='stone'?2:1,kind==='grass'?15:kind==='bark'?4:2);return tex;
}
const texGrass=naturalTexture('grass',0x637455,23), texStone=naturalTexture('stone',0x737b6e,17),texBark=naturalTexture('bark',0x755539,19);
const mats={ground:new T.MeshStandardMaterial({color:0xb0c5a9,map:texGrass,roughness:.99,bumpMap:texGrass,bumpScale:.045}),stone:new T.MeshStandardMaterial({color:0xe0e8d8,map:texStone,roughness:.92,bumpMap:texStone,bumpScale:.025}),darkStone:new T.MeshStandardMaterial({color:0xa2b5a1,map:texStone,roughness:1,bumpMap:texStone,bumpScale:.05}),wood:new T.MeshStandardMaterial({color:0xc9ac87,map:texBark,roughness:.96,bumpMap:texBark,bumpScale:.027}),straw:new T.MeshStandardMaterial({color:0xbba472,roughness:1}),cloth:new T.MeshStandardMaterial({color:0x5c7054,roughness:1}),metal:new T.MeshStandardMaterial({color:0x9b9c78,metalness:.35,roughness:.65})};
function mesh(geo,mat,parent=scene,x=0,y=0,z=0){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(parent,size,pos,mat){return mesh(new T.BoxGeometry(...size),mat,parent,...pos);}
function cylinder(parent,r1,r2,h,pos,mat,n=10){return mesh(new T.CylinderGeometry(r1,r2,h,n),mat,parent,...pos);}
const ground=mesh(new T.CircleGeometry(80,96),mats.ground);ground.rotation.x=-Math.PI/2;ground.castShadow=false;ground.position.y=-.045;
const arena=cylinder(scene,15.6,15.7,.11,[0,-.095,0],mats.darkStone,96);
const inner=mesh(new T.CircleGeometry(14.9,96),new T.MeshStandardMaterial({color:0xc2c6ad,map:texGrass,roughness:1,bumpMap:texGrass,bumpScale:.03}));inner.rotation.x=-Math.PI/2;inner.position.y=-.035;inner.castShadow=false;
function ring(r,width,color,opacity=1){const m=mesh(new T.RingGeometry(r-width,r,96),new T.MeshBasicMaterial({color,transparent:opacity<1,opacity,side:T.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.y=.006;m.castShadow=false;return m;}
ring(15,.05,0xc8cfaa,.7);ring(7.9,.027,0xbdc5a2,.5);ring(3.2,.03,0xc6caa5,.45);
for(let i=0;i<15;i++){const s=box(scene,[1.28,.07,.9],[(i%2?-.04:.04),-.015,7.4-i*1.08],mats.stone);s.rotation.y=(i%3-1)*.055;}
let seed=607;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const obstacles=[];
for(let i=0;i<14;i++){const a=i/14*Math.PI*2,r=11.8+rand()*2;const x=Math.sin(a)*r,z=Math.cos(a)*r;const m=mesh(new T.DodecahedronGeometry(.5+rand()*.55,1),mats.darkStone,scene,x,.25,z);m.scale.set(1.3,.6+rand()*.5,1);m.rotation.set(rand(),rand(),rand());obstacles.push({x,z,r:.7});}
const temp=new T.Object3D();const trunks=new T.InstancedMesh(new T.CylinderGeometry(.17,.32,5,12),mats.wood,55),leaves=new T.InstancedMesh(new T.ConeGeometry(2.3,5,11),new T.MeshStandardMaterial({color:0x354e39,roughness:1,flatShading:true}),110);trunks.castShadow=true;leaves.castShadow=true;
for(let i=0;i<55;i++){const a=i/55*Math.PI*2+(rand()-.5)*.1,r=19+rand()*13,sc=.8+rand()*.7;temp.position.set(Math.sin(a)*r,2.5*sc,Math.cos(a)*r);temp.rotation.set(0,rand()*6,0);temp.scale.setScalar(sc);temp.updateMatrix();trunks.setMatrixAt(i,temp.matrix);for(let j=0;j<2;j++){temp.position.y=(5+j*2)*sc;temp.scale.setScalar(sc*(1-j*.22));temp.updateMatrix();leaves.setMatrixAt(i*2+j,temp.matrix);}}scene.add(trunks,leaves);
const bushMat=new T.MeshStandardMaterial({color:0x2f573c,roughness:.96});
const bushes=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),bushMat,140);bushes.castShadow=true;bushes.receiveShadow=true;
for(let i=0;i<140;i++){const angle=rand()*Math.PI*2, radius=15.75+rand()*19;
 temp.position.set(Math.sin(angle)*radius,.2+rand()*.35,Math.cos(angle)*radius);temp.rotation.set(rand()*.1,rand()*6.28,rand()*.1);
 const sc=.22+rand()*.42;temp.scale.set(sc*1.35,sc*.78,sc*1.35);temp.updateMatrix();bushes.setMatrixAt(i,temp.matrix);}
scene.add(bushes);

// Broken stone gateway gives the training ground a visible landmark.
for(const x of [-3.1,3.1]){box(scene,[.85,3.7,.95],[x,1.8,-11.4],mats.darkStone);box(scene,[1.12,.3,1.2],[x,3.55,-11.4],mats.stone);box(scene,[1.16,.3,1.2],[x,.1,-11.4],mats.stone);}
box(scene,[7,.5,1.1],[0,3.85,-11.4],mats.stone);
for(const x of [-4.3,4.3]){const post=new T.Group();post.position.set(x,0,-10.8);scene.add(post);cylinder(post,.04,.055,3,[0,1.5,0],mats.metal);const flag=box(post,[.72,1.2,.025],[.36,2.25,0],mats.cloth);flag.rotation.z=-.07;}
const motes=new Float32Array(60*3);for(let i=0;i<60;i++){motes[i*3]=(rand()-.5)*28;motes[i*3+1]=.4+rand()*3;motes[i*3+2]=(rand()-.5)*28;}
const particleGeo=new T.BufferGeometry();particleGeo.setAttribute('position',new T.BufferAttribute(motes,3));const particles=new T.Points(particleGeo,new T.PointsMaterial({color:0xe5e6b0,size:.045,transparent:true,opacity:.55,depthWrite:false}));scene.add(particles);
const player=new T.Group();player.position.set(0,0,4.6);player.rotation.y=Math.PI;scene.add(player);
const state={ready:false,started:false,paused:false,dead:false,hp:100,stamina:100,hits:0,blocks:0,defeated:0,view:'third',selected:0,comboQueued:false,action:null,actionTime:0,actionDuration:0,damageDone:false,time:0,regenDelay:0,lastDamage:-100,blockExhausted:false,sprintExhausted:false,currentClip:'',yaw:0,pitch:.28,sensitivity:1,toastUntil:0,flash:0,hitFlash:0,shield:100,magic:100,equipped:true,rollCooldown:0,guardWeight:0,combatTarget:-1,jumpAttack:false,rollStrikeQueued:false,motionSpeed:0,lock:-1,attackHold:0,charged:false,hitStop:0,shake:0,fullBody:false,lunge:0,flip:0,hopSide:0,turnRate:0,lastYaw:0,strafePhase:0,spinHits:0,lastSpark:0,crouch:false,deathTime:-1,victoryPending:false,chestOpen:false,lift:0,airborne:false,vy:0,airTime:0,airSlash:false,rollEntrySpeed:0};
const jumpMomentum=new T.Vector3();let bodyV13=null,hairV15=null;
const input={keys:new Set(),move:{x:0,y:0},look:{x:0,y:0},attack:new Set(),block:new Set(),sprintToggle:false};
let knight=null,motionMeta={},visual=null,lockMarker=null,strafeActs=null,strafeWeight=0,actor,mixer,activeAction,actions={},upperAttacks={},activeUpperAttack=null,bodyNodes=[],firstPersonArms=null,dodgeVector=new T.Vector3(),rollVector=new T.Vector3(),cameraReady=false,heldSword=null,heldShield=null,stowedSword=null,stowedShield=null;
const attacks=[{clip:'K_Slash1',legacy:'Sword_Slash',label:'TAILLE',cost:10,damage:25,hit:.36,lunge:.5},{clip:'K_Slash2',legacy:'Sword_Backslash',label:'REVERS',cost:12,damage:28,hit:.38,lunge:.45},{clip:'K_Slash3',legacy:'Sword_Overhead',label:'VERTICAL',cost:18,damage:40,hit:.44,lunge:.65},{clip:'K_Slash4',legacy:'Sword_Thrust',label:'ESTOC',cost:14,damage:30,hit:.42,lunge:.95}];
const loops=new Set(['Idle','Walk','Run','Combat_Idle','Shield_Hold','K_Guard','K_Run','K_Charge','K_StrafeL','K_StrafeR','K_GuardFwd','K_GuardBack']);
const dummyList=[];
const RING_CIRCUMFERENCE={energy:282.743,shield:213.628,magic:144.513};
function setRing(id,value,max,circ){const el=$(id);if(!el)return;const safe=Math.max(0,Math.min(max,Number(value)||0));el.style.strokeDashoffset=(circ*(1-safe/max)).toFixed(3);el.style.opacity=safe<=0?'.45':'1';}

// Reuse the actual Aerin sword and shield mesh geometry for backpack/belt props.
// The skinned surface is baked into static geometry only at the idle bind pose.
function makeStowedCopy(source,kind){
 if(!source)return null;
 actor.updateMatrixWorld(true);source.updateMatrixWorld(true);
 const inv=new T.Matrix4().copy(actor.matrixWorld).invert(),container=new T.Group();
 source.traverse(mesh=>{
  if(!mesh.isMesh||!mesh.geometry?.attributes?.position)return;
  mesh.updateMatrixWorld(true);
  const geometry=mesh.geometry.clone(),pos=geometry.attributes.position,v=new T.Vector3();
  for(let i=0;i<pos.count;i++){
   v.fromBufferAttribute(pos,i);
   if(mesh.isSkinnedMesh){if(typeof mesh.boneTransform==='function')mesh.boneTransform(i,v);else if(typeof mesh.applyBoneTransform==='function')mesh.applyBoneTransform(i,v);}
   v.applyMatrix4(mesh.matrixWorld).applyMatrix4(inv);
   pos.setXYZ(i,v.x,v.y,v.z);
  }
  geometry.deleteAttribute('skinIndex');geometry.deleteAttribute('skinWeight');geometry.computeVertexNormals();
  const part=new T.Mesh(geometry,mesh.material);part.castShadow=true;part.receiveShadow=true;container.add(part);
 });
 const bbox=new T.Box3().setFromObject(container),center=bbox.getCenter(new T.Vector3());
 for(const part of container.children)part.geometry.translate(-center.x,-center.y,-center.z);
 // Sword along the belt, shield slung on the back, kept visible while walking.
 if(kind==='sword'){container.position.set(.27,.67,-.13);container.rotation.set(0,0,-.30);}else{container.position.set(0,1.07,.25);container.rotation.set(0,Math.PI,.13);}
 actor.add(container);container.visible=false;return container;
}
function showEquipment(){
 const held=!!state.equipped;
 if(heldSword)heldSword.visible=held;
 if(heldShield)heldShield.visible=held;
 if(stowedSword)stowedSword.visible=!held&&state.view!=='first';
 if(stowedShield)stowedShield.visible=!held&&state.view!=='first';
 const el=$('#gear-button');if(el){el.setAttribute('aria-pressed',String(held));el.setAttribute('aria-label',held?'Ranger épée et bouclier (G)':'Dégainer épée et bouclier (G)');}
}
function labelSprite(name){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=90;const ctx=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));sprite.scale.set(1.7,.6,1);sprite.position.y=2.5;return{sprite,draw(hp,alert){ctx.clearRect(0,0,256,90);ctx.fillStyle='rgba(15,30,22,.85)';ctx.fillRect(14,10,228,65);ctx.textAlign='center';ctx.font='18px monospace';ctx.fillStyle=alert?'#ffc7a4':'#e6efce';ctx.fillText(alert?'RIPOSTE !':name,128,37);ctx.fillStyle='#46533c';ctx.fillRect(35,51,186,6);ctx.fillStyle=alert?'#e7a477':'#c8d99c';ctx.fillRect(35,51,186*hp/100,6);texture.needsUpdate=true;}};}
for(const [i,pos]of [[0,[-3.8,0,-1.5]],[1,[0,0,-3]],[2,[3.8,0,-1.5]]]){const root=new T.Group();root.position.set(...pos);scene.add(root);cylinder(root,.16,.24,1.25,[0,.6,0],mats.wood);const body=new T.Group();root.add(body);cylinder(body,.37,.3,.68,[0,1.3,0],mats.cloth,9);mesh(new T.IcosahedronGeometry(.25,1),mats.straw,body,0,1.94,0);box(body,[1.15,.13,.13],[0,1.6,0],mats.wood);const paddle=box(body,[.13,.67,.16],[.57,1.38,0],mats.wood);const emblem=cylinder(body,.19,.19,.04,[0,1.32,.31],mats.straw,16);emblem.rotation.x=Math.PI/2;const telegraph=ring(1.95,.035,0xd78560,.05);telegraph.position.x=pos[0];telegraph.position.z=pos[2];const label=labelSprite('MANNEQUIN 0'+(i+1));root.add(label.sprite);label.draw(100,false);dummyList.push({root,body,paddle,telegraph,label,hp:100,phase:'idle',timer:1+i*.4,respawn:0,hitTime:0});}
// V12 — coffre au trésor (ouverture, objet brandi : fiole de vie qui restaure tout).
const chest=(function(){const root=new T.Group();root.position.set(5.2,0,-6.2);root.rotation.y=-.9;scene.add(root);
 const wood=new T.MeshStandardMaterial({color:0x6a3f1e,roughness:.85}),band=new T.MeshStandardMaterial({color:0xc9973a,metalness:.6,roughness:.4});
 box(root,[.9,.45,.58],[0,.225,0],wood);for(const x of [-.36,.36])box(root,[.06,.47,.6],[x,.235,0],band);
 const lid=new T.Group();lid.position.set(0,.45,-.29);root.add(lid);const top=mesh(new T.CylinderGeometry(.29,.29,.9,14,1,false,0,Math.PI),wood,lid,0,0,.29);top.rotation.z=Math.PI/2;top.rotation.y=Math.PI/2;
 const lock=box(root,[.12,.14,.04],[0,.38,.3],band);
 const glow=new T.PointLight(0xffd889,0,2.4);glow.position.set(0,.7,0);root.add(glow);
 return {root,lid,glow};})();
const item=(function(){const g=new T.Group();g.visible=false;const glass=new T.MeshStandardMaterial({color:0xff5d7a,emissive:0xb81f45,emissiveIntensity:.8,roughness:.2,transparent:true,opacity:.9});
 mesh(new T.SphereGeometry(.07,14,10),glass,g,0,0,0);mesh(new T.CylinderGeometry(.025,.03,.07,10),glass,g,0,.08,0);mesh(new T.CylinderGeometry(.032,.032,.025,10),new T.MeshStandardMaterial({color:0x8a5a2b}),g,0,.125,0);
 const halo=new T.PointLight(0xff8aa0,0,3);g.add(halo);g.userData.halo=halo;scene.add(g);return g;})();
function showItem(on){item.visible=on;item.userData.halo.intensity=on?1.4:0;chest.glow.intensity=on?1.2:0;if(on)toast('TU OBTIENS : FIOLE DE VIE · TOUT EST RESTAURÉ',2.3);}
function canOpenChest(){if(state.chestOpen||!active()||state.action)return false;return player.position.distanceTo(chest.root.position)<1.7;}
function interact(){if(!active())return;if(canOpenChest()){beginAction('chest');return;}if(state.chestOpen&&player.position.distanceTo(chest.root.position)<1.7)toast('LE COFFRE EST VIDE',1);}
function toggleCrouch(){if(!active()||state.action)return;state.crouch=!state.crouch;if(!actions.K_Crouch)state.crouch=false;}
function toast(message,seconds=2){$('#toast').textContent=message;$('#toast').classList.add('visible');state.toastUntil=state.time+seconds;}
function setClip(name,fade=.13,speed=1){if(!mixer)return;if(name==='__strafe'){if(state.currentClip!=='__strafe'){if(activeAction)activeAction.fadeOut(fade);activeAction=null;state.currentClip='__strafe';strafeWeight=0;}return;}const next=actions[name];if(!next)return;if(state.currentClip==='__strafe'&&strafeActs){for(const a of strafeActs)a.fadeOut(fade);strafeWeight=0;}if(state.currentClip===name&&activeAction===next){activeAction.setEffectiveTimeScale(speed);return;}if(activeAction)activeAction.fadeOut(fade);next.reset().setEffectiveWeight(1).setEffectiveTimeScale(speed).fadeIn(fade).setLoop(loops.has(name)?T.LoopRepeat:T.LoopOnce,Infinity);next.clampWhenFinished=true;next.play();activeAction=next;state.currentClip=name;}
function tuneClipSpeed(speed=1){if(activeAction)activeAction.setEffectiveTimeScale(speed);}
function consume(amount){if(state.stamina+1e-6<amount){toast('ENDURANCE INSUFFISANTE',1);return false;}state.stamina=Math.max(0,state.stamina-amount);state.regenDelay=.65;return true;}
function active(){return state.ready&&state.started&&!state.paused&&!state.dead;}
function direction(){return new T.Vector3(Math.sin(player.rotation.y),0,Math.cos(player.rotation.y));}
function cameraForward(){return new T.Vector3(-Math.sin(state.yaw),0,-Math.cos(state.yaw));}
function prepareUpperAttacks(){
 const reference=(actions['K_Guard']||actions['Combat_Idle'])?.getClip();if(!reference)return;
 for(const attack of attacks){
  const full=actions[attack.clip]?.getClip();if(!full)continue;
  const tracks=full.tracks.filter(t=>t.name.endsWith('.quaternion')&&/^mixamorig(?:Spine[12]?|Neck|Head(?:Top_End)?|Left(?:Shoulder|Arm|ForeArm|Hand.*)|Right(?:Shoulder|Arm|ForeArm|Hand.*))\./.test(t.name)).map(t=>t.clone());
  if(!tracks.length)continue;
  const clip=new T.AnimationClip(attack.clip+'_upper',full.duration,tracks);
  if(T.AnimationUtils?.makeClipAdditive)T.AnimationUtils.makeClipAdditive(clip,0,reference);
  upperAttacks[attack.clip]=mixer.clipAction(clip);
 }
}
function playUpperAttack(clip,speed){
 const upper=upperAttacks[clip];if(!upper)return false;
 if(activeUpperAttack&&activeUpperAttack!==upper)activeUpperAttack.fadeOut(.09);
 upper.reset().setEffectiveWeight(1).setEffectiveTimeScale(speed).setLoop(T.LoopOnce,1);
 upper.clampWhenFinished=true;upper.fadeIn(.08).play();activeUpperAttack=upper;return true;
}
function fadeUpperAttack(){if(activeUpperAttack){activeUpperAttack.fadeOut(.12);activeUpperAttack=null;}}
function animateLocomotion(dt){
 if(state.airborne){if(actions.K_JumpAir&&!/K_Jump|K_RunJump/.test(state.currentClip))setClip('K_JumpAir',.15);return false;}
 const v=movement(),moving=v.lengthSq()>.001;
 const keyboardMove=['KeyW','KeyZ','KeyS','KeyA','KeyQ','KeyD'].some(k=>input.keys.has(k));
 const stickAmount=Math.min(1,Math.hypot(input.move.x,input.move.y));
 const amount=keyboardMove?1:stickAmount;
 const manualSprint=input.keys.has('ShiftLeft')||input.keys.has('ShiftRight')||input.sprintToggle;
 const sprint=moving&&(manualSprint||(!keyboardMove&&stickAmount>.82))&&!state.sprintExhausted;
 const walkSpeed=.85+1.75*Math.min(amount/.82,1),runSpeed=2.60+1.85*Math.min(1,Math.max(0,(amount-.82)/.18));
 const speed=manualSprint&&moving?4.45:sprint?runSpeed:keyboardMove?2.25:walkSpeed;
 if(sprint){state.stamina=Math.max(0,state.stamina-(8+10*amount)*dt);state.regenDelay=.45;if(state.stamina<.1)state.sprintExhausted=true;}
 const locked=lockTarget();
 if(state.crouch&&(sprint||state.action==='attack'))state.crouch=false;
 if(state.crouch&&!state.action&&actions.K_Crouch){
  if(moving){state.motionSpeed+=(1.35*Math.max(.45,amount)-state.motionSpeed)*(1-Math.exp(-dt*9));movePlayer(v.clone().normalize().multiplyScalar(state.motionSpeed*dt));const goal=Math.atan2(v.x,v.z),df=Math.atan2(Math.sin(goal-player.rotation.y),Math.cos(goal-player.rotation.y));player.rotation.y+=df*Math.min(1,dt*10);setClip('K_Sneak',.2,.75+.5*amount);tuneClipSpeed(.75+.5*amount);}
  else{state.motionSpeed=0;setClip('K_Crouch',.25);}
  return moving;
 }
 if(locked&&moving&&!sprint&&state.equipped&&state.action!=='attack'&&state.action!=='charge'){return strafeMove(dt,v,amount,locked);}
 if(moving){
  state.motionSpeed+=(speed-state.motionSpeed)*(1-Math.exp(-dt*12));
  movePlayer(v.clone().normalize().multiplyScalar(state.motionSpeed*dt));
  const goal=Math.atan2(v.x,v.z),diff=Math.atan2(Math.sin(goal-player.rotation.y),Math.cos(goal-player.rotation.y));
  player.rotation.y+=diff*Math.min(1,dt*(state.action==='attack'?9:14));
  const swordRun=sprint&&state.equipped&&actions.K_Run;
  const anim=swordRun?'K_Run':sprint?'Run':'Walk',rate=swordRun?.86+.3*amount:sprint?.98+.44*amount:.56+.43*amount;
  setClip(anim,.17,rate);tuneClipSpeed(rate);
 }else{state.motionSpeed=0;if(locked)facePoint(locked.root.position,dt,10);setClip(state.equipped&&(locked||nearestThreat().distance<5.1)?(actions.K_Guard?'K_Guard':'Combat_Idle'):'Idle',.22);}
 return moving;
}
// V11 — marche en garde verrouillée : quatre clips (avant, arrière, gauche, droite) mêlés selon la
// direction locale, phase commune pour que les pieds restent synchronisés.
function strafeMove(dt,v,amount,t){
 const speed=1.15+1.55*Math.min(1,amount);
 state.motionSpeed+=(speed-state.motionSpeed)*(1-Math.exp(-dt*10));
 movePlayer(v.clone().normalize().multiplyScalar(state.motionSpeed*dt));
 facePoint(t.root.position,dt,12);
 setClip('__strafe',.18);
 const f=direction(),lx=v.x*f.z-v.z*f.x,lz=v.x*f.x+v.z*f.z; // lx>0 : vers la gauche d'Aerin
 state.strafeLocal={x:lx,z:lz};
 state.strafePhase=(state.strafePhase+dt*state.motionSpeed/1.55)%1;
 return true;
}
function updateStrafeWeights(dt){
 if(!strafeActs)return;
 const on=state.currentClip==='__strafe';
 strafeWeight+=((on?1:0)-strafeWeight)*(1-Math.exp(-dt*9));
 if(!on&&strafeWeight<.01){for(const a of strafeActs)if(a.isRunning()&&a.getEffectiveWeight()<.01)a.stop();return;}
 if(!on)return;
 const l=state.strafeLocal||{x:0,z:1};let w=[Math.max(0,l.z),Math.max(0,-l.z),Math.max(0,l.x),Math.max(0,-l.x)];const sum=w[0]+w[1]+w[2]+w[3]||1;w=w.map(x=>x/sum);
 strafeActs.forEach((a,i)=>{if(!a.isScheduled()){a.reset();a.setLoop(T.LoopRepeat,Infinity);a.play();}a.setEffectiveTimeScale(0);a.time=state.strafePhase*a.getClip().duration;a.setEffectiveWeight(w[i]*strafeWeight);});
}
function localInput(){const v=movement();if(v.lengthSq()<.001)return {x:0,y:0};const f=direction();return {x:v.x*f.z-v.z*f.x,y:v.x*f.x+v.z*f.z};}
function facePoint(p,dt,rate){const a=Math.atan2(p.x-player.position.x,p.z-player.position.z),d=Math.atan2(Math.sin(a-player.rotation.y),Math.cos(a-player.rotation.y));player.rotation.y+=d*Math.min(1,dt*rate);}
function lockTarget(){if(state.lock<0)return null;const d=dummyList[state.lock];if(!d||d.hp<=0||!d.root.visible||d.root.position.distanceTo(player.position)>11){state.lock=-1;return null;}return d;}
function attackTarget(){const lt=lockTarget();if(lt)return lt;let best=null,score=-1;const f=direction();for(const d of dummyList){if(d.hp<=0||!d.root.visible)continue;const diff=d.root.position.clone().sub(player.position).setY(0);const dist=diff.length();if(dist>3.3)continue;const dot=f.dot(diff.normalize());if(dot<.15)continue;const sc=dot*1.5-dist*.3;if(sc>score){score=sc;best=d;}}return best;}
function toggleLock(){if(!active())return;if(state.lock>=0){state.lock=-1;toast('CIBLE LIBÉRÉE',.8);return;}
 let best=-1,score=-Infinity;const cf=cameraForward();for(let i=0;i<dummyList.length;i++){const d=dummyList[i];if(d.hp<=0||!d.root.visible)continue;const diff=d.root.position.clone().sub(player.position).setY(0),dist=diff.length();if(dist>10)continue;const sc=cf.dot(diff.normalize())*4-dist*.4;if(sc>score){score=sc;best=i;}}
 if(best<0){toast('AUCUNE CIBLE À PORTÉE',1);return;}state.lock=best;toast('CIBLE VERROUILLÉE · '+(best+1),.9);}
// V13 — vrai saut : impulsion, gravité, élan horizontal conservé (marche/course), léger contrôle en l'air.
const GRAVITY=15.5;
function startRealJump(){
 const v=movement();const speed=v.lengthSq()>.001?Math.max(state.motionSpeed,1.6):0;
 jumpMomentum.copy(v.lengthSq()>.001?v.clone().normalize().multiplyScalar(speed):new T.Vector3());
 if(v.lengthSq()>.001)player.rotation.y=Math.atan2(v.x,v.z);
 state.vy=speed>3.2?5.0:5.3;state.airborne=true;state.airTime=0;state.crouch=false;state.actionDuration=99;
}
function updateAir(dt){
 if(!state.airborne)return;
 state.airTime+=dt;state.vy-=GRAVITY*dt;player.position.y+=state.vy*dt;
 const v=movement();if(v.lengthSq()>.001){const want=v.clone().normalize().multiplyScalar(Math.max(2.2,jumpMomentum.length()));jumpMomentum.lerp(want,1-Math.exp(-dt*2.2));}
 movePlayer(jumpMomentum.clone().multiplyScalar(dt));
 if(state.action==='jump'&&state.currentClip==='K_JumpStart'&&state.airTime>.2)setClip('K_JumpAir',.12);
 if(player.position.y<=0&&state.vy<0){
  player.position.y=0;state.airborne=false;const fall=-state.vy;state.vy=0;
  state.motionSpeed=jumpMomentum.length();
  if(state.action==='jump'){
   const moving=movement().lengthSq()>.001;
   state.action=null;state.actionTime=0;
   if(!moving&&actions.K_Land){state.action='land';state.actionTime=0;state.actionDuration=actions.K_Land.getClip().duration*.9;setClip('K_Land',.05,1.1);}
   if(fall>7.5&&knight)knight.sparks.burst(player.position.clone().setY(.05),6,[.6,.55,.45]);
  }
 }
}
function lungeProfile(p,a,b){if(p<=a||p>=b)return 0;const u=(p-a)/(b-a);return Math.sin(Math.PI*u)*Math.PI/2/(b-a);}

function startJumpStrike(){
 if(state.action==='jump'&&actions.K_JumpSlash&&state.equipped&&!state.jumpAttack){state.action=null;return beginAction('jumpslash');}
 if(!state.equipped||state.jumpAttack||state.action!=='jump')return false;
 const atk=attacks[state.selected];if(!consume(atk.cost))return false;
 state.jumpAttack=true;state.attackIndex=state.selected;state.selected=(state.selected+1)%attacks.length;
 state.damageDone=false;
 playUpperAttack(atk.clip,1.45);
 return true;
}
function beginAction(kind){
 if(!active())return false;
 const wasAttack=state.action==='attack';
 if(state.action){
  if((kind==='jump'||kind==='roll'||kind==='dodge'||kind==='jumpslash'||kind==='hop'||kind==='flip')&&wasAttack){fadeUpperAttack();state.action=null;state.comboQueued=false;}
  else if(kind==='spin'&&state.action==='charge'){state.action=null;}
  else if(kind==='attack'&&state.action==='charge'){state.action=null;}
  else return false;
 }
 if(['attack','charge','spin','jumpslash','bash'].includes(kind)&&!state.equipped){toast('DÉGAINE D’ABORD TES ARMES',1.15);return false;}
 // En cible verrouillée, l'esquive devient bond latéral ou salto arrière selon le joystick.
 if(kind==='dodge'&&lockTarget()&&actions.K_HopL){const lv=localInput();if(Math.abs(lv.x)>.35&&Math.abs(lv.x)>=Math.abs(lv.y)){kind='hop';state.hopSide=lv.x>0?1:-1;}else if(lv.y<.35)kind='flip';else kind='roll';}
 if(kind==='roll'&&state.rollCooldown>0)return false;
 if(state.airborne&&!['attack','jumpslash'].includes(kind))return false;
 const blocking=input.block.size>0&&!state.blockExhausted;
 if(blocking&&kind==='attack'&&actions.K_ShieldBash)kind='bash';
 if(blocking&&!['dodge','roll','hop','flip','bash'].includes(kind))return false;
 let clip,cost;
 if(kind==='attack'){clip=attacks[state.selected].clip;cost=attacks[state.selected].cost;}
 else if(kind==='charge'){clip='K_Charge';cost=0;}
 else if(kind==='spin'){clip='K_Spin';cost=22;}
 else if(kind==='jumpslash'){clip='K_JumpSlash';cost=18;}
 else if(kind==='bash'){clip='K_ShieldBash';cost=10;}
 else if(kind==='hop'){clip=state.hopSide>0?'K_HopL':'K_HopR';cost=14;}
 else if(kind==='flip'){clip='K_Backflip';cost=20;}
 else if(kind==='chest'){clip='K_OpenChest';cost=0;}
 else if(kind==='itemget'){clip='K_ItemGet';cost=0;}
 else if(kind==='victory'){clip='K_Victory';cost=0;}
 else if(kind==='jump'){if(state.airborne)return false;clip=actions.K_JumpStart?(state.motionSpeed>3.2&&actions.K_RunJump?'K_RunJump':'K_JumpStart'):'Jump';cost=10;}
 else if(kind==='dodge'){clip='Dodge_Back';cost=22;}
 else if(kind==='roll'){clip='Roll_Forward';cost=24;}
 else if(kind==='stow'){if(!state.equipped)return false;clip=actions.K_Sheathe?'K_Sheathe':'Weapons_Stow';cost=0;}
 else if(kind==='draw'){if(state.equipped)return false;clip=actions.K_Unsheathe?'K_Unsheathe':'Weapons_Draw';cost=0;}
 if(!clip||!actions[clip]||!consume(cost))return false;
 const clipSpeed=kind==='attack'?(clip.startsWith('K_')?1.08:1.35):kind==='roll'?1.13:kind==='dodge'?1.12:kind==='hop'?1.15:kind==='flip'?1.05:kind==='spin'?1.0:kind==='jumpslash'?1.05:kind==='bash'?1.1:1;
 state.action=kind;state.actionTime=0;state.actionDuration=actions[clip].getClip().duration/clipSpeed;
 state.damageDone=false;state.attackIndex=state.selected;
 state.jumpAttack=false;state.rollStrikeQueued=false;
 state.magic=Math.max(0,state.magic-(kind==='attack'?10:kind==='dodge'||kind==='roll'||kind==='hop'||kind==='flip'?14:kind==='spin'?24:6));
 state.spinHits=0;state.fullBody=false;state.lunge=0;
 if(kind==='jump'&&actions.K_JumpStart)startRealJump();
 if(kind==='attack'){
  // En mouvement : coup porté par le haut du corps, les jambes continuent (V10).
  // À l'arrêt ou en cible verrouillée : coup complet avec fente et magnétisme vers la cible.
  const still=movement().lengthSq()<.001||!!lockTarget();
  const aim=attackTarget();if(aim)facePoint(aim.root.position,1,1);
  if(still&&clip.startsWith('K_')){fadeUpperAttack();state.fullBody=true;state.lunge=attacks[state.selected].lunge*(aim?clamp((player.position.distanceTo(aim.root.position)-1.05)/1.2,0,1):1);setClip(clip,.07,clipSpeed);}
  else if(!playUpperAttack(clip,clipSpeed))setClip(clip,.08,clipSpeed);
  state.comboCount=(state.comboCount||0)+1;state.selected=(state.attackIndex+1)%attacks.length;
  const c=$('#combo-label'),n=$('#combo-count');if(c)c.textContent=attacks[state.attackIndex].label;if(n)n.textContent=String(state.attackIndex+1).padStart(2,'0')+' / 04';
 }else{
  if(kind==='charge'||kind==='spin'||kind==='bash'||kind==='jumpslash'){const aim=attackTarget();if(aim)facePoint(aim.root.position,1,1);}
  if(kind==='jumpslash'){const aim=attackTarget();state.airSlash=state.airborne;state.lunge=state.airborne?0:aim?clamp(player.position.distanceTo(aim.root.position)-1.1,0,2.2):1.2;}
  if(kind==='bash')state.lunge=.35;
  if(kind==='hop'){const t=lockTarget();const f=t?t.root.position.clone().sub(player.position).setY(0).normalize():direction();dodgeVector.set(f.z,0,-f.x).multiplyScalar(state.hopSide);}
  if(kind==='flip'){const t=lockTarget();dodgeVector.copy(t?player.position.clone().sub(t.root.position).setY(0).normalize():direction().negate());}
  if(kind==='dodge'){const v=movement();dodgeVector.copy(v.lengthSq()>.01?v:cameraForward().negate()).normalize();}
  if(kind==='roll'){
   const v=movement();rollVector.copy(v.lengthSq()>.01?v:cameraForward()).normalize();
   player.rotation.y=Math.atan2(rollVector.x,rollVector.z);state.rollCooldown=.82;state.rollEntrySpeed=state.airborne?0:state.motionSpeed;
  }else if(kind==='hop'||kind==='flip'){const t=lockTarget();if(t)facePoint(t.root.position,1,1);}
  else if(!['jump','charge','spin','bash','jumpslash','chest','itemget','victory'].includes(kind))player.rotation.y=Math.atan2(-Math.sin(state.yaw),-Math.cos(state.yaw));
  setClip(clip,kind==='spin'||kind==='hop'||kind==='flip'?.06:.13,clipSpeed);
  if(kind==='charge'){state.charged=false;toast('CHARGE… RELÂCHE POUR TOURNOYER',1.2);}
  if(kind==='chest'||kind==='itemget'||kind==='victory'){state.crouch=false;if(kind==='chest')facePoint(chest.root.position,1,1);if(kind==='itemget'){state.actionDuration=2.3;showItem(true);}if(kind==='victory')state.actionDuration=2.2;}
  if(kind==='jump'&&wasAttack)startJumpStrike();
 }
 return true;
}
function requestAttack(){
 if(!active()||!state.equipped)return false;
 if(state.action==='jump')return startJumpStrike();
 if(['jumpslash','spin','bash','charge','hop','flip'].includes(state.action)){state.comboQueued=true;return true;}
 if(state.action==='roll'){state.rollStrikeQueued=true;return true;}
 if(state.action==='attack'){state.comboQueued=true;return true;}
 return beginAction('attack');
}
function chooseAttack(i){state.selected=i;document.querySelectorAll('[data-attack]').forEach((b,k)=>b.setAttribute('aria-pressed',String(k===i)));}
function clearInput(){input.keys.clear();input.attack.clear();input.block.clear();input.move.x=input.move.y=input.look.x=input.look.y=0;input.sprintToggle=false;state.blockExhausted=false;$('#sprint-button').setAttribute('aria-pressed','false');for(const j of joysticks){j.pointer=null;j.knob.style.transform='';}drag=null;}
function setPaused(on){if(!state.started||state.dead)return;state.paused=on;document.body.classList.toggle('paused',on);if(on)clearInput();}
function pause(){if(!active())return;setPaused(true);$('#pause-dialog').showModal();}
function resume(){for(const d of document.querySelectorAll('dialog[open]'))d.close();setPaused(false);mount.focus({preventScroll:true});}
function showHelp(){if(!state.ready)return;if(state.started)setPaused(true);$('#pause-dialog').close();$('#help-dialog').showModal();}
function closeHelp(){$('#help-dialog').close();if(state.started)resume();}
function switchView(){state.view=state.view==='third'?'first':'third';$('#view-label').textContent=state.view==='third'?'3ᵉ PERS.':'1ʳᵉ PERS.';bodyNodes.forEach(o=>o.visible=state.view==='third');if(firstPersonArms)firstPersonArms.visible=state.view==='first';knight?.setFirstPerson(state.view==='first');if(hairV15)hairV15.visible=state.view!=='first';showEquipment();actor.scale.setScalar(state.view==='first'?.65:1);actor.position.set(0,state.view==='first'?.65:0,state.view==='first'?.65:0);cameraReady=false;}
function reset(){clearInput();Object.assign(state,{hp:100,stamina:100,shield:100,magic:100,equipped:true,rollCooldown:0,guardWeight:0,combatTarget:-1,jumpAttack:false,rollStrikeQueued:false,motionSpeed:0,hits:0,blocks:0,defeated:0,dead:false,paused:false,action:null,actionTime:0,lastDamage:-100,regenDelay:0,sprintExhausted:false,selected:0,comboCount:0,comboQueued:false,yaw:0,pitch:.28,time:0});showEquipment();player.position.set(0,0,4.6);player.rotation.y=Math.PI;for(const d of dummyList){d.hp=100;d.phase='idle';d.timer=1;d.respawn=0;d.root.visible=true;d.body.rotation.set(0,0,0);d.label.draw(100,false);d.telegraph.material.opacity=.05;}fadeUpperAttack();state.airborne=false;state.vy=0;player.position.y=0;jumpMomentum.set(0,0,0);state.crouch=false;state.deathTime=-1;state.victoryPending=false;state.chestOpen=false;if(chest)chest.lid.rotation.x=0;showItem(false);state.lock=-1;state.attackHold=0;state.charged=false;state.hitStop=0;state.shake=0;if(actor){actor.rotation.set(0,0,0);if(state.view!=='first')actor.position.set(0,0,0);}if(visual)visual.rotation.set(0,0,0);knight?.cape.reset();hairV15?.reset();state.currentClip='';setClip(actions.K_Guard?'K_Guard':'Combat_Idle',0);const comboLabel=$('#combo-label'),comboCount=$('#combo-count');if(comboLabel)comboLabel.textContent='TAILLE';if(comboCount)comboCount.textContent='01 / 04';cameraReady=false;resume();toast('APPROCHE UN MANNEQUIN POUR T’ENTRAÎNER',3);}
function movement(){const k=input.keys;let x=input.move.x+(k.has('KeyD')?1:0)-(k.has('KeyA')||k.has('KeyQ')?1:0),y=input.move.y+(k.has('KeyS')?1:0)-(k.has('KeyW')||k.has('KeyZ')?1:0);const len=Math.hypot(x,y);if(len<.12)return new T.Vector3();if(len>1){x/=len;y/=len;}const forward=cameraForward(),right=new T.Vector3(Math.cos(state.yaw),0,-Math.sin(state.yaw));return right.multiplyScalar(x).addScaledVector(forward,-y);}
function movePlayer(delta){player.position.add(delta);const collide=(x,z,r)=>{const dx=player.position.x-x,dz=player.position.z-z,dist=Math.hypot(dx,dz),min=r+.29;if(dist<min){if(dist<.0001)player.position.x=x+min;else{player.position.x=x+dx/dist*min;player.position.z=z+dz/dist*min;}}};for(const o of obstacles)collide(o.x,o.z,o.r);if(typeof chest!=='undefined')collide(chest.root.position.x,chest.root.position.z,.5);for(const d of dummyList)if(d.hp>0)collide(d.root.position.x,d.root.position.z,.48);const r=Math.hypot(player.position.x,player.position.z);if(r>14.55){player.position.x*=14.55/r;player.position.z*=14.55/r;}}
function strike(opt={}){const attack=opt.damage?{damage:opt.damage}:attacks[state.attackIndex],front=direction();let hit=false;const reach=opt.reach||2.05,arc=opt.arc===undefined?.35:opt.arc;for(const d of dummyList){if(d.hp<=0)continue;const diff=d.root.position.clone().sub(player.position);const distance=diff.length();if(distance>reach||front.dot(diff.normalize())<arc)continue;hit=true;impact(d,opt.heavy);d.hp=Math.max(0,d.hp-attack.damage);d.hitTime=.2;state.hits++;d.label.draw(d.hp,d.phase==='windup');if(d.hp===0){d.phase='down';d.respawn=3.2;d.telegraph.material.opacity=0;d.root.visible=false;state.defeated++;toast('MANNEQUIN NEUTRALISÉ · +1',1.5);if(state.defeated%3===0){state.victoryPending=true;toast('LES TROIS MANNEQUINS SONT TOMBÉS !',2.2);}}}
 if(hit){state.hitFlash=.22;state.magic=Math.min(100,state.magic+14);}else if(!opt.quiet)toast('APPROCHE-TOI ET VISE LE MANNEQUIN',1.1);
 return hit;
}
function resetActorPose(){if(actor){actor.rotation.set(0,0,0);if(state.view!=='first')actor.position.set(0,0,0);}}
// V11 — sensation d'impact : gel bref, secousse, étincelles, recul du mannequin.
function impact(d,heavy){state.hitStop=Math.max(state.hitStop,heavy?.11:.075);state.shake=Math.max(state.shake,heavy?.85:.5);d.knock=1;
 if(knight){const p=d.root.position.clone().setY(1.35),toward=player.position.clone().sub(d.root.position).setY(0).normalize().multiplyScalar(.3);knight.sparks.burst(p.add(toward),heavy?24:14,heavy?[1,.85,.45]:[1,.75,.35]);}
 if(d.phase==='windup'&&heavy){d.phase='recover';d.timer=1.2;d.label.draw(d.hp,false);toast('RIPOSTE BRISÉE',.9);}}
// Charge : maintenir Frappe ; relâcher une fois chargée déclenche l'attaque tournoyante.
function updateCharge(dt){
 const held=input.attack.size>0&&state.equipped&&active();
 state.attackHold=held?state.attackHold+dt:0;
 if(state.action==='charge'){
  if(!state.charged&&state.actionTime>.62){state.charged=true;toast('ATTAQUE TOURNOYANTE PRÊTE',1);if(knight)knight.sparks.burst(knight.trail.tipWorld(),10,[1,.9,.5]);}
  if(state.charged&&knight&&state.time-state.lastSpark>.18){state.lastSpark=state.time;knight.sparks.burst(knight.trail.tipWorld(),3,[1,.88,.45]);}
  const v=movement();if(v.lengthSq()>.001){movePlayer(v.clone().normalize().multiplyScalar(1.1*dt));const lt=lockTarget();if(lt)facePoint(lt.root.position,dt,8);}
  if(!held){if(state.charged)beginAction('spin');else{state.action=null;setClip(actions.K_Guard?'K_Guard':'Combat_Idle',.12);}}
  return;
 }
 if(held&&state.attackHold>.42&&actions.K_Charge){
  const canChain=!state.action||(state.action==='attack'&&state.actionTime/state.actionDuration>.7&&!state.comboQueued);
  if(canChain&&!(input.block.size>0)){if(state.action==='attack'){fadeUpperAttack();state.action=null;}beginAction('charge');}
 }
}
// Après le mixeur : effets visuels de la tenue, inclinaison dans les virages, regard vers la cible.
const _q1=new T.Quaternion(),_q2=new T.Quaternion(),_v1=new T.Vector3();
function rotateBoneWorld(bone,axis,angle){if(!bone||!bone.parent)return;bone.parent.getWorldQuaternion(_q1);_q2.setFromAxisAngle(axis,angle);const inv=_q1.clone().invert();bone.quaternion.premultiply(inv.multiply(_q2).multiply(_q1));}
function postPose(dt,sdt){
 if(!actor||!visual)return;
 // inclinaison : virage (roulis) et accélération (tangage), seulement au sol et en déplacement libre
 const yawRate=Math.atan2(Math.sin(player.rotation.y-state.lastYaw),Math.cos(player.rotation.y-state.lastYaw))/Math.max(dt,1e-3);state.lastYaw=player.rotation.y;
 state.turnRate+=(yawRate-state.turnRate)*(1-Math.exp(-dt*8));
 const free=!state.action&&state.currentClip!=='__strafe';
 const roll=free?clamp(-state.turnRate*state.motionSpeed*.022,-.2,.2):0,pitch=free?clamp(state.motionSpeed*.018,0,.08):0;
 visual.rotation.z+=(roll-visual.rotation.z)*(1-Math.exp(-dt*7));visual.rotation.x+=(pitch-visual.rotation.x)*(1-Math.exp(-dt*5));
 // regard vers la cible verrouillée
 const lt=lockTarget();if(lt&&knight){const head=knight.bones.Head,neck=knight.bones.Neck;actor.updateMatrixWorld(true);const a=Math.atan2(lt.root.position.x-player.position.x,lt.root.position.z-player.position.z),d=clamp(Math.atan2(Math.sin(a-player.rotation.y),Math.cos(a-player.rotation.y)),-.9,.9);_v1.set(0,1,0);rotateBoneWorld(neck,_v1,d*.35);rotateBoneWorld(head,_v1,d*.4);}
 if(item.visible&&knight){const l=knight.bones.LeftHand.getWorldPosition(new T.Vector3()),r=knight.bones.RightHand.getWorldPosition(new T.Vector3());item.position.copy(l).add(r).multiplyScalar(.5).add(new T.Vector3(0,.12,0));item.rotation.y=state.time*2;}
 // marqueur de cible
 if(!lockMarker){lockMarker=new T.Group();const m=new T.MeshBasicMaterial({color:0xffd27a,transparent:true,opacity:.9,depthTest:false});for(let i=0;i<3;i++){const c=new T.Mesh(new T.ConeGeometry(.07,.16,3),m);c.rotation.x=Math.PI;c.position.set(Math.sin(i/3*Math.PI*2)*.28,0,Math.cos(i/3*Math.PI*2)*.28);c.rotation.z=0;lockMarker.add(c);}lockMarker.renderOrder=6;scene.add(lockMarker);}
 lockMarker.visible=!!lt;if(lt){lockMarker.position.copy(lt.root.position).setY(2.95+Math.sin(state.time*5)*.05);lockMarker.rotation.y=state.time*2.2;}
 if(knight){
  const swing=(state.action==='attack'&&state.actionTime/state.actionDuration>.18&&state.actionTime/state.actionDuration<.62)||state.action==='spin'&&state.actionTime/state.actionDuration<.72||(state.action==='jumpslash'&&state.actionTime/state.actionDuration>.45&&state.actionTime/state.actionDuration<.78)||(state.action==='charge'&&state.charged);
  actor.updateMatrixWorld(true);knight.trail.update(dt,swing&&state.view!=='first',state.action==='spin'||state.charged?[1,.86,.45]:[.72,.9,1]);knight.sparks.update(dt);if(state.view!=='first')knight.cape.update(sdt,state.time);
 }
 if(hairV15){hairV15.visible=state.view!=='first';if(state.view!=='first')hairV15.update(dt);
 }
}

function incoming(d){const distance=player.position.distanceTo(d.root.position);if(distance>2.25)return;const ratio=state.action?state.actionTime/state.actionDuration:0;if((state.action==='dodge'&&ratio>.06&&ratio<.72)||(state.action==='roll'&&ratio>.09&&ratio<.82)||(state.action==='hop'&&ratio>.05&&ratio<.7)||(state.action==='flip'&&ratio>.08&&ratio<.78)){toast('ESQUIVE',.8);return;}if(state.action==='jump'&&ratio>.25&&ratio<.7)return;if(state.airborne&&player.position.y>.35)return;
 const to=d.root.position.clone().sub(player.position).normalize();const guard=state.equipped&&input.block.size>0&&!state.blockExhausted&&!state.action&&direction().dot(to)>.32;
 if(guard&&state.stamina>=12){consume(12);state.blocks++;state.shield=Math.max(0,state.shield-18);state.magic=Math.min(100,state.magic+6);state.action='blockHit';state.actionTime=0;state.actionDuration=actions.Shield_Hit.getClip().duration;setClip('Shield_Hit',.04);toast('BLOCAGE RÉUSSI',1);state.hitFlash=.15;}
 else{resetActorPose();state.hp=Math.max(0,state.hp-16);state.shield=Math.max(0,state.shield-22);state.lastDamage=state.time;state.flash=.4;state.action='hit';state.actionTime=0;state.actionDuration=actions.Hit_React.getClip().duration;setClip('Hit_React',.06);if(state.hp<=0){state.dead=true;clearInput();fadeUpperAttack();state.crouch=false;if(actions.K_Death){state.action='death';state.deathTime=0;setClip('K_Death',.12);}else{$('#end-dialog').showModal();document.body.classList.add('paused');}}}
}
function updateDummies(dt){for(const d of dummyList){d.hitTime=Math.max(0,d.hitTime-dt);if(d.hp<=0){d.respawn-=dt;if(d.respawn<=0){d.hp=100;d.phase='idle';d.timer=1;d.root.visible=true;d.label.draw(100,false);}continue;}const dist=d.root.position.distanceTo(player.position);d.root.rotation.y=Math.atan2(player.position.x-d.root.position.x,player.position.z-d.root.position.z);d.knock=Math.max(0,(d.knock||0)-dt*3.2);d.body.rotation.z=d.hitTime>0?Math.sin(d.hitTime*35)*.13:0;
 if(d.phase==='idle'){d.telegraph.material.opacity=.045;d.body.rotation.x=0;d.timer-=dt;if(dist<2.15&&d.timer<=0){d.phase='windup';d.timer=.9;d.label.draw(d.hp,true);}}
 else if(d.phase==='windup'){d.timer-=dt;d.telegraph.material.opacity=.35+Math.sin(state.time*20)*.2;d.body.rotation.x=-.18*(1-d.timer/.9);if(d.timer<=0){incoming(d);d.phase='recover';d.timer=1.7;d.label.draw(d.hp,false);}}
 else if(d.phase==='recover'){d.timer-=dt;d.telegraph.material.opacity=.06;d.body.rotation.x=.2*Math.max(0,(d.timer-1.45)/.25);if(d.timer<=0){d.phase='idle';d.timer=.45;}}
 d.body.rotation.x-=.42*Math.sin(Math.min(1,d.knock||0)*Math.PI*.5);
}}
function updatePlayer(dt){
 updateAir(dt);
 state.rollCooldown=Math.max(0,state.rollCooldown-dt);
 state.regenDelay=Math.max(0,state.regenDelay-dt);
 if(!input.block.size)state.blockExhausted=false;
 if(state.stamina>28)state.sprintExhausted=false;
 if(state.action){
  state.actionTime+=dt;
  const elapsed=state.actionTime,progress=elapsed/Math.max(.01,state.actionDuration);
  if(state.action==='attack'&&state.fullBody){
   const lp=lungeProfile(progress,.12,.5);if(state.lunge>0)movePlayer(direction().multiplyScalar(state.lunge*lp*dt/Math.max(.05,state.actionDuration)));
   if(!state.damageDone&&progress>=attacks[state.attackIndex].hit){state.damageDone=true;strike();}
   if(state.comboQueued&&progress>=.6&&state.equipped){state.action=null;state.comboQueued=false;beginAction('attack');return finishPlayer(dt);}
  }
  else if(state.action==='attack'){
   animateLocomotion(dt); // Walking/running still works during all four sword attacks.
   if(!state.damageDone&&progress>=attacks[state.attackIndex].hit){state.damageDone=true;strike();}
  }
  if(state.action==='jump'&&!state.airborne&&!actions.K_JumpStart){
   const v=movement();if(v.lengthSq()>.001)movePlayer(v.clone().normalize().multiplyScalar(2.15*dt));
   if(state.jumpAttack&&!state.damageDone&&progress>.48){state.damageDone=true;strike();}
  }
  if(state.action==='dodge'&&progress<.55)movePlayer(dodgeVector.clone().multiplyScalar(4.3*dt));
  // V12 — aventure
  if(state.action==='chest'){chest.lid.rotation.x=-1.9*clamp((progress-.42)/.4,0,1);if(progress>=.98&&!state.chestOpen){state.chestOpen=true;}}
  // V11 — actions de combat complètes
  if(state.action==='spin'){
   const u=clamp((progress-.08)/.62,0,1),e=u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;if(actor&&state.view!=='first')actor.rotation.y=e*Math.PI*2;
   if(state.spinHits===0&&progress>.25){state.spinHits=1;strike({damage:30,reach:2.6,arc:-1.1,heavy:true,quiet:true});}
   if(state.spinHits===1&&progress>.5){state.spinHits=2;if(!strike({damage:20,reach:2.6,arc:-1.1,heavy:false,quiet:true}))toast('ATTAQUE TOURNOYANTE',.8);}
   const v=movement();if(v.lengthSq()>.001)movePlayer(v.clone().normalize().multiplyScalar(1.4*dt));
  }
  if(state.action==='jumpslash'){
   const air=clamp((progress-.1)/.52,0,1);if(actor&&state.view!=='first'&&!state.airSlash)actor.position.y=Math.sin(Math.PI*air)*.55;
   const lp=lungeProfile(progress,.1,.62);if(state.lunge>0)movePlayer(direction().multiplyScalar(state.lunge*lp*dt/Math.max(.05,state.actionDuration)));
   if(!state.damageDone&&progress>=.62){state.damageDone=true;strike({damage:45,reach:2.35,arc:.2,heavy:true});}
  }
  if(state.action==='bash'){
   const lp=lungeProfile(progress,.12,.35);movePlayer(direction().multiplyScalar(state.lunge*lp*dt/Math.max(.05,state.actionDuration)));
   if(!state.damageDone&&progress>=.3){state.damageDone=true;strike({damage:8,reach:1.7,arc:.3,heavy:true});}
  }
  if(state.action==='hop'){
   const air=clamp((progress-.12)/.42,0,1);if(actor&&state.view!=='first')actor.position.y=Math.sin(Math.PI*air)*.24;
   if(progress>.08&&progress<.6)movePlayer(dodgeVector.clone().multiplyScalar(4.8*dt));
   const lt=lockTarget();if(lt)facePoint(lt.root.position,dt,10);
  }
  if(state.action==='flip'){
   const u=clamp((progress-.14)/.5,0,1),e=u*u*(3-2*u),h=.92;
   if(actor&&state.view!=='first'){const th=-e*Math.PI*2;actor.rotation.x=th;actor.position.set(0,h-h*Math.cos(th)+Math.sin(Math.PI*u)*.42,-h*Math.sin(th));}
   if(progress>.1&&progress<.72)movePlayer(dodgeVector.clone().multiplyScalar(3.7*dt));
  }

  if(state.action==='roll'){const rollSpeed=Math.max(5,state.rollEntrySpeed*1.18)*Math.max(.22,Math.sin(Math.PI*Math.min(1,progress)));if(rollSpeed>0)movePlayer(rollVector.clone().multiplyScalar(rollSpeed*dt));}
  if(state.action==='stow'&&progress>=(actions.K_Sheathe?.52:.54)&&state.equipped){state.equipped=false;showEquipment();}
  if(state.action==='draw'&&progress>=(actions.K_Unsheathe?.36:.47)&&!state.equipped){state.equipped=true;showEquipment();}
  if(state.action==='charge'){/* maintenu tant que l'épée est chargée : voir updateCharge */}
  else if(elapsed>=state.actionDuration){
   const finished=state.action,nextAttack=(finished==='roll'&&state.rollStrikeQueued)||(['jumpslash','spin','bash','hop','flip'].includes(finished)&&state.comboQueued);
   if(actor&&(finished==='spin'||finished==='flip'||finished==='hop'||finished==='jumpslash')){actor.rotation.set(0,0,0);if(state.view!=='first')actor.position.set(0,0,0);}
   if(finished==='chest'){state.action=null;beginAction('itemget');return finishPlayer(dt);}
   if(finished==='itemget'){showItem(false);state.hp=100;state.stamina=100;state.shield=100;state.magic=100;}
   const combo=finished==='attack'&&state.comboQueued;
   state.action=null;state.actionTime=0;state.jumpAttack=false;state.rollStrikeQueued=false;state.comboQueued=false;
   if(finished==='attack'||finished==='jump')fadeUpperAttack();
   if((nextAttack||combo)&&state.equipped)beginAction('attack');
  }
 }
 updateCharge(dt);
 if(!state.action&&state.victoryPending&&actions.K_Victory){state.victoryPending=false;beginAction('victory');}
 const blocking=state.equipped&&input.block.size>0&&!state.blockExhausted;
 if(!state.action){
  if(blocking){
   player.rotation.y=Math.atan2(-Math.sin(state.yaw),-Math.cos(state.yaw));
   state.stamina=Math.max(0,state.stamina-5*dt);state.regenDelay=.45;
   if(state.stamina<=.1){state.blockExhausted=true;toast('GARDE ÉPUISÉE · RELÂCHE LE BOUCLIER',2);}
   setClip('Shield_Hold',.16);
  }else animateLocomotion(dt); // maintien de Frappe = charge de l'attaque tournoyante (updateCharge)
 }
 return finishPlayer(dt);
}
function finishPlayer(dt){
 const blocking=state.equipped&&input.block.size>0&&!state.blockExhausted;
 if(blocking)state.shield=Math.max(0,state.shield-10*dt);else state.shield=Math.min(100,state.shield+(state.action?7:16)*dt);
 state.magic=Math.min(100,state.magic+(state.action?4.5:8)*dt);
 if(state.regenDelay===0&&!blocking)state.stamina=Math.min(100,state.stamina+22*dt);
 if(state.time-state.lastDamage>5)state.hp=Math.min(100,state.hp+8*dt);
}
// Aerin V09 — combat stance on the native Mixamo skeleton, not an imported copyrighted FBX.
// The animation mixer owns the base clip; these short additive offsets make a visible guard
// while an enemy is close, then blend out for attacks, jumps, blocks, and rolls.
const guardBones={};
const guardPose=[
 ['Hips',.06,0,-.075], ['Spine',.08,0,-.035], ['Spine1',.11,-.04,.045],
 ['Spine2',.07,.035,.04], ['Neck',-.045,0,0],
 ['LeftShoulder',-.055,0,-.075], ['LeftArm',-.32,-.07,-.18],
 ['LeftForeArm',-.34,.06,-.10], ['LeftHand',-.04,.05,-.07],
 ['RightShoulder',-.045,0,.11], ['RightArm',-.23,.08,.22],
 ['RightForeArm',-.18,-.11,.14], ['RightHand',-.08,-.06,.03],
 ['LeftUpLeg',.18,.035,-.09], ['LeftLeg',-.27,0,0], ['LeftFoot',.065,0,0],
 ['RightUpLeg',-.19,-.04,.06], ['RightLeg',-.23,0,0], ['RightFoot',.06,0,0]
];
function prepareGuardBones(){if(!actor||guardBones.Hips)return;actor.traverse(node=>{
 if(node.isBone){const k=node.name.replace(/^.*:/,'');if(k==='Hips'||guardPose.some(row=>row[0]===k))guardBones[k]=node;}
});}
function nearestThreat(){let best=-1,distance=Infinity;
 for(let i=0;i<dummyList.length;i++){const d=dummyList[i];if(d.hp<=0||!d.root.visible)continue;
 const dx=d.root.position.x-player.position.x,dz=d.root.position.z-player.position.z,dist=Math.hypot(dx,dz);
 if(dist<distance){distance=dist;best=i;}}
 return {index:best,distance};}
function applyOffensiveGuard(dt){
 if(!actor||!state.started||state.dead)return;
 prepareGuardBones();
 const enemy=nearestThreat();const distance=enemy.distance;
 const canGuard=state.equipped&&!state.action&&!state.paused&&enemy.index>=0&&!/^K_|__strafe/.test(state.currentClip);
 const moving=Math.hypot(input.move.x,input.move.y)>.13||['KeyW','KeyZ','KeyS','KeyA','KeyQ','KeyD'].some(k=>input.keys.has(k));
 const sprint=state.currentClip==='Run';
 const strength=canGuard?clamp((5.3-distance)/1.5,0,1)*(sprint?.3:moving?.65:1):0;
 state.guardWeight+= (strength-state.guardWeight)*(1-Math.exp(-dt*10));
 if(state.guardWeight<.002){state.guardWeight=0;state.combatTarget=canGuard?enemy.index:-1;return;}
 state.combatTarget=enemy.index;
 // Automatic orientation only while stationary, so joystick input always keeps priority.
 if(canGuard&&!moving&&!input.block.size&&distance<4.9){const d=dummyList[enemy.index];
 const angle=Math.atan2(d.root.position.x-player.position.x,d.root.position.z-player.position.z);
 const delta=Math.atan2(Math.sin(angle-player.rotation.y),Math.cos(angle-player.rotation.y));
 player.rotation.y+=delta*Math.min(1,dt*6.5);}
 const breathe=Math.sin(state.time*2.8)*.016*state.guardWeight;
 for(const [name,x,y,z] of guardPose){const bone=guardBones[name];if(!bone)continue;
 bone.rotation.x+=x*state.guardWeight+(name==='Spine2'?breathe:0);
 bone.rotation.y+=y*state.guardWeight;
 bone.rotation.z+=z*state.guardWeight;}
 if(guardBones.Hips)guardBones.Hips.position.y-=.065*state.guardWeight;
}
function updateCamera(dt){let forward=cameraForward();const portrait=innerHeight>innerWidth;if(state.view==='first'&&state.started){const eye=player.position.clone().add(new T.Vector3(0,1.5,0));camera.position.copy(eye).addScaledVector(forward,.035);camera.lookAt(eye.clone().add(new T.Vector3(forward.x,Math.sin(-state.pitch*.65),forward.z).multiplyScalar(7)));player.rotation.y=Math.atan2(forward.x,forward.z);return;}
 const lt=state.started?lockTarget():null;if(lt){const dx=lt.root.position.x-player.position.x,dz=lt.root.position.z-player.position.z;const want=Math.atan2(-dx,-dz)+.32;state.yaw+=Math.atan2(Math.sin(want-state.yaw),Math.cos(want-state.yaw))*(1-Math.exp(-dt*5));state.pitch+=(.2-state.pitch)*(1-Math.exp(-dt*3));}
 const target=player.position.clone().add(new T.Vector3(0,state.started?1.0:1.1,0));if(lt)target.lerp(lt.root.position.clone().setY(1.15),.28);let yaw=state.started?state.yaw:2.65,distance=state.started?(portrait?5.8:4.6):4.2,pitch=state.started?state.pitch:.13;const desired=target.clone().add(new T.Vector3(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance));if(!cameraReady){camera.position.copy(desired);cameraReady=true;}else camera.position.lerp(desired,1-Math.exp(-dt*12));camera.lookAt(target);if(state.shake>0){const k=state.shake*state.shake*.09;camera.position.x+=(Math.random()-.5)*k;camera.position.y+=(Math.random()-.5)*k;camera.rotation.z+=(Math.random()-.5)*k*.6;}
}
let lastHUD='',lastHUDUpdate=-1;function updateHUD(){if(state.time-lastHUDUpdate<.075&&lastHUDUpdate>=0&&active())return;lastHUDUpdate=state.time;const hp=Math.ceil(state.hp),stamina=Math.ceil(state.stamina),shield=Math.ceil(state.shield),magic=Math.ceil(state.magic),label=state.action==='chest'?'COFFRE':state.action==='itemget'?'OBJET OBTENU':state.action==='victory'?'VICTOIRE':state.crouch&&!state.action?(state.currentClip==='K_Sneak'?'FURTIF':'ACCROUPI'):state.action==='attack'?attacks[state.attackIndex].label:state.action==='charge'?(state.charged?'CHARGÉE':'CHARGE'):state.action==='spin'?'TOURNOYANTE':state.action==='jumpslash'?'SAUT FRAPPÉ':state.action==='bash'?'COUP DE BOUCLIER':state.action==='hop'?'BOND':state.action==='flip'?'SALTO':state.action==='dodge'?'ESQUIVE':state.action==='jump'?'SAUT':state.action==='hit'?'IMPACT':state.action==='blockHit'?'BLOCAGE':input.block.size&&!state.blockExhausted?'PROTECTION':state.currentClip==='Run'?'COURSE':state.currentClip==='Walk'?'MARCHE':'GARDE';const sig=[hp,stamina,shield,magic,state.hits,state.blocks,label].join(',');if(lastHUD!==sig){lastHUD=sig;const setText=(id,value)=>{const n=$(id);if(n)n.textContent=value;};setText('#health-label',hp);setText('#stamina-label',stamina);setText('#shield-label',shield);setText('#magic-label',magic);setRing('#energy-ring',state.stamina,100,RING_CIRCUMFERENCE.energy);for(const [id,v] of [['#hp-fill',state.hp],['#st-fill',state.stamina],['#sh-fill',state.shield],['#mg-fill',state.magic]]){const el=$(id);if(el)el.style.transform=`scaleX(${Math.max(0,Math.min(100,v))/100})`;}document.body.classList.toggle('hp-low',state.hp<30);setRing('#shield-ring',state.shield,100,RING_CIRCUMFERENCE.shield);setRing('#magic-ring',state.magic,100,RING_CIRCUMFERENCE.magic);$('#health-meter')?.setAttribute('aria-valuenow',hp);$('#stamina-meter')?.setAttribute('aria-valuenow',stamina);$('#shield-meter')?.setAttribute('aria-valuenow',shield);$('#magic-meter')?.setAttribute('aria-valuenow',magic);$('#hit-count').textContent=String(state.hits).padStart(2,'0');$('#block-count').textContent=String(state.blocks).padStart(2,'0');$('#action-state').textContent=label;$('#attack-button').classList.toggle('active',state.action==='attack');$('#block-button').setAttribute('aria-pressed',String(label==='PROTECTION'||label==='BLOCAGE'));$('#dodge-button').classList.toggle('active',state.action==='dodge');$('#jump-button').classList.toggle('active',state.action==='jump');$('#roll-button')?.classList.toggle('active',state.action==='roll');$('#lock-button')?.setAttribute('aria-pressed',String(state.lock>=0));$('#crouch-button')?.setAttribute('aria-pressed',String(state.crouch));}$('.act-cell')?.classList.toggle('off',!canOpenChest());$('#toast').classList.toggle('visible',state.toastUntil>state.time);$('#damage-flash').style.opacity=state.flash>0?Math.min(.55,state.flash*2):0;$('#hit-marker').style.opacity=state.hitFlash>0?'1':'0';}
// Pointer identities are kept separately: both sticks and a held action can coexist.
const joysticks=[];let drag=null;
function joystick(id,target){const el=$(id),knob=el.querySelector('.joystick-knob'),j={el,knob,pointer:null};joysticks.push(j);function change(e){const r=el.getBoundingClientRect(),radius=r.width*.36;let dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;const len=Math.hypot(dx,dy);if(len>radius){dx*=radius/len;dy*=radius/len;}target.x=dx/radius;target.y=dy/radius;knob.style.transform=`translate(${dx}px,${dy}px)`;}
 el.addEventListener('pointerdown',e=>{if(!active()||j.pointer!==null)return;e.preventDefault();j.pointer=e.pointerId;el.setPointerCapture(e.pointerId);change(e);});el.addEventListener('pointermove',e=>{if(j.pointer===e.pointerId)change(e);});function release(e){if(e.pointerId!==j.pointer)return;j.pointer=null;target.x=target.y=0;knob.style.transform='';}for(const n of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(n,release);
}
joystick('#move-stick',input.move);joystick('#look-stick',input.look);
function hold(id,set,name,onPress){const el=$(id);el.addEventListener('pointerdown',e=>{if(!active())return;e.preventDefault();el.setPointerCapture(e.pointerId);set.add(name+e.pointerId);if(onPress)onPress();});for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,e=>set.delete(name+e.pointerId));el.addEventListener('keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(active()){set.add(name+'keyboard');if(onPress&&!e.repeat)onPress();}}});el.addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();set.delete(name+'keyboard');}});el.addEventListener('blur',()=>set.delete(name+'keyboard'));}
hold('#attack-button',input.attack,'buttonAttack',()=>requestAttack());hold('#block-button',input.block,'buttonBlock');
mount.addEventListener('contextmenu',e=>e.preventDefault());mount.addEventListener('pointerdown',e=>{if(!active())return;if(e.pointerType==='touch'&&e.clientX<innerWidth*.43)return;mount.focus({preventScroll:true});mount.setPointerCapture(e.pointerId);if(e.button===1){e.preventDefault();toggleLock();return;}if(e.button===2){input.block.add('mouse');return;}drag={id:e.pointerId,x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,moved:false};});mount.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>5)drag.moved=true;state.yaw-=dx*.004*state.sensitivity;state.pitch=clamp(state.pitch+dy*.003*state.sensitivity,-.04,.65);drag.x=e.clientX;drag.y=e.clientY;});mount.addEventListener('pointerup',e=>{input.block.delete('mouse');if(drag?.id===e.pointerId){if(!drag.moved&&e.button===0&&e.pointerType!=='touch')requestAttack();drag=null;}});for(const n of ['pointercancel','lostpointercapture'])mount.addEventListener(n,()=>{drag=null;input.block.delete('mouse');});
const handled=new Set(['KeyC','KeyT','KeyF','Tab','KeyW','KeyA','KeyS','KeyD','KeyZ','KeyQ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','Space','KeyB','KeyJ','KeyE','KeyV','KeyR','KeyG','Digit1','Digit2','Digit3','Digit4']);
window.addEventListener('keydown',e=>{if(e.code==='Escape'){e.preventDefault();if($('#help-dialog').open)closeHelp();else if($('#pause-dialog').open)resume();else pause();return;}if(!active()||e.target.matches('input,select,button,a'))return;if(handled.has(e.code))e.preventDefault();input.keys.add(e.code);if(e.code==='Space'){input.attack.add('key');if(!e.repeat)requestAttack();}if(e.code==='KeyB')input.block.add('key');if(e.repeat)return;if(e.code==='KeyJ')beginAction('jump');if(e.code==='KeyR')beginAction('roll');if(e.code==='KeyG')beginAction(state.equipped?'stow':'draw');if(e.code==='KeyE')beginAction('dodge');if(e.code==='KeyV')switchView();if(e.code==='KeyF'||e.code==='Tab')toggleLock();if(e.code==='KeyC')toggleCrouch();if(e.code==='KeyT')interact();if(/^Digit[1-4]$/.test(e.code))chooseAttack(Number(e.code.slice(-1))-1);});
window.addEventListener('keyup',e=>{input.keys.delete(e.code);if(e.code==='Space')input.attack.delete('key');if(e.code==='KeyB')input.block.delete('key');});window.addEventListener('blur',()=>{clearInput();if(active())pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(active())pause();}});
$('#start-button').onclick=()=>{state.started=true;$('#welcome').hidden=true;$('#game-hud').hidden=false;reset();};$('#pause-button').onclick=pause;$('#resume-button').onclick=resume;$('#reset-button').onclick=reset;$('#retry-button').onclick=reset;$('#help-button').onclick=showHelp;$('#pause-help').onclick=showHelp;$('#help-dialog').querySelectorAll('.close-dialog').forEach(b=>b.onclick=closeHelp);for(const d of document.querySelectorAll('dialog'))d.addEventListener('cancel',e=>{e.preventDefault();if(d.id==='help-dialog')closeHelp();else if(d.id==='pause-dialog')resume();});$('#view-button').onclick=()=>{switchView();mount.focus({preventScroll:true});};$('#jump-button').onclick=()=>{beginAction('jump');mount.focus({preventScroll:true});};$('#roll-button').onclick=()=>{beginAction('roll');mount.focus({preventScroll:true});};$('#gear-button').onclick=()=>{beginAction(state.equipped?'stow':'draw');mount.focus({preventScroll:true});};$('#dodge-button').onclick=()=>{beginAction('dodge');mount.focus({preventScroll:true});};const crouchBtn=$('#crouch-button');if(crouchBtn)crouchBtn.onclick=()=>{toggleCrouch();mount.focus({preventScroll:true});};const actBtn=$('#act-button');if(actBtn)actBtn.onclick=()=>{interact();mount.focus({preventScroll:true});};const lockBtn=$('#lock-button');if(lockBtn)lockBtn.onclick=()=>{toggleLock();mount.focus({preventScroll:true});};$('#sprint-button').onclick=()=>{input.sprintToggle=!input.sprintToggle;$('#sprint-button').setAttribute('aria-pressed',String(input.sprintToggle));mount.focus({preventScroll:true});};document.querySelectorAll('[data-attack]').forEach(b=>b.onclick=()=>{chooseAttack(Number(b.dataset.attack));mount.focus({preventScroll:true});});
try{const saved=Number(localStorage.getItem('aerinSensitivity'));if(saved>=.4&&saved<=2)state.sensitivity=saved;}catch(_){}$('#sensitivity').value=state.sensitivity;$('#sensitivity').oninput=e=>{state.sensitivity=Number(e.target.value);try{localStorage.setItem('aerinSensitivity',String(state.sensitivity));}catch(_){}};
new T.GLTFLoader().load('assets/aerin.glb',g=>{actor=g.scene;visual=new T.Group();visual.name='Aerin_Visual_V11';player.add(visual);visual.add(actor);actor.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}if(o.name==='Aerin_Body')bodyNodes.push(o);});// A first-person copy keeps only the forearms and gloves; it shares the animated bones.
if(bodyNodes[0]){firstPersonArms=bodyNodes[0].clone(true);firstPersonArms.name='Aerin_FirstPersonArms';firstPersonArms.visible=false;bodyNodes[0].parent.add(firstPersonArms);firstPersonArms.traverse(o=>{if(!o.isSkinnedMesh)return;const geo=o.geometry.clone(),si=geo.attributes.skinIndex,sw=geo.attributes.skinWeight,index=geo.index,kept=[];const armIds=new Set(o.skeleton.bones.map((b,i)=>/ForeArm|Hand/.test(b.name)?i:-1));function isArm(v){let weight=0;for(let k=0;k<4;k++)if(armIds.has(si.getComponent?si.getComponent(v,k):si.array[v*4+k]))weight+=sw.array[v*4+k];return weight>.6;}if(index){for(let i=0;i<index.count;i+=3){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);if(isArm(a)&&isArm(b)&&isArm(c))kept.push(a,b,c);}geo.setIndex(kept);o.geometry=geo;o.frustumCulled=false;o.castShadow=false;}});}
let builtClips={};try{if(window.AerinStyleV12){window.AerinStyleV12.stripTracks(g.animations);state.lift=window.AerinStyleV12.proportions(T,actor,g.animations.find(c=>c.name==='Idle'));visual.position.y=state.lift;}}catch(e){console.warn('Aerin V12 : proportions indisponibles',e);}
try{if(window.AerinBodyV13){bodyV13=window.AerinBodyV13.build(T,actor,{neutral:g.animations.find(c=>c.name==='Idle')});bodyNodes.push(bodyV13.group);if(firstPersonArms){firstPersonArms.parent?.remove(firstPersonArms);}firstPersonArms=bodyV13.fpArms;}}catch(e){console.warn('Aerin V13 : corps indisponible',e);bodyV13=null;}
try{if(window.AerinHairV15)hairV15=window.AerinHairV15.build(T,actor,{neutral:g.animations.find(c=>c.name==='Idle')});}catch(e){console.warn('Aerin V15 : cheveux indisponibles',e);hairV15=null;}
try{if(window.AerinMotionV11){const lib=window.AerinMotionV11.build(T,actor,g.animations.find(c=>c.name==='Idle'));builtClips=lib.clips;motionMeta=lib.meta;}}catch(e){console.warn('Aerin V11 : mouvements de combat indisponibles',e);}
mixer=new T.AnimationMixer(actor);for(const clip of g.animations)actions[clip.name]=mixer.clipAction(clip);for(const name in builtClips)actions[name]=mixer.clipAction(builtClips[name]);if(!actions.K_Slash1)for(const a of attacks)a.clip=a.legacy;if(actions.K_StrafeL)strafeActs=['K_GuardFwd','K_GuardBack','K_StrafeL','K_StrafeR'].map(n=>actions[n]);prepareUpperAttacks();const required=['Combat_Idle','Walk','Run','Shield_Hold','Shield_Hit','Hit_React','Jump','Dodge_Back','Weapons_Stow','Weapons_Draw','Roll_Forward',...attacks.map(a=>a.clip)];if(required.some(n=>!actions[n])){window.aerinBoot.fail('Le personnage n’a pas été chargé complètement. Touche Recharger.');return;}setClip('Combat_Idle',0);mixer.update(0);actor.updateMatrixWorld(true);
 heldSword=actor.getObjectByName('Aerin_Sword');heldShield=actor.getObjectByName('Aerin_Shield');
 try{if(window.AerinKnightV11){knight=window.AerinKnightV11.dress(T,actor,{neutral:g.animations.find(c=>c.name==='Idle'),groundY:()=>player.position.y,noTassets:!!bodyV13,greaveScale:bodyV13?1.16:1,greaveDepth:bodyV13?1.2:1});heldSword=knight.sword.group;heldShield=knight.shield.group;}}catch(e){console.warn('Aerin V11 : tenue de chevalier indisponible',e);knight=null;}
 try{if(window.AerinStyleV12)window.AerinStyleV12.celShade(T,actor,{outline:window.aerinDevice?.quality!=='mobile'});}catch(e){console.warn('Aerin V12 : cel shading indisponible',e);}
 try{if(knight?.makeStowed){const st=knight.makeStowed();stowedSword=st.sword;stowedShield=st.shield;}else{stowedSword=makeStowedCopy(heldSword,'sword');stowedShield=makeStowedCopy(heldShield,'shield');}}
 catch(e){console.warn('Aerin: copies des armes au fourreau indisponibles',e);}
 setClip(actions.K_Guard?'K_Guard':'Combat_Idle',0);mixer.update(0);showEquipment();state.ready=true;window.aerinBoot.ready();},e=>{if(e.lengthComputable)window.aerinBoot.progress(e.loaded/e.total);},e=>{window.aerinBoot.fail('Le personnage n’a pas pu être téléchargé. Vérifie ta connexion, puis touche Recharger.');console.error(e);});
function resize(){const r=mount.getBoundingClientRect();renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();cameraReady=false;}window.addEventListener('resize',resize);window.addEventListener('aerinviewport',resize);resize();
const clock=new T.Clock();function tick(dt){if(state.ready&&!state.started)mixer.update(dt);if(active()){state.time+=dt;const k=input.keys;state.yaw-=((k.has('ArrowRight')?1:0)-(k.has('ArrowLeft')?1:0)+input.look.x)*1.8*state.sensitivity*dt;state.pitch=clamp(state.pitch+((k.has('ArrowDown')?1:0)-(k.has('ArrowUp')?1:0)+input.look.y)*1.15*state.sensitivity*dt,-.04,.65);const sdt=state.hitStop>0?dt*.07:dt;state.hitStop=Math.max(0,state.hitStop-dt);state.shake=Math.max(0,state.shake-dt*2.6);updatePlayer(sdt);updateDummies(sdt);updateStrafeWeights(sdt);mixer.update(sdt);applyOffensiveGuard(sdt);postPose(dt,sdt);state.flash=Math.max(0,state.flash-dt);state.hitFlash=Math.max(0,state.hitFlash-dt);particles.rotation.y=state.time*.009;}if(state.dead&&state.deathTime>=0){state.deathTime+=dt;mixer.update(dt);knight?.cape.update(dt,state.time+state.deathTime);hairV15?.update(dt);if(state.deathTime>=1.9){state.deathTime=-1;$('#end-dialog').showModal();document.body.classList.add('paused');}}if(!state.paused&&!state.dead)updateCamera(dt);updateHUD();renderer.render(scene,camera);}
renderer.setAnimationLoop(()=>tick(Math.min(clock.getDelta(),.033)));
window.addEventListener('aerinquality',e=>{const mobile=e.detail==='mobile';renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1:e.detail==='ultra'?1.65:1.3));sun.shadow.mapSize.set(mobile?768:e.detail==='ultra'?2048:1536,mobile?768:e.detail==='ultra'?2048:1536);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}resize();});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();clearInput();setPaused(true);window.aerinBoot.fail('La 3D a été interrompue. Touche Recharger pour relancer le jeu.');});
window.aerinGame={state,player,dummies:dummyList,input,scene,camera,renderer,toggleLock,toggleCrouch,interact,chest,get knight(){return knight;},get motionMeta(){return motionMeta;},version:'V15',get hair(){return hairV15;},get body(){return bodyV13;},get actor(){return actor;},get mixer(){return mixer;},get actions(){return actions;},beginAction,reset,showEquipment};
}
