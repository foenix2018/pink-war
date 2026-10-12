import * as T from './vendor/three.webgpu.min.js';
import { createRLHGlove, syncRLHMaterials } from './rlh-gloves.js';

// Keep the exact weapon/IK attachment frame. The imported RLH model has its own
// anatomical wrist origin; this adapter aligns that origin with the game's wrist.
export const GRIP=Object.freeze({halfWidth:.018,halfDepth:.0235,wrist:[.03,.052,.098],forearm:[.1,-.3,.95]});
const basis=new T.Matrix4().makeBasis(new T.Vector3(0,-1,0),new T.Vector3(0,0,-1),new T.Vector3(1,0,0));
const orientation=new T.Quaternion().setFromRotationMatrix(basis).premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-.35));
const clamp=n=>Math.max(0,Math.min(1,Number(n)||0));
export const syncGloveMaterials=syncRLHMaterials;

export function createGlove(materials,{mirror=false,sleeve=true,forearm=GRIP.forearm}={}){
  const group=new T.Group(),model=createRLHGlove(materials,{mirror,sleeve}),base=new T.Vector3();
  // Reflection belongs to the outer game frame, so hands/grips and IK agree.
  model.scale.setScalar(.81);model.quaternion.copy(orientation);model.position.set(...GRIP.wrist);group.add(model);
  if(mirror)group.scale.x=-1;
  group.name='Pink war RLH '+(mirror?'gauche':'droit');
  const rig=model.userData.rig,localDirection=new T.Vector3(...forearm).normalize().applyQuaternion(orientation.clone().invert());
  rig.forearm.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),localDirection);
  const order=['middle','ring','pinky','index'];
  const digitBones=[...order.map(name=>rig.doigts[name].artic),rig.pouce.artic];
  const pose={trigger:0,grip:0,reload:0,relax:0};
  Object.assign(group.userData,{source:'RLH V40',rlh:model,rig,skeleton:model.userData.skeleton,pose,digitBones,fingerJoints:digitBones.map(chain=>chain[1]),assembly:model.userData.assembly,
    setLevel:level=>model.userData.setLevel(level),
    setBasePosition(position){base.set(...position);group.position.copy(base);},
    dispose:()=>model.userData.dispose()
  });
  group.userData.animate=({trigger=0,grip=0,reload=0,relax=0}={},dt=.016,handedness=1)=>{
    Object.assign(pose,{trigger:clamp(trigger),grip:clamp(grip),reload:clamp(reload),relax:clamp(relax)});
    const {trigger:t,grip:g,reload:r,relax:open}=pose;
    const closed={index:.28+t*.20,middle:.82+g*.05,ring:.85+g*.04,pinky:.82+g*.03,thumbCurl:.55+g*.08,thumbOpp:.80+g*.08,spread:.02,wristFlex:0,wristSide:0};
    const relaxed={index:.13,middle:.17,ring:.21,pinky:.28,thumbCurl:.15,thumbOpp:.25,spread:.20};
    const opened={index:.03,middle:.03,ring:.04,pinky:.06,thumbCurl:.05,thumbOpp:.10,spread:.85};
    for(const key of Object.keys(relaxed)){
      let target=closed[key];
      if(open<=.65)target+=(relaxed[key]-target)*open/.65;
      else target=relaxed[key]+(opened[key]-relaxed[key])*(open-.65)/.35;
      if(r>0&&key!=='spread')target+=(relaxed[key]-target)*r*.65;
      closed[key]=target;
    }
    rig.pose(closed);rig.maj(dt);
    // The RLH index is full adult length. Its three angles are fitted to the
    // existing trigger guard, rather than shrinking the finger to fit the gun.
    const pull=clamp((rig.etat.index-.28)/.20),held=1-Math.min(1,open/.65+r*.8);
    const index=rig.doigts.index.artic,angles=[.08+pull*.035,-(.80+pull*.30),-(.71+pull*.04)];
    for(let i=0;i<3;i++)index[i].rotation.x=index[i].rotation.x*(1-held)+angles[i]*held;
    const sign=(mirror?-1:1)*handedness;
    model.userData.setSide(sign<0?'G':'D');
    group.rotation.z=sign*r*.09;group.position.set(base.x,base.y+r*.014,base.z-r*.02);
  };
  group.userData.animate({},1);return group;
}
