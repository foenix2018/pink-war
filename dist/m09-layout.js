// The same metric plan builds the Blender model, physics and mission route.
import {DATA} from './m09-data.js';
export {DATA};
export const LEVEL_ID='m09-jardins-suspendus';
export const PLAN=DATA.plan;
export const START=Object.freeze({...PLAN.start});
export const AREAS=Object.freeze(DATA.platforms.map(p=>({...p,x1:p.x-p.r,x2:p.x+p.r,z1:p.z-p.r,z2:p.z+p.r})));
export const areaAt=(x,z)=>DATA.platforms.find(p=>Math.hypot(x-p.x,z-p.z)<=p.r)?.id||'passerelles';
const platforms=new Map(DATA.platforms.map(p=>[p.id,p]));
export function linkEnds(link){const a={...platforms.get(link.a)},b={...platforms.get(link.b)};if(link.start){a.x=link.start[0];a.z=link.start[1];}if(link.end){b.x=link.end[0];b.z=link.end[1];}return[a,b];}
export function linkPoint(link,t){
 const [a,b]=linkEnds(link),length=Math.hypot(b.x-a.x,b.z-a.z);
 const u=Math.max(0,Math.min(1,(t*length-link.startRadius)/(length-link.startRadius-link.endRadius)));
 const stepped=a.y===b.y?u:Math.round(u*link.steps)/link.steps;
 return{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,height:a.y+(b.y-a.y)*stepped};
}
export function walkSurfaces(x,z,padding=0){
 const found=[];
 for(const p of DATA.platforms)if(Math.hypot(x-p.x,z-p.z)<=p.r+padding)found.push({id:p.id,height:p.y});
 for(const l of DATA.links){
  const [a,b]=linkEnds(l),dx=b.x-a.x,dz=b.z-a.z,t=((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz);
  if(t<0||t>1)continue;const p=linkPoint(l,t);
  if(Math.hypot(x-p.x,z-p.z)<=l.width/2+padding)found.push({id:l.id,height:p.height});
 }
 return found;
}
export function createTraversal(){
 const height=(x,z,time=0,max=Infinity)=>walkSurfaces(x,z).reduce((v,s)=>s.height<=max+.01?Math.max(v,s.height):v,-65);
 return{surfaces:walkSurfaces,height,routes:[],lifts:[],maxMoveStep:.075,routeForSurface:()=>null,
  navigation:{edge:-164,size:165,surface:height},bounds:{min:-162,max:162}};
}
export const DOORS=Object.freeze([{id:'access',x:-105,z:115,y:10,width:8,height:8.5}]);
export function buildCollisions({open=[]}={}){
 return[...DATA.colliders.map(b=>({...b})),...DOORS.filter(d=>!open.includes(d.id)).map(d=>({kind:'sas fermé ORDRE',x:d.x,z:d.z,hx:d.width/2,hz:.25,y:d.y,height:d.height,doorId:d.id}))];
}
export const INTERACTIONS=Object.freeze(PLAN.objectives.map(i=>({...i})));
const hints=[
 'Le lecteur d’accès est devant le sas rose. Ouvre-le pour infiltrer les Jardins.',
 'Suis les tubes roses à gauche. Entre dans la serre par la baie vitrée ouverte.',
 'Sors de la serre par sa baie nord-ouest et emprunte l’escalier du palier botanique.',
 'La grande passerelle traverse le ravin. Ses garde-corps bordent les cascades.',
 'Monte les marches centrales vers la terrasse circulaire. Les deux trajectoires se rejoignent ici.',
 'L’escalier du nord rejoint la grande serre. Le terminal est devant l’arbre biotique.',
 'Sors du dôme par la baie est. Le pont mène aux écrans bleus d’ORDRE.',
 'Descends les escaliers du côté est vers le jardin fleuri. Neutralise sa défense.',
 'Suis la descente rose jusqu’à la plateforme AEGIS et la navette d’évacuation.'
];
export const STAGES=Object.freeze([...INTERACTIONS.map((p,i)=>({id:p.id,label:p.label,hint:hints[i],checkpoint:i===0?START:{...INTERACTIONS[i-1],yaw:0}})),{id:'fin',label:'Les Jardins sont libres',hint:'Retourne à la planque.',checkpoint:{...INTERACTIONS.at(-1),yaw:0}}]);
export const STAGE_INDEX=Object.freeze(Object.fromEntries(STAGES.map((s,i)=>[s.id,i])));
export const HOLDS=Object.freeze({control:24,extraction:16});
export const SUPPLIES=Object.freeze([
 {kind:'heal',x:-99,z:90,y:14},{kind:'cell',x:-95,z:64,y:14},
 {kind:'heal',x:-69,z:6,y:22},{kind:'cell',x:5,z:-18,y:34},
 {kind:'heal',x:3,z:-72,y:46},{kind:'cell',x:100,z:-52,y:46},
 {kind:'heal',x:100,z:12,y:32},{kind:'cell',x:111,z:75,y:22}
]);
// Small squads arrive on the actual terrace at the correct height, never through a wall.
export const ENCOUNTERS=Object.freeze({
 access:[{form:'probe',x:-111,z:103},{form:'stalker',x:-100,z:101}],
 research:[{form:'scuttler',x:-95,z:68},{form:'stalker',x:-85,z:66},{form:'probe',x:-88,z:47}],
 pavilion:[{form:'bulwark',x:-62,z:1},{form:'stalker',x:-71,z:1}],
 bridge:[{form:'probe',x:-10,z:20},{form:'probe',x:-2,z:25}],
 core:[{form:'synth',x:-17,z:-74},{form:'stalker',x:1,z:-79},{form:'probe',x:8,z:-105}],
 control:[{form:'bulwark',x:85,z:-53},{form:'probe',x:104,z:-54}],
 liberation:[{form:'brute',x:85,z:2},{form:'stalker',x:100,z:7},{form:'probe',x:94,z:-9}],
 extraction:[{form:'probe',x:93,z:72},{form:'stalker',x:110,z:91}]
});
