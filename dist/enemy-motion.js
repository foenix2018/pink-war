const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function turnEnemy(enemy,target,dt){
 if(!Number.isFinite(target)||!(dt>0))return 0;
 if(!Number.isFinite(enemy.yaw)){enemy.yaw=target;enemy.turnRate=0;return 0;}
 const delta=Math.atan2(Math.sin(target-enemy.yaw),Math.cos(target-enemy.yaw));
 const rate=enemy.form==='brute'||enemy.form==='bulwark'?5.2:enemy.form==='spectre'?12:8.5;
 const step=clamp(delta*(1-Math.exp(-dt*16)),-rate*dt,rate*dt);enemy.yaw+=step;enemy.turnRate=step/dt;
 enemy.facingError=delta-step;return enemy.facingError;
}
export function strideFrame(vx,vz,yaw){
 const x=(vx||0)*Math.cos(yaw)-(vz||0)*Math.sin(yaw),z=(vx||0)*Math.sin(yaw)+(vz||0)*Math.cos(yaw);
 return {x,z,angle:Math.hypot(x,z)<.05?0:Math.atan2(x,-z)};
}
