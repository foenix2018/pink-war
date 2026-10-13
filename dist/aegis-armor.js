import * as T from './vendor/three.webgpu.min.js';
import { armorPanel, bevelBox, ball, limb, matrix, bake, merge } from './geo.js';

// Original Pink War suit. Geometry is authored in the RLH bind pose, then rigidly
// skinned to its real bones. Cloth, finger rigs and native animations remain RLH.
// Broad military sci-fi influences only: no franchise meshes, marks or textures.
export const AEGIS = Object.freeze({ name:'AÉGIS', generation:1 });
const templateCache=new WeakMap();

function template(data,masculine) {
  let variants=templateCache.get(data);
  if(!variants){variants=new Map();templateCache.set(data,variants);}
  if(variants.has(masculine))return variants.get(masculine);
  const byName=new Map(data.bones.map((b,i)=>[b.name.replace('mixamorig',''),i])),items=[];
  const at=name=>new T.Vector3().setFromMatrixPosition(new T.Matrix4().fromArray(data.bones[byName.get(name)].inverse).invert());
  const add=(bone,key,geometry,position=[0,0,0],rotation=[0,0,0],scale=[1,1,1],level=1,tag='')=>{
    items.push({bone:byName.get(bone),key,geometry:bake(geometry,matrix(position,rotation,scale)),level,tag});
  };
  const plate=(bone,key,outline,p,scale=[1,1,1],rotation=[0,0,0],level=1,tag='')=>
    add(bone,key,armorPanel(outline,.022,.01),p,rotation,scale,level,tag);
  const box=(bone,key,size,p,rotation=[0,0,0],level=1)=>add(bone,key,bevelBox(...size,.004),p,rotation,[1,1,1],level);
  const link=(bone,key,a,b,r1,r2=r1,level=1)=>items.push({bone:byName.get(bone),key,geometry:limb(a,b,r1,r2,14),level});
  const sphere=(bone,key,p,r,level=1)=>add(bone,key,ball([0,0,0],r,[16,10]),p,[0,0,0],[1,1,1],level);
  // A front-facing panel follows the real rest direction of a limb, not a box's
  // arbitrary Y axis. The gaps around elbows and knees allow the rig to bend.
  function limbPlate(bone,end,key,outline,front,scale=[1,1,1],t=.5,level=1) {
    const a=at(bone),b=at(end),y=a.clone().sub(b).normalize(),z=new T.Vector3(0,0,1);
    z.addScaledVector(y,-z.dot(y)).normalize();const x=y.clone().cross(z).normalize();
    const frame=new T.Matrix4().makeBasis(x,y,z).setPosition(a.lerp(b,t).addScaledVector(z,-front));
    items.push({bone:byName.get(bone),key,geometry:bake(armorPanel(outline,.022,.01),frame.multiply(new T.Matrix4().makeScale(...scale))),level});
  }
  const width=masculine?1.04:.94;
  const chest=[[-.132,-.128],[.132,-.128],[.186,-.062],[.204,.061],[.151,.112],[.058,.102],[-.058,.102],[-.151,.112],[-.204,.061],[-.186,-.062]];
  plate('Spine2','pearl',chest,[0,1.43,-.168],[width,1,1],[0,0,0],1,'plastron');
  plate('Spine2','rose',[[-.086,-.087],[.086,-.087],[.133,.052],[.082,.079],[0,.067],[-.082,.079],[-.133,.052]],
    [0,1.434,-.194],[width,1,.6]);
  // An original small rescue crown retains the existing Pink War identity.
  const crown=[[-.105,-.052],[.105,-.052],[.126,.062],[.057,.012],[0,.108],[-.057,.012],[-.126,.062]];
  plate('Spine2','pearl',crown,[0,1.446,-.217],[.27,.27,.18]);
  for(const sign of [-1,1]) {
    plate('Spine2','dark',[[-.019,-.092],[.019,-.092],[.022,.066],[0,.08],[-.022,.066]],
      [sign*.171*width,1.424,-.188],[1,1,.7],[0,sign*.12,sign*-.1]);
    box('Spine2','glow',[.028,.004,.003],[sign*.106,1.50,-.198]);
    // Two separate clavicle pieces leave a dark, flexible neck seal.
    plate('Spine2','pearl',[[-.055,-.026],[.047,-.026],[.059,.014],[.023,.034],[-.044,.029]],
      [sign*.119,1.563,-.124],[width,1,.6],[.15,sign*-.27,sign*-.17]);
  }
  for(let i=0;i<3;i++) {
    const y=1.293-i*.051,bone=i===0?'Spine1':'Spine';
    plate(bone,i===1?'rose':'dark',[[-.11,-.020],[.11,-.020],[.134,.012],[.106,.023],[-.106,.023],[-.134,.012]],
      [0,y,-.167],[width,1,.7]);
  }
  // LYLU's shoulder shield is broad; GHJU's follows the same anatomy with a
  // narrower outline. Neither chest plate changes the native bone lengths.
  const shoulder=[[-.069,-.073],[.061,-.070],[.085,-.020],[.075,.067],[.029,.099],[-.058,.080],[-.086,.018]];
  const thigh=[[-.051,-.120],[.041,-.12],[.068,-.064],[.077,.074],[.04,.12],[-.048,.11],[-.073,.045],[-.07,-.05]];
  const shin=[[-.037,-.121],[.04,-.115],[.061,.067],[.043,.12],[-.045,.12],[-.064,.058]];
  const forearm=[[-.038,-.065],[.031,-.07],[.052,.031],[.034,.075],[-.032,.075],[-.052,.03]];
  for(const [side,sign] of [['Left',-1],['Right',1]]) {
    const arm=side+'Arm',fore=side+'ForeArm',leg=side+'UpLeg',knee=side+'Leg',foot=side+'Foot';
    plate(arm,'pearl',shoulder,[sign*.258,1.458,-.015],[masculine?1.13:1,.96,1],[0,sign*-.77,sign*-.10]);
    plate(arm,'rose',shoulder,[sign*.270,1.471,-.035],[masculine?.91:.80,.71,.5],[0,sign*-.77,sign*-.10]);
    limbPlate(leg,knee,'pearl',thigh,.102,[1,1,.72],.51,5);
    limbPlate(leg,knee,'rose',thigh,.120,[.43,.83,.45],.51,5);
    limbPlate(knee,foot,'pearl',shin,.082,[1,1,.77],.51,7);
    limbPlate(knee,foot,'rose',shin,.099,[.36,.89,.45],.51,7);
    limbPlate(fore,side+'Hand','dark',forearm,.064,[1.16,1.10,1],.49,4);
    limbPlate(fore,side+'Hand','pearl',forearm,.080,[.86,.88,.65],.49,4);
    // Source leather boot and sole remain visible around an articulated instep.
    const boot=at(foot);
    plate(foot,'rose',[[-.066,-.04],[.067,-.04],[.08,.017],[.036,.041],[-.038,.041],[-.08,.017]],
      [boot.x,boot.y-.013,boot.z-.133],[1,1,.6],[.70,0,0],3);
    // Level 3: the upper-arm plate ends before the elbow socket.
    limbPlate(arm,fore,'rose',forearm,.075,[1.08,.91,.65],.53,3);
    // Level 5: small convex knee guards; never a continuous stiff thigh/shin tube.
    const k=at(knee);
    plate(knee,'dark',[[-.062,-.05],[.06,-.05],[.074,.016],[.047,.053],[-.047,.053],[-.073,.016]],
      [k.x,k.y+.012,k.z-.103],[1,1,1],[0,0,0],5);
    plate(knee,'rose',[[-.034,-.03],[.034,-.03],[.041,.024],[0,.039],[-.041,.024]],
      [k.x,k.y+.015,k.z-.124],[1,1,.7],[0,0,0],5);
    // Level 7: slim lateral exoskeleton rails, bound to the corresponding thigh.
    const hip=at(leg);
    link(leg,'dark',[hip.x+sign*.074,hip.y-.065,.024],[k.x+sign*.075,k.y+.085,.024],.010,.009,7);
    sphere(leg,'pearl',[hip.x+sign*.075,hip.y-.10,.024],[.022,.022,.012],7);
    // Level 9: reinforced bracer flanges, without a plate on the flexing palm.
    limbPlate(fore,side+'Hand','rose',forearm,.097,[.36,.9,.5],.49,9);
  }
  // Native ARI bottle/harness is retained: new side rails turn the rescue pack
  // into a compact life-support assembly rather than an unrelated magic backpack.
  for(const sign of [-1,1]) {
    link('Spine2','dark',[sign*.102,1.49,.295],[sign*.095,1.245,.30],.018,.014);
    box('Spine2','rose',[.036,.17,.030],[sign*.112,1.382,.298]);
    box('Spine2','glow',[.014,.007,.004],[sign*.112,1.458,.318], [0,0,0],6);
    box('Spine2','pearl',[.045,.051,.030],[sign*.136,1.342,.265],[0,0,0],6);
  }
  box('Spine2','dark',[.070,.046,.025],[0,1.376,-.205],[0,0,0],2);
  box('Spine2','glow',[.034,.004,.004],[0,1.379,-.221],[0,0,0],2);
  const scanner=at('LeftForeArm').lerp(at('LeftHand'),.66);
  box('LeftForeArm','rose',[.048,.050,.022],[scanner.x-.054,scanner.y,scanner.z-.031],[0,0,-.21],4);
  box('LeftForeArm','glow',[.028,.025,.004],[scanner.x-.054,scanner.y,scanner.z-.044],[0,0,-.21],4);

  // Keep the complete coloured RLH F1 XF helmet and sealed mask. Only slim
  // military sensor plates are added as later equipment is recovered.
  for(const sign of [-1,1]) {
    box('Head','rose',[.025,.036,.038],[sign*.130,1.853,.06],[0,sign*-.25,0],8);
    sphere('Head','lens',[sign*.137,1.864,.033],[.008,.009,.008],8);
  }
  plate('Head','pearl',crown,[0,1.934,-.098],[.19,.19,.2],[.20,0,0],10);
  box('Spine2','pearl',[.056,.013,.006],[0,1.512,-.214],[0,0,0],10);
  box('Spine2','glow',[.028,.003,.003],[0,1.512,-.219],[0,0,0],10);

  const levels=new Map();
  function forLevel(level) {
    if(levels.has(level))return levels.get(level);
    const groups=new Map();
    for(const item of items)if(item.level<=level){if(!groups.has(item.key))groups.set(item.key,[]);groups.get(item.key).push(item);}
    const parts=[];
    for(const [key,list] of groups) {
      const geometry=merge(list.map(item=>item.geometry)),count=geometry.attributes.position.count;
      const indices=new Uint16Array(count*4),weights=new Float32Array(count*4);let offset=0;
      for(const item of list){for(let i=0;i<item.geometry.attributes.position.count;i++){indices[offset*4]=item.bone;weights[offset*4]=1;offset++;}}
      geometry.setAttribute('skinIndex',new T.Float32BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
      geometry.computeBoundingBox();geometry.computeBoundingSphere();parts.push({key,geometry});
    }
    const result={parts,count:items.filter(item=>item.level<=level).length};levels.set(level,result);return result;
  }
  const result={forLevel,items,masculine};variants.set(masculine,result);return result;
}

export function createAegisArmor(actor,kit,profile) {
  const source=template(actor.data,!!profile?.masculine),root=actor.root;
  const api={name:AEGIS.name,generation:AEGIS.generation,parts:[],level:0,count:0,
    setLevel(n) {
      n=Math.max(1,Math.min(10,Math.floor(Number(n)||1)));if(n===this.level)return;
      for(const mesh of this.parts)mesh.removeFromParent();this.parts=[];
      const stage=source.forLevel(n);this.count=stage.count;this.level=n;
      for(const part of stage.parts) {
        const mesh=new T.SkinnedMesh(part.geometry,kit.materials[part.key]);mesh.name='AÉGIS '+part.key;mesh.frustumCulled=false;
        mesh.userData.suit=AEGIS.name;mesh.userData.level=n;
        root.add(mesh);mesh.bind(actor.skeleton,new T.Matrix4());mesh.castShadow=part.key!=='glow';mesh.receiveShadow=true;
        mesh.boundingBox=new T.Box3(new T.Vector3(-1,-.2,-1),new T.Vector3(1,2.35,1));mesh.boundingSphere=new T.Sphere(new T.Vector3(0,1,0),1.8);
        this.parts.push(mesh);
      }
    },
    dispose(){for(const mesh of this.parts)mesh.removeFromParent();this.parts=[];}
  };
  api.setLevel(1);return api;
}
