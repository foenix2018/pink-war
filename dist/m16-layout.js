// M16 — Laboratoire oublié. All dimensions in metres; shared layout for render, physics and mission.
export const LEVEL_ID='m16-memoires',PLAN={chapter:16,title:'Ce qui reste de nous'},Y=12,START={x:-150,z:105,y:12,yaw:0};
const F=(id,x,z,w,d,height,label)=>({id,x,z,w,d,height,label,x1:x-w/2,x2:x+w/2,z1:z-d/2,z2:z+d/2});
export const FLOORS=[
 F('access',-150,100,34,34,12,'01 · Ancien sas PINK'),
 F('archives',-105,70,44,36,12,'02 · Archives familiales'),
 F('medical',-45,70,42,36,12,'03 · Quartiers médicaux'),
 F('memory',-45,0,52,44,12,'04 · Salle des mémoires'),
 F('maintenance',30,0,42,36,12,'05 · Galerie de maintenance'),
 F('security',30,-65,46,38,12,'06 · Sas de sécurité'),
 F('arena',105,-65,54,46,12,'07 · Assaut ORDRE'),
 F('tunnel',105,20,42,40,12,'08 · Tunnels de secours'),
 F('evac',135,110,62,48,12,'09 · Extraction AEGIS')
];
export const BRIDGES=[F('entry-a',-150,70,12,26,12,'Route du sas'),F('entry-b',-137,70,26,12,12,'Accès archives'),F('archives-med',-75,70,20,12,12,'Couloir médical'),F('med-memory',-45,35,12,32,12,'Galerie médicale'),F('memory-maint',-7.5,0,27,12,12,'Galerie de liaison'),F('maint-security',30,-32.5,12,31,12,'Tunnel nord'),F('security-arena',67.5,-65,31,12,12,'Sortie fortifiée'),F('arena-tunnel',105,-23,12,44,12,'Piste de fuite'),F('tunnel-bend',105,63,12,48,12,'Route de secours'),F('evac-link',120,87,30,12,12,'Accès héliport'),F('evac-lane',135,98,12,24,12,'Piste AEGIS')];
export const GROUNDED=FLOORS.map(f=>f.id),TERRACES=[F('archive-service',-105,105,28,20,12,'Cour des archives'),F('medical-service',-10,70,24,28,12,'Maintenance médicale'),F('evac-service',135,150,44,22,12,'Logistique AEGIS')];
export const DECKS=[...FLOORS,...BRIDGES,...TERRACES],AREAS=FLOORS,ANNEXES=[],ROOMS=FLOORS.filter(f=>['archives','medical','memory','maintenance','security','tunnel'].includes(f.id)).map(f=>({...f,w:f.w-8,d:f.d-8,h:f.id==='memory'?10:6}));
export const RAMPS=[];
// Mid-descent switchback landing; its two ramps use the same real surfaces.
export const rampHeight=(r,x,z)=>r.y0+(r.y1-r.y0)*(z-r.from)/(r.to-r.from);
const insideRect=(f,x,z)=>x>=f.x1-.0001&&x<=f.x2+.0001&&z>=f.z1-.0001&&z<=f.z2+.0001;
export const EXPLORATION=[
 {id:'ridge',label:'Ancienne piste du personnel',width:9,points:[[-105,70],[-105,105],[-74,125],[-45,112],[-45,70]].map(([x,z])=>[x,z,12])},
 {id:'maintenance',label:'Dérivation technique',width:9,points:[[-45,0],[-45,-32],[-18,-45],[8,-65],[30,-65]].map(([x,z])=>[x,z,12])},
 {id:'ravine',label:'Sentier de la crête',width:9,points:[[105,-65],[105,-30],[146,-18],[157,18],[135,48],[105,48],[105,20]].map(([x,z])=>[x,z,12])},
 {id:'supply',label:'Ancienne piste AEGIS',width:9,points:[[105,63],[75,69],[63,110],[85,142],[135,142],[135,110]].map(([x,z])=>[x,z,12])}
];
const segs=EXPLORATION.flatMap(r=>r.points.slice(1).map((b,i)=>({id:r.id,a:r.points[i],b,width:r.width})));
function nearestSeg(s,x,z){const a=s.a,b=s.b,dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return{d:Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz),h:a[2]+t*(b[2]-a[2])};}
const rectDist=(f,x,z)=>Math.hypot(Math.max(f.x1-x,0,x-f.x2),Math.max(f.z1-z,0,z-f.z2));
export const baseInside=(x,z)=>DECKS.some(f=>insideRect(f,x,z));
function exact(x,z){for(const f of DECKS)if(insideRect(f,x,z))return{id:f.id,height:f.height};for(const r of RAMPS)if(insideRect(r,x,z))return{id:r.id,height:rampHeight(r,x,z)};return null;}
function near(x,z){let best=null;const add=(d,h,id,limit)=>{const score=d/limit;if(score<=1&&(!best||score<best.score))best={id,height:h,score};};for(const f of DECKS)add(rectDist(f,x,z),f.height,f.id,6);for(const r of RAMPS)add(rectDist(r,x,z),rampHeight(r,x,Math.max(r.z1,Math.min(r.z2,z))),r.id,5);for(const s of segs){const q=nearestSeg(s,x,z);add(q.d,q.h,s.id,s.width/2);}return best;}
export const inside=(x,z)=>!!(exact(x,z)||near(x,z));
export function walkSurfaces(x,z,t=0){return x>=-190&&x<=190&&z>=-190&&z<=190?[{id:'mountain',height:groundSample(x,z)}]:[];}
export function createTraversal(){const height=(x,z,t=0,max=Infinity)=>{const s=walkSurfaces(x,z)[0];return s?s.height:-65;};return{routes:[],lifts:[],bounds:{min:-190,max:190},surfaces:walkSurfaces,height,routeForSurface:()=>null,maxMoveStep:.055,navigation:{edge:-189,size:190,surface:height}};}
export const areaAt=(x,z)=>(exact(x,z)||near(x,z))?.id||'montagne';
export const UPPER_RAILS=[],RAILS=[],SLOPE_RAILS=[];
const S=(id,x,z,y,w,d,h,material)=>({id,x,z,y,w,d,h,material});
export const WALLS=ROOMS.flatMap(r=>{const w=(r.w-10)/2,d=(r.d-10)/2;return [-1,1].flatMap(a=>[-1,1].flatMap(b=>[S(r.id+'-n'+a+b,r.x+b*(w+10)/2,r.z+a*r.d/2,r.height,w,.6,r.h,'wall'),S(r.id+'-e'+a+b,r.x+a*r.w/2,r.z+b*(d+10)/2,r.height,.6,d,r.h,'wall')]))});
export const PROPS=FLOORS.filter(f=>!['memory','evac'].includes(f.id)).flatMap(f=>[-1,1].flatMap(q=>[-1,1].map(k=>S(f.id+'-prop-'+q+'-'+k,f.x+q*f.w*.29,f.z+k*f.d*.27,12,3.5,2.8,2.8,({access:'gate',archives:'rack',medical:'medbed',maintenance:'terminal',security:'terminal',arena:'cover',tunnel:'cover'}[f.id])))));
export const PODS=[];
export const MACHINES=[S('memory-table',-45,-12,12,5,3,1.45,'memory-table'),S('medical-scanner',-45,58,12,5,3,3.1,'scanner'),S('aircraft',150,120,12,15,10,4,'aircraft')];
export const EQUIPMENT=TERRACES.flatMap(f=>[-1,1].map(q=>S(f.id+'-'+q,f.x+q*f.w*.33,f.z+5,12,3.3,2.7,2.5,({ 'archive-service':'generator','medical-service':'coolant','evac-service':'cargo'}[f.id]))));
export const SOLIDS=[...WALLS,...PROPS,...MACHINES,...EQUIPMENT],DRESS_PROPS=[...PROPS,...EQUIPMENT];
export function terrainHeight(x,z){const e=exact(x,z)||near(x,z);if(e)return e.height;const valley=-41+7*Math.sin(x*.033)*Math.cos(z*.027)+4*Math.sin(z*.079+x*.041);let value=valley;
 const blend=(d,h,w)=>{const t=Math.max(0,1-d/w);value=Math.max(value,valley+(h-valley)*t*t*(3-2*t));};
 for(const f of DECKS)blend(Math.max(0,rectDist(f,x,z)-6),f.height,23);
 for(const r of RAMPS)blend(Math.max(0,rectDist(r,x,z)-5),rampHeight(r,x,Math.max(r.z1,Math.min(r.z2,z))),20);
 for(const s of segs){const q=nearestSeg(s,x,z);blend(Math.max(0,q.d-s.width/2),q.h,19);}
 const ridge=68*Math.exp(-Math.pow((z+155)/49,2))*Math.exp(-Math.pow((x+22)/150,2));
 return Math.max(value,valley+ridge+5*Math.sin(x*.11+z*.062));}
// The same triangulated heightfield drives terrain rendering and ground contact.
export const GROUND_GRID={min:-190,max:190,step:2,n:191};
let groundGrid=null;
export function groundSamples(){if(groundGrid)return groundGrid;const {min,step,n}=GROUND_GRID;groundGrid=new Float32Array(n*n);for(let j=0;j<n;j++)for(let i=0;i<n;i++)groundGrid[j*n+i]=terrainHeight(min+i*step,min+j*step);return groundGrid;}
export function groundSample(x,z){const {min,max,step,n}=GROUND_GRID;if(x<min||x>max||z<min||z>max)return terrainHeight(x,z);const g=groundSamples(),u=(x-min)/step,v=(z-min)/step,i=Math.min(n-2,Math.floor(u)),j=Math.min(n-2,Math.floor(v)),fx=u-i,fz=v-j,a=g[j*n+i],b=g[(j+1)*n+i],c=g[(j+1)*n+i+1],d=g[j*n+i+1];return fx+fz<=1?a+(d-a)*fx+(b-a)*fz:c+(b-c)*(1-fx)+(d-c)*(1-fz);}
// Deterministic woodland and archive stations share scene/collision data.
export const TREES=(()=>{let seed=781;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296),out=[];for(let i=0;i<320&&out.length<110;i++){const x=(rand()-.5)*430,z=(rand()-.5)*410,h=4+rand()*6;if(inside(x,z)||inside(x+4,z)||inside(x-4,z)||inside(x,z+4)||inside(x,z-4)||groundSample(x,z)<-25||out.some(t=>Math.hypot(t.x-x,t.z-z)<5))continue;out.push({x,z,y:groundSample(x,z),h});}return out;})();
export const terminalPosition=p=>({x:p.x+(p.dx||0),z:p.z+(p.dz||0)});
export function buildCollisions(){const solid=SOLIDS.map(p=>({kind:p.material,x:p.x,z:p.z,y:p.y,hx:p.w/2,hz:p.d/2,height:p.h,navPad:.12}));return [...solid,...TREES.filter(t=>Math.abs(t.x)<190&&Math.abs(t.z)<190).map(t=>({kind:'tree',x:t.x,z:t.z,y:t.y,hx:.23,hz:.23,height:t.h*.58,navPad:.12})),...EXPLORATION_LOGS.map(p=>{const {x,z}=terminalPosition(p);return{kind:'archive-terminal',x,z,y:groundSample(x,z),hx:.45,hz:.38,height:1.25,navPad:.08};}),...[...UPPER_RAILS,...SLOPE_RAILS].flatMap(r=>{const n=r.y0===r.y1?1:Math.max(1,Math.ceil(Math.hypot(r.b-r.x,r.d-r.z)/2));return Array.from({length:n},(_,i)=>{const t=(i+.5)/n;return{kind:'rail',x:r.x+(r.b-r.x)*t,z:r.z+(r.d-r.z)*t,y:r.y0+(r.y1-r.y0)*t-.25,hx:Math.max(.12,Math.abs(r.b-r.x)/n/2),hz:Math.max(.12,Math.abs(r.d-r.z)/n/2),height:1.65,navPad:.12};});})];}
const defs=[
 ['access',-150,100,'Rejoindre le refuge temporaire'],
 ['gate',-150,84,'Rétablir le sas PINK'],
 ['archives',-105,70,'Accéder aux archives familiales'],
 ['memory-log',-105,60,'Consulter les souvenirs des quatre enfants'],
 ['medical',-45,70,'Rejoindre les quartiers médicaux'],
 ['scan',-45,78,'Examiner les dossiers de transfert'],
 ['diagnosis',-45,70,'Confirmer l’impossibilité du retour biologique'],
 ['memory',-45,0,'Rejoindre GAB-1 et CAR-14'],
 ['gab',-51,0,'Écouter Gabrielle'],
 ['car',-39,0,'Écouter Carla'],
 ['truth',-45,0,'Accepter leur nouvelle identité'],
 ['maintenance',30,0,'Réactiver la galerie de service'],
 ['alarm',30,-9,'Identifier la tentative de capture ORDRE'],
 ['security',30,-65,'Rejoindre le sas de sécurité'],
 ['seal',30,-55,'Verrouiller les accès de capture'],
 ['arena',105,-65,'Repousser les unités de capture'],
 ['wave-b',105,-55,'Protéger les deux compagnons'],
 ['tunnel',105,20,'Rejoindre les tunnels de secours'],
 ['relay',105,30,'Rétablir le contact AEGIS'],
 ['escape',105,63,'Franchir la piste de fuite'],
 ['evac',135,110,'Sécuriser le point d’extraction'],
 ['extract',135,101,'Évacuer avec GAB-1 et CAR-14']
];
export const INTERACTIONS=defs.map(([id,x,z,label],i)=>({id,x,z,y:12,label,hint:label,radius:3.2,number:i+1}));
export const STAGES=[...INTERACTIONS.map((p,i)=>({...p,checkpoint:i?{...INTERACTIONS[i-1],yaw:0}:START})),{id:'fin',label:'Famille évacuée',checkpoint:INTERACTIONS.at(-1)}];
export const HOLDS={gate:12,'memory-log':24,scan:25,diagnosis:25,gab:20,car:20,truth:38,maintenance:15,alarm:15,seal:25,arena:55,'wave-b':55,relay:25,escape:20,evac:30,extract:35};
export const EXPLORATION_LOGS=[
 {id:'intel-ridge',log:'ridge',x:-74,z:125,y:12,dx:0,dz:2.5,label:'Carnet du personnel',radius:3},
 {id:'intel-maintenance',log:'maintenance',x:-18,z:-45,y:12,dx:0,dz:2.5,label:'Registre médical',radius:3},
 {id:'intel-ravine',log:'ravine',x:157,z:18,y:12,dx:2.5,dz:0,label:'Ordre de capture intercepté',radius:3},
 {id:'intel-supply',log:'supply',x:63,z:110,y:12,dx:-2.5,dz:0,label:'Journal AEGIS',radius:3}
];
export const SUPPLIES=[...EXPLORATION_LOGS.map((p,i)=>({kind:i%2?'cell':'heal',x:p.x,z:p.z,y:12})),...INTERACTIONS.filter((_,i)=>[0,11,13,15,17,20].includes(i)).map((p,i)=>({kind:i%2?'cell':'heal',x:p.x,z:p.z+2,y:12}))];
const combat=new Set(['alarm','security','seal','arena','wave-b','tunnel','relay','escape','evac','extract']);
export const ENCOUNTERS=Object.fromEntries(INTERACTIONS.map(p=>[p.id,combat.has(p.id)?[-1,1].map((q,i)=>({form:['arena','wave-b'].includes(p.id)?(i?'bulwark':'brute'):(i?'probe':'stalker'),x:p.x+q*3,z:p.z,y:12})):[]]));
export const REINFORCEMENTS=Object.fromEntries(INTERACTIONS.filter(p=>['seal','arena','wave-b','relay','escape','evac','extract'].includes(p.id)).map(p=>[p.id,[-1,1].map((q,i)=>({form:i?'synth':'stalker',x:p.x+q*3,z:p.z+3,y:12}))]));
const way=[
 [[-150,100]],[[-150,84]],[[-150,70],[-105,70]],[[-105,60]],[[-105,70],[-45,70]],[[-45,78]],[[-45,70]],[[-45,0]],[[-51,0]],[[-39,0]],[[-45,0]],[[30,0]],[[30,-9]],[[30,-65]],[[30,-55]],[[30,-65],[105,-65]],[[105,-55]],[[105,20]],[[105,30]],[[105,63]],[[105,87],[135,87],[135,110]],[[135,101]]
];
export const GUIDES=way.map((nodes,i)=>[i?INTERACTIONS[i-1]:START,...nodes.map(([x,z])=>({x,z,y:groundSample(x,z)}))]);
export const ROUTE=GUIDES.flat().map(p=>[p.x,p.y,p.z]);
export function guideTarget(i,p){const a=GUIDES[i]||[];let k=0,best=Infinity;a.forEach((v,j)=>{const d=Math.hypot(p.x-v.x,p.z-v.z,2*(p.elevation-v.y));if(d<best){best=d;k=j;}});return a[Math.min(k+1,a.length-1)];}
export const DURATION_TARGET_MIN=30;
