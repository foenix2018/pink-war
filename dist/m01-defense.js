// Local orders for the authored opening posts. Perception, cover selection,
// body navigation and ballistics remain owned by the shared combat engine.
export function openingDefenseOrder(enemy,{seen,threat,time},alarm){
 const post=enemy.defense;if(!post||alarm||enemy.form==='probe')return null;
 const home={x:post.x,z:post.z},distance=Math.hypot(enemy.x-home.x,enemy.z-home.z);
 if(enemy.awareness==='patrol')return {point:home,stopDistance:.35,canFire:false,state:'watch',speedScale:.55,yaw:post.facing};
 if(post.role!=='anchor')return null;
 const range=Math.hypot(threat.x-home.x,threat.z-home.z);
 if(range<7||(enemy.suppressedUntil||0)>time)return null;
 // A gunner defends his installation, rather than automatically charging the
 // player. Heard contacts can be investigated nearby without revealing a new target.
 if(!seen&&range<16)return {point:{x:threat.x,z:threat.z},stopDistance:2,canFire:false,state:'investigate',speedScale:.65};
 return {point:home,stopDistance:.5,canFire:seen,state:distance>1?'redeploy':'anchor',speedScale:.8};
}
