// Local cover choices use only the last heard/seen position. No knowledge of a
// concealed player's live position, teleportation, or shots through walls.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function chooseTacticalCover(enemy,threat,obstacles,allies,segmentBox){
  const floor=enemy.elevation||0,r=enemy.radius||.65,margin=r+.23;
  const free=p=>obstacles.every(b=>b.walkableSurface||(b.y||0)+b.height<floor+.12||(b.y||0)>floor+1.9||Math.abs(p.x-b.x)>b.hx+r+.08||Math.abs(p.z-b.z)>b.hz+r+.08);
  const eye=p=>({x:p.x,y:floor+1.96,z:p.z});let best=null;
  const walls=obstacles.filter(w=>!w.walkableSurface&&(w.y||0)<=floor+.2&&(w.y||0)+w.height>=floor+2.12&&distance(enemy,w)<=22).sort((a,b)=>distance(enemy,a)-distance(enemy,b)).slice(0,20);
  for(const wall of walls){
    if(wall.walkableSurface||(wall.y||0)>floor+.2||(wall.y||0)+wall.height<floor+2.12||distance(enemy,wall)>22)continue;
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
        if(obstacles.some(b=>segmentBox(eye(peek),threat,b)!==null))continue;
        if(obstacles.some(b=>!b.walkableSurface&&segmentBox(eye(hidden),eye(peek),{...b,hx:b.hx+r+.07,hz:b.hz+r+.07})!==null))continue;
        if(allies.some(a=>a!==enemy&&a.tactics?.cover&&distance(a.tactics.cover.hidden,hidden)<2.2))continue;
        const score=travel+distance(hidden,peek)*1.4+Math.abs(range-17)*.15;
        if(!best||score<best.score)best={hidden,peek,score,wall};
      }
    }
  }
  return best;
}

export function tacticalOrder(enemy,{time,threat,seen,obstacles,allies,segmentBox}){
  if(enemy.form!=='synth')return null;
  const t=enemy.tactics||=( {state:'advance',cover:null,nextPlan:0,until:0,shots:0} );
  if(enemy.awareness==='patrol'||!Number.isFinite(threat?.x)||Math.abs((enemy.elevation||0)-(threat.y-1.25))>.7){t.cover=null;t.state='advance';return null;}
  const changed=t.cover&&segmentBox({x:t.cover.hidden.x,y:(enemy.elevation||0)+1.96,z:t.cover.hidden.z},threat,t.cover.wall)===null;
  if(changed){t.cover=null;t.nextPlan=time+.3;}
  if(!t.cover&&time>=t.nextPlan){t.nextPlan=time+1.4;t.cover=chooseTacticalCover(enemy,threat,obstacles,allies,segmentBox);if(t.cover){t.state='relocate';t.until=time+9;}}
  if(!t.cover)return null;
  if(t.state==='relocate'){
    if(distance(enemy,t.cover.hidden)<.48){t.state='cover';t.until=time+1.15+(enemy.id%4)*.23;}
    else if(time>t.until){t.cover=null;t.nextPlan=time+2;return null;}
  }else if(t.state==='cover'&&time>=t.until){t.state='peek';t.until=time+3.2;t.shots=0;}
  else if(t.state==='peek'&&(time>=t.until||t.shots>=2)){t.state='return';t.until=time+4;}
  else if(t.state==='return'){
    if(distance(enemy,t.cover.hidden)<.48){t.state='cover';t.until=time+1.25+(enemy.id%3)*.3;}
    else if(time>t.until){t.cover=null;t.nextPlan=time+1;return null;}
  }
  const point=t.state==='peek'?t.cover.peek:t.cover.hidden;
  return {point,stopDistance:.28,canFire:t.state==='peek'&&seen&&distance(enemy,point)<.65,state:t.state};
}
