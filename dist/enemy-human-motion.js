import {HUMAN_REFERENCE} from './enemy-humanoid-data.js';
export {HUMAN_REFERENCE};
const lerp=(a,b,t)=>a+(b-a)*t;
export function sampleHumanStep(phase,runBlend,out){
 const walk=HUMAN_REFERENCE.walkRifle.samples,run=HUMAN_REFERENCE.run.samples,u=((phase/(Math.PI*2))%1+1)%1*walk.length,i=Math.floor(u),j=(i+1)%walk.length,t=u-i;
 for(let k=0;k<5;k++)out[k]=lerp(lerp(walk[i][k],walk[j][k],t),lerp(run[i][k],run[j][k],t),runBlend);
 const support=Math.min(out[0],out[2])*(1-runBlend);out[0]-=support;out[2]-=support;
 return out;
}
export function humanIdleBob(time){const m=HUMAN_REFERENCE.rifle,u=((time/m.duration)%1+1)%1*m.samples.length,i=Math.floor(u),j=(i+1)%m.samples.length;return lerp(m.samples[i][4],m.samples[j][4],u-i);}
