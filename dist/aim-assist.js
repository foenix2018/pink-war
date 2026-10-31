import {segmentBox,traceEnemyHit} from './game-logic.js';
import {enemyScale} from './enemy-combat.js';
const normalize=v=>{const n=Math.hypot(v.x,v.y,v.z)||1;return {x:v.x/n,y:v.y/n,z:v.z/n};};
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const blocked=(a,b,obstacles)=>obstacles.some(o=>segmentBox(a,b,o)!==null);
// Tiny projectile correction only. No camera motion, headshot lock or hidden target.
export function assistedAim({camera,forward,origin,direction,enemies=[],obstacles=[],touch=false,enabled=true}){
 if(!enabled||!enemies.length)return direction;
 const f=normalize(forward),end={x:camera.x+f.x*60,y:camera.y+f.y*60,z:camera.z+f.z*60};
 let limit=1;for(const o of obstacles){const h=segmentBox(camera,end,o);if(h!==null)limit=Math.min(limit,h);}
 if(enemies.some(e=>{const h=traceEnemyHit(camera,end,e);return h&&h.t<limit;}))return direction;
 const cone=(touch?2.2:1.4)*Math.PI/180;let best=null,bestScore=-Infinity;
 for(const e of enemies){if(!(e.hp>0))continue;const scale=enemyScale(e.form,e.elite)*(e.roomScale||1);const center={x:e.x,y:(e.elevation||0)+(e.form==='probe'?.55:e.form==='scuttler'?.79:1.27)*scale,z:e.z};const delta=sub(center,camera),distance=Math.hypot(delta.x,delta.y,delta.z);if(distance<2||distance>55)continue;const cosine=dot(normalize(delta),f);if(cosine<Math.cos(cone)||blocked(camera,center,obstacles)||blocked(origin,center,obstacles))continue;const score=cosine-distance*.000001;if(score>bestScore){bestScore=score;best=center;}}
 if(!best)return direction;
 const from=normalize(direction),to=normalize(sub(best,origin)),angle=Math.acos(Math.max(-1,Math.min(1,dot(from,to))));if(angle<.000001)return direction;
 const fraction=Math.min(touch?.24:.18,((touch?.45:.28)*Math.PI/180)/angle);
 const result=normalize({x:from.x+(to.x-from.x)*fraction,y:from.y+(to.y-from.y)*fraction,z:from.z+(to.z-from.z)*fraction});
 // The corrected ray must still have clear space up to the candidate's depth.
 const d=Math.hypot(best.x-origin.x,best.y-origin.y,best.z-origin.z);const endpoint={x:origin.x+result.x*d,y:origin.y+result.y*d,z:origin.z+result.z*d};
 return blocked(origin,endpoint,obstacles)?direction:result;
}
export function firingView(fov,blend,ads=0){const t=Math.max(0,Math.min(1,blend));return {fov:fov*(1-.045*t*(1-.8*ads)),x:-.012*t*(1-ads),y:.012*t*(1-ads),z:.018*t*(1-ads)};}
