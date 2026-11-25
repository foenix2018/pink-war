// Chapter 10 metric plan. The HELIX shell is shared with the old standalone
// courtyard; laboratories, physical doors and the east evacuation deck are new.
import * as B from './couronne-layout.js';
export const LEVEL_ID='m10-couronne-helix';
export const PLAN=Object.freeze({chapter:10,title:'La Couronne HELIX'});
export const START=Object.freeze({x:0,z:78,y:0,yaw:0});
export const FLOORS=Object.freeze([...B.FLOORS,{id:'liaison-aegis',x1:32,x2:46,z1:-57,z2:-51,height:12},{id:'quai-aegis',x1:44,x2:72,z1:-80,z2:-44,height:12}]);
export const STAIRS=B.STAIRS;
export const ROOMS=Object.freeze([{id:'laboratoires',x1:-28,x2:-9,z1:-81,z2:-58,y:12,doorX:-20},{id:'archives',x1:9,x2:28,z1:-81,z2:-58,y:12,doorX:20}]);
const box=(kind,x1,x2,z1,z2,y,height,extra={})=>({kind,x:(x1+x2)/2,z:(z1+z2)/2,hx:(x2-x1)/2,hz:(z2-z1)/2,y,height,...extra});
export const DOORS=Object.freeze([
 {id:'access',x:0,z:60,y:0,width:6.2,height:3.8,axis:'x'},
 {id:'laboratoires',x:-20,z:-58,y:12,width:3.8,height:3.6,axis:'x'},
 {id:'archives',x:20,z:-58,y:12,width:3.8,height:3.6,axis:'x'},
 {id:'evacuation',x:33,z:-54,y:12,width:5.8,height:3.7,axis:'z'}
]);
export const FIXTURES=Object.freeze([
 box('paillasse',-27,-24.4,-78,-64,12,1.05),
 box('baies archives',24.9,27.1,-78,-64,12,3.0),
 box('terminal laboratoire',-20.55,-19.45,-70.55,-69.95,12,1.85),
 box('terminal archives',19.45,20.55,-70.55,-69.95,12,1.85),
 box('terminal confinement',10.45,11.55,-46.1,-45.5,12,1.85),
 box('terminal extraction',56.85,57.95,-61.1,-60.5,12,1.85)
]);
const walls=ROOMS.flatMap(r=>[
 box('verrière laboratoire',r.x1,r.x1+.20,r.z1,r.z2,r.y,4.2),box('verrière laboratoire',r.x2-.20,r.x2,r.z1,r.z2,r.y,4.2),
 box('verrière laboratoire',r.x1,r.x2,r.z1,r.z1+.20,r.y,4.2),
 box('verrière laboratoire',r.x1,r.doorX-2,r.z2-.1,r.z2+.1,r.y,4.2),box('verrière laboratoire',r.doorX+2,r.x2,r.z2-.1,r.z2+.1,r.y,4.2),
 box('linteau laboratoire',r.doorX-2,r.doorX+2,r.z2-.14,r.z2+.14,r.y+3.7,.5)
]);
const rails=[
 box('screen',31.85,32.15,-86,-57,12,3,{surface:'glass'}),box('screen',31.85,32.15,-51,-34,12,3,{surface:'glass'}),
 box('rail liaison',32,44,-57.1,-56.9,12,1.2),box('rail liaison',32,44,-51.1,-50.9,12,1.2),
 box('rail AEGIS',44,72,-80.1,-79.9,12,1.2),box('rail AEGIS',44,72,-44.1,-43.9,12,1.2),box('rail AEGIS',71.9,72.1,-80,-44,12,1.2),
 box('rail AEGIS',43.9,44.1,-80,-57,12,1.2),box('rail AEGIS',43.9,44.1,-51,-44,12,1.2)
];
export function buildCollisions({open=[]}={}){
 const original=B.buildCollisions({gatesOpen:open.includes('security')}).filter(c=>!(c.kind==='screen'&&c.y===12&&Math.abs(c.x-32)<.01));
 return [...original,...rails,...walls,...FIXTURES,...DOORS.filter(d=>!open.includes(d.id)).map(d=>box('porte opaque HELIX',d.x-(d.axis==='x'?d.width/2:.18),d.x+(d.axis==='x'?d.width/2:.18),d.z-(d.axis==='x'?.18:d.width/2),d.z+(d.axis==='x'?.18:d.width/2),d.y,d.height,{doorId:d.id}))];
}
export function stairHeight(s,z){const n=Math.round((s.bottomZ-s.topZ)/.32),u=Math.max(0,Math.min(1,(s.bottomZ-z)/(s.bottomZ-s.topZ)));return s.base+(s.height-s.base)*Math.ceil(u*n-1e-7)/n;}
export function walkSurfaces(x,z){
 const out=[];
 if(x>=-40&&x<=40&&z>=4&&z<=60||x>=-16&&x<=16&&z>=60&&z<=84)out.push({id:'esplanade',height:0});
 for(const f of FLOORS)if(x>=f.x1&&x<=f.x2&&z>=f.z1&&z<=f.z2)out.push({id:f.id,height:f.height});
 for(const s of STAIRS)if(Math.abs(x-s.x)<=s.halfWidth&&z<=s.bottomZ&&z>=s.topZ-B.LANDING)out.push({id:s.id,height:stairHeight(s,z)});
 return out;
}
export function createTraversal(){const base=B.createTraversal(),height=(x,z,t=0,max=Infinity)=>walkSurfaces(x,z).reduce((h,s)=>s.height<=max+.01?Math.max(h,s.height):h,-165);return{...base,surfaces:walkSurfaces,height,maxMoveStep:.065,navigation:{edge:-98,size:99,surface:height}};}
export const AREAS=Object.freeze([{id:'arrivee',label:'Héliport HELIX',x1:-16,x2:16,z1:60,z2:84},...ROOMS.map(r=>({...r,label:r.id==='archives'?'Archives de supervision':'Laboratoires de recherche'})),...FLOORS.map(f=>({...f,label:f.id==='ancrage'?'Couronne HELIX':f.id==='quai-aegis'?'Quai AEGIS':f.id})),{id:'esplanade',label:'Esplanade du siège',x1:-40,x2:40,z1:4,z2:60}]);
export const areaAt=(x,z)=>AREAS.find(a=>x>=a.x1&&x<=a.x2&&z>=a.z1&&z<=a.z2)?.id||'abords';
export const INTERACTIONS=Object.freeze([
 {id:'access',x:0,z:63,y:0,label:'Ouvrir le sas HELIX',hint:'Le lecteur est devant les portiques. Franchis le sas puis longe la fontaine par la droite.'},
 {id:'esplanade',x:26,z:51,y:0,label:'Isoler la surveillance extérieure',hint:'Neutralise la patrouille. Le pupitre se trouve à droite de l’esplanade, au pied de la terrasse.'},
 {id:'security',x:0,z:-28.2,y:6,label:'Déverrouiller les laboratoires',hint:'Monte le grand escalier. Entre au milieu de la façade vitrée ; contourne le comptoir pour atteindre le pupitre du fond.'},
 {id:'laboratoires',x:-20,z:-68.3,y:12,label:'Sécuriser les chercheurs',hint:'Prends l’escalier ouest, à gauche du hall. Le laboratoire s’ouvre par sa porte vitrée côté sud.'},
 {id:'kessler',x:0,z:-51,y:12,label:'Établir la liaison avec Kessler',hint:'Sors du laboratoire par sa porte. La liaison privée se trouve devant le grand noyau central.'},
 {id:'archives',x:20,z:-68.3,y:12,label:'Copier les archives HELIX',hint:'Le sas est du laboratoire est déverrouillé. Les baies de données révèlent les autorisations de 2189.'},
 {id:'confinement',x:11,z:-44.2,y:12,label:'Couper le confinement',hint:'HELIX tente de capturer vos deux unités. Reviens au pupitre de sûreté, devant le noyau, puis rejoins la passerelle à l’est.'},
 {id:'extraction',x:56,z:-60,y:12,label:'Rejoindre AEGIS avec les archives',hint:'Franchis la porte à droite de la Couronne et traverse la passerelle vitrée jusqu’au quai d’extraction.'}
].map((p,i)=>Object.freeze({...p,number:i+1,radius:2.5})));
export const STAGES=Object.freeze([...INTERACTIONS.map((p,i)=>({...p,checkpoint:i?{...INTERACTIONS[i-1],yaw:0}:START})),{id:'fin',label:'Les archives sont hors réseau',hint:'Retourne à la planque.',checkpoint:{...INTERACTIONS.at(-1),yaw:0}}]);
export const HOLDS=Object.freeze({archives:12,confinement:10,extraction:15});
export const OPEN_FOR=Object.freeze({access:['access'],security:['security','laboratoires'],kessler:['archives'],confinement:['evacuation']});
export const SUPPLIES=Object.freeze([{kind:'heal',x:7,z:63,y:0},{kind:'cell',x:27,z:47,y:0},{kind:'heal',x:7,z:-27,y:6},{kind:'cell',x:-22,z:-64,y:12},{kind:'heal',x:21,z:-62,y:12},{kind:'cell',x:47,z:-54,y:12}]);
export const ENCOUNTERS=Object.freeze({
 access:[{form:'stalker',x:3,z:69},{form:'probe',x:0,z:66}],
 esplanade:[{form:'stalker',x:-10,z:40},{form:'se04',x:10,z:40},{form:'probe',x:0,z:44}],
 security:[{form:'synth',x:-10,z:-6},{form:'stalker',x:4,z:-12},{form:'probe',x:14,z:-10}],
 laboratoires:[{form:'stalker',x:-20,z:-64},{form:'synth',x:-20,z:-74}],
 archives:[{form:'bulwark',x:20,z:-64},{form:'stalker',x:20,z:-74}],
 confinement:[{form:'brute',x:0,z:-49},{form:'stalker',x:20,z:-40},{form:'probe',x:0,z:-78}],
 extraction:[{form:'stalker',x:64,z:-55},{form:'probe',x:55,z:-49}]
});
// A grounded route, including the desk detour and the real stair landings.
export const WALKTHROUGH=Object.freeze([
 [0,78],[0,63],[0,56],[6,56],[23,56],[23,51],[26,51],[25,44],[25,16],[0,16],[0,15],[0,2],[0,-13],[0,-19],[7,-19],[7,-28.2],[0,-28.2],
 [7,-28],[7,-19],[0,-19],[0,-13],[-23,-13],[-28,-20],[-28,-36],[-21,-42],[-20,-55],[-20,-61],[-20,-68.3],[-20,-55.5],[0,-55.5],[0,-51],[0,-55.5],[20,-55.5],[20,-61],[20,-68.3],[20,-55],[17,-44.2],[11,-44.2],[22,-48],[28,-54],[40,-54],[47,-54],[56,-60]
].map(([x,z])=>Object.freeze({x,z})));
export function guideTarget(stage,p){
 const it=INTERACTIONS[stage];if(!it)return null;const floor=walkSurfaces(p.x,p.z).reduce((y,s)=>Math.max(y,s.height),-165);
 if(it.id==='esplanade'){if(p.z>56.8)return{x:0,z:56,y:0};if(p.x<22.5)return{x:23,z:56,y:0};if(p.z>52)return{x:23,z:51,y:0};}
 if(it.y>0&&floor<5.95){if(floor<.1&&p.z>17.7)return{x:0,z:17,y:0};return{x:0,z:2,y:6};}
 if(it.id==='security'&&floor>5){
  if(p.z> -17)return{x:0,z:-19,y:6};
  if(p.z> -24&&p.x<6)return{x:7,z:-19,y:6};
  if(p.x>5&&p.z> -26)return{x:7,z:-28,y:6};
 }
 if(it.y===12&&floor<11.95){
  if(p.z< -16&&Math.abs(p.x)<20){
   if(p.z< -23.5&&p.x<6)return{x:7,z:-26,y:6};
   if(p.x>5&&p.z< -20.5)return{x:7,z:-19,y:6};
   if(p.x>3)return{x:0,z:-19,y:6};
   return{x:0,z:-13,y:6};
  }
  if(p.x> -23.5)return{x:-25,z:-13,y:6};
  return{x:-28,z:-35.5,y:12};
 }
 if(p.x< -9&&p.z< -58&&it.id!=='laboratoires')return{x:-20,z:-55.5,y:12};
 if(p.x>9&&p.x<29&&p.z< -58&&it.id!=='archives')return{x:20,z:-55.5,y:12};
 if(it.id==='laboratoires'&&p.z> -58){if(Math.abs(p.x+20)>1)return{x:-20,z:-55.5,y:12};return{x:-20,z:-61,y:12};}
 if(it.id==='archives'&&p.z> -58){if(p.z> -54.5)return{x:0,z:-55.5,y:12};if(Math.abs(p.x-20)>1)return{x:20,z:-55.5,y:12};return{x:20,z:-61,y:12};}
 if(it.id==='kessler'&&p.x< -10)return{x:0,z:-55.5,y:12};
 if(it.id==='confinement'&&p.z< -48)return{x:20,z:-44.2,y:12};
 if(it.id==='extraction'&&p.x<44){if(p.x<27||Math.abs(p.z+54)>1)return{x:28,z:-54,y:12};return{x:46,z:-54,y:12};}
 return it;
}
