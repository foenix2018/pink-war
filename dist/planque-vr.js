import {syncTrackedHands} from './xr-hands.js';
import {createXRMenuPanel} from './planque-vr-menu.js';
import {turnStep,stickAxis} from './planque-vr-stations.js';
import {buzz} from './haptics.js';

// La planque en réalité virtuelle : même monde, même simulation, mêmes stations que sur écran.
// Marche au stick gauche (dans la direction du regard), rotation au stick droit, A = interagir,
// X gauche = pause, menus 3D pointés à la manette droite. Aucun dialogue HTML en casque.
const SETTINGS_KEY='pink-war-vr-hideout';
const down=b=>!!b?.pressed||(b?.value||0)>.15;
export const readHideoutVRSettings=()=>{try{const raw=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');return{snapTurn:raw.snapTurn===true};}catch{return{snapTurn:false};}};
export const saveHideoutVRSettings=value=>{try{localStorage.setItem(SETTINGS_KEY,JSON.stringify({snapTurn:!!value.snapTurn}));}catch{/* préférence facultative */}};
export async function headsetAvailable(){
  let timer;try{return !!(globalThis.isSecureContext&&navigator.xr&&await Promise.race([navigator.xr.isSessionSupported('immersive-vr'),new Promise(resolve=>{timer=setTimeout(()=>resolve(false),1500);})]));}catch{return false;}finally{clearTimeout(timer);}
}

export function createHideoutVR({getWorld,onFrame,onEnter=()=>{},onExit=()=>{},onClosePanel=()=>{},getYaw=()=>0,setYaw=()=>{}}){
  let session=null,rig=null,busy=false,entries=[],menu=null,hud=null,yaw=0,controls=null,settings=readHideoutVRSettings();
  const previous=new Map(),turnState={held:false};
  const edge=(name,value)=>{const hit=value&&!previous.get(name);previous.set(name,value);return hit;};
  const idle=()=>({x:0,z:0,moveYaw:yaw,yaw,interact:false,pause:false,menuOpen:true});
  function makeHud(T,camera){
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=160;const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    const plane=new T.Mesh(new T.PlaneGeometry(.52,.108),new T.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));
    plane.position.set(0,-.3,-1.05);plane.renderOrder=100;plane.frustumCulled=false;plane.visible=false;camera.add(plane);
    hud={canvas,texture,plane,key:''};
  }
  const api={get active(){return !!session;},get yaw(){return yaw;},get entries(){return entries;},get controls(){return controls;},get menu(){return menu;},get settings(){return settings;},
    toggleTurn(){settings={...settings,snapTurn:!settings.snapTurn};saveHideoutVRSettings(settings);return settings.snapTurn;},
    async enter(){
      if(session){await api.exit();return;}if(busy)return;
      const w=getWorld();if(!w?.game||!w.renderer)throw Error('La planque est encore en préparation.');
      if(!globalThis.isSecureContext||!navigator.xr)throw Error('Ouvre ce lien en HTTPS dans le navigateur du casque pour utiliser la VR.');
      if(!w.renderer.isWebGLRenderer)throw Error('Le casque a été branché après le chargement. Recharge la planque pour passer en rendu VR.');
      // requestSession doit partir dans le geste de l'utilisateur.
      const pending=navigator.xr.requestSession('immersive-vr',{requiredFeatures:['local-floor'],optionalFeatures:['bounded-floor']});busy=true;
      let opened;try{
        opened=await pending;session=opened;const {T,scene,camera,renderer}=w;yaw=getYaw();
        rig=new T.Group();rig.name='Planque / rig VR';scene.add(rig);rig.add(camera);camera.clearViewOffset?.();camera.position.set(0,0,0);camera.rotation.set(0,0,0);
        renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local-floor');renderer.xr.setFramebufferScaleFactor?.(.85);renderer.xr.setFoveation?.(.7);
        entries=[0,1].map(index=>{const ray=renderer.xr.getController(index),anchor=new T.Group(),mount=new T.Group();anchor.matrixAutoUpdate=false;anchor.visible=false;rig.add(ray,anchor);anchor.add(mount);mount.position.set(0,-.012,.018);
          const hand=w.createHand();mount.add(hand);return{ray,anchor,mount,hand,source:null,tracked:false};});
        menu=createXRMenuPanel(T,scene,{accent:w.accent,onClose:()=>onClosePanel()});
        makeHud(T,camera);
        opened.addEventListener('end',finish,{once:true});
        opened.addEventListener('visibilitychange',()=>{if(opened.visibilityState!=='visible')w.onHidden?.();});
        document.body.classList.add('xr-mode');await renderer.xr.setSession(opened);renderer.setAnimationLoop(onFrame);previous.clear();onEnter();api.syncPose();
      }catch(error){if(opened)await opened.end().catch(()=>{});if(session)finish();throw error;}finally{busy=false;}
    },
    // Place l'origine du repère de jeu : le joueur est là où le rig est, aux pieds de l'utilisateur.
    syncPose(){if(!session)return;const w=getWorld(),p=w.game.player;rig.position.set(p.x,0,p.z);rig.rotation.y=yaw;rig.updateMatrixWorld(true);w.renderer.xr.updateCamera(w.camera);},
    // Déplacement instantané (pièce choisie dans le menu) ; la direction du regard suit le yaw donné.
    face(value){yaw=value;setYaw(yaw);api.syncPose();},
    input(frame,dt){
      const w=getWorld(),T=w.T;syncTrackedHands(entries,session,frame,w.renderer.xr.getReferenceSpace());api.syncPose();
      const left=entries.find(e=>e.source?.handedness==='left'),right=entries.find(e=>e.source?.handedness==='right'),lp=left?.source?.gamepad,rp=right?.source?.gamepad;
      const pause=edge('pause',!!left?.tracked&&down(lp?.buttons[4])),interactPressed=edge('interact',!!right?.tracked&&down(rp?.buttons[4]));
      const trigger=right?.tracked?down(rp?.buttons[0]):false;
      for(const e of entries){e.hand.visible=!!e.tracked;e.hand.scale.x=(e.source?.handedness==='left'?-1:1)*Math.abs(e.hand.scale.x);e.hand.userData.animate?.({grip:e.source?.gamepad?.buttons?.[1]?.value||0,trigger:e.source?.gamepad?.buttons?.[0]?.value||0,reload:0},dt,e.source?.handedness==='left'?-1:1);}
      if(menu.open){const consumed=menu.update({camera:w.camera,ray:right?.tracked?right.ray:null,trigger});return controls={...idle(),pause,menuOpen:consumed,interact:false};}
      menu.update({camera:w.camera,ray:null,trigger:false});
      yaw=turnStep({value:rp?.axes?.[2],yaw,dt,snap:settings.snapTurn,state:turnState});setYaw(yaw);api.syncPose();
      const forward=new T.Vector3();w.camera.getWorldDirection(forward);const moveYaw=Math.atan2(-forward.x,-forward.z);
      return controls={x:stickAxis(lp?.axes?.[2]),z:stickAxis(lp?.axes?.[3]),moveYaw,yaw,interact:interactPressed,pause,menuOpen:false};
    },
    // Texte court dans le champ de vision : aide de la station proche ou dernier message de la planque.
    say(text){
      if(!hud)return;const key=text||'';if(hud.key===key)return;hud.key=key;hud.plane.visible=!!key;if(!key)return;
      const c=hud.canvas.getContext('2d');c.clearRect(0,0,768,160);c.fillStyle='#101c29ea';c.beginPath();c.roundRect(0,0,768,160,34);c.fill();
      c.fillStyle='#f2f2ed';c.textAlign='center';c.font='600 38px sans-serif';
      const words=key.split(/\s+/),lines=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(line&&c.measureText(next).width>690){lines.push(line);line=word;}else line=next;}lines.push(line);
      lines.slice(0,3).forEach((l,i,all)=>c.fillText(l,384,(all.length===1?92:62)+i*44,700));hud.texture.needsUpdate=true;
    },
    haptic(hand='right',pulse=[.35,45]){buzz(entries.find(e=>e.source?.handedness===hand)?.source?.gamepad,pulse);},
    async exit(){await session?.end();}
  };
  function finish(){
    if(!session)return;const w=getWorld();session=null;w.renderer.setAnimationLoop(null);w.scene.add(w.camera);
    menu?.dispose();menu=null;if(hud){hud.plane.removeFromParent();hud.plane.geometry.dispose();hud.plane.material.dispose();hud.texture.dispose();hud=null;}
    for(const e of entries){e.hand.userData.dispose?.();e.ray.removeFromParent();e.anchor.removeFromParent();}entries=[];rig?.removeFromParent();rig=null;
    w.renderer.xr.enabled=false;document.body.classList.remove('xr-mode');setYaw(yaw);onExit();
  }
  return api;
}
