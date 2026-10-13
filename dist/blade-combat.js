const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function bladeSwingPose(phase,side=1){
  if(!(phase>0&&phase<1))return {x:0,y:0,z:0};
  const arc=Math.sin(phase*Math.PI),cross=Math.cos(phase*Math.PI)*arc*side;
  return {x:-1.02*arc,y:-.65*cross,z:1.05*cross};
}
// Sample a bounded ruled surface swept by the real blade. Occlusion is tested
// from the grip for every sample; neither a long swing nor a hand in a wall cheats.
export function sweepBlade(previous,current,enemies,obstacles,eye,segmentBox,traceEnemyHit){
  if(!current||![current.base,current.tip].every(p=>p&&[p.x,p.y,p.z].every(Number.isFinite)))return [];
  if(distance(current.base,current.tip)>1.3)return [];
  if(previous&&distance(previous.base,current.base)>2)return [];
  const span=previous?Math.max(distance(previous.base,current.base),distance(previous.tip,current.tip)):0;
  const steps=Math.min(18,Math.max(1,Math.ceil(span/.065))),hits=new Map();
  for(let i=0;i<=steps;i++){
    const t=i/steps,base=previous?mix(previous.base,current.base,t):current.base,tip=previous?mix(previous.tip,current.tip,t):current.tip;
    if(obstacles.some(w=>segmentBox(eye,base,w)!==null))continue;
    let wallAt=1;
    for(const wall of obstacles){const hit=segmentBox(base,tip,wall);if(hit!==null)wallAt=Math.min(wallAt,hit);}
    for(const enemy of enemies){
      const hit=traceEnemyHit(base,tip,enemy);
      if(hit&&hit.t<wallAt&&!hits.has(enemy.id))hits.set(enemy.id,{enemy,...hit,point:mix(base,tip,hit.t)});
    }
  }
  return [...hits.values()];
}
// Closest points between two finite segments (Ericson). Used by physical parries.
export function bladeBulletContact(a,b,c,d,radius=.075){
  const v=(p,q)=>({x:q.x-p.x,y:q.y-p.y,z:q.z-p.z}),dot=(p,q)=>p.x*q.x+p.y*q.y+p.z*q.z;
  const u=v(a,b),w=v(c,d),r=v(c,a),uu=dot(u,u),ww=dot(w,w),uw=dot(u,w),ur=dot(u,r),wr=dot(w,r),limit=x=>Math.max(0,Math.min(1,x));
  let s=0,t=0;
  if(uu<1e-9&&ww<1e-9)return distance(a,c)<=radius?{t:0,point:a}:null;
  if(uu<1e-9)t=limit(wr/ww);
  else if(ww<1e-9)s=limit(-ur/uu);
  else{
    const denom=uu*ww-uw*uw;s=denom>1e-9?limit((uw*wr-ur*ww)/denom):0;
    t=(uw*s+wr)/ww;
    if(t<0){t=0;s=limit(-ur/uu);}else if(t>1){t=1;s=limit((uw-ur)/uu);}
  }
  const p=mix(a,b,s),q=mix(c,d,t);return distance(p,q)<=radius?{t:s,point:p}:null;
}
