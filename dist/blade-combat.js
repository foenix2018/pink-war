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
// First segment entry into the finite blade capsule, including its end caps.
export function bladeBulletContact(a,b,c,d,radius=.075){
  const v=(p,q)=>({x:q.x-p.x,y:q.y-p.y,z:q.z-p.z}),dot=(p,q)=>p.x*q.x+p.y*q.y+p.z*q.z;
  const ray=v(a,b),axis=v(c,d),length=Math.hypot(axis.x,axis.y,axis.z),times=[];
  function sphere(center){
    const offset=v(center,a),A=dot(ray,ray),B=2*dot(offset,ray),C=dot(offset,offset)-radius*radius;
    if(C<=0){times.push(0);return;}const discriminant=B*B-4*A*C;
    if(A>1e-10&&discriminant>=0){const t=(-B-Math.sqrt(discriminant))/(2*A);if(t>=0&&t<=1)times.push(t);}
  }
  sphere(c);if(length>.0001){
    sphere(d);axis.x/=length;axis.y/=length;axis.z/=length;
    const offset=v(c,a),along=dot(offset,axis),travel=dot(ray,axis);
    const radial={x:offset.x-axis.x*along,y:offset.y-axis.y*along,z:offset.z-axis.z*along};
    const motion={x:ray.x-axis.x*travel,y:ray.y-axis.y*travel,z:ray.z-axis.z*travel};
    const A=dot(motion,motion),B=2*dot(radial,motion),C=dot(radial,radial)-radius*radius,disc=B*B-4*A*C;
    if(C<=0&&along>=0&&along<=length)times.push(0);
    if(A>1e-10&&disc>=0)for(const t of [(-B-Math.sqrt(disc))/(2*A),(-B+Math.sqrt(disc))/(2*A)]){
      if(t>=0&&t<=1&&along+travel*t>=0&&along+travel*t<=length)times.push(t);
    }
  }
  if(!times.length)return null;const t=Math.min(...times),point=mix(a,b,t);
  const ratio=length>.0001?Math.max(0,Math.min(1,dot(v(c,point),axis)/length)):0;
  return {t,point,bladePoint:mix(c,d,ratio)};
}

// Specular deflection from the blade's cylindrical surface. No enemy selection
// or homing: contact and blade orientation determine the outgoing trajectory.
export function reflectedVelocity(velocity, blade, contact) {
  const axis={x:blade.tip.x-blade.base.x,y:blade.tip.y-blade.base.y,z:blade.tip.z-blade.base.z};
  const length=Math.hypot(axis.x,axis.y,axis.z)||1;axis.x/=length;axis.y/=length;axis.z/=length;
  const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
  let normal=contact?.bladePoint?{x:contact.point.x-contact.bladePoint.x,y:contact.point.y-contact.bladePoint.y,z:contact.point.z-contact.bladePoint.z}:null;
  if(!normal||Math.hypot(normal.x,normal.y,normal.z)<.001){
    const along=dot(velocity,axis);normal={x:velocity.x-axis.x*along,y:velocity.y-axis.y*along,z:velocity.z-axis.z*along};
  }
  let norm=Math.hypot(normal.x,normal.y,normal.z);
  if(norm<.001){normal=axis;norm=1;}
  normal.x/=norm;normal.y/=norm;normal.z/=norm;const incidence=dot(velocity,normal);
  return {x:velocity.x-2*incidence*normal.x,y:velocity.y-2*incidence*normal.y,z:velocity.z-2*incidence*normal.z,normal};
}
