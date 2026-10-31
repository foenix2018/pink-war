// B-11 heavy chassis driven by RECO1's original 41-bone RLH animation rig.
import * as T from './vendor/three.webgpu.min.js';
import {Assembly,merge,matrix,bevelBox} from './geo.js';
import {reco1Assets} from './reco1-assets.js';
import {createReco1Pose} from './reco1-pose.js';
import {enemyScale} from './enemy-combat.js';
import {enemyAlertState,ENEMY_OPTICS} from './enemy-alert.js';
import {bruteSurfaces} from './brute-surfaces.js';

let shared;
function geometry(){
 if(shared)return shared;
 const mat={plate:{uuid:'plate'},edge:{uuid:'edge'},dark:{uuid:'dark'},metal:{uuid:'metal'},red:{uuid:'red'},eye:{uuid:'eye'},mark:{uuid:'mark'}};
 const builds=new Map();
 const part=n=>{if(!builds.has(n))builds.set(n,new Assembly());return builds.get(n);};
 const box=(n,m,size,pos,rot=[0,0,0],rad=.012)=>part(n).add(bevelBox(...size,rad,1),mat[m],matrix(pos,rot),m!=='red'&&m!=='eye');
 const panel=(n,m,pts,pos,depth=.06,rot=[0,0,0])=>{const shape=new T.Shape();pts.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false});g.translate(0,0,-depth/2);part(n).add(g,mat[m],matrix(pos,rot));};
 const cylinder=new T.CylinderGeometry(1,1,1,12),ring=new T.TorusGeometry(1,.13,6,16);
 const cyl=(n,m,pos,r,length,rot=[Math.PI/2,0,0])=>part(n).add(cylinder,mat[m],matrix(pos,rot,[r,length,r]));
 const loop=(n,m,pos,r)=>part(n).add(ring,mat[m],matrix(pos,[0,0,0],[r,r,r]),false);
 const chest='Spine2',hip='Hips',head='Head';
 box(chest,'dark',[.83,.48,.39],[0,1.36,.01]);
 box(chest,'dark',[.57,.22,.38],[0,1.14,.015]);
 for(const s of [-1,1]){
  panel(chest,'plate',[[-.23,-.16],[.17,-.16],[.25,-.06],[.22,.16],[.13,.22],[-.16,.22],[-.25,.10]],[s*.235,1.39,.255],.10,[0,s*.10,s*-.055]);
  panel(chest,'edge',[[-.12,-.11],[.10,-.11],[.14,.04],[.07,.13],[-.10,.13],[-.14,.03]],[s*.13,1.39,.325],.045,[0,0,s*.08]);
  box(chest,'plate',[.39,.23,.33],[s*.48,1.57,.015],[0,0,s*.13],.035);
  panel(chest,'plate',[[-.19,-.14],[.16,-.15],[.23,-.05],[.20,.14],[.10,.19],[-.17,.18],[-.23,.06]],[s*.48,1.57,.205],.08,[0,s*.08,s*.08]);
  box(chest,'dark',[.25,.25,.28],[s*.32,1.69,-.22],[0,0,s*.06],.02);
  box(chest,'plate',[.25,.23,.07],[s*.32,1.70,-.36]);
  box(chest,'dark',[.19,.17,.02],[s*.32,1.70,-.404],[],.003);
  for(let i=0;i<5;i++)box(chest,'metal',[.16,.012,.014],[s*.32,1.63+i*.032,-.418],[],.002);
  box(chest,'red',[.023,.16,.015],[s*.46,1.7,-.42],[],.002);
  for(const y of [1.28,1.49])for(const x of [.15,.32])cyl(chest,'metal',[s*x,y,.33],.009,.012);
  box(chest,'plate',[.15,.16,.20],[s*.29,1.09,.04],[0,0,s*.10]);
 }
 box(chest,'dark',[.23,.20,.075],[0,1.22,.28]);
 for(let i=0;i<3;i++)box(chest,'red',[.14,.024,.018],[0,1.17+i*.048,.33],[],.003);
 box(hip,'dark',[.45,.20,.26],[0,.98,0]);
 for(const s of [-1,1]){
  panel(hip,'plate',[[-.14,-.11],[.12,-.11],[.16,.04],[.08,.13],[-.10,.13],[-.16,.03]],[s*.15,.95,.18],.07,[0,0,s*.08]);
  cyl(hip,'dark',[s*.23,.91,0],.105,.15,[0,0,Math.PI/2]);
  cyl(hip,'metal',[s*.30,.91,0],.055,.016,[0,0,Math.PI/2]);
 }
 box(head,'dark',[.32,.17,.24],[0,1.62,.01]);
 panel(head,'plate',[[-.14,-.07],[.14,-.07],[.19,-.015],[.16,.08],[-.16,.08],[-.19,-.015]],[0,1.65,.15],.06);
 box(head,'dark',[.28,.053,.022],[0,1.65,.195],[],.006);
 box(head,'eye',[.22,.018,.012],[0,1.65,.211],[],.003);
 box(head,'plate',[.26,.07,.22],[0,1.74,.02],[],.016);
 for(const s of [-1,1]){box(head,'plate',[.07,.13,.15],[s*.16,1.64,.015]);cyl(head,'metal',[s*.20,1.64,.01],.036,.02,[0,0,Math.PI/2]);}
 for(const [side,arm,fore,hand,thigh,shin,foot] of [[-1,'RightArm','RightForeArm','RightHand','RightUpLeg','RightLeg','RightFoot'],[1,'LeftArm','LeftForeArm','LeftHand','LeftUpLeg','LeftLeg','LeftFoot']]){
  const x=side*.40,legx=side*.23;
  cyl(arm,'dark',[side*.36,1.43,0],.105,.16,[0,0,Math.PI/2]);
  box(arm,'dark',[.20,.27,.20],[x,1.33,.01],[0,0,side*.12]);
  box(arm,'plate',[.22,.23,.17],[x,1.33,.13],[0,0,side*.12],.025);
  cyl(fore,'dark',[x,1.20,.025],.09,.16,[0,0,Math.PI/2]);
  box(fore,'plate',[.22,.23,.19],[side*.44,1.11,.04],[],.02);
  box(hand,'dark',[.14,.12,.15],[side*.46,.99,.14]);
  box(thigh,'dark',[.24,.32,.24],[legx,.72,.025],[0,0,side*.05]);
  panel(thigh,'plate',[[-.14,-.17],[.12,-.17],[.16,-.07],[.14,.14],[.08,.19],[-.12,.18],[-.16,.04]],[legx,.72,.18],.10,[0,0,side*.04]);
  cyl(shin,'dark',[legx,.49,.05],.10,.22,[0,0,Math.PI/2]);
  cyl(shin,'metal',[side*.34,.49,.05],.06,.025,[0,0,Math.PI/2]);
  panel(shin,'plate',[[-.13,-.17],[.13,-.17],[.17,-.06],[.12,.16],[-.11,.16],[-.17,-.05]],[legx,.31,.18],.09,[0,0,side*.05]);
  box(shin,'red',[.018,.14,.018],[side*.35,.30,.21],[],.002);
  box(foot,'dark',[.27,.10,.36],[legx,.07,.10]);
  for(let i=-1;i<=1;i++)box(foot,'plate',[.09,.105,.17],[legx+i*.087,.075,.22],[0,0,i*.05]);
 }
 // Full-height shield on left forearm; layered plates, frame and light rails.
 const sh='LeftForeArm';
 box(sh,'dark',[.45,.91,.15],[.60,1.05,.13],[],.035);
 for(let i=0;i<3;i++){
  const y=1.35-i*.29;
  panel(sh,'plate',[[-.20,-.13],[.17,-.13],[.22,-.06],[.21,.10],[.15,.14],[-.17,.14],[-.22,.07]],[.60,y,.24],.07);
  box(sh,'edge',[.36,.018,.02],[.60,y-.12,.29],[],.003);
  for(const x of [.46,.74])for(const yy of [y-.08,y+.08])cyl(sh,'metal',[x,yy,.29],.008,.01);
 }
 for(const x of [.365,.835]){box(sh,'dark',[.045,.86,.09],[x,1.05,.13]);box(sh,'red',[.017,.65,.018],[x,1.06,.19],[],.002);}
 box(sh,'mark',[.18,.025,.012],[.62,.84,.293],[0,0,-.45],.002);
 box(sh,'mark',[.18,.025,.012],[.62,.77,.293],[0,0,-.45],.002);
 // Rotating cannon is carried on the opposite forearm, not on the shoulder.
 const gun='RightForeArm';
 cyl(gun,'dark',[-.47,1.08,.20],.13,.30);
 cyl(gun,'plate',[-.47,1.08,.34],.115,.15);
 for(let i=0;i<6;i++){let a=i*Math.PI/3,x=-.47+Math.cos(a)*.073,y=1.08+Math.sin(a)*.073;cyl(gun,'metal',[x,y,.53],.022,.35);loop(gun,'red',[x,y,.71],.020);}
 cyl(gun,'dark',[-.47,1.08,.58],.12,.055);cyl(gun,'plate',[-.47,1.08,.38],.13,.05);
 box(gun,'red',[.018,.09,.025],[-.60,1.1,.35],[],.002);
 const names=[...builds.keys()], by=new Map();
 names.forEach((name,index)=>{for(const item of builds.get(name).items){const key=item.material.uuid==='edge'?'dark':item.material.uuid==='mark'?'metal':item.material.uuid;if(!by.has(key))by.set(key,[]);by.get(key).push({geometry:item.geometry,index});}});
 const parts=[...by].map(([key,items])=>{const geometry=merge(items.map(i=>i.geometry)),count=geometry.attributes.position.count,indices=new Float32Array(count*4),weights=new Float32Array(count*4);let offset=0;for(const item of items){const n=item.geometry.index?item.geometry.index.count:item.geometry.attributes.position.count;for(let i=0;i<n;i++){indices[(offset+i)*4]=item.index;weights[(offset+i)*4]=1;}offset+=n;}geometry.setAttribute('skinIndex',new T.Float32BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));return {key,geometry};});
 // Raise the helmet to the game's existing head hit zone.
 for(const part of parts){const p=part.geometry.attributes.position,idx=part.geometry.attributes.skinIndex;for(let i=0;i<p.count;i++)if(names[idx.getX(i)]==='Head')p.setY(i,p.getY(i)+.18);p.needsUpdate=true;part.geometry.computeBoundingSphere();}
 shared={names,parts};
 return shared;
}
export function createRempart({elite=false,environment=null}={}){
 const asset=reco1Assets(),states={motion:'idle',aim:false,mode:'patrol'},pose=createReco1Pose(asset,states),root=new T.Group(),visual=new T.Group();
 pose.gun.visible=false;pose.update(0,0,0);root.add(visual);visual.rotation.y=Math.PI;root.scale.setScalar(enemyScale('bulwark',elite));
 const wear=bruteSurfaces(T);
 const materials={plate:new T.MeshStandardMaterial({color:0x777b80,map:wear.paint,roughnessMap:wear.rough,bumpMap:wear.relief,bumpScale:.0012,roughness:.72,metalness:.7,envMap:environment}),edge:new T.MeshStandardMaterial({color:0x272b2f,roughness:.78,metalness:.65}),dark:new T.MeshStandardMaterial({color:0x111518,roughness:.8,metalness:.55}),metal:new T.MeshStandardMaterial({color:0x777b7b,roughness:.5,metalness:.8}),red:new T.MeshBasicMaterial({color:0xff1734,toneMapped:false}),eye:new T.MeshBasicMaterial({color:ENEMY_OPTICS.idle,toneMapped:false}),mark:new T.MeshStandardMaterial({color:0xb8b8b3,roughness:.9,metalness:.15})};
 const data=geometry(),q=new T.Quaternion(),p=new T.Vector3(),scale=new T.Vector3(1,1,1),temp=new T.Matrix4();
 const transform=b=>{b.getWorldPosition(p);b.getWorldQuaternion(q);return temp.compose(p,q,scale);};
 const bones=data.names.map(name=>{const source=pose.bones.get('mixamorig'+name),bone=new T.Bone();bone.name='B-11 '+name;transform(source).decompose(bone.position,bone.quaternion,bone.scale);bone.updateMatrixWorld(true);return {source,bone};});
 const skin=new T.Skeleton(bones.map(b=>b.bone),bones.map(b=>b.bone.matrixWorld.clone().invert()));
 for(const item of data.parts){const mesh=new T.SkinnedMesh(item.geometry,materials[item.key]);mesh.bindMode=T.DetachedBindMode;mesh.bind(skin,new T.Matrix4());mesh.castShadow=!mesh.material.isMeshBasicMaterial;mesh.receiveShadow=mesh.castShadow;mesh.frustumCulled=false;visual.add(mesh);}
 function sync(){for(const {source,bone} of bones){transform(source).decompose(bone.position,bone.quaternion,bone.scale);bone.updateMatrixWorld(true);}}
 root.name='REMPART B-11 / heavy suppression chassis';root.userData.form='bulwark';root.userData.designRevision='B-11 / RECO1 skeleton';root.userData.nativeSkeleton=pose.skeleton;root.userData.skeleton=pose.skeleton;root.userData.humanoidReference={source:asset.source,sourceBoneCount:41};root.userData.optics=materials.eye;root.userData.reco1Pose=pose;
 let previous=null,px=0,pz=0,speed=0;
 root.userData.animate=(time,phase=0,moving=true,enemy={},simulationTime=time)=>{
  const dt=previous===null?0:Math.min(.1,Math.max(0,time-previous)),elapsed=previous===null?0:time-previous,x=enemy.x??root.position.x,z=enemy.z??root.position.z,dist=Math.hypot(x-px,z-pz);
  const measured=moving&&elapsed>0&&dist<2&&(enemy.stunnedUntil||0)<=simulationTime?Math.min(5,dist/elapsed):0;speed+=(measured-speed)*(1-Math.exp(-dt*18));if(measured<.01&&speed<.03)speed=0;previous=time;px=x;pz=z;
  const alert=enemyAlertState(enemy,simulationTime);states.motion=speed>2.9?'run':speed>.06?'walk':'idle';states.aim=alert!=='idle';states.mode=alert==='engaged'?'attack':alert==='alert'?'search':'patrol';
  pose.setPose({speed,coverCrouch:enemy.coverCrouch||0,hitPulse:Math.max(0,1-(simulationTime-(enemy.hitAt??-99))/.22)});pose.update(dt,time,0);sync();materials.eye.color.setHex(ENEMY_OPTICS[alert]);root.userData.alertState=alert;root.userData.motionSpeed=speed;root.userData.nativeMotion=states.motion;
 };
 root.userData.animate(0,0,false,{},0);
 let disposed=false;root.addEventListener('removed',()=>{if(disposed)return;disposed=true;pose.dispose();skin.dispose();Object.values(materials).forEach(m=>m.dispose());});return root;
}
