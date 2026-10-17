import * as T from './vendor/three.webgpu.min.js';
import {bevelBox,ball,limb,loft,matrix,bake,merge} from './geo.js';
import {profiledPanel} from './armor-profiles.js';

// Original full tactical suit on the preserved RLH skeleton. The old rescue
// jacket and F1 helmet are replaced, not hidden under another oversized shell.
export const AEGIS=Object.freeze({name:'AÉGIS III',generation:3,revision:'3.42'});
const cache=new WeakMap();
function template(data,masculine){
  let variants=cache.get(data);if(!variants){variants=new Map();cache.set(data,variants);}if(variants.has(masculine))return variants.get(masculine);
  const bones=new Map(data.bones.map((b,i)=>[b.name.replace('mixamorig',''),i])),items=[];
  const at=name=>new T.Vector3().setFromMatrixPosition(new T.Matrix4().fromArray(data.bones[bones.get(name)].inverse).invert());
  const add=(bone,key,g,p=[0,0,0],r=[0,0,0],s=[1,1,1],level=1,tag='',blend=false)=>items.push({bone:bones.get(bone),key,geometry:bake(g,matrix(p,r,s)),level,tag,blend});
  const box=(b,k,size,p,r=[0,0,0],level=1)=>add(b,k,bevelBox(...size,Math.min(...size)*.18,1),p,r,[1,1,1],level);
  const plate=(b,k,outline,p,s=[1,1,1],r=[0,0,0],level=1,tag='')=>add(b,k,profiledPanel(outline,{depth:.013,bulge:k==='pearl'?.018:k==='dark'?.009:.006,round:.10}),p,r,s,level,tag);
  const link=(b,k,a,c,r1,r2=r1,level=1)=>items.push({bone:bones.get(b),key:k,geometry:bake(limb(a,c,r1,r2,16)),level});
  const ell=(b,k,p,r,level=1)=>add(b,k,ball([0,0,0],r,[16,10]),p,[0,0,0],[1,1,1],level);
  const width=masculine?1.03:.94;
  // A fitted woven undersuit: chest, obliques and pelvis have separate human
  // cross-sections; weighted spine rings bend below the rigid chest harness.
  add('Spine','suit',loft([[1.025,.163,.100],[1.08,.165,.105],[1.17,.148,.101],[1.27,.168,.111],[1.39,.202,.127],[1.47,.214,.129],[1.515,.198,.117],[1.55,.147,.090],[1.575,.071,.068]],28),[0,0,0],[0,0,0],[width,1,1],1,'undersuit',true);
  add('Hips','suit',loft([[.88,.115,.085],[.93,.183,.108],[1.005,.184,.119],[1.065,.162,.107]],24),[0,0,0],[0,0,0],[width,1,1]);
  link('Neck','suit',[0,1.54,.024],[0,1.657,.024],.070,.060);
  for(let j=0;j<5;j++)add('Neck','dark',new T.TorusGeometry(.062,.003,5,24).rotateX(Math.PI/2),[0,1.58+j*.014,.024]);
  const chest=[[-.117,-.121],[.117,-.121],[.168,-.064],[.193,.047],[.174,.091],[.131,.116],[.061,.095],[-.061,.095],[-.131,.116],[-.174,.091],[-.193,.047],[-.168,-.064]];
  plate('Spine2','dark',chest,[0,1.419,-.130],[width*1.06,1.1,1.5]);
  plate('Spine2','pearl',chest,[0,1.427,-.147],[width,1,1]);
  // Recessed dark chest computer and small universe crown, like the reference.
  plate('Spine2','dark',[[-.073,-.066],[.073,-.066],[.089,.044],[.063,.072],[-.063,.072],[-.089,.044]],[0,1.439,-.183],[1,1,.65]);
  const crown=[[-.105,-.052],[.105,-.052],[.126,.062],[.057,.012],[0,.108],[-.057,.012],[-.126,.062]];
  plate('Spine2','rose',crown,[0,1.449,-.202],[.38,.38,.23]);
  for(const s of [-1,1]){
    plate('Spine2','rose',[[-.016,-.09],[.016,-.09],[.018,.075],[-.018,.075]],[s*.146*width,1.426,-.165],[1,1,.4],[0,s*.25,s*-.12]);
    link('Spine2','dark',[s*.157,1.548,-.071],[s*.141,1.25,-.143],.015,.014);
    for(const y of [1.50,1.31])box('Spine2','steel',[.040,.022,.012],[s*.15,y,-.160],[0,0,s*-.06]);
    box('Spine2','glow',[.004,.033,.002],[s*.109,1.485,-.178]);
    plate('Spine2','pearl',[[-.049,-.018],[.049,-.018],[.055,.014],[.028,.030],[-.040,.027]],[s*.113,1.55,-.095],[1,1,.6],[.13,s*-.16,s*-.19]);
    // Soft cargo pouches, retention strap and flush buckle at the abdomen.
    box('Spine1','suit',[.070,.112,.044],[s*.102,1.258,-.125],[.1,0,s*.035]);
    box('Spine1','dark',[.073,.022,.012],[s*.102,1.295,-.152]);
    box('Spine1','steel',[.016,.023,.008],[s*.102,1.273,-.160]);
  }
  for(let j=0;j<3;j++)plate('Spine','dark',[[-.103,-.016],[.103,-.016],[.118,.012],[-.118,.012]],[0,1.198-j*.045,-.110],[width,1,.5]);
  // Waist belt follows the hips instead of a rectangular slab through them.
  add('Hips','dark',loft([[1.020,.181,.121],[1.027,.184,.124],[1.063,.182,.124],[1.07,.176,.119]],28));
  box('Hips','steel',[.061,.038,.014],[0,1.044,-.132]);box('Hips','dark',[.044,.025,.005],[0,1.044,-.142]);
  for(const s of [-1,1]){
    box('Hips','suit',[.075,.112,.085],[s*.186,1.023,-.015],[0,0,s*-.08]);
    box('Hips','dark',[.079,.025,.045],[s*.186,1.061,-.042],[0,0,s*-.08]);
    box('Hips','rose',[.012,.040,.004],[s*.189,1.018,-.061]);
  }
  function sleeve(bone,end,rings){
    const a=at(bone),b=at(end),dir=b.clone().sub(a).normalize(),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),dir);
    const g=loft(rings.map(([t,rx,rz])=>[t*a.distanceTo(b),rx,rz]),20);g.applyMatrix4(new T.Matrix4().compose(a,q,new T.Vector3(1,1,1)));add(bone,'suit',g);
  }
  function limbPlate(bone,end,key,outline,front,scale=[1,1,1],t=.5,level=1,tag=''){
    const a=at(bone),b=at(end),y=a.clone().sub(b).normalize(),z=new T.Vector3(0,0,1);z.addScaledVector(y,-z.dot(y)).normalize();const x=y.clone().cross(z).normalize();
    const m=new T.Matrix4().makeBasis(x,y,z).setPosition(a.lerp(b,t).addScaledVector(z,-front));
    items.push({bone:bones.get(bone),key,geometry:bake(profiledPanel(outline,{depth:.014,bulge:key==='pearl'?.018:.008,round:.12}),m.multiply(new T.Matrix4().makeScale(...scale))),level,tag});
  }
  const shoulder=[[-.052,-.079],[.047,-.082],[.073,-.034],[.079,.018],[.055,.066],[.010,.088],[-.045,.075],[-.071,.032],[-.073,-.018]];
  const thigh=[[-.045,-.105],[.041,-.107],[.065,-.047],[.062,.082],[.035,.109],[-.042,.10],[-.062,.040],[-.059,-.04]];
  const shin=[[-.034,-.126],[.035,-.12],[.053,.080],[.032,.123],[-.034,.123],[-.051,.07]];
  const bracer=[[-.033,-.074],[.027,-.074],[.043,.039],[.026,.079],[-.03,.074],[-.043,.032]];
  for(const [side,s] of [['Left',-1],['Right',1]]){
    const arm=side+'Arm',fore=side+'ForeArm',hand=side+'Hand',leg=side+'UpLeg',knee=side+'Leg',foot=side+'Foot';
    sleeve(arm,fore,[[0,.068,.064],[.12,.074,.067],[.38,.069,.063],[.60,.061,.057],[.70,.064,.058],[.77,.057,.054],[.84,.060,.055],[.92,.049,.048],[1,.047,.047]]);
    sleeve(fore,hand,[[0,.048,.046],[.10,.051,.050],[.22,.055,.051],[.40,.052,.047],[.62,.044,.040],[.85,.037,.035],[1,.035,.033]]);
    ell(fore,'suit',at(fore).toArray(),[.049,.049,.047]);
    sleeve(leg,knee,[[0,.093,.095],[.12,.096,.099],[.37,.087,.090],[.58,.076,.080],[.68,.079,.081],[.75,.068,.074],[.83,.071,.075],[1,.055,.059]]);
    sleeve(knee,foot,[[0,.057,.060],[.22,.070,.071],[.45,.068,.065],[.75,.051,.047],[1,.043,.043]]);
    ell(knee,'dark',at(knee).toArray(),[.058,.059,.060]);
    const hip=at(leg),kn=at(knee),ankle=at(foot);
    plate(arm,'dark',shoulder,[s*.216,1.479,.016],[1.09,1.06,1.4],[.06,s*-.65,s*-.14]);
    plate(arm,'pearl',shoulder,[s*.219,1.482,-.001],[1.0,1,.9],[.06,s*-.65,s*-.14]);
    plate(arm,'rose',shoulder,[s*.234,1.492,-.024],[.51,.58,.25],[.06,s*-.65,s*-.14]);
    // Small curved shoulder badge; shoulder is never as wide as the helmet.
    plate(arm,'pearl',crown,[s*.241,1.495,-.039],[.16,.16,.1],[.06,s*-.65,s*-.14]);
    limbPlate(fore,hand,'dark',bracer,.043,[1.18,1.10,1],.48);
    limbPlate(fore,hand,'pearl',bracer,.057,[1,.94,.68],.48);
    limbPlate(fore,hand,'rose',bracer,.073,[.25,.77,.25],.48);
    limbPlate(leg,knee,'dark',thigh,.083,[1.13,1.1,1.1],.50);
    limbPlate(leg,knee,'pearl',thigh,.096,[1,1,.7],.50);
    limbPlate(leg,knee,'rose',thigh,.118,[.23,.76,.22],.50);
    // Narrow bands wrap the cloth with soft edges, rather than floating boxes.
    for(const t of [.22,.75]){
      const p=hip.clone().lerp(kn,t);add(leg,'dark',loft([[-.014,.089-t*.026,.098-t*.031],[.014,.089-t*.026,.098-t*.031]],20),p.toArray());
    }
    plate(knee,'dark',[[-.047,-.047],[.043,-.046],[.056,.010],[.032,.055],[-.034,.055],[-.056,.009]],[kn.x,kn.y+.014,kn.z-.060]);
    plate(knee,'pearl',[[-.038,-.035],[.036,-.035],[.045,.013],[.026,.044],[-.027,.044],[-.046,.014]],[kn.x,kn.y+.015,kn.z-.079]);
    limbPlate(knee,foot,'pearl',shin,.065,[1,1,.67],.50);
    limbPlate(knee,foot,'dark',shin,.082,[.51,.79,.3],.50);
    limbPlate(knee,foot,'rose',shin,.090,[.15,.76,.2],.50);
    // Boots: a curved leather upper and one shaped outsole, toe extends forward.
    const bx=ankle.x;
    add(foot,'suit',loft([[.032,.060,.135,-.070],[.055,.064,.139,-.070],[.097,.060,.118,-.055],[.14,.049,.070,-.008],[.22,.047,.051,.006]],24),[bx,0,ankle.z]);
    add(foot,'dark',loft([[.012,.058,.133,-.072],[.018,.064,.141,-.072],[.039,.065,.141,-.072],[.047,.059,.133,-.072]],24),[bx,0,ankle.z]);
    plate(foot,'pearl',[[-.047,-.023],[.047,-.023],[.052,.020],[.030,.033],[-.030,.033],[-.052,.020]],[bx,.09,ankle.z-.156],[1,1,.65],[.65,0,0]);
    for(let j=0;j<3;j++)box(foot,'dark',[.092,.010,.013],[bx,.135-j*.018,ankle.z-.073-j*.022],[.65,0,0]);
    box(foot,'rose',[.026,.033,.008],[bx,.185,ankle.z-.048]);
    // Flush fasteners and flexible elbow cuffs have a purpose and a substrate.
    const fastener=new T.CylinderGeometry(.0035,.0035,.0025,8).rotateX(Math.PI/2);
    for(const [x,y,z] of [[s*.157,1.48,-.169],[s*.128,1.342,-.165],[kn.x+s*.028,kn.y+.027,kn.z-.089]])add(y<1?knee:'Spine2','steel',fastener,[x,y,z]);
    // Later tiers add functional reinforcements while preserving the silhouette.
    limbPlate(arm,fore,'pearl',bracer,.065,[1,.8,.65],.58,3);
    limbPlate(leg,knee,'steel',thigh,.122,[.18,.85,.3],.50,5);
    link(leg,'steel',[hip.x+s*.090,hip.y-.08,.02],[kn.x+s*.067,kn.y+.08,.02],.006,.006,7);
    limbPlate(fore,hand,'rose',bracer,.082,[.12,.84,.3],.48,9);
  }
  // Compact rear protection, attached to the torso; no air tank or long coat.
  plate('Spine2','dark',chest,[0,1.415,.125],[width*.97,1.03,1],[0,Math.PI,0]);
  plate('Spine2','pearl',chest,[0,1.417,.144],[width*.87,.91,.6],[0,Math.PI,0]);
  box('Spine2','dark',[.105,.232,.046],[0,1.413,.162]);
  for(let j=0;j<5;j++)box('Spine2','steel',[.067,.008,.005],[0,1.35+j*.027,.188]);
  // Helmet: human-sized complete shell, opaque continuous visor, sculpted jaw.
  // Its center follows the existing animated Head bone in the RLH bind pose.
  const hy=1.751,hz=.018;
  add('Head','pearl',loft([[-.132,.059,.062],[-.106,.088,.101],[-.052,.110,.128],[.035,.115,.132],[.097,.099,.117],[.130,.061,.079],[.141,.014,.023]],32),[0,hy,hz],[0,0,0],[1,1,1],1,'closed-helmet');
  // Original curved blue/pink eye shield, narrow enough to leave a brow/jaw.
  const vs=[],uv=[],ix=[],rows=[[-.015,.93],[.035,1],[.052,.94]],steps=28;
  for(let r=0;r<rows.length;r++)for(let j=0;j<=steps;j++){const a=(j/steps-.5)*2.36;vs.push(Math.sin(a)*.123,hy+rows[r][0],hz-Math.cos(a)*.147*rows[r][1]);uv.push(j/steps,r/2);if(r&&j<steps){const q=r*(steps+1)+j,k=q-steps-1;ix.push(k,q,k+1,k+1,q,q+1);}}
  const visor=new T.BufferGeometry();visor.setAttribute('position',new T.Float32BufferAttribute(vs,3));visor.setAttribute('uv',new T.Float32BufferAttribute(uv,2));visor.setIndex(ix);visor.computeVertexNormals();
  // The row winding faces outward towards -Z, like the closed shell.
  add('Head','lens',visor,[0,0,0],[0,0,0],[1,1,1],1,'visor');
  plate('Head','dark',[[-.065,.046],[.065,.046],[.093,-.005],[.050,-.062],[-.051,-.062],[-.093,-.005]],[0,hy-.065,hz-.118],[1,1,1],[.05,0,0]);
  plate('Head','rose',[[-.064,-.01],[.064,-.01],[.086,.026],[.061,.041],[-.061,.041],[-.086,.026]],[0,hy+.069,hz-.122],[1,1,.5],[.32,0,0]);
  for(const s of [-1,1]){
    plate('Head','pearl',[[-.021,-.048],[.022,-.047],[.033,.022],[.008,.042],[-.027,.020]],[s*.084,hy-.069,hz-.109],[1,1,.6],[-.1,s*-.38,s*-.27]);
    ell('Head','dark',[s*.114,hy-.002,hz+.009],[.016,.048,.048]);
    ell('Head','rose',[s*.126,hy-.002,hz+.009],[.009,.034,.034]);
    box('Head','steel',[.012,.041,.025],[s*.130,hy-.001,hz+.013]);
    box('Head','glow',[.004,.018,.009],[s*.137,hy+.002,hz-.004]);
    for(let j=0;j<3;j++)box('Head','steel',[.004,.016,.005],[s*(.039+j*.010),hy-.097,hz-.130],[.1,0,s*-.2]);
    // Fitted coloured scalp strips use the helmet's curved rings; no square
    // panel can protrude above the dome like a floating crest.
    const pv=[],pu=[],pi=[],pr=[[.075,.106,.124],[.098,.099,.118],[.124,.073,.091],[.135,.048,.065]];
    for(let r=0;r<pr.length;r++)for(let j=0;j<=8;j++){const a=s*(.24+j/8*.65),[y,rx,rz]=pr[r];pv.push(Math.sin(a)*(rx+.002),hy+y,hz-Math.cos(a)*(rz+.002));pu.push(j/8,r/3);if(r&&j<8){const q=r*9+j,k=q-9;pi.push(...(s===1?[k,q,k+1,k+1,q,q+1]:[q,k,k+1,q,k+1,q+1]));}}
    const cap=new T.BufferGeometry();cap.setAttribute('position',new T.Float32BufferAttribute(pv,3));cap.setAttribute('uv',new T.Float32BufferAttribute(pu,2));cap.setIndex(pi);cap.computeVertexNormals();add('Head','rose',cap);
  }
  plate('Head','rose',crown,[0,hy+.106,hz-.094],[.17,.17,.15],[.40,0,0]);
  box('Spine2','steel',[.032,.041,.014],[-.176,1.472,-.137],[0,0,-.12],2);
  box('LeftForeArm','glow',[.024,.028,.005],[-.309,1.105,-.044],[0,0,-.18],4);
  box('Spine2','rose',[.036,.056,.015],[.147,1.46,.154],[0,0,0],6);
  for(const s of [-1,1])box('Head','steel',[.014,.025,.033],[s*.111,hy+.055,hz+.042],[0,0,0],8);
  plate('Spine2','steel',crown,[0,1.449,-.190],[.13,.13,.14],[0,0,0],10);
  const levels=new Map();
  const result={items,forLevel(level){
    if(levels.has(level))return levels.get(level);const groups=new Map();for(const item of items)if(item.level<=level){if(!groups.has(item.key))groups.set(item.key,[]);groups.get(item.key).push(item);}
    const parts=[];for(const [key,list] of groups){const g=merge(list.map(i=>i.geometry)),count=g.attributes.position.count,indices=new Float32Array(count*4),weights=new Float32Array(count*4);let offset=0;
      for(const item of list)for(let j=0;j<item.geometry.attributes.position.count;j++,offset++){
        indices[offset*4]=item.bone;weights[offset*4]=1;
        if(item.blend){const y=item.geometry.attributes.position.getY(j),t=Math.max(0,Math.min(1,(y-1.24)/.16));indices[offset*4]=bones.get(y<1.24?'Spine':'Spine1');indices[offset*4+1]=bones.get(y<1.24?'Spine1':'Spine2');weights[offset*4]=1-(y<1.24?Math.max(0,Math.min(1,(y-1.10)/.14)):t);weights[offset*4+1]=1-weights[offset*4];}
      }
      g.setAttribute('skinIndex',new T.Float32BufferAttribute(indices,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));g.computeBoundingBox();g.computeBoundingSphere();parts.push({key,geometry:g});
    }const stage={parts,count:items.filter(i=>i.level<=level).length};levels.set(level,stage);return stage;
  }};variants.set(masculine,result);return result;
}
export function createAegisArmor(actor,kit,profile){
  const source=template(actor.data,!!profile?.masculine),root=actor.root;
  const api={...AEGIS,parts:[],level:0,count:0,template:source,
    setLevel(n){n=Math.max(1,Math.min(10,Math.floor(Number(n)||1)));if(n===this.level)return;for(const m of this.parts)m.removeFromParent();this.parts=[];const stage=source.forLevel(n);this.count=stage.count;this.level=n;
      for(const p of stage.parts){const mesh=new T.SkinnedMesh(p.geometry,kit.materials[p.key]);mesh.name='AÉGIS III '+p.key;mesh.frustumCulled=false;mesh.userData.suit=AEGIS.name;mesh.userData.level=n;root.add(mesh);mesh.bind(actor.skeleton,new T.Matrix4());mesh.castShadow=p.key!=='glow';mesh.receiveShadow=true;mesh.boundingBox=new T.Box3(new T.Vector3(-1,-.2,-1),new T.Vector3(1,2.35,1));mesh.boundingSphere=new T.Sphere(new T.Vector3(0,1,0),1.8);this.parts.push(mesh);}
    },dispose(){for(const m of this.parts)m.removeFromParent();this.parts=[];}
  };api.setLevel(1);return api;
}
