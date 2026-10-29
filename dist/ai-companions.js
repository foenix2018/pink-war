// Original Pink Wars companions. These are new actors, never replacements for
// the canonical Shadow Unit rigs. Assistance uses local perception and energy.
import {segmentBox} from './game-logic.js';
import {createCompanionModel} from './companion-model.js';

export function createAICompanion(T,scene,characterId='ghju') {
  const defensive=characterId!=='lylu',name=defensive?'Gaby':'Cara',color=defensive?0xff65b1:0x57baff;
  const root=new T.Group();root.name=name+' / autonomous phase sphere';scene.add(root);
  const emission=new T.MeshBasicMaterial({color,toneMapped:false});
  const model=createCompanionModel(T,root,defensive);
  const shield=new T.Mesh(new T.SphereGeometry(.7,20,12),new T.MeshBasicMaterial({color,transparent:true,opacity:.08,side:T.DoubleSide,depthWrite:false}));
  shield.visible=false;scene.add(shield);
  const beam=new T.Mesh(new T.CylinderGeometry(.012,.012,1,6),emission);beam.visible=false;scene.add(beam);
  const light=new T.PointLight(color,0,3.4,2);root.add(light);
  const target=new T.Vector3(),delta=new T.Vector3(),up=new T.Vector3(0,1,0),eye=new T.Vector3(),look=new T.Vector3(),facing=new T.Quaternion(),faceMatrix=new T.Matrix4();
  let energy=100,cooldown=0,pulse=0,presentationPulse=0,beamLife=0,initialized=false,assists=0,state='Follow',introduced=false,greeting=0,disposed=false;
  function clear(a,b,obstacles){return !obstacles.some(box=>segmentBox(a,b,box)!==null);}
  function update(dt,{game,camera,active=true,assistance=true}={}){
    root.visible=active;shield.visible=false;
    if(!active){beam.visible=false;return;}
    if(!introduced){introduced=true;greeting=5;}
    dt=Math.min(.05,Math.max(0,dt));energy=Math.min(100,energy+dt*4);cooldown=Math.max(0,cooldown-dt);
    pulse=Math.max(0,pulse-dt);presentationPulse=Math.max(0,presentationPulse-dt);greeting=Math.max(0,greeting-dt);beamLife=Math.max(0,beamLife-dt);beam.visible=beamLife>0;
    camera.getWorldPosition(eye);camera.getWorldDirection(look);
    const yaw=Math.atan2(-look.x,-look.z),side=defensive?-1:1;
    const forward=greeting>0||Math.max(pulse,presentationPulse)>.2?1.25:-.45;
    // Reserve the physical radius and a screen-edge margin, especially in
    // portrait. The old proportional offset clipped the shell on a phone.
    const halfWidth=Math.tan(Math.max(50,camera.fov||64)*Math.PI/360)*(camera.aspect||1)*Math.max(0,forward);
    const lateral=forward>0?Math.min(.85,Math.max(.06,halfWidth-.225)):.85;
    target.set(eye.x+Math.cos(yaw)*side*lateral-Math.sin(yaw)*forward,eye.y-.24+Math.sin(game.time*1.7)*.014,eye.z-Math.sin(yaw)*side*lateral-Math.cos(yaw)*forward);
    // Never pass through a wall to reach the shoulder, nor enter the near clip.
    if(!clear(eye,target,game.obstacles))target.copy(eye).add(new T.Vector3(0,.6,.1));
    if(!initialized){root.position.copy(target);initialized=true;}
    const next=root.position.clone().lerp(target,1-Math.exp(-dt*6));
    if(clear(root.position,next,game.obstacles))root.position.copy(next);
    else root.position.copy(target);
    // Keep the optical face readable near the player instead of continuously
    // spinning the entire shell. Only the stabilizer turns independently.
    facing.setFromRotationMatrix(faceMatrix.lookAt(eye,root.position,up));
    if(root.parent)facing.premultiply(root.parent.getWorldQuaternion(new T.Quaternion()).invert());
    root.quaternion.slerp(facing,1-Math.exp(-dt*5));light.intensity=pulse*10;
    state=greeting>0?'Dialogue':cooldown?'Cooldown':'Follow';
    if(assistance&&game.state==='playing'&&!cooldown){
      const center={x:game.player.x,y:game.player.elevation+1.1,z:game.player.z};
      if(defensive){
        const incoming=game.bullets.find(b=>b.hostile&&Math.hypot(b.x-center.x,b.y-center.y,b.z-center.z)<1.4);
        if(incoming&&energy>=30){
          incoming.life=0;incoming.hostile=false;incoming.damage=0;energy-=30;cooldown=3;pulse=1;assists++;
          game.event('companion-assist',{name,kind:'shield'});
        }else if(game.player.hp>0&&game.player.hp<60&&energy>=45){
          game.player.hp=Math.min(100,game.player.hp+18);energy-=45;cooldown=12;pulse=1;assists++;
          game.event('companion-assist',{name,kind:'heal'});
        }
      }else if(energy>=35){
        const foe=game.enemies.filter(e=>e.awareness==='engaged'&&Math.hypot(e.x-center.x,e.z-center.z)<22)
          .find(e=>clear(root.position,{x:e.x,y:e.elevation+e.aimHeight,z:e.z},game.obstacles));
        if(foe){
          const end=new T.Vector3(foe.x,foe.elevation+foe.aimHeight,foe.z);
          delta.subVectors(end,root.position);beam.position.copy(root.position).add(end).multiplyScalar(.5);
          beam.quaternion.setFromUnitVectors(up,delta.clone().normalize());beam.scale.y=delta.length();beamLife=.12;
          game.damageEnemy(foe,18,{x:foe.x,y:end.y,z:foe.z});
          energy-=35;cooldown=5;pulse=1;assists++;game.event('companion-assist',{name,kind:'support'});
        }
      }
      if(pulse)state='Assist';
    }
    if(defensive&&pulse>.65){shield.position.copy(eye);shield.visible=true;shield.material.opacity=(pulse-.65)*.3;}
    model.update(dt,{pulse:Math.max(pulse,presentationPulse),dialogue:greeting>0});
  }
  return {name,root,update,preview:(dt)=>model.update(dt),
    react(event){if(event?.name===name&&['companion-assist','companion-phase'].includes(event.type)){presentationPulse=1;model.react();}},
    reset(){energy=100;cooldown=pulse=presentationPulse=beamLife=greeting=0;initialized=introduced=false;assists=0;beam.visible=shield.visible=false;root.quaternion.identity();model.reset();},
    snapshot:()=>({name,state,visible:root.visible,energy:Math.round(energy),cooldown,assists,model:model.stats()}),
    dispose(){if(disposed)return;disposed=true;root.removeFromParent();shield.removeFromParent();beam.removeFromParent();model.dispose();shield.geometry.dispose();beam.geometry.dispose();emission.dispose();shield.material.dispose();}};
}
