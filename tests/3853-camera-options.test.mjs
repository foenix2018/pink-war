import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {bindViewButton,normalizeView} from '../dist/view-options.js';

const source=name=>readFileSync(new URL('../dist/'+name+'.js',import.meta.url),'utf8');
const button=()=>({dataset:{},attributes:{},setAttribute(k,v){this.attributes[k]=v;}});
function missionControls(name,{view='fps',ready=true,xr=false}={}){
 const text=source(name),start=text.indexOf('function changeView('),end=text.indexOf('\nfunction ',start+1);
 const setView=text.slice(start,end);
 const wiring=text.match(/\n view:(\{getView:[^\n]+\}),\n/)[1];
 const saved=[],camera=[];
 const context={view,playerRig:ready?{}:null,xr:{active:xr},normalizeView,savePreferredView:value=>saved.push(value),snapCamera:()=>camera.push(1),notice(){}};
 vm.createContext(context);const options=vm.runInContext(setView+';('+wiring+')',context),el=button(),binding=bindViewButton(el,options);
 return {context,saved,camera,el,binding};
}

for(const name of ['niveau3','niveau4','niveau6','ligne9','couronne-helix']){
 test(name+': the actual options callback switches FPS → third person → FPS while paused',()=>{
  const c=missionControls(name);assert.equal(c.el.disabled,false);c.el.onclick();
  assert.equal(c.context.view,'third');assert.equal(c.el.attributes['aria-pressed'],'true');assert.match(c.el.textContent,/Passer en FPS/);
  c.el.onclick();assert.equal(c.context.view,'fps');assert.equal(c.el.attributes['aria-pressed'],'false');
  assert.deepEqual(c.saved,['third','fps']);assert.equal(c.camera.length,2);
 });
 test(name+': missing character cannot trap the player in third person; XR stays locked',()=>{
  const c=missionControls(name,{view:'third',ready:false});assert.equal(c.el.disabled,false);c.el.onclick();
  assert.equal(c.context.view,'fps');assert.equal(c.el.disabled,true);
  c.context.playerRig={};c.binding.refresh();assert.equal(c.el.disabled,false);c.el.onclick();assert.equal(c.context.view,'third');
  c.context.xr.active=true;c.binding.refresh();assert.equal(c.el.disabled,true);c.el.onclick();assert.equal(c.context.view,'third');
 });
}

test('mission 2 options allow returning to FPS without waiting for the character',()=>{
 const text=source('level2-test'),wiring=text.match(/\n view:(\{getView:[^\n]+\}),\n/)[1];
 const context={xr:null,view:'third',playerRig:null,changeView:next=>{context.view=normalizeView(next);}};vm.createContext(context);
 const options=vm.runInContext('('+wiring+')',context),el=button();bindViewButton(el,options);
 assert.equal(el.disabled,false);el.onclick();assert.equal(context.view,'fps');assert.equal(el.disabled,true);
});

test('mission 1 setter permits FPS without a loaded rig and preserves the XR guard',()=>{
 const text=source('vesper-combat'),setter=text.match(/    (setView\(next\)\{[^\n]+\}),/)[1],saved=[];
 const context={view:'third',rig:null,xr:{active:false},normalizeView,savePreferredView:v=>saved.push(v),syncCamera(){},getState:()=>({})};vm.createContext(context);
 const control=vm.runInContext('({'+setter+'})',context);
 assert.equal(control.setView('fps'),true);assert.equal(context.view,'fps');assert.deepEqual(saved,['fps']);
 assert.equal(control.setView('third'),false);context.rig={};assert.equal(control.setView('third'),true);
 context.xr.active=true;assert.equal(control.setView('fps'),false);
});
