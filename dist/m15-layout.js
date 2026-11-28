// M15 — Laboratoire oublié. All dimensions in metres; shared layout for render, physics and mission.
export const LEVEL_ID='m15-pink',PLAN={chapter:15,title:'Les quatre enfants'},Y=8,START={x:-110,z:128,y:8,yaw:0};
const F=(id,x,z,w,d,height,label)=>({id,x,z,w,d,height,label,x1:x-w/2,x2:x+w/2,z1:z-d/2,z2:z+d/2});
export const FLOORS=[
 F('access',-110,112,48,40,8,'01 · Entrée du site'),
 F('security',-110,47,60,44,8,'02 · Périmètre de sécurité'),
 F('lab',-110,-22,56,42,14,'03 · Bloc de recherche B2'),
 F('archives',-110,-100,56,44,26,'04 · Archives PINK'),
 F('pods',-25,-100,62,52,26,'05 / 06 · Les quatre enfants'),
 F('data',60,-100,52,44,26,'07 · Données complètes'),
 F('destruct',125,-100,44,42,26,'08 · Effacement du programme'),
 F('arena',125,-25,58,48,14,'09 · Contre-attaque'),
 F('evac',125,79,54,50,8,'10 · Extraction AEGIS')
];
export const BRIDGES=[F('road-entry',-110,80.5,12,23,8,'Route d’accès'),F('archive-pods',-66.5,-100,31,12,26,'Tunnel PINK'),F('pods-data',19.5,-100,37,12,26,'Galerie de transfert'),F('data-destruct',94.5,-100,17,12,26,'Galerie technique')];
export const GROUNDED=['access','security','lab','archives','pods','data','destruct','arena','evac'];
export const TERRACES=[F('security-yard',-154,47,28,44,8,'Cour technique'),F('lab-yard',-152,-22,28,42,14,'Annexe de recherche'),F('archive-yard',-152,-100,28,44,26,'Antennes et maintenance'),F('data-yard',60,-133,52,22,26,'Refroidissement'),F('evac-yard',125,116,54,24,8,'Aire de service')];
export const DECKS=[...FLOORS,...BRIDGES,...TERRACES],AREAS=FLOORS,ANNEXES=[],ROOMS=FLOORS.filter(f=>['lab','archives','data','destruct','pods'].includes(f.id)).map(f=>({...f,w:f.w-8,d:f.d-8,h:f.id==='pods'?15:9}));
const R=(id,x,z1,z2,y1,y2,w=10)=>({id,axis:'z',x1:x-w/2,x2:x+w/2,z1:Math.min(z1,z2),z2:Math.max(z1,z2),from:z1,to:z2,y0:y1,y1:y2});
export const RAMPS=[R('security-lab',-110,25,-1,8,14),R('lab-archives',-110,-43,-78,14,26),R('destruct-arena',125,-79,-49,26,14),R('arena-evac',125,-1,54,14,8)];
// Mid-descent switchback landing; its two ramps use the same real surfaces.
export const rampHeight=(r,x,z)=>r.y0+(r.y1-r.y0)*(z-r.from)/(r.to-r.from);
const insideRect=(f,x,z)=>x>=f.x1-.0001&&x<=f.x2+.0001&&z>=f.z1-.0001&&z<=f.z2+.0001;
export const EXPLORATION=[
 {id:'ridge',label:'Sentier des anciens postes',width:8,points:[[-110,82,8],[-135,76,8],[-154,65,8],[-174,38,8],[-170,5,11],[-152,-22,14],[-110,-22,14]]},
 {id:'maintenance',label:'Galerie de maintenance B2',width:8,points:[[-110,-22,14],[-148,-22,14],[-174,-48,18],[-170,-78,24],[-152,-100,26],[-110,-100,26]]},
 {id:'ravine',label:'Sentier du ravin',width:10,points:[[-25,-90,26],[-25,-66,26],[-6,-43,22],[24,-48,24],[48,-68,26],[60,-100,26]]},
 {id:'supply',label:'Piste de ravitaillement AEGIS',width:9,points:[[125,-25,14],[153,-25,14],[177,3,12],[171,39,10],[153,61,8],[125,79,8]]}
];
const segs=EXPLORATION.flatMap(r=>r.points.slice(1).map((b,i)=>({id:r.id,a:r.points[i],b,width:r.width})));
function nearestSeg(s,x,z){const a=s.a,b=s.b,dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return{d:Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz),h:a[2]+t*(b[2]-a[2])};}
const rectDist=(f,x,z)=>Math.hypot(Math.max(f.x1-x,0,x-f.x2),Math.max(f.z1-z,0,z-f.z2));
export const baseInside=(x,z)=>DECKS.some(f=>insideRect(f,x,z));
function exact(x,z){for(const f of DECKS)if(insideRect(f,x,z))return{id:f.id,height:f.height};for(const r of RAMPS)if(insideRect(r,x,z))return{id:r.id,height:rampHeight(r,x,z)};return null;}
function near(x,z){let best=null;const add=(d,h,id,limit)=>{const score=d/limit;if(score<=1&&(!best||score<best.score))best={id,height:h,score};};for(const f of DECKS)add(rectDist(f,x,z),f.height,f.id,6);for(const r of RAMPS)add(rectDist(r,x,z),rampHeight(r,x,Math.max(r.z1,Math.min(r.z2,z))),r.id,5);for(const s of segs){const q=nearestSeg(s,x,z);add(q.d,q.h,s.id,s.width/2);}return best;}
export const inside=(x,z)=>!!(exact(x,z)||near(x,z));
export function walkSurfaces(x,z,t=0){const e=exact(x,z)||near(x,z);return e?[{id:e.id,height:e.height}]:[];}
export function createTraversal(){const height=(x,z,t=0,max=Infinity)=>{const s=walkSurfaces(x,z)[0];return s&&s.height<=max+.011?s.height:-65;};return{routes:[],lifts:[],bounds:{min:-190,max:190},surfaces:walkSurfaces,height,routeForSurface:()=>null,maxMoveStep:.055,navigation:{edge:-189,size:190,surface:height}};}
export const areaAt=(x,z)=>walkSurfaces(x,z)[0]?.id||'montagne';
export const UPPER_RAILS=[],RAILS=[],SLOPE_RAILS=[];
const S=(id,x,z,y,w,d,h,material)=>({id,x,z,y,w,d,h,material});
export const WALLS=ROOMS.flatMap(r=>{const w=(r.w-10)/2,d=(r.d-10)/2;return [-1,1].flatMap(a=>[-1,1].flatMap(b=>[S(r.id+'-n'+a+b,r.x+b*(w+10)/2,r.z+a*r.d/2,r.height,w,.6,r.h,'wall'),S(r.id+'-e'+a+b,r.x+a*r.w/2,r.z+b*(d+10)/2,r.height,.6,d,r.h,'wall')]))});
export const PROPS=FLOORS.filter(f=>!['pods','evac'].includes(f.id)).flatMap(f=>[-1,1].flatMap(q=>[-1,1].map(k=>S(f.id+'-prop-'+q+'-'+k,f.x+q*f.w*.30,f.z+k*f.d*.27,f.height,4,3,3.3,({access:'gate',security:'cover',lab:'pod',archives:'rack',data:'rack',destruct:'terminal',arena:'cover'}[f.id])))));
export const PODS=[-43,-31,-19,-7].map((x,i)=>({...S('child-'+i,x,-114,26,4.2,4.2,5.8,'child-pod'),label:['LISANDRU','GHJULIA','GABRIELLE','CARLA'][i]}));
export const MACHINES=[...PODS,S('reactor',125,-112,26,10,7,11,'reactor'),S('aircraft',139,91,8,15,10,4,'aircraft')];
export const EQUIPMENT=TERRACES.flatMap(f=>[-1,1].flatMap(q=>[-1,1].map(k=>S(f.id+'-'+q+'-'+k,f.x+q*f.w*.30,f.z+k*f.d*.30,f.height,3.3,2.7,2.5,({'security-yard':'barrier','lab-yard':'coolant','archive-yard':'antenna','data-yard':'generator','evac-yard':'cargo'}[f.id])))));
export const SOLIDS=[...WALLS,...PROPS,...MACHINES,...EQUIPMENT],DRESS_PROPS=[...PROPS,...EQUIPMENT];
export function terrainHeight(x,z){const e=exact(x,z)||near(x,z);if(e)return e.height;const valley=-41+7*Math.sin(x*.033)*Math.cos(z*.027)+4*Math.sin(z*.079+x*.041);let value=valley;
 const blend=(d,h,w)=>{const t=Math.max(0,1-d/w);value=Math.max(value,valley+(h-valley)*t*t*(3-2*t));};
 for(const f of DECKS)blend(Math.max(0,rectDist(f,x,z)-6),f.height,23);
 for(const r of RAMPS)blend(Math.max(0,rectDist(r,x,z)-5),rampHeight(r,x,Math.max(r.z1,Math.min(r.z2,z))),20);
 for(const s of segs){const q=nearestSeg(s,x,z);blend(Math.max(0,q.d-s.width/2),q.h,19);}
 const ridge=85*Math.exp(-Math.pow((z+175)/39,2))*Math.exp(-Math.pow((x+22)/150,2));
 return Math.max(value,valley+ridge+5*Math.sin(x*.11+z*.062));}
export function buildCollisions(){const solid=SOLIDS.map(p=>({kind:p.material,x:p.x,z:p.z,y:p.y,hx:p.w/2,hz:p.d/2,height:p.h,navPad:.12}));return [...solid,...[...UPPER_RAILS,...SLOPE_RAILS].flatMap(r=>{const n=r.y0===r.y1?1:Math.max(1,Math.ceil(Math.hypot(r.b-r.x,r.d-r.z)/2));return Array.from({length:n},(_,i)=>{const t=(i+.5)/n;return{kind:'rail',x:r.x+(r.b-r.x)*t,z:r.z+(r.d-r.z)*t,y:r.y0+(r.y1-r.y0)*t-.25,hx:Math.max(.12,Math.abs(r.b-r.x)/n/2),hz:Math.max(.12,Math.abs(r.d-r.z)/n/2),height:1.65,navPad:.12};});})];}
const defs=[
 ['access',-110,116,8,'Atteindre le laboratoire PINK'],['gate',-110,96,8,'Déverrouiller le sas'],
 ['security',-110,47,8,'Sécuriser le périmètre'],['security-scan',-110,32,8,'Neutraliser le contrôle ORDRE'],
 ['lab',-110,-16,14,'Accéder au bloc de recherche B2'],['lab-scan',-110,-30,14,'Analyser les bio-expériences'],
 ['archives',-110,-100,26,'Accéder aux archives PINK'],['archive-copy',-110,-111,26,'Copier le protocole Phase Enfants'],['archive-decode',-110,-90,26,'Déchiffrer les transferts de conscience'],
 ['pods',-25,-100,26,'Accéder aux caissons d’hibernation'],['pod-a',-43,-107,26,'Ouvrir le registre LISANDRU'],['pod-b',-31,-107,26,'Ouvrir le registre GHJULIA'],['pod-c',-19,-107,26,'Libérer le caisson GABRIELLE'],['pod-d',-7,-107,26,'Libérer le caisson CARLA'],['truth',-25,-94,26,'Découvrir la vérité sur GAB-1 et CAR-14'],
 ['data',60,-100,26,'Récupérer les données complètes'],['upload',60,-109,26,'Transférer les preuves à AEGIS'],
 ['destruct',125,-100,26,'Déclencher l’effacement du programme'],['purge',125,-91,26,'Confirmer l’autodestruction'],
 ['arena',125,-25,14,'Résister à la contre-attaque'],['wave-b',125,-15,14,'Repousser les dernières unités ORDRE'],
 ['evac',125,66,8,'Sécuriser l’héliport'],['extract',125,79,8,'Rejoindre AEGIS']
];
export const INTERACTIONS=defs.map(([id,x,z,y,label],i)=>({id,x,z,y,label,hint:label,radius:3.2,number:i+1}));
export const STAGES=[...INTERACTIONS.map((p,i)=>({...p,checkpoint:i?{...INTERACTIONS[i-1],yaw:0}:START})),{id:'fin',label:'Laboratoire évacué',checkpoint:INTERACTIONS.at(-1)}];
export const HOLDS={gate:15,'security-scan':20,'lab-scan':24,'archive-copy':25,'archive-decode':24,'pod-a':12,'pod-b':12,'pod-c':18,'pod-d':18,truth:35,upload:35,destruct:20,purge:30,arena:45,'wave-b':40,extract:25};
export const EXPLORATION_SUPPLIES=[{kind:'heal',x:-174,z:38,y:8},{kind:'cell',x:-174,z:-48,y:18},{kind:'heal',x:-6,z:-43,y:22},{kind:'cell',x:177,z:3,y:12}];
export const SUPPLIES=INTERACTIONS.filter((_,i)=>[0,2,4,6,9,15,19,21].includes(i)).map((p,i)=>({kind:i%2?'cell':'heal',x:p.x,z:p.z+2,y:p.y})).concat(EXPLORATION_SUPPLIES);
const combat=new Set(['access','security','security-scan','lab','lab-scan','archives','archive-copy','archive-decode','data','upload','destruct','purge','arena','wave-b','evac','extract']);
export const ENCOUNTERS=Object.fromEntries(INTERACTIONS.map(p=>[p.id,combat.has(p.id)?[-1,1].map((q,i)=>({form:['arena','wave-b'].includes(p.id)?(i?'bulwark':'brute'):(i?'probe':'stalker'),x:p.x+q*3,z:p.z,y:p.y})):[]]));
export const REINFORCEMENTS=Object.fromEntries(INTERACTIONS.filter(p=>['security-scan','archive-copy','upload','purge','arena','wave-b','extract'].includes(p.id)).map(p=>[p.id,[-1,1].map((q,i)=>({form:['arena','wave-b'].includes(p.id)?(i?'seer':'brute'):(i?'synth':'stalker'),x:p.x+q*3,z:p.z+3,y:p.y}))]));
const way=[
 [[-110,116]], [[-110,96]], [[-110,92],[-110,69],[-110,47]], [[-110,32]], [[-110,25],[-110,-1],[-110,-16]], [[-110,-30]], [[-110,-43],[-110,-78],[-110,-100]], [[-110,-111]], [[-110,-90]], [[-110,-100],[-25,-100]], [[-43,-100],[-43,-107]], [[-43,-101],[-31,-101],[-31,-107]], [[-31,-101],[-19,-101],[-19,-107]], [[-19,-101],[-7,-101],[-7,-107]], [[-7,-100],[-25,-100],[-25,-94]], [[-25,-100],[60,-100]], [[60,-109]], [[60,-100],[125,-100]], [[125,-91]], [[125,-79],[125,-49],[125,-25]], [[125,-15]], [[125,-1],[125,54],[125,66]], [[125,79]]
];
export const GUIDES=way.map((nodes,i)=>{const prev=i?INTERACTIONS[i-1]:START;let y=prev.y;return [prev,...nodes.map(([x,z])=>{const v=walkSurfaces(x,z).sort((a,b)=>Math.abs(a.height-y)-Math.abs(b.height-y))[0];y=v?.height??INTERACTIONS[i].y;return{x,z,y};})];});
export const ROUTE=GUIDES.flat().map(p=>[p.x,p.y,p.z]);
export function guideTarget(i,p){const a=GUIDES[i]||[];let k=0,best=Infinity;a.forEach((v,j)=>{const d=Math.hypot(p.x-v.x,p.z-v.z,2*(p.elevation-v.y));if(d<best){best=d;k=j;}});return a[Math.min(k+1,a.length-1)];}
export const DURATION_TARGET_MIN=30;
