import {Assembly,matrix,limb} from './geo.js';

// One authored structure per function. These coordinates also supply the hulls.
export const SERVICE_RAMP=Object.freeze([
 [62.25,8.53,-56],[68,8.25,-56],[75,7.25,-56],
 [82,5.8,-54],[88,3.65,-48],[91,1.55,-40],[91,.18,-33]
].map(Object.freeze));
export const FREIGHT_GANTRY=Object.freeze({x1:64.5,x2:95.5,z:-81,height:11.4});
export const STREET_BLADES=Object.freeze([
 [-12.6,5.6,17,'救急','#ff4fa1','SOINS'],[-12.6,5.2,46,'薬局','#5fe0f0','PHARMA'],[17.4,5.4,22,'修理','#ffb35c','ATELIER'],[17.4,5.8,38,'電脳','#c06bff','IMPLANTS'],
 [12.6,5.6,-8,'夜市','#ff4fa1','MARCHÉ'],[12.6,5.2,-24,'酒場','#ffb35c','BAR'],[-12.6,5.6,-46,'倉庫','#5fe0f0','DÉPÔT'],[12.6,5.6,-70,'屋台','#ff4fa1','NOUILLES'],
 [-12.6,5.6,-82,'危険','#ff3b4e','ZONE ROUGE'],[-12.6,5.4,62,'市場','#ffb35c','MARCHÉ'],[12.6,5.6,50,'東','#5fe0f0','EST']
].map(Object.freeze));
export const WORKSHOP_EQUIPMENT=Object.freeze([
 {id:'pompe-atelier-1',prop:'pump',x:38,z:28,hx:1,hz:.75,height:1.6},
 {id:'pompe-atelier-2',prop:'generator',x:38,z:34,hx:1,hz:.75,height:1.5}
].map(Object.freeze));
// Retire the five overlapping visitor-map machines as complete assemblies.
export const RETIRED_MACHINES=Object.freeze(Array.from({length:5},(_,j)=>{
 const x=22+j*3.6,z=25+(j%2)*5;
 return Object.freeze({x1:x-1.08,x2:x+1.08,y1:0,y2:2.65,z1:z-1.08,z2:z+1.5});
}));
const RETIRED_BENCH_SKINS=Array.from({length:7},(_,j)=>({x1:18.4+j*3.8,x2:21.6+j*3.8,y1:0,y2:3.9,z1:35.8,z2:37.8}));
export const inside=(c,b,pad=.025)=>['x','y','z'].every(a=>c[a+'1']>=b[a+'1']-pad&&c[a+'2']<=b[a+'2']+pad);
export const retiredMachineHull=c=>RETIRED_MACHINES.some(b=>inside(c,b));
export const retiredDecoration=c=>retiredMachineHull(c)||RETIRED_BENCH_SKINS.some(b=>inside(c,b));
export function faceBounds(world,q,scale){
 const b={x1:Infinity,y1:Infinity,z1:Infinity,x2:-Infinity,y2:-Infinity,z2:-Infinity};
 for(let v=0;v<4;v++)for(const[a,k]of[['x',0],['y',1],['z',2]]){const n=world.pos[q*12+v*3+k]*scale;b[a+'1']=Math.min(b[a+'1'],n);b[a+'2']=Math.max(b[a+'2'],n);}
 return b;
}
const RAMP_SECTIONS=SERVICE_RAMP.map((p,i)=>{
 const a=SERVICE_RAMP[Math.max(0,i-1)],b=SERVICE_RAMP[Math.min(SERVICE_RAMP.length-1,i+1)],dx=b[0]-a[0],dz=b[2]-a[2],n=Math.hypot(dx,dz);
 return [-1,1].map(s=>[p[0]-s*dz/n*3.5,p[1],p[2]+s*dx/n*3.5]);
});
const RAMP_TRIANGLES=RAMP_SECTIONS.slice(1).flatMap((e,i)=>[[RAMP_SECTIONS[i][0],RAMP_SECTIONS[i][1],e[1]],[RAMP_SECTIONS[i][0],e[1],e[0]]]);
export function serviceRampHeight(x,z){
 for(const[a,b,c]of RAMP_TRIANGLES){
  const d=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]),u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/d,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/d;
  if(u>=-1e-6&&v>=-1e-6&&u+v<=1.000001)return u*a[1]+v*b[1]+(1-u-v)*c[1];
 }
 return null;
}
export function rampDeckHulls(){
 const out=[];
 for(let i=1;i<RAMP_SECTIONS.length;i++){
  const n=Math.ceil(Math.hypot(SERVICE_RAMP[i][0]-SERVICE_RAMP[i-1][0],SERVICE_RAMP[i][2]-SERVICE_RAMP[i-1][2])/.6);
  for(let j=0;j<n;j++){
   const points=[j/n,(j+1)/n].flatMap(t=>RAMP_SECTIONS[i-1].map((a,k)=>a.map((v,h)=>v+(RAMP_SECTIONS[i][k][h]-v)*t)));
   const xs=points.map(p=>p[0]),zs=points.map(p=>p[2]),ys=points.map(p=>p[1]),y=Math.max(0,Math.min(...ys)-.45);
   // Two millimetres of overlap close numerical seams between adjacent slices.
   out.push({kind:'raised-road',x:(Math.min(...xs)+Math.max(...xs))/2,z:(Math.min(...zs)+Math.max(...zs))/2,hx:(Math.max(...xs)-Math.min(...xs))/2+.002,hz:(Math.max(...zs)-Math.min(...zs))/2+.002,y,height:Math.max(...ys)-y,walkableSurface:true,surface:'concrete'});
  }
 }
 for(const[i,p]of rampPillars().entries()){
  const e=RAMP_SECTIONS[i+1],dx=Math.abs(e[1][0]-e[0][0])/7,dz=Math.abs(e[1][2]-e[0][2])/7;
  out.push({kind:'ramp-cap',x:p.x,z:p.z,hx:dx*3.1+dz*.7,hz:dz*3.1+dx*.7,y:p.height-.24,height:.32,walkableSurface:true,surface:'concrete'});
 }
 return out;
}
export function rampPillars(){return SERVICE_RAMP.slice(1,-1).map(([x,y,z])=>({x,z,hx:.6,hz:.6,y:0,height:y-.45}));}
export function createStreetSignSupports(T,parent,M){
 const assembly=new Assembly();
 for(const[x,y,z]of STREET_BLADES){
  const px=x+Math.sign(x)*.65,h=y+1.1;
  assembly.limb(M.galva,[px,0,z],[px,h,z],.08,.06);
  assembly.box(M.dark,[.38,.12,.38],[px,.06,z]);
  for(const a of[-.8,.8])assembly.limb(M.galva,[px,y+a,z],[x,y+a,z],.04);
 }
 assembly.build(parent,{name:'mâts et attaches des enseignes'});
}
export function createServiceInfrastructure(T,parent,M,{low=false}={}){
 const root=new T.Group();root.name='M03 / bretelle et portique raccordés';parent.add(root);
 const assembly=new Assembly(),deck=[],indices=[],edges=RAMP_SECTIONS;
 const piece=(m,size,p,rotation=[0,0,0])=>{const g=new T.BoxGeometry(...size);assembly.add(g,m,matrix(p,rotation));g.dispose();};
 const rod=(m,a,b,r=.045)=>{const g=limb(a,b,r,r,low?6:10);assembly.add(g,m);g.dispose();};
 for(let i=0;i<SERVICE_RAMP.length;i++){
  for(const e of edges[i])deck.push(e[0],e[1],e[2],e[0],e[1]-.45,e[2]);
  if(i){const k=(i-1)*4,j=i*4;indices.push(k,k+2,j+2,k,j+2,j,k+1,j+1,j+3,k+1,j+3,k+3,k,j,k+1,k+1,j,j+1,k+2,k+3,j+2,k+3,j+3,j+2);}
 }
 // Closed ends and shared cross sections keep the deck continuous at bends.
 indices.push(0,1,2,1,3,2);const k=(SERVICE_RAMP.length-1)*4;indices.push(k,k+2,k+1,k+1,k+2,k+3);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(deck,3));g.setAttribute('uv',new T.Float32BufferAttribute(deck.flatMap((v,i)=>i%3===0?[v/3,deck[i+2]/3]:[]),2));g.setIndex(indices);g.computeVertexNormals();assembly.add(g,M.concrete);g.dispose();
 for(let side=0;side<2;side++)for(let i=1;i<edges.length;i++){
  const a=edges[i-1][side],b=edges[i][side];
  for(const h of [.55,1.05])rod(M.galva,[a[0],a[1]+h,a[2]],[b[0],b[1]+h,b[2]],.045);
  const n=Math.ceil(Math.hypot(b[0]-a[0],b[2]-a[2])/2.5);
  for(let j=0;j<n;j++){const t=j/n,p=a.map((v,k)=>v+(b[k]-v)*t);rod(M.galva,p,[p[0],p[1]+1.1,p[2]],.05);}
 }
 for(const[i,p]of rampPillars().entries()){
  const g=new T.CylinderGeometry(.5,.6,p.height,low?8:14);assembly.add(g,M.concrete,matrix([p.x,p.height/2,p.z]));g.dispose();const e=edges[i+1],yaw=Math.atan2(-(e[1][2]-e[0][2]),e[1][0]-e[0][0]);piece(M.concrete,[6.2,.32,1.4],[p.x,p.height-.08,p.z],[0,yaw,0]);
 }
 const B=FREIGHT_GANTRY;
 for(const x of[B.x1,B.x2]){
  piece(M.dark,[1.7,.22,1.7],[x,.11,B.z]);piece(M.yellow,[1.2,B.height,1.2],[x,B.height/2,B.z]);
  rod(M.galva,[x,B.height-2.8,B.z],[x+(x===B.x1?2.8:-2.8),B.height,B.z],.14);
 }
 piece(M.yellow,[B.x2-B.x1+1.2,1,1.4],[(B.x1+B.x2)/2,B.height+.5,B.z]);
 piece(M.galva,[B.x2-B.x1,.15,.65],[(B.x1+B.x2)/2,B.height-.08,B.z]);
 assembly.build(root,{name:'structure porteuse'});
 // The trolley, cable and hook remain connected to the overhead rail.
 const trolley=new T.Group();trolley.name='chariot de levage sur rail';trolley.position.set(76,B.height-.55,B.z);root.add(trolley);
 const body=new T.Mesh(new T.BoxGeometry(2,.9,1.15),M.dark);trolley.add(body);
 const cable=new T.Mesh(new T.CylinderGeometry(.035,.035,2.2,6),M.galva);cable.position.y=-1.55;trolley.add(cable);
 const hook=new T.Mesh(new T.TorusGeometry(.22,.055,6,16,Math.PI*1.5),M.galva);hook.position.y=-2.7;trolley.add(hook);
 return {root,update(t){trolley.position.x=80+Math.sin(t*.15)*10;}};
}
