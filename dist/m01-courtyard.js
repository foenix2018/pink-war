import {Assembly,loft,matrix,bevelBox} from './geo.js';
import {createCircuitSwitch} from './circuit-switch.js';
import {createMachineFinishes} from './machine-finishes.js';
import {LEVEL1_MAP} from './level1-layout.js';

// Detailed props on the Blender-built courtyard: original medical equipment,
// physical access labels and two electrical isolators. No new dynamic light.
export function createCourtyardArt(T,parent,maps,{quality='auto',labels=true}={}){
 const root=new T.Group();root.name='M01 / cour et aile technique';parent.add(root);
 const assembly=new Assembly(),owned=[],textures=[],lamps=[],colliders=[],switches=[];
 const finishes=createMachineFinishes(T,{performance:quality==='low'});
 const cloth=finishes.fabric;
 const rubber=new T.MeshStandardMaterial({color:0x151d1d,map:maps.steel.map,roughness:.9,metalness:.08});owned.push(rubber);
 const ceramic=new T.MeshStandardMaterial({color:0xb2b4a4,map:maps.plaster.map,roughness:.85,metalness:.04});owned.push(ceramic);
 const red=new T.MeshStandardMaterial({color:0x713b30,roughness:.86,metalness:.14});owned.push(red);
 const box=(m,s,p,r=[0,0,0],b=.014)=>assembly.add(bevelBox(...s,b,1),m,matrix(p,r)),rod=(m,a,b,r=.02)=>assembly.limb(m,a,b,r,r*.9);
 function sign(x,y,z,lines,width=2.5){
  box(maps.steel,[width,.92,.09],[x,y,z]);for(const side of [-1,1])rod(maps.rust,[x+side*(width*.4),0,z],[x+side*(width*.4),y+.4,z],.024);
  colliders.push({x,z,y:y-.46,hx:width/2,hz:.05,height:.92,surface:'metal',campaign:true,courtyardPart:'access-sign'});
  if(!labels)return;
  const c=document.createElement('canvas');c.width=512;c.height=192;const ctx=c.getContext('2d');ctx.fillStyle='#303b35';ctx.fillRect(0,0,512,192);ctx.strokeStyle='#a39472';ctx.lineWidth=3;ctx.strokeRect(9,9,494,174);ctx.fillStyle='#d9ceb2';ctx.font='600 25px system-ui';lines.forEach((s,i)=>ctx.fillText(s,24,44+i*44,464));
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;textures.push(texture);const material=new T.MeshBasicMaterial({map:texture,toneMapped:false});owned.push(material);
  const g=new T.PlaneGeometry(width-.09,.83);assembly.add(g,material,matrix([x,y,z+.052]),false);
 }
 sign(-45,1.9,89,['SECOURS 07 / ANNEXE','CONVOI  →','AILE TECHNIQUE  ↑'],3.2);
 sign(-35.5,2.1,62,['TRIAGE / ACCÈS TECHNIQUE','CIRCUIT ISOLÉ · ENTRÉE EST'],3.3);
 sign(5,2.1,76,['ANNEXE DES ARCHIVES','POSTE DE SECOURS / HORS RÉSEAU'],3.4);
 for(const c of LEVEL1_MAP.courtyard.controls){
  switches.push(createCircuitSwitch(T,root,{x:c.x,y:.86,z:c.z-.20,batch:assembly,materials:{paint:finishes.paint,metal:finishes.steel,rubber:finishes.rubber,dark:maps.dark}}));
  const points=[[c.x-.36,.15,c.z-.48],[c.x-.55,.055,c.z-.48],[c.x-1.1,.055,c.z-.98],[c.x-1.1,.055,c.z-1.98]];
  assembly.add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),12,.035,6,false),finishes.rubber);
 }
 for(const [x,z,turn]of [[-30,66,0],[-18.5,49,Math.PI/2],[-31,78,0]]){
  const group=new T.Group();group.position.set(x,0,z);group.rotation.y=turn;root.add(group);const a=new Assembly();
  for(const side of [-1,1])a.limb(maps.steel,[-.84,.5,side*.31],[.84,.5,side*.31],.028,.028);
  for(const sx of [-1,1])for(const sz of [-1,1])a.limb(maps.steel,[sx*.72,.04,sz*.30],[-sx*.4,.49,sz*.30],.023,.023);
  a.box(cloth,[1.95,.11,.70],[0,.56,0],[0,0,0],.045);
  a.add(loft([[-.08,.18,.09],[0,.23,.13],[.08,.18,.09]],12),ceramic,matrix([-.65,.65,0],[0,0,Math.PI/2]));
  a.box(rubber,[.36,.16,.33],[.68,.10,.04],[.07,.1,0],.04);a.mount(group);a.setLevel(1);
  const cos=Math.abs(Math.cos(turn)),sin=Math.abs(Math.sin(turn));colliders.push({x,z,y:0,hx:(1.95*cos+.7*sin)/2,hz:(.7*cos+1.95*sin)/2,height:.72,surface:'metal',campaign:true,courtyardPart:'cot'});
 }
 // Broken supply racks have thickness, shelves and connected supports.
 for(const [x,z]of [[-30.5,70],[-18,69]]){
  for(const dx of [-.7,.7])for(const dz of [-.26,.26])rod(maps.steel,[x+dx,.03,z+dz],[x+dx,1.8,z+dz],.028);
  for(const y of [.14,.78,1.45])box(maps.steel,[1.48,.04,.58],[x,y,z]);
  for(const [dx,y]of [[-.35,.3],[.35,.94],[-.35,1.61]]){box(ceramic,[.5,.26,.43],[x+dx,y,z],[0,dx*.15,0],.025);box(red,[.18,.008,.05],[x+dx,y+.135,z]);box(red,[.05,.008,.18],[x+dx,y+.135,z]);}
  colliders.push({x,z,y:0,hx:.78,hz:.31,height:1.83,surface:'metal',campaign:true,courtyardPart:'medical-rack'});
 }
 assembly.mount(root);assembly.setLevel(1);
 root.traverse(o=>{if(o.isMesh){o.castShadow=quality!=='low'&&!o.material.isMeshBasicMaterial;o.receiveShadow=true;}});
 let last=null;
 function update(game){const isolated=!!game.circuitIsolated;last=isolated;for(const control of switches)control.setState(isolated);}
 const stats=()=>{let triangles=0,draws=0;root.traverse(o=>{if(o.isMesh){draws++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});return{revision:'3.63.5',approaches:2,isolators:2,medicalCots:3,colliders:colliders.length,triangles,draws,circuitIsolated:!!last};};
 return {root,colliders,update,stats,dispose(){for(const control of switches)control.dispose();finishes.dispose();root.removeFromParent();root.traverse(o=>o.geometry?.dispose());for(const m of owned)m.dispose();for(const t of textures)t.dispose();}};
}
