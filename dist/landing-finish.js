import {Assembly,bevelBox,matrix,limb} from './geo.js';
// M02 proposal: connected landing rails, sealed tube ends and bolted footplates.
export function createLandingFinish(T,parent,{M,low=false,collisions=[]}={}){
 const root=new T.Group();root.name='Proposition / finitions des paliers M02';parent.add(root);const a=new Assembly();
 const put=(g,m,p=[0,0,0],r=[0,0,0])=>{a.add(g,m,matrix(p,r),!low);g.dispose();};
 const box=(s,p,m=M.iron)=>put(bevelBox(...s,Math.min(.007,...s.map(v=>v*.17)),1),m,p);
 const rod=(u,v,r=.032,m=M.iron)=>put(limb(u,v,r,r,low?6:10),m);
 function post(x,z,base){
  box([.19,.026,.19],[x,base+.014,z],M.black);box([.15,.015,.15],[x,base+.035,z]);rod([x,base+.05,z],[x,base+1.12,z],.035);
  for(const sx of [-1,1])for(const sz of [-1,1])put(new T.CylinderGeometry(.016,.016,.014,6),M.iron,[x+sx*.055,base+.051,z+sz*.055]);
  put(new T.CylinderGeometry(.045,.045,.025,low?8:12),M.iron,[x,base+1.11,z]);
 }
 function rail(from,to,base,{collide=true}={}){
  const dx=to[0]-from[0],dz=to[1]-from[1],length=Math.hypot(dx,dz);if(length<.01)return;
  for(const h of [1.12,.60])rod([from[0],base+h,from[1]],[to[0],base+h,to[1]],h>1?.043:.022);
  const n=Math.max(1,Math.ceil(length/1.6));for(let i=0;i<=n;i++)post(from[0]+dx*i/n,from[1]+dz*i/n,base);
  if(Math.abs(dx)<.001)box([.035,.12,length],[from[0],base+.075,(from[1]+to[1])/2],M.black);else if(Math.abs(dz)<.001)box([length,.12,.035],[(from[0]+to[0])/2,base+.075,from[1]],M.black);
  // Rounded, plugged ends avoid open cuts. Curved unions overlap these caps.
  for(const [x,z] of [from,to])put(new T.SphereGeometry(.043,low?8:12,6),M.iron,[x,base+1.12,z]);
  if(collide)collisions.push({x:(from[0]+to[0])/2,z:(from[1]+to[1])/2,hx:Math.abs(dx)/2+.045,hz:Math.abs(dz)/2+.045,y:base+.08,height:1.10,surface:'metal',landingRail:true});
 }
 function union(points){put(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),low?10:18,.043,low?6:10,false),M.iron);for(const p of [points[0],points.at(-1)])put(new T.SphereGeometry(.047,8,6),M.iron,p);}
 // Bridge openings remain at east landing, west stairs and the roof stair.
 rail([-11,-16.62],[8.9,-16.62],12,{collide:false});rail([-5.1,-19.38],[11,-19.38],12,{collide:false});
 rail([9.255,-8.02],[9.255,-16.27],12);rail([11.945,-8.02],[11.945,-18.84],12);
 union([[9.255,13.04,-8.02],[9.255,13.10,-8.18],[9.255,13.12,-8.35]]);
 union([[11.945,13.04,-8.02],[11.945,13.10,-8.18],[11.945,13.12,-8.35]]);
 union([[9.255,13.12,-16.27],[9.23,13.12,-16.48],[9.08,13.12,-16.60],[8.9,13.12,-16.62]]);
 union([[11.945,13.12,-18.84],[11.88,13.12,-19.19],[11.56,13.12,-19.38],[11,13.12,-19.38]]);
 rail([-11.945,-19.38],[-11.945,-17.0],12);rail([-9.255,-19.38],[-9.255,-18.98],12);
 union([[-11.945,12.873,-19.7],[-11.945,13.02,-19.52],[-11.945,13.12,-19.38]]);
 union([[-9.255,12.873,-19.7],[-9.255,13.02,-19.52],[-9.255,13.12,-19.38]]);
 union([[-11.945,13.12,-17.0],[-11.80,13.12,-16.70],[-11.40,13.12,-16.62],[-11,13.12,-16.62]]);
 // Slab fascia, landing junction plates and edge bolts finish the deck itself.
 box([.13,.24,11.9],[12.04,11.86,-12.5]);box([2.7,.035,.34],[10.6,12.019,-8.02],M.iron);
 box([21.8,.17,.10],[0,11.90,-16.47]);box([21.8,.17,.10],[0,11.90,-19.53]);
 for(const x of [9.36,11.84])for(const z of [-8.02,-10,-12,-14,-16])put(new T.CylinderGeometry(.021,.021,.014,6),M.iron,[x,12.035,z]);
 // Full roof perimeter, with a 2.84 m opening facing its staircase.
 rail([-11.65,-44.5],[-11.65,-57.5],25);rail([-11.65,-57.5],[-1.75,-57.5],25);rail([-1.75,-57.5],[-1.75,-44.5],25);
 rail([-11.65,-44.5],[-8.12,-44.5],25);rail([-5.28,-44.5],[-1.75,-44.5],25);
 box([10.4,.24,.13],[-6.7,24.85,-57.73]);box([.13,.24,13.5],[-11.94,24.85,-51]);box([.13,.24,13.5],[-1.46,24.85,-51]);
 box([2.42,.035,.34],[-6.7,25.021,-45.72]);
 for(const side of [-1,1]){
  const x=-6.7+side*1.27;union([[x,26.04,-45.72],[x,26.08,-45.96],[x,26.04,-46.17],[x,25.82,-46.24]]);post(x,-46.24,25);
 }
 a.build(root);for(const item of a.items)item.geometry.dispose();a.items.length=0;return root;
}
