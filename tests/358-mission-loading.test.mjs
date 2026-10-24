import test from 'node:test';
import assert from 'node:assert/strict';
import {createMissionLoading,missionPresentation} from '../dist/mission-loading.js';

function loadingDOM(t){
 const oldDocument=globalThis.document,oldRAF=globalThis.requestAnimationFrame,frames=[];
 const node=()=>({hidden:false,style:{setProperty(){}},attributes:{},setAttribute(k,v){this.attributes[k]=v;},querySelector(selector){return this.nodes[selector]||=(node());},nodes:{}});
 const document={querySelector:()=>true,createElement:node,body:{append(){}},head:{append(){}}};
 globalThis.document=document;globalThis.requestAnimationFrame=fn=>frames.push(fn);
 t.after(()=>{globalThis.document=oldDocument;globalThis.requestAnimationFrame=oldRAF;});
 return ()=>frames.shift()?.();
}

test('the mission cover stays until rendering completion is explicitly validated',async t=>{
 const nextFrame=loadingDOM(t),loading=createMissionLoading();loading.set(.58,'Surfaces');loading.set(.28);
 assert.equal(loading.progress,.58,'completed stages cannot move backward');assert.equal(loading.root.hidden,false);
 const complete=loading.finish();assert.equal(loading.finish(),complete,'only one completion sequence');
 assert.equal(loading.progress,1);assert.equal(loading.root.hidden,false);nextFrame();assert.equal(loading.root.hidden,false);
 nextFrame();assert.equal(await complete,true);assert.equal(loading.root.hidden,true);
});

test('a render failure during transition keeps a visible recovery screen',async t=>{
 const nextFrame=loadingDOM(t),loading=createMissionLoading();loading.set(.9);
 const complete=loading.finish();loading.fail('Rendu perdu');nextFrame();nextFrame();
 assert.equal(await complete,false);assert.equal(loading.root.hidden,false);
 assert.equal(loading.root.querySelector('.pw-load-error').hidden,false);
 assert.equal(loading.root.querySelector('.pw-load-state').textContent,'Rendu perdu');
});

test('a lost rendering context can recover the cover after the mission has started',async t=>{
 const nextFrame=loadingDOM(t),loading=createMissionLoading();const complete=loading.finish();nextFrame();nextFrame();await complete;
 loading.fail('Contexte perdu');loading.set(.1,'Faux succès');assert.equal(loading.root.hidden,false);
 assert.equal(loading.root.querySelector('.pw-load-state').textContent,'Contexte perdu');
});

test('mission presentation follows the chosen sibling and the actual chapter',()=>{
 const ghju=missionPresentation(1,'ghju'),lylu=missionPresentation(1,'lylu');
 assert.match(ghju.description,/frère/);assert.match(lylu.description,/sœur/);assert.notEqual(ghju.signal,lylu.signal);
 assert.match(lylu.image,/chargement-lylu/);assert.equal(missionPresentation(2).title,'Sous les Néons');
});
