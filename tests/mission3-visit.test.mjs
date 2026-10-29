import test from 'node:test';
import assert from 'node:assert/strict';
import {M03_STEPS,createMission3Visit} from '../dist/mission3-visit.js';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../dist/'+path,import.meta.url),'utf8');
const makeDocument=()=>{
 const node=()=>({children:[],style:{},classList:{add(){}},appendChild(child){this.children.push(child);return child},setAttribute(){},querySelector(){return null},querySelectorAll(){return []}});
 return {createElement(){return node()},body:node(),head:node(),querySelector(){return null},title:''};
};
test('mission 03 includes four ordered terminals in different districts',()=>{
 assert.equal(M03_STEPS.length,4);
 assert.equal(new Set(M03_STEPS.map(step=>step.action)).size,4);
 assert.ok(M03_STEPS.some(p=>p.y>0),'high A3 archive is required');
});
test('mission 03 cannot be skipped and completes only at the fourth station',()=>{
 const doc=makeDocument(),previous=globalThis.document;
 globalThis.document=doc;
 try{
  let complete=0,boxes=0,lines=0;
  const interactions=[{action:'old-campaign-terminal'}];
  const manager=createMission3Visit({document:doc,mesh:{box(){boxes++},line(){lines++}},interactions,onFinish(){complete++}});
  assert.equal(interactions.length,4,'M03 replaces M01 objectives for this route only');
  manager.decorate();manager.configure();
  assert.ok(boxes>50);assert.ok(lines>0);
  assert.equal(manager.interact(interactions[3]).accepted,false,'cannot skip to the portal');
  for(let i=0;i<3;i++){assert.equal(manager.interact(interactions[i]).accepted,true);assert.equal(manager.progress(),i+1);}
  assert.equal(complete,0);assert.equal(manager.interact(interactions[0]).accepted,false,'cannot repeat a completed terminal');
  assert.equal(manager.interact(interactions[3]).accepted,true);assert.equal(manager.finished,true);assert.equal(complete,1);
  assert.equal(manager.interact(interactions[3]).accepted,false,'cannot complete twice');
  assert.equal(doc.body.children.length,1,'finale is mounted');
 }finally{globalThis.document=previous;}
});
test('the level 1 canonical path remains distinct from the new M03 scene',()=>{
 const html=read('vesper-level1-v7.html');
 assert.match(html,/get\('chapter'\)==='3'/);
 assert.match(html,/if\(isChapter3\)m01ArchitectureFinish\(\)/);
 assert.match(html,/if\(!referenceVisit\)\{/);
 assert.match(html,/mission3=createMission3Visit/);
 assert.doesNotMatch(read('mission3-visit.js'),/import .*soldier|import .*characters|import .*hands|import .*weapons/);
});
test('mission 03 can be launched from the story menu and the M02 finale',()=>{
 const entry=read('entry.js'),menu=read('index.html'),story=read('story-chapters.js');
 assert.match(menu,/data-chapter="campaign3"/);
 assert.match(entry,/if\(mode==='campaign3'\)/);
 assert.match(entry,/searchParams\.set\('chapter','3'\)/);
 assert.match(story,/chapter=3&character=/);
});
