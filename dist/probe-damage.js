// S-03: four independently damaged rotors shared by combat, flight and WebGPU.
export const PROBE_ROTORS=Object.freeze([
 Object.freeze({x:-.61,z:-.42}),Object.freeze({x:-.61,z:.42}),
 Object.freeze({x:.61,z:-.42}),Object.freeze({x:.61,z:.42})
]);
export const PROBE_ROTOR_HP=36;
export const probeRotorMaxHp=(wave=1,elite=false)=>Math.round(PROBE_ROTOR_HP*(1+(Math.max(1,wave)-1)*.055)*(elite?1.55:1));
export function probeRotorAt(enemy,index){
 const rotor=PROBE_ROTORS[index];
 if(!rotor)return null;
 const scale=enemy.elite?1.13:1,yaw=enemy.yaw||0,c=Math.cos(yaw),s=Math.sin(yaw);
 return {x:enemy.x+(rotor.x*c+rotor.z*s)*scale,y:(enemy.elevation||0)+.49*scale,z:enemy.z+(-rotor.x*s+rotor.z*c)*scale};
}
export function probeRotorIndex(enemy,point){
 let best=-1,d=Infinity;
 for(let i=0;i<PROBE_ROTORS.length;i++){const p=probeRotorAt(enemy,i),r=Math.hypot(point.x-p.x,point.y-p.y,point.z-p.z);if(r<d){best=i;d=r;}}
 return best;
}
export function probeFlightState(enemy){
 const lost=enemy.rotorDestroyed?.reduce((n,v)=>n+(v?1:0),0)||0;
 return {lost,crashing:lost>=2||!!enemy.crashing,speedScale:lost===1?.68:1,accuracy:lost===1?.75:0};
}
export function damageProbeRotor(enemy,index,damage,wave=1,time=0){
 if(!Number.isInteger(index)||index<0||index>=4)return {destroyed:false,lost:probeFlightState(enemy).lost};
 enemy.rotorDestroyed??=[false,false,false,false];
 enemy.rotorHp??=Array(4).fill(probeRotorMaxHp(wave,!!enemy.elite));
 if(enemy.rotorDestroyed[index])return {destroyed:false,lost:probeFlightState(enemy).lost};
 enemy.rotorHp[index]=Math.max(0,enemy.rotorHp[index]-Math.max(0,damage));
 const destroyed=enemy.rotorHp[index]===0;
 if(destroyed){enemy.rotorDestroyed[index]=true;enemy.lastRotorLostAt=time;}
 const lost=probeFlightState(enemy).lost;
 if(lost>=2&&!enemy.crashing){
   enemy.crashing=true;enemy.crashStartedAt=time;enemy.crashVelocityY=Math.min(0,enemy.verticalSpeed||0);
   enemy.chargeRemaining=0;enemy.chargeProgress=0;enemy.lockedTarget=null;
 }
 return {destroyed,lost,index};
}
