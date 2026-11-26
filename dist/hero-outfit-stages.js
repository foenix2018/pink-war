import * as T from './vendor/three.webgpu.min.js';
import {suitStage,ARMOR_STAGES} from './armor-progression.js';
import {bevelBox,loft} from './geo.js';
import {batchHeroArmor} from './hero-armor-batches.js';

// Keep the canonical bodies, helmets, native bones, hands and animation clips.
// Masks change the indexed ranges of the existing skinned batches, not their skin weights.
export function installOutfitStages(model,profile,{armour,gear}={}){
 const pose=model.actor.bones.map(b=>({p:b.position.clone(),q:b.quaternion.clone()}));for(let i=0;i<pose.length;i++){model.actor.bones[i].position.fromArray(model.actor.data.bones[i].p);model.actor.bones[i].quaternion.fromArray(model.actor.data.bones[i].q);}model.root.updateMatrixWorld(true);
 const groups=[],owned=[],originalMaterials=new Map();let current=0,disposed=false;
 const accent=new T.MeshBasicMaterial({color:profile.masculine?0x51b5ff:0xff148b,toneMapped:false}),shell=new T.MeshStandardMaterial({color:0x28313b,metalness:.65,roughness:.36}),trim=new T.MeshStandardMaterial({color:0x697683,metalness:.8,roughness:.32});owned.push(accent,shell,trim);
 function anchor(boneName,minStage){const b=model.actor.bone(boneName),g=new T.Group(),i=model.actor.bones.indexOf(b);new T.Matrix4().fromArray(model.actor.data.bones[i].inverse).decompose(g.position,g.quaternion,g.scale);b.add(g);g.userData.outfitStage=minStage;groups.push(g);return g;}
 function add(parent,g,m,p,r=[0,0,0]){const o=new T.Mesh(g,m);o.position.set(...p);o.rotation.set(...r);parent.add(o);return o;}
 // Actual arm-mounted field projector and shock actuator, separate from the later dorsal thrusters.
 const field=anchor('LeftForeArm',2);add(field,bevelBox(.09,.12,.065,.012,2),shell,[-.32,1.18,-.035]);
 add(field,new T.CylinderGeometry(.036,.043,.018,16),trim,[-.32,1.18,-.08],[Math.PI/2,0,0]);add(field,new T.TorusGeometry(.029,.004,6,24),accent,[-.32,1.18,-.092]);
 // Launcher and spool: calibrated to the same arm and compatible with the shared grapple effect.
 const hook=anchor('LeftForeArm',4);add(hook,bevelBox(.095,.17,.07,.015,2),shell,[-.32,1.09,-.05]);
 for(const x of [-.347,-.293])add(hook,new T.CylinderGeometry(.015,.018,.13,12),trim,[x,1.09,-.092]);add(hook,new T.TorusGeometry(.035,.007,8,24),trim,[-.32,1.10,.014]);
 const bindPosition=name=>new T.Vector3().setFromMatrixPosition(new T.Matrix4().fromArray(model.actor.data.bones[model.actor.bones.indexOf(model.actor.bone(name))].inverse).invert());const forearmCentre=bindPosition('LeftForeArm').lerp(bindPosition('LeftHand'),.5),shift=forearmCentre.sub(new T.Vector3(-.32,1.14,0));for(const g of [field,hook])for(const mesh of g.children)mesh.position.add(shift);
 // Bastion: layered shoulder cups and separate thigh/shin shields follow each bone.
 for(const side of ['Left','Right']){const sign=side==='Left'?-1:1;
  const g=anchor(side+'Arm',5);add(g,loft([[-.065,.065,.095],[-.040,.088,.115],[.005,.098,.125],[.048,.082,.106],[.075,.028,.035]],24),shell,[sign*.255,1.49,0]);add(g,bevelBox(.15,.022,.18,.010,2),trim,[sign*.255,1.429,0]);
  const leg=anchor(side+'UpLeg',5);for(let i=0;i<3;i++)add(leg,bevelBox(.12,.065,.045,.015,2),i===1?trim:shell,[sign*.12, .89-i*.058,-.12],[.12,0,0]);
 }
 model.root.updateMatrixWorld(true);const extras=batchHeroArmor(model,groups),extraGeo=groups.flatMap(g=>g.children.map(m=>m.geometry));
 const stageFor=source=>{const name=source.parent.name;if(/épaule/.test(name))return 5;if(/ Arm$/.test(name))return 3;if(/UpLeg|Hip|abdomen|bassin/.test(name))return 2;return 1;};
 const mask=(bindings,minimum)=>{const buckets=new Map();for(const b of bindings){if(!buckets.has(b.batch))buckets.set(b.batch,[]);if(minimum(b.source)<=current)for(let i=b.first;i<b.first+b.count;i++)buckets.get(b.batch).push(i);}for(const[mesh,index]of buckets){mesh.geometry.setIndex(index);mesh.visible=index.length>0;mesh.geometry.computeBoundingSphere();}};
 const textures=new Map();
 function finish(stage){if(textures.has(stage))return textures.get(stage);const width=240,height=224,data=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){let c=240;if(stage===2){const column=Math.round(x/24);let distance=Infinity,edge=0;for(let col=column-1;col<=column+1;col++){const offset=Math.abs(col%2)*14,row=Math.round((y-offset)/28);for(let rr=row-1;rr<=row+1;rr++){const dx=Math.abs(x-col*24),dy=Math.abs(y-offset-rr*28),d=dx*dx+dy*dy;if(d<distance){distance=d;edge=14-Math.max(dx*.875+dy*.5,dy);}}}c=edge<.7?164:240+(x*7+y*11)%12;}else if(stage>=4){const a=Math.floor(x/5),b=Math.floor(y/5),weave=((a+b)%2)?Math.sin(x*.6):Math.sin(y*.6);c=132+Math.round(weave*27)+(x+y)%6;}else c=220+(y*13%17);const i=(y*width+x)*4;data.set([c,c,c,255],i);}
  const t=new T.DataTexture(data,width,height);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.setScalar(stage===2?2:3);t.needsUpdate=true;textures.set(stage,t);return t;
 }
 const plateMaterials=[...new Set(armour.batches.map(m=>m.material))].filter(m=>m.isMeshStandardMaterial&&!m.isMeshPhysicalMaterial&&!m.transparent&&m.color.getHex()!==0x080a0f);
 for(const m of plateMaterials)originalMaterials.set(m,{map:m.map,normalMap:m.normalMap,roughnessMap:m.roughnessMap});
 const palette=[0,0xe0e2e6,0xe6e7e9,0x929ca8,0x343d48,0x202733];
 function refresh(){for(const m of plateMaterials){m.color.setHex(palette[current]);m.map=finish(current);m.normalMap=null;m.roughnessMap=null;m.bumpMap=m.map;m.bumpScale=current===2?.0004:.00015;m.metalness=current<=2?.14:current===3?.82:.58;m.roughness=current<=2?.52:current===3?.29:.38;m.needsUpdate=true;}
  if(model.jetpackFX?.root)model.jetpackFX.root.visible=current>=3;
  for(const g of gear.anchors)if(/protections de hanche/.test(g.name))g.visible=current>=5;
 }
 // Tenues 4-5 : le casque fourni (hero-helmets.js) remplace la coque Shadow dès qu'il est chargé.
 let helmetOverride=()=>false;const armourStage=source=>helmetOverride()&&source.parent===armour.helmet?Infinity:stageFor(source);
 model.setLevel=n=>{const stage=suitStage(n);if(current===stage)return;current=stage;mask(armour.bindings,armourStage);mask(extras.bindings,s=>s.parent.userData.outfitStage);model.gun?.userData.setLevel?.(stage);model.freeHand?.userData.setLevel?.(stage);refresh();};
 for(let i=0;i<pose.length;i++){model.actor.bones[i].position.copy(pose[i].p);model.actor.bones[i].quaternion.copy(pose[i].q);}model.root.updateMatrixWorld(true);
 Object.defineProperty(model,'equipmentLevel',{configurable:true,get:()=>current});
 const ready=gear.ready.then(()=>{if(disposed)return false;refresh();return true;});model.setLevel(1);
 return{ready,get stage(){return current;},setHelmetOverride(fn){helmetOverride=fn||(()=>false);},refreshHelmet(){if(current)mask(armour.bindings,armourStage);},snapshot:()=>({stage:current,name:ARMOR_STAGES[current-1].name,triangles:[...armour.batches,...extras.batches].reduce((n,m)=>n+(m.visible?m.geometry.index.count/3:0),0),batches:armour.batches.filter(m=>m.visible).length+extras.batches.filter(m=>m.visible).length,jetpack:model.jetpackFX?.root.visible}),dispose(){disposed=true;extras.dispose();for(const g of groups)g.removeFromParent();for(const g of extraGeo)g.dispose();for(const m of owned)m.dispose();for(const t of textures.values())t.dispose();}};
}
