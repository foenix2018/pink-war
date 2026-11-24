// Deterministic training sessions: count complete animated repetitions, no partial-set award.
export const FITNESS_PROGRAMS=Object.freeze({
 squat:Object.freeze({stat:'strength',label:'Squat barre',reps:10,duration:3.6,anchor:{x:6.85,z:5.4,yaw:Math.PI/2}}),
 dumbbells:Object.freeze({stat:'dexterity',label:'Curl haltères',reps:12,duration:3,anchor:{x:8.75,z:7.65,yaw:Math.PI/2}}),
 rower:Object.freeze({stat:'endurance',label:'Rameur',reps:15,duration:2.8,anchor:{x:7.30,z:10.14,yaw:-Math.PI/2}})
});
export const FITNESS_LABELS={strength:'Force',dexterity:'Habileté',endurance:'Endurance'};
export function createFitnessSession(id){const p=FITNESS_PROGRAMS[id];return p?{id,elapsed:0,reps:0,goal:p.reps,complete:false,claimed:false}:null;}
export function advanceFitness(session,dt){if(!session||session.complete)return session;const p=FITNESS_PROGRAMS[session.id];session.elapsed=Math.min(p.reps*p.duration,session.elapsed+Math.max(0,Math.min(.08,Number(dt)||0)));session.reps=Math.min(p.reps,Math.floor((session.elapsed+1e-7)/p.duration));session.complete=session.reps===p.reps;return session;}
export function claimFitness(session,profile){if(!session?.complete||session.claimed||!profile?.fitness)return 0;session.claimed=true;const key=FITNESS_PROGRAMS[session.id].stat,old=Math.max(0,Math.min(100,Number(profile.fitness[key])||0));profile.fitness[key]=Math.min(100,old+1);return profile.fitness[key]-old;}
