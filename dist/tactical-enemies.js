// Local cover choices use only the last heard/seen position. No knowledge of a
// concealed player's live position, teleportation, or shots through walls.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const coverEyeHeight=(enemy,cover)=> (enemy.elevation||0)+(cover?.crouch?1.34:1.96);
// A visible, approaching phase sphere is a local danger cue. Hidden spheres do
// not reveal their target. Movement still uses the game's normal collisions.
export function grenadeAvoidance(enemy,{time,hazards=[],obstacles,segmentBox}){
 if(enemy.form==='probe')return null;
 const eye={x:enemy.x,y:(enemy.elevation||0)+(enemy.aimHeight||1.25),z:enemy.z};
 const r=enemy.radius||.65;
 for(const p of hazards){
  if(Math.hypot(p.x-eye.x,p.y-eye.y,p.z-eye.z)>8||obstacles.some(b=>segmentBox(eye,p,b)!==null))continue;
  const t=Math.max(0,Math.min(.6,p.life-p.age)),danger={x:p.x+p.vx*t,z:p.z+p.vz*t};
  if(distance(enemy,danger)>(p.radius||3.5)+2)continue;
  const away=Math.atan2(enemy.x-danger.x,enemy.z-danger.z);
  for(const angle of [0,.65,-.65,1.1,-1.1]){
   const point={x:enemy.x+Math.sin(away+angle)*4.5,z:enemy.z+Math.cos(away+angle)*4.5};
   if(obstacles.some(b=>!b.walkableSurface&&segmentBox(eye,{...point,y:eye.y},{...b,hx:b.hx+r+.08,hz:b.hz+r+.08})!==null))continue;
   enemy.evadePoint=point;enemy.evadeUntil=time+.85;
   if(enemy.awareness==='patrol'){
    enemy.awareness='search';enemy.lastKnownX=p.x;enemy.lastKnownZ=p.z;enemy.lastKnownHeight=enemy.elevation||0;
   }
   enemy.alertedUntil=Math.max(enemy.alertedUntil||0,time+2);break;
  }
 }
 if(enemy.evadePoint&&time<(enemy.evadeUntil||0)&&distance(enemy,enemy.evadePoint)>.5)
  return {point:enemy.evadePoint,stopDistance:.4,canFire:false,state:'evade',speedScale:1.25,crouched:false};
 enemy.evadePoint=null;return null;
}
export function chooseTacticalCover(enemy,threat,obstacles,allies,segmentBox){
  const floor=enemy.elevation||0,r=enemy.radius||.65,margin=r+.23;
  const free=p=>obstacles.every(b=>b.walkableSurface||(b.y||0)+b.height<floor+.12||(b.y||0)>floor+1.9||Math.abs(p.x-b.x)>b.hx+r+.08||Math.abs(p.z-b.z)>b.hz+r+.08);
  let best=null;
  const walls=obstacles.filter(w=>!w.walkableSurface&&(w.y||0)<=floor+.2&&(w.y||0)+w.height>=floor+1.72&&distance(enemy,w)<=22).sort((a,b)=>distance(enemy,a)-distance(enemy,b)).slice(0,24);
  for(const wall of walls){
    const crouch=(wall.y||0)+wall.height<floor+2.12;
    const eye=p=>({x:p.x,y:coverEyeHeight(enemy,{crouch}),z:p.z});
    const standing=p=>({x:p.x,y:floor+1.96,z:p.z});
    for(const [nx,nz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      if((wall.x-threat.x)*nx+(wall.z-threat.z)*nz<=0)continue;
      const tx=-nz,tz=nx,normal=nx?wall.hx:wall.hz,tangent=nx?wall.hz:wall.hx;
      for(const side of [-1,1]){
        const along=Math.max(0,tangent-.45)*side;
        const hidden={x:wall.x+nx*(normal+margin)+tx*along,z:wall.z+nz*(normal+margin)+tz*along};
        const peek={x:wall.x+nx*(normal+margin)+tx*side*(tangent+margin+.3),z:wall.z+nz*(normal+margin)+tz*side*(tangent+margin+.3)};
        const travel=distance(enemy,hidden),range=distance(hidden,threat);
        if(travel>16||range<6||range>46||!free(hidden)||!free(peek))continue;
        if(segmentBox(eye(hidden),threat,wall)===null)continue;
        if(obstacles.some(b=>segmentBox(standing(peek),threat,b)!==null))continue;
        if(obstacles.some(b=>!b.walkableSurface&&segmentBox(eye(hidden),eye(peek),{...b,hx:b.hx+r+.07,hz:b.hz+r+.07})!==null))continue;
        if(allies.some(a=>a!==enemy&&a.tactics?.cover&&distance(a.tactics.cover.hidden,hidden)<2.2))continue;
        const preferred=side===(enemy.id%2?1:-1)?0:.22;
        const score=travel+distance(hidden,peek)*1.4+Math.abs(range-17)*.15+preferred;
        if(!best||score<best.score)best={hidden,peek,score,wall,crouch};
      }
    }
  }
  return best;
}

export function tacticalOrder(enemy,{time,threat,seen,obstacles,allies,segmentBox}){
  if(enemy.form!=='synth')return null;
  const t=enemy.tactics||=( {state:'advance',cover:null,nextPlan:0,until:0,shots:0} );
  if(enemy.awareness==='patrol'||!Number.isFinite(threat?.x)||Math.abs((enemy.elevation||0)-(threat.y-1.25))>.7){t.cover=null;t.state='advance';return null;}
  const underFire=(enemy.suppressedUntil||0)>time;
  const changed=t.cover&&segmentBox({x:t.cover.hidden.x,y:coverEyeHeight(enemy,t.cover),z:t.cover.hidden.z},threat,t.cover.wall)===null;
  if(changed){t.cover=null;t.nextPlan=time+.3;}
  if(!t.cover&&time>=t.nextPlan){t.nextPlan=time+1.4;t.cover=chooseTacticalCover(enemy,threat,obstacles,allies,segmentBox);if(t.cover){t.state='relocate';t.until=time+9;}}
  if(!t.cover)return null;
  if(t.state==='relocate'){
    if(distance(enemy,t.cover.hidden)<.48){t.state='cover';t.until=time+1.15+(enemy.id%4)*.23;}
    else if(time>t.until){t.cover=null;t.nextPlan=time+2;return null;}
  }else if(t.state==='cover'&&time>=t.until&&!underFire){t.state='peek';t.until=time+3.2;t.shots=0;}
  else if(t.state==='peek'&&(underFire||time>=t.until||t.shots>=2)){t.state='return';t.until=time+4;}
  else if(t.state==='return'){
    if(distance(enemy,t.cover.hidden)<.48){t.state='cover';t.until=time+1.25+(enemy.id%3)*.3;}
    else if(time>t.until){t.cover=null;t.nextPlan=time+1;return null;}
  }
  const point=t.state==='peek'?t.cover.peek:t.cover.hidden;
  return {point,stopDistance:.28,canFire:t.state==='peek'&&seen&&distance(enemy,point)<.65,state:t.state,
    crouched:!!t.cover.crouch&&t.state!=='peek',speedScale:underFire?1.15:1};
}
