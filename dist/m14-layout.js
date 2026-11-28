// M14 — Convergence. All dimensions in metres; shared layout for render, physics and mission.
export const LEVEL_ID='m14-convergence',PLAN={chapter:14,title:'La Tour de convergence'},Y=8,START={x:-100,z:107,y:8,yaw:0};
const F=(id,x,z,w,d,height,label)=>({id,x,z,w,d,height,label,x1:x-w/2,x2:x+w/2,z1:z-d/2,z2:z+d/2});
export const FLOORS=[
 F('access',-100,85,44,48,8,'01 · Sas de la Tour'),
 F('admin',-100,14,48,36,20,'02 · Administration'),
 F('lab',-100,-55,48,38,32,'03 · Recherche CONVERGENCE'),
 F('data',-30,-55,44,38,32,'04 · Archives de transition'),
 F('locks',-30,-125,50,40,44,'05 · Contrôle réseau A / B / C'),
 F('lift',35,-125,34,30,44,'06 · Ascenseur central'),
 F('core',35,-125,34,30,68,'06 · Palier supérieur'),
 F('pink',105,-125,46,40,68,'07 · Noyau CONVERGENCE'),
 F('arena',105,-50,54,44,56,'08 · Contre-offensive'),
 F('transfer',105,25,48,40,44,'09 · Baie AEGIS'),
 F('evac',105,120,54,50,8,'10 · Héliport AEGIS')
];
export const BRIDGES=[F('lab-data',-64,-55,24,9,32,'Passerelle de recherche'),F('locks-lift',6.5,-125,23,9,44,'Passerelle ascenseur'),F('core-pink',67.5,-125,31,9,68,'Passerelle noyau')];
export const GROUNDED=['access','admin','lab','data','locks','transfer','evac'];
export const TERRACES=[F('access-yard',-134,85,24,48,8,'Cour extérieure / accès'),F('admin-yard',-136,14,24,36,20,'Parvis administratif'),F('lab-yard',-136,-55,24,38,32,'Terrasse rocheuse / recherche'),F('data-yard',-30,-24,44,24,32,'Cour technique'),F('locks-yard',-67,-125,24,40,44,'Poste électrique extérieur'),F('transfer-yard',141,25,24,40,44,'Parvis de transmission'),F('evac-yard',105,157,54,24,8,'Aire de service AEGIS')];
export const DECKS=[...FLOORS,...BRIDGES,...TERRACES],AREAS=FLOORS,ANNEXES=[],ROOMS=[...FLOORS.filter(f=>['admin','lab','data','locks','transfer'].includes(f.id)).map(f=>({...f,w:f.w-8,d:f.d-8,h:8}))];
const R=(id,x,z1,z2,y1,y2,w=9)=>({id,axis:'z',x1:x-w/2,x2:x+w/2,z1:Math.min(z1,z2),z2:Math.max(z1,z2),from:z1,to:z2,y0:y1,y1:y2});
export const RAMPS=[R('access-admin',-100,61,32,8,20),R('admin-lab',-100,-4,-36,20,32),R('data-locks',-30,-74,-105,32,44),R('pink-arena',105,-105,-72,68,56),R('arena-transfer',105,-28,5,56,44),R('transfer-evac-a',105,45,75,44,26),R('transfer-evac-b',105,75,95,26,8)];
// Mid-descent switchback landing; its two ramps use the same real surfaces.
export const rampHeight=(r,x,z)=>r.y0+(r.y1-r.y0)*(z-r.from)/(r.to-r.from);
const insideRect=(f,x,z)=>x>=f.x1-.0001&&x<=f.x2+.0001&&z>=f.z1-.0001&&z<=f.z2+.0001;
export const baseInside=(x,z)=>DECKS.some(f=>insideRect(f,x,z));
export const inside=(x,z)=>baseInside(x,z)||RAMPS.some(r=>insideRect(r,x,z));
export function walkSurfaces(x,z,t=0){return [...DECKS.filter(f=>insideRect(f,x,z)).map(f=>({id:f.id,height:f.height})),...RAMPS.filter(r=>insideRect(r,x,z)).map(r=>({id:r.id,height:rampHeight(r,x,z)}))];}
export function createTraversal(){const height=(x,z,t=0,max=Infinity)=>walkSurfaces(x,z,t).reduce((a,f)=>f.height<=max+.011?Math.max(a,f.height):a,-65);return{routes:[],lifts:[],bounds:{min:-190,max:190},surfaces:walkSurfaces,height,routeForSurface:()=>null,maxMoveStep:.055,navigation:{edge:-189,size:190,surface:height}};}
export const areaAt=(x,z)=>FLOORS.find(f=>insideRect(f,x,z))?.id||'passerelle';
// Each rail is generated from the perimeter, minus ramp or bridge openings at matching height.
function edgeRails(f){const ret=[];for(const side of ['west','east','north','south']){const v=side==='west'||side==='east',a=v?f.z1:f.x1,b=v?f.z2:f.x2,c=side==='west'?f.x1:side==='east'?f.x2:side==='north'?f.z1:f.z2,sign=side==='west'||side==='north'?-1:1;let start=null;for(let n=0;n<=Math.round((b-a)*2);n++){const k=a+n*.5,m=k+.25,x=v?c+sign*.02:m,z=v?m:c+sign*.02;const other=walkSurfaces(x,z).some(o=>Math.abs(o.height-f.height)<.06);const end=k>=b-.001;if(!end&&!other&&start===null)start=k;if((end||other)&&start!==null){ret.push({x:v?c:start,z:v?start:c,b:v?c:k,d:v?k:c,y0:f.height,y1:f.height});start=null;}}}return ret;}
export const UPPER_RAILS=DECKS.flatMap(edgeRails),RAILS=[],SLOPE_RAILS=RAMPS.flatMap(r=>[r.x1,r.x2].map(x=>({x,z:r.from,b:x,d:r.to,y0:r.y0,y1:r.y1})));
const S=(id,x,z,y,w,d,h,material)=>({id,x,z,y,w,d,h,material});
export const WALLS=ROOMS.flatMap(r=>{const w=(r.w-10)/2,d=(r.d-10)/2;return [-1,1].flatMap(a=>[-1,1].flatMap(b=>[S(r.id+'-n'+a+b,r.x+b*(w+10)/2,r.z+a*r.d/2,r.height,w,.6,r.h,'wall'),S(r.id+'-e'+a+b,r.x+a*r.w/2,r.z+b*(d+10)/2,r.height,.6,d,r.h,'wall')]))});
export const PROPS=FLOORS.filter(f=>!['lift','core','evac'].includes(f.id)).flatMap(f=>[-1,1].flatMap(q=>[-1,1].map((k,i)=>S(f.id+'-prop-'+q+'-'+k,f.x+q*(f.w*.29),f.z+k*(f.d*.27),f.height,4,3,3.3,({admin:'desk',lab:'pod',data:'rack',locks:'terminal',pink:'terminal',arena:'cover',transfer:'rack',access:'gate'}[f.id])))));
export const MACHINES=[S('spire',35,-83,-30,26,24,192,'spire'),S('brain',105,-134,68,11,8,10,'brain'),S('aircraft',117,132,8,15,10,4,'aircraft')];
export const EQUIPMENT=TERRACES.flatMap(f=>[-1,1].flatMap(q=>[-1,1].map(k=>S(f.id+'-'+q+'-'+k,f.x+q*f.w*.30,f.z+k*f.d*.30,f.height,3.3,2.7,2.5,({ 'access-yard':'barrier','admin-yard':'utility','lab-yard':'coolant','data-yard':'generator','locks-yard':'transformer','transfer-yard':'antenna','evac-yard':'cargo'}[f.id])))));
export const SOLIDS=[...WALLS,...PROPS,...MACHINES,...EQUIPMENT],DRESS_PROPS=[...PROPS,...EQUIPMENT];
// Rock mesa height under each grounded zone. Gameplay remains on exact registered surfaces.
export function terrainHeight(x,z){let base=-58+5*Math.sin(x*.08)*Math.cos(z*.09),value=base;for(const f of [...FLOORS.filter(a=>GROUNDED.includes(a.id)),...TERRACES]){const dist=Math.hypot(Math.max(f.x1-x,0,x-f.x2),Math.max(f.z1-z,0,z-f.z2));const slope=Math.max(0,1-dist/21);value=Math.max(value,base+(f.height-.95-base)*slope*slope);}for(const r of RAMPS.filter(a=>['access-admin','admin-lab','data-locks','transfer-evac-a','transfer-evac-b'].includes(a.id))){const dist=Math.hypot(Math.max(r.x1-x,0,x-r.x2),Math.max(r.z1-z,0,z-r.z2)),slope=Math.max(0,1-dist/15),h=rampHeight(r,x,Math.max(r.z1,Math.min(r.z2,z)));value=Math.max(value,base+(h-.95-base)*slope*slope);}const walk=walkSurfaces(x,z);if(walk.length)value=Math.min(value,Math.min(...walk.map(a=>a.height))-.85);return value;}

export function buildCollisions(){const solid=SOLIDS.map(p=>({kind:p.material,x:p.x,z:p.z,y:p.y,hx:p.w/2,hz:p.d/2,height:p.h,navPad:.12}));return [...solid,...[...UPPER_RAILS,...SLOPE_RAILS].flatMap(r=>{const n=r.y0===r.y1?1:Math.max(1,Math.ceil(Math.hypot(r.b-r.x,r.d-r.z)/2));return Array.from({length:n},(_,i)=>{const t=(i+.5)/n;return{kind:'rail',x:r.x+(r.b-r.x)*t,z:r.z+(r.d-r.z)*t,y:r.y0+(r.y1-r.y0)*t-.25,hx:Math.max(.12,Math.abs(r.b-r.x)/n/2),hz:Math.max(.12,Math.abs(r.d-r.z)/n/2),height:1.65,navPad:.12};});})];}
const defs=[
 ['access',-100,88,8,'Infiltrer le sas ORDRE'],['scan',-100,69,8,'Détourner le contrôle d’accès'],
 ['admin',-100,14,20,'Sécuriser l’administration'],['badge',-92,14,20,'Collecter les habilitations'],['admin-exit',-100,2,20,'Ouvrir le passage de recherche'],
 ['lab',-100,-50,32,'Atteindre CONVERGENCE'],['lab-scan',-100,-62,32,'Analyser les interfaces neurales'],['data',-30,-55,32,'Collecter les données de transition'],['data-copy',-30,-64,32,'Copier le registre humain / IA'],
 ['lock-a',-42,-125,44,'Neutraliser le terminal A'],['lock-b',-30,-133,44,'Neutraliser le terminal B'],['lock-c',-18,-125,44,'Neutraliser le terminal C'],
 ['lift',35,-125,44,'Activer l’ascenseur central'],['arrival',35,-125,68,'Sécuriser le palier supérieur'],['pink',105,-125,68,'Insérer le code PINK'],['disrupt',105,-117,68,'Perturber CONVERGENCE'],
 ['arena',105,-50,56,'Résister à la contre-offensive'],['wave-b',105,-40,56,'Repousser les unités lourdes'],['transfer',105,25,44,'Rejoindre la baie de transmission'],['upload',105,35,44,'Transférer les données vers AEGIS'],['evac',105,111,8,'Sécuriser l’héliport'],['extract',105,120,8,'Embarquer et évacuer']
];
export const INTERACTIONS=defs.map(([id,x,z,y,label],i)=>({id,x,z,y,label,hint:label,radius:3.2,number:i+1}));
export const STAGES=[...INTERACTIONS.map((p,i)=>({...p,checkpoint:i?{...INTERACTIONS[i-1],yaw:0}:START})),{id:'fin',label:'Tour évacuée',checkpoint:INTERACTIONS.at(-1)}];STAGES[13].checkpoint={...INTERACTIONS[13],yaw:0};
export const HOLDS={scan:18,badge:16,'admin-exit':10,'lab-scan':22,'data-copy':25,'lock-a':15,'lock-b':15,'lock-c':15,lift:12,pink:28,disrupt:32,arena:40,'wave-b':35,upload:30,extract:22};
export const SUPPLIES=INTERACTIONS.filter((_,i)=>i%2===0&&i!==12).map((p,i)=>({kind:i%2?'cell':'heal',x:p.x,z:p.z+2,y:p.y}));
const combatIds=new Set(['access','admin','badge','lab','lab-scan','data','data-copy','lock-a','lock-b','lock-c','arrival','pink','disrupt','arena','wave-b','transfer','upload','evac','extract']);
export const ENCOUNTERS=Object.fromEntries(INTERACTIONS.map(p=>[p.id,combatIds.has(p.id)?[-1,1].map((q,i)=>({form:['arena','wave-b'].includes(p.id)?(i?'bulwark':'brute'):(i?'probe':'stalker'),x:p.x+q*3,z:p.z,y:p.y})):[]]));
export const REINFORCEMENTS=Object.fromEntries(INTERACTIONS.filter(p=>['data-copy','pink','disrupt','arena','wave-b','upload','extract'].includes(p.id)).map(p=>[p.id,[-1,1].map((q,i)=>({form:['arena','wave-b'].includes(p.id)?(i?'seer':'brute'):(i?'synth':'stalker'),x:p.x+q*3,z:p.z+3,y:p.y}))]));
const way=[
 [[-100,88]], [[-100,69]], [[-100,61],[-100,32],[-100,14]], [[-92,14]], [[-100,14],[-100,2]], [[-100,-4],[-100,-36],[-100,-50]], [[-100,-62]], [[-100,-55],[-30,-55]], [[-30,-64]], [[-30,-74],[-30,-105],[-30,-125],[-42,-125]], [[-30,-125],[-30,-133]], [[-30,-125],[-18,-125]], [[35,-125]], [[35,-125]], [[105,-125]], [[105,-117]], [[105,-105],[105,-72],[105,-50]], [[105,-40]], [[105,-28],[105,5],[105,25]], [[105,35]], [[105,45],[105,75],[105,95],[105,111]], [[105,120]]
];
export const GUIDES=way.map((nodes,i)=>{const p=INTERACTIONS[i],prev=i?INTERACTIONS[i-1]:START;let y=prev.y;return [prev,...nodes.map(([x,z])=>{const list=walkSurfaces(x,z);let v=list.sort((a,b)=>Math.abs(a.height-y)-Math.abs(b.height-y))[0];if(i===13)v={height:68};if(i===14&&x>=35)v={height:68};y=v?.height??p.y;return{x,z,y};})];});
export const ROUTE=GUIDES.flat().map(p=>[p.x,p.y,p.z]);
export function guideTarget(i,p){const a=GUIDES[i]||[];let k=0,best=Infinity;a.forEach((v,j)=>{const d=Math.hypot(p.x-v.x,p.z-v.z,2*(p.elevation-v.y));if(d<best){best=d;k=j;}});return a[Math.min(k+1,a.length-1)];}
export const DURATION_TARGET_MIN=30;
