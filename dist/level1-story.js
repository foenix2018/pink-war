// Three readable spaces tell the fall of the district: human rescue, a failed
// evacuation, then the machine occupation. Coordinates are metres on Vesper's
// existing map; these small static props never seal a street or a doorway.
import {Assembly,profile,loft,matrix} from './geo.js';

export const LEVEL1_STORY=Object.freeze({
 id:'vesper-evacuation-07',revision:'3.40',
 beats:Object.freeze([
  Object.freeze({id:'secours',x:-6.5,z:68,title:'DERNIER POSTE DE SECOURS',lines:['ÉVACUATION SUSPENDUE — 17:42','Laissez la radio sur le canal 07.','Nos équipes reviennent. — Commandement humain']}),
  Object.freeze({id:'evacuation',x:8.2,z:39,title:'COULOIR D’ÉVACUATION 07',lines:['TRANSPORTS HUMAINS : ANNULÉS','Ne rejoignez pas les portes de transfert.','ORDRE réquisitionne les véhicules.']}),
  Object.freeze({id:'resistance',x:-24,z:20,title:'NE CONNECTEZ RIEN',lines:['Le réseau nous écoute.','Conservez les journaux hors ligne.','La balise commande le verrou du relais.']}),
  Object.freeze({id:'occupation',x:5,z:-8,title:'ORDRE / RÉSEAU DE SURVEILLANCE',lines:['IDENTIFIANTS HUMAINS RÉVOQUÉS','Tour de service : verrouillage actif.','Coupure locale : accès manuel.']})
 ]),
 colliders:Object.freeze([
  Object.freeze({x:-6.5,z:68,hx:1.05,hz:.46,y:0,height:.69,surface:'metal',campaign:true,story:'rescue-cot'}),
  Object.freeze({x:3.8,z:-8.7,hx:.28,hz:.28,y:0,height:2.6,surface:'metal',campaign:true,story:'sensor-support'}),
  Object.freeze({x:6.2,z:-8.7,hx:.28,hz:.28,y:0,height:2.6,surface:'metal',campaign:true,story:'sensor-support'})
 ])
});

export function createLevel1Story(T,parent,maps,{quality='auto'}={}){
 const root=new T.Group();root.name='Vesper / traces de la Chute';parent.add(root);
 const a=new Assembly(),owned=[],geometries=[];
 const cloth=new T.MeshStandardMaterial({color:0x6f7770,roughness:.97,metalness:0});owned.push(cloth);
 const red=new T.MeshStandardMaterial({color:0x71392f,roughness:.88,metalness:.08});owned.push(red);
 const m={steel:maps.steel,rust:maps.rust,dark:maps.dark,cloth,red,light:maps.plaster};
 function rod(mat,p,q,r=.025,r2=r){a.limb(mat,p,q,r,r2);}
 function box(mat,size,p,rot=[0,0,0],bevel=.018){a.box(mat,size,p,rot,bevel);}
 // These are physical warning boards on salvaged frames, not floating text.
 for(const beat of LEVEL1_STORY.beats){
  const yy=beat.id==='occupation'?3.05:2.65;
  box(m.steel,[2.5,1.28,.055],[beat.x,yy,beat.z+.10]);
  for(const side of [-1,1])rod(m.rust,[beat.x+side*1.03,.04,beat.z+.10],[beat.x+side*1.03,yy+.61,beat.z+.10],.027);
 }
 // A folded field hospital, left mid-evacuation. The central route stays open.
 const x=-6.5,z=68;
 for(const dz of [-.38,.38])rod(m.steel,[x-1,.51,z+dz],[x+1,.51,z+dz],.035);
 for(const dx of [-.72,.72])for(const dz of [-.32,.32])rod(m.steel,[x+dx,.04,z+dz],[x-dx*.24,.52,z+dz],.023);
 box(m.cloth,[1.93,.12,.72],[x,.57,z]);
 a.add(loft([[-.09,.24,.13],[0,.29,.17],[.10,.22,.13]],14),m.light,matrix([x-.66,.64,z],[0,0,Math.PI/2]));
 for(const sx of [-1,1]){
  const xx=-6.9+sx*.27;box(m.dark,[.45,.35,.53],[xx,.20,70],[0,sx*.15,0],.05);
  box(m.light,[.43,.025,.51],[xx,.39,70],[0,sx*.15,0]);
  box(m.red,[.17,.006,.05],[xx,.405,70]);box(m.red,[.05,.006,.17],[xx,.405,70]);
 }
 // Sagging cable on a broken radio mast; no helpful AI, only a dead human set.
 rod(m.rust,[-7.5,0,66.5],[-7.3,2.25,66.5],.032);
 rod(m.steel,[-7.3,2.25,66.5],[-7.1,3.05,66.48],.014);
 box(m.dark,[.39,.30,.18],[-7.45,.75,66.45],[0,.2,0],.035);
 for(let i=0;i<4;i++)box(m.steel,[.23,.012,.009],[-7.45,.69+i*.03,66.347]);
 // Luggage lies beside a derelict car, rather than arbitrarily on the path.
 for(const [xx,zz,turn] of [[9.6,40.9,.22],[9.75,38.3,-.35],[7.2,36.6,1.1]]){
  box(m.cloth,[.55,.30,.38],[xx,.17,zz],[.12,turn,0],.065);
  for(const dx of [-.18,.18])rod(m.dark,[xx+dx,.29,zz-.16],[xx+dx,.30,zz+.16],.012);
  rod(m.steel,[xx-.08,.36,zz],[xx+.08,.36,zz],.012);
 }
 // Broken utility robot: exposed central spine, detached claw, dead lenses.
 const rx=6.25,rz=43.7;
 a.add(loft([[-.30,.15,.11],[-.20,.26,.18],[.17,.31,.21],[.30,.20,.14]],14),m.steel,matrix([rx,.26,rz],[Math.PI/2,0,.35]));
 for(let i=0;i<4;i++)rod(m.dark,[rx-.12,.19,rz-.25+i*.14],[rx+.15,.19,rz-.25+i*.14],.028);
 a.ball(m.dark,[rx-.38,.18,rz-.54],[.19,.15,.20]);
 box(m.steel,[.31,.15,.26],[rx-.38,.20,rz-.54],[0,.2,0],.04);
 box(m.dark,[.18,.025,.012],[rx-.38,.20,rz-.677]);
 rod(m.rust,[rx+.2,.16,rz+.13],[rx+.65,.12,rz+.36],.055,.033);
 for(const dx of [-.055,.055])rod(m.steel,[rx+.65+dx,.12,rz+.36],[rx+.79+dx,.08,rz+.57],.016,.009);
 // A disconnected improvised terminal inside the western shop.
 box(m.rust,[.74,.68,.85],[-25,.35,20.6],[0,.1,0],.045);
 box(m.steel,[.82,.06,.92],[-25,.73,20.6],[0,.1,0]);
 box(m.dark,[.22,.24,.28],[-25,.88,20.6],[0,.1,0],.035);
 for(let i=0;i<3;i++)rod(m.dark,[-25+i*.045,.82,20.7],[-24.9+i*.05,.04,21.0],.012);
 // Service scanner over the sabotage point: readable mechanical occupation.
 for(const xx of [3.8,6.2]){
  a.add(profile([[.18,0],[.24,.17],[.13,2.28],[.04,2.60],[-.12,2.60],[-.22,.14]],.30,.025),m.steel,matrix([xx,0,-8.7],[0,Math.PI/2,0]));
  box(m.rust,[.50,.12,.52],[xx,.07,-8.7]);
 }
 rod(m.steel,[3.8,2.55,-8.7],[6.2,2.55,-8.7],.10,.10);
 a.ball(m.dark,[5,2.42,-8.7],[.29,.19,.23]);
 a.mount(root);a.setLevel(1);
 for(const mesh of a.meshes){geometries.push(mesh.geometry);mesh.castShadow=quality!=='low';mesh.receiveShadow=true;}
 // Only this lens changes after sabotage. It is a world fixture, not an NPC.
 const lensMat=new T.MeshBasicMaterial({color:0xff321f,toneMapped:false});owned.push(lensMat);
 const lensGeo=new T.SphereGeometry(.065,12,8);geometries.push(lensGeo);
 const lens=new T.Mesh(lensGeo,lensMat);lens.position.set(5,2.42,-8.91);root.add(lens);
 let sabotaged=false;
 return {root,colliders:[...LEVEL1_STORY.colliders.map(b=>({...b})),...LEVEL1_STORY.beats.map(b=>({x:b.x,z:b.z+.10,hx:1.25,hz:.035,y:(b.id==='occupation'?3.05:2.65)-.64,height:1.28,surface:'metal',campaign:true,story:'warning-board-'+b.id}))],
  update(game){if(sabotaged!==!!game?.campaign?.sabotaged){sabotaged=!!game?.campaign?.sabotaged;lensMat.color.setHex(sabotaged?0x18282b:0xff321f);}},
  stats:()=>({revision:'3.40',beats:LEVEL1_STORY.beats.length,batches:a.meshes.length+1,pieces:a.count,sabotaged,triangles:geometries.reduce((n,g)=>n+(g.index?.count||g.attributes.position.count)/3,0)}),
  dispose(){root.removeFromParent();for(const g of geometries)g.dispose();for(const mat of owned)mat.dispose();root.clear();}
 };
}
