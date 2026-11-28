import {bevelBox,loft} from './geo.js';
import {FLOORS,ROUTE} from './m11-layout.js';

export function buildM11Roads(k){
 const {box,rod,quad,sector}=k;
 for(const f of FLOORS){
  const pieces=f.id==='barrage'?4:1;
  for(let i=0;i<pieces;i++){
   const w=f.w/pieces,x=f.x1+w*(i+.5),y=f.height,z=f.z;
   sector(f.id+' / dalle '+i);
   box([x,y-.69,z],[w,1.38,f.d],f.id==='barrage'?'deck':'road');
   // Expansion strips under the pavement edge, where the slab bears on the piers.
   for(const side of [-1,1])box([x,y-.43,z+side*f.d*.5],[w-.055,.24,.09],'concrete');
   const lane=f.id==='barrage'?-43:z;
   for(let xx=x-w*.5+2;xx<x+w*.5-1;xx+=4.6)
    box([xx,y+.011,lane+(f.id==='barrage'?2.4:-.055)],[1.63,.012,.10],'line');
   if(f.id==='barrage')for(const zz of [-54,-35.7]){
    for(let xx=x-w*.5+2;xx<x+w*.5-2;xx+=4.6)
     box([xx,y+.016,zz],[1.15,.035,.29],'edge');
   }
  }
 }
 // Platforms are already physical surfaces. Render only the exposed part of
 // each ramp, leaving the original traversal equation and collider boxes intact.
 let spans=0;
 for(let i=1;i<ROUTE.length;i++){
  const a=ROUTE[i-1],b=ROUTE[i],dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz),nx=dz/len,nz=-dx/len;
  const pos=(t,s=0)=>[a[0]+dx*t+nx*s,a[1]+(b[1]-a[1])*t,a[2]+dz*t+nz*s];
  const visible=(x,y,z)=>!FLOORS.some(f=>x>f.x1+.012&&x<f.x2-.012&&z>f.z1+.012&&z<f.z2-.012&&y<=f.height+.035);
  const across=[-2.895,-1.45,0,1.45,2.895],n=Math.ceil(len/1.1);
  const railStarts=[null,null];
  sector(i<4?'Passerelle civile':i<11?'Montée au barrage':'Rampe AEGIS');
  for(let j=0;j<n;j++){
   const begin=j/n,end=(j+1)/n,mid=(begin+end)*.5;
   let any=false;
   for(let m=1;m<across.length;m++){
    const l=across[m-1],r=across[m];
    if(!visible(...pos(mid,(l+r)*.5)))continue;
    const at=(t,s)=>{const p=pos(t,s);p[1]+=.008;return p;};
    quad(at(begin,r),at(begin,l),at(end,l),at(end,r),'deck');any=true;
   }
   if(any)spans++;
   for(const [edge,s] of [-2.9,2.9].entries()){
    if(visible(...pos(mid,s))&&Math.abs(b[1]-a[1])>.45){
     if(railStarts[edge]===null)railStarts[edge]=begin;
    }else if(railStarts[edge]!==null){
     sideRail(railStarts[edge],begin,s);railStarts[edge]=null;
    }
   }
  }
  for(const [edge,s] of [-2.9,2.9].entries())if(railStarts[edge]!==null)sideRail(railStarts[edge],1,s);
  function sideRail(start,end,s){
   const f=pos(start,s),t=pos(end,s);
   rod([f[0],f[1]-.10,f[2]],[t[0],t[1]-.10,t[2]],.137,'edge');
   rod([f[0],f[1]+1.04,f[2]],[t[0],t[1]+1.04,t[2]],.045,'edge');
   const steps=Math.max(1,Math.ceil((end-start)*len/3));
   for(let j=0;j<=steps;j++){
    const [x,y,z]=pos(start+(end-start)*j/steps,s);
    rod([x,y,z],[x,y+1.04,z],.031,'edge');
   }
  }
 }
 return spans;
}
export function buildM11Aircraft(T,k,low){
 const x=109,y=32,z=-71;
 const {box,rod,cylinder,add,quad,trimSign}=k;
 k.sector('AEGIS / Navette de secours');
 const hull=loft([[-3.22,.22,.23],[-2.78,1.06,.53],[-1.63,1.48,.73],[.43,1.51,.82],[2.01,1.25,.74],[3.18,.74,.44]],low?12:20);
 add(hull,'white',[x,y+1.52,z],[Math.PI/2,0,0]);
 const belly=loft([[-2.74,.50,.27],[-1.98,1.14,.29],[1.51,1.24,.30],[2.85,.52,.18]],low?10:16);
 add(belly,'dark',[x,y+.86,z],[Math.PI/2,0,0]);
 // Armoured canopy, cut by independent glazed facets.
 const py=y+1.67;
 for(const s of [-1,1]){
  const a=[x+s*.14,py+.40,z-2.58],b=[x+s*1.15,py+.47,z-1.80],c=[x+s*1.12,py+.83,z-.85],d=[x+s*.11,py+.90,z-1.29];
  // The four facets are visible from either side of the approach.
  if(s>0)quad(d,c,b,a,'glass');else quad(a,b,c,d,'glass');
  for(const [p,q] of [[a,b],[b,c],[c,d]])rod(p,q,.039,'edge');
  // Skids actually bear on their replaceable soles. The two angled struts
  // are supported by a piston and fixed to the hull with collars.
  for(const [foot,upper] of [[-2.09,-1.45],[2.13,1.41]]){
   const a=[x+s*.98,y+.18,z+foot],b=[x+s*1.10,y+1.18,z+upper];
   const piston=a.map((v,i)=>v+(b[i]-v)*.61);
   rod(a,piston,.105,'edge');rod(piston,b,.079,'steel');
   cylinder([piston[0],piston[1],piston[2]],.106,.139,'dark');
   add(bevelBox(.25,.062,.51,.025,1),'rubber',[a[0],y+.079,a[2]]);
  }
  rod([x+s*.98,y+.151,z-2.30],[x+s*1.01,y+.151,z+2.30],.102,'edge');
  rod([x+s*.98,y+.19,z-2.53],[x+s*.98,y+.151,z-2.30],.096,'edge');
  // Chamfered baggage door with inset seal, two hinges and a folding handle.
  add(bevelBox(.157,.68,1.37,.061,1),'dark',[x+s*1.393,y+1.52,z+.66]);
  add(bevelBox(.097,.61,1.25,.052,1),'paintRed',[x+s*1.455,y+1.52,z+.66]);
  for(const dz of [.29,1.03])cylinder([x+s*1.507,y+1.80,z+dz],.049,.145,'edge',[Math.PI/2,0,0]);
  box([x+s*1.515,y+1.54,z+.33],[.034,.111,.231],'dark');
  rod([x+s*1.547,y+1.54,z+.253],[x+s*1.547,y+1.54,z+.406],.021,'edge');
  for(const dy of [-.184,.184])for(const dz of [.19,1.11]){
   cylinder([x+s*1.51,y+1.52+dy,z+dz],.020,.026,'edge',[0,0,Math.PI/2]);
  }
  const p0=[x+s*1.13,y+2.15,z+.32],p1=[x+s*2.72,y+2.14,z+.68],p2=[x+s*2.72,y+2.14,z+1.93],p3=[x+s*1.23,y+2.19,z+2.34];
  const a0=p0.map((v,i)=>v-(i===1?.19:0)),a1=p1.map((v,i)=>v-(i===1?.19:0)),a2=p2.map((v,i)=>v-(i===1?.19:0)),a3=p3.map((v,i)=>v-(i===1?.19:0));
  for(const face of [[p0,p1,p2,p3],[a3,a2,a1,a0],[p1,a1,a2,p2],[p2,a2,a3,p3],[p0,a0,a1,p1]]){
   if(s>0)quad(...face.reverse(),'paint');else quad(...face,'paint');
  }
  buildM11Rotor(T,k,x+s*3.55,y+2.28,z+1.29,s,low);
  for(const offset of [0,.10]){
   rod([x+s*1.49,y+2.05,z+.61+offset],[x+s*2.47,y+2.17,z+.71+offset],.035,'rubber');
   rod([x+s*2.47,y+2.17,z+.71+offset],[x+s*2.83,y+2.28,z+.94+offset],.036,'edge');
  }
  for(const dz of [-.27,.02,.31])box([x+s*1.43,y+1.69,z+dz],[.053,.086,.17],'dark');
 }
 rod([x-.14,py+.40,z-2.58],[x+.14,py+.40,z-2.58],.035,'edge');
 rod([x-.11,py+.90,z-1.29],[x+.11,py+.90,z-1.29],.039,'edge');
 quad([x-.14,py+.40,z-2.58],[x-.11,py+.90,z-1.29],[x+.11,py+.90,z-1.29],[x+.14,py+.40,z-2.58],'dark');
 box([x,y+1.93,z-2.13],[.11,.085,.62],'edge');
 box([x,y+1.40,z-3.06],[.71,.092,.038],'warm');
 box([x,y+1.35,z+2.99],[.89,.064,.19],'red');
 trimSign('AEGIS  ·  C-07','ÉVACUATION SANITAIRE',[x,y+1.30,z+3.20],0,1.47,.39,'aegis');
}

function buildM11Rotor(T,{add,box,cylinder,rod,ring},x,y,z,side,low){
 // An open duct with a rounded leading lip. The spars and rotor sit inside the throat.
 const section=[
  [.88,-.20],[.96,-.24],[1.05,-.24],[1.13,-.18],[1.16,-.11],[1.15,.13],
  [1.11,.21],[1.05,.242],[.966,.21],[.915,.15],[.897,.02],[.895,-.112],[.88,-.20]
 ].map(([radius,height])=>new T.Vector2(radius,height));
 add(new T.LatheGeometry(section,low?20:34),'white',[x,y,z]);
 ring([x,y-.164,z],1.115,.028,'edge');
 ring([x,y+.133,z],.921,.022,'edge');
 cylinder([x,y-.025,z],.24,.29,'steel');
 cylinder([x,y+.14,z],.185,.077,'edge');
 cylinder([x,y-.184,z],.166,.10,'dark');
 for(let j=0;j<5;j++){
  const a=j*Math.PI*2/5,s=Math.sin(a),c=Math.cos(a);
  rod([x+.18*s,y-.144,z+.18*c],[x+.90*s,y-.144,z+.90*c],.035,'steel');
 }
 for(let j=0;j<7;j++){
  const a=j*Math.PI*2/7,s=Math.sin(a),c=Math.cos(a);
  box([x+.552*s,y+.036,z+.552*c],[.135,.042,.624],'dark',a+side*.22);
 }
 for(const d of [-1,1]){
  const near=x+side*1.032;
  box([near,y-.026,z+d*.39],[.21,.11,.245],'edge');
 }
 // Navigation lamp in a caged recess, supported by the outer housing.
 cylinder([x+side*1.141,y+.019,z],.125,.096,'dark',[0,0,Math.PI/2]);
 cylinder([x+side*1.198,y+.019,z],.069,.044,side<0?'red':'blue',[0,0,Math.PI/2]);
}
