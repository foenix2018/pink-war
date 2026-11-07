import {createArenaOptics} from './arena-optics.js';
import {metricSurfaceUV} from './combat-surface-textures.js';
import {Assembly,matrix,bevelBox,loft} from './geo.js';
import {ARENA_TURRETS,TURRET_HP} from './arena-defense.js';

// Reuse one mechanical model's buffers for all eight articulated sentries.
export function createArenaTurretArt(T,root,M,{low=false,optics=createArenaOptics(T,{low})}={}){
 M={...M,paint:M.paint.clone(),steel:M.steel.clone()};
 M.paint.color.setHex(0x9ba4b3);M.paint.roughness=.48;M.paint.envMapIntensity=.7;
 M.steel.color.setHex(0xaeb6bd);
 const base=new T.Group(),head=new T.Group(),ba=new Assembly(),ha=new Assembly();
 const add=(a,g,m,p=[0,0,0],r=[0,0,0])=>{a.add(g,m,matrix(p,r),!low);g.dispose();};
 const box=(a,m,s,p,r=[0,0,0])=>add(a,metricSurfaceUV(bevelBox(...s,.035,1),.75),m,p,r);
 const rod=(a,m,p,q,r=.07)=>{const u=new T.Vector3(...p),v=new T.Vector3(...q),d=v.clone().sub(u);
  const g=new T.CylinderGeometry(r,r,d.length(),low?8:12);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));
  add(a,g,m,u.add(v).multiplyScalar(.5).toArray());};
 add(ba,new T.CylinderGeometry(.64,.84,.28,16),M.paint,[0,.18,0]);
 add(ba,new T.CylinderGeometry(.46,.56,.72,12),M.black,[0,.66,0]);
 for(const y of [.38,.82,1.15])add(ba,new T.CylinderGeometry(.61,.61,.12,16),M.steel,[0,y,0]);
 for(let i=0;i<3;i++){
  const angle=i*Math.PI*2/3,rad=(r,y)=>[Math.sin(angle)*r,y,Math.cos(angle)*r],foot=rad(1.65,.12);
  box(ba,M.paint,[.54,.2,.82],foot,[0,angle,0]);
  rod(ba,M.black,rad(.48,.9),rad(1.42,.3),.15);rod(ba,M.steel,rad(.58,.82),rad(1.15,.42),.065);
  rod(ba,M.paint,rad(.5,.95),rad(.92,.68),.18);rod(ba,M.steel,rad(.92,.68),rad(1.5,.2),.11);
  add(ba,new T.SphereGeometry(.18,8,6),M.steel,rad(.92,.68));
 }
 add(ba,new T.CylinderGeometry(.65,.52,.22,20),M.paint,[0,1.28,0]);
 // Layered sloped armour, service panels, paired shrouded barrels and cooling fins.
 add(ha,loft([[-.34,.65,.55],[-.12,.92,.73],[.20,.83,.67],[.39,.52,.43]],8),M.paint);
 box(ha,M.black,[1.6,.34,.5],[0,0,.54]);box(ha,M.steel,[1.1,.08,.6],[0,.34,-.05]);
 for(const side of [-1,1]){
  box(ha,M.steel,[.12,.5,1.0],[side*.79,.04,-.04],[0,0,side*-.25]);
  box(ha,M.black,[.3,.4,.7],[side*.49,-.12,.70]);
  rod(ha,M.steel,[side*.49,-.12,.66],[side*.49,-.12,1.7],.12);
  rod(ha,M.black,[side*.49,-.12,1.3],[side*.49,-.12,1.77],.085);
  for(let i=0;i<4;i++)box(ha,M.steel,[.12,.05,.40],[side*(.28+i*.13),.34,-.27]);
  box(ha,M.black,[.055,.22,.48],[side*.92,.02,-.1]);
 }
 add(ha,new T.CylinderGeometry(.22,.25,.22,16),M.black,[0,.04,.76],[Math.PI/2,0,0]);
 add(ha,new T.TorusGeometry(.18,.035,6,20),M.steel,[0,.04,.90]);
 rod(ha,M.black,[-.38,.27,-.35],[-.38,1.13,-.35],.025);
 ba.build(base);ha.build(head);for(const a of [ba,ha])for(const item of a.items)item.geometry.dispose();
 const glow=new T.MeshBasicMaterial({color:0xff285e,toneMapped:false});
 const sensor=new T.MeshStandardMaterial({color:0x209bc9,emissive:0x087cb5,emissiveIntensity:.9,metalness:.65,roughness:.2,envMap:M.steel.envMap});
 const dark=new T.MeshBasicMaterial({color:0x10151c});
 const lensGeo=new T.CircleGeometry(.145,20),pupilGeo=new T.CircleGeometry(.047,16),irisGeo=new T.TorusGeometry(.105,.012,5,20),stripGeo=new T.CapsuleGeometry(.018,.20,2,8),beaconGeo=new T.SphereGeometry(.06,8,6);
 const hpGeo=new T.PlaneGeometry(1.6,.10),models=new Map();
 for(const descriptor of ARENA_TURRETS){
  const group=new T.Group();group.name=`Tourelle de défense / ${descriptor.id}`;group.position.set(descriptor.x,0,descriptor.z);root.add(group);
  group.add(base.clone());const pivot=new T.Group();pivot.position.y=1.75;group.add(pivot);const body=head.clone();pivot.add(body);pivot.rotation.y=descriptor.yaw;
  const lens=new T.Mesh(lensGeo,sensor);lens.position.set(0,.04,.925);body.add(lens);
  const pupil=new T.Mesh(pupilGeo,dark);pupil.position.set(0,.04,.929);body.add(pupil);
  const iris=new T.Mesh(irisGeo,sensor);iris.position.set(0,.04,.929);body.add(iris);
  const strips=[];for(const x of [-.72,.72]){const strip=new T.Mesh(stripGeo,glow);strip.position.set(x,.18,.60);strip.rotation.z=Math.PI/2;body.add(strip);strips.push(strip);}
  const beacon=new T.Mesh(beaconGeo,glow);beacon.position.set(-.38,1.13,-.35);body.add(beacon);
  const laserModel=optics.laser(root),laser=laserModel.group;
  const health=new T.Group();health.position.set(0,3.1,0);group.add(health);
  const bg=new T.Mesh(hpGeo,dark),bar=new T.Mesh(hpGeo,sensor);bg.scale.set(1.08,1.6,1);bar.position.z=.01;health.add(bg,bar);health.visible=false;
  models.set(descriptor.id,{group,pivot,body,lens,iris,beacon,strips,laser,laserModel,health,bar});
 }
 const point=new T.Vector3(),dir=new T.Vector3(),up=new T.Vector3(0,0,1);
 function sync(sim){
  for(const t of sim.turrets||[]){const m=models.get(t.id);if(!m)continue;
   const alive=t.hp>0,locking=alive&&t.lockAt!==null;
   m.pivot.rotation.y=t.yaw;m.body.rotation.x=alive?(t.target?Math.atan2(1.75-t.target.y,Math.hypot(t.target.x-t.x,t.target.z-t.z)):0):.6;
   m.pivot.position.y=alive?1.75:1.13;m.body.rotation.z=alive?0:.35;
   m.lens.material=m.iris.material=alive?sensor:dark;m.beacon.visible=alive&&(!locking||Math.floor(sim.time*10)%2===0);
   for(const strip of m.strips)strip.material=alive?glow:dark;
   m.laser.visible=locking&&!!t.target;
   if(m.laser.visible){m.group.updateMatrixWorld(true);m.lens.getWorldPosition(point);dir.set(t.target.x,t.target.y,t.target.z);m.laserModel.aim(point,dir);}
   m.health.visible=alive&&(locking||sim.time-t.hitAt<3||Math.hypot(t.x-sim.player.x,t.z-sim.player.z)<10);
   m.health.rotation.y=Math.atan2(sim.player.x-t.x,sim.player.z-t.z);m.bar.scale.x=t.hp/TURRET_HP;m.bar.position.x=-(1-m.bar.scale.x)*.8;
  }
 }
 function reset(){for(const [id,m] of models){const t=ARENA_TURRETS.find(t=>t.id===id);m.pivot.rotation.y=t.yaw;m.pivot.position.y=1.75;m.body.rotation.set(0,0,0);m.lens.material=m.iris.material=sensor;m.beacon.visible=true;m.health.visible=m.laser.visible=false;for(const s of m.strips)s.material=glow;}}
 return {sync,reset,models,materials:M};
}
