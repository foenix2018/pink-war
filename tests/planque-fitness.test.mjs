import test from 'node:test';import assert from 'node:assert/strict';import {createFitnessSession,advanceFitness,claimFitness,FITNESS_PROGRAMS,fitnessBonuses} from '../dist/hideout-fitness.js';import {freshHideoutProfile,readHideoutProfile,saveHideoutProfile,applyHideoutPreparation} from '../dist/hideout-state.js';
test('complete cycles only, exactly one stat point per full set, no duplicate claims',()=>{for(const id of Object.keys(FITNESS_PROGRAMS)){const s=createFitnessSession(id),p=freshHideoutProfile(),program=FITNESS_PROGRAMS[id];advanceFitness(s,.08);assert.equal(claimFitness(s,p),0);for(let i=0;i<Math.ceil(program.reps*program.duration/.05)+2;i++)advanceFitness(s,.05);assert.equal(s.reps,program.reps);assert.ok(s.complete);assert.equal(claimFitness(s,p),1);assert.equal(p.fitness[program.stat],1);assert.equal(claimFitness(s,p),0);}});
test('fitness persists per hero and caps at 100',()=>{const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};const p=freshHideoutProfile();p.fitness.strength=100;const s=createFitnessSession('squat');s.complete=true;assert.equal(claimFitness(s,p),0);saveHideoutProfile('lylu',p,storage);assert.equal(readHideoutProfile('lylu',storage).fitness.strength,100);assert.equal(readHideoutProfile('ghju',storage).fitness.strength,0);});

test('fitness benefits are monotonic, bounded and neutral at zero',()=>{
 assert.deepEqual(fitnessBonuses(),{meleeMultiplier:1,reloadMultiplier:1,sprintMultiplier:1});
 assert.deepEqual(fitnessBonuses({strength:500,dexterity:100,endurance:100}),{meleeMultiplier:1.15,reloadMultiplier:.88,sprintMultiplier:1.08});
 const mid=fitnessBonuses({strength:50,dexterity:50,endurance:50});assert.ok(mid.meleeMultiplier>1&&mid.reloadMultiplier<1&&mid.sprintMultiplier>1);
});
test('saved fitness reaches campaign only, including a direct mission start',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const p=freshHideoutProfile();p.fitness={strength:80,dexterity:40,endurance:60};saveHideoutProfile('lylu',p,storage);
 const campaign={mode:'campaign',characterId:'lylu',nanoWeapons:[],missionLevel:1};
 applyHideoutPreparation(campaign,{storage});assert.deepEqual(campaign.fitnessBonuses,fitnessBonuses(p.fitness));
 for(const mode of ['arena','campaign']){const game={mode,characterId:'lylu',nanoWeapons:[],inHideout:mode==='campaign'};applyHideoutPreparation(game,{storage});assert.equal(game.fitnessBonuses,undefined);}
});
