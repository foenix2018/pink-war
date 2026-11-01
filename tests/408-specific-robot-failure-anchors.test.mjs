import test from 'node:test';
import assert from 'node:assert/strict';
import {electricFailureAnchor,ROBOT_FAILURE_CONTACTS,robotFailureCategory,robotDeathDuration,enemyDamageStage,SHUTDOWN_CUES} from '../dist/enemy-destruction-fx.js';
import {readFileSync} from 'node:fs';
const read=n=>readFileSync(new URL('../dist/'+n,import.meta.url),'utf8');

test('RECO1, Brute and Rampart have unique accurate optical, reactor and actuator sites',()=>{
 const expected={seer:{label:'RECO1',head:1.69},brute:{label:'BRUTE',head:2.05},bulwark:{label:'REMPART',head:1.738}};
 const signatures=new Set();
 for(const [form,v] of Object.entries(expected)){
  assert.equal(robotFailureCategory(form),v.label);
  const anchors=Array.from({length:5},(_,slot)=>electricFailureAnchor({form,x:0,z:0,elevation:0},slot));
  assert.ok(Math.abs(anchors[1].y-v.head)<.001,form+' optical head height');
  assert.ok(anchors[0].y<anchors[1].y,form+' chest below optics');
  assert.ok(anchors[2].x<0&&anchors[3].x>0,form+' side actuators');
  assert.ok(anchors[4].z<0,form+' armed side exposed');
  signatures.add(JSON.stringify(anchors));
 }
 assert.equal(signatures.size,3,'independent rig calibrations');
 assert.equal(ROBOT_FAILURE_CONTACTS.sentinel[1][1],4.04,'large Sentinel head is not humanoid height');
});
test('positions use actual model localToWorld including elite scale and yaw, not rough world offsets',()=>{
 const model={position:{x:12,y:2,z:-8},scale:1.3,yaw:Math.PI/2,
   localToWorld(p){
    const x=p.x*this.scale,z=p.z*this.scale;
    return {x:this.position.x+Math.cos(this.yaw)*x+Math.sin(this.yaw)*z,y:this.position.y+p.y*this.scale,z:this.position.z-Math.sin(this.yaw)*x+Math.cos(this.yaw)*z};
   }};
 const scratch={set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}};
 const eye=electricFailureAnchor({form:'seer',x:1,z:1,elite:true},1,model,scratch);
 assert.ok(Math.abs(eye.x-11.857)<.001);
 assert.ok(Math.abs(eye.y-(2+1.69*1.3))<.001);
 assert.ok(Math.abs(eye.z+8)<.001);
 assert.equal(electricFailureAnchor({form:'seer',x:12,z:-8,elevation:2,elite:true,yaw:Math.PI/2},1).y,2+1.69*1.3);
});
test('robot stage progression, death pacing and explosion timing remain intact',()=>{
 const samples=[100,70,45,25,8].map(hp=>enemyDamageStage(hp,100));
 assert.deepEqual(samples.map(x=>x.stage),[0,1,2,3,4]);
 assert.ok(robotDeathDuration('probe')<robotDeathDuration('seer'));
 assert.ok(robotDeathDuration('seer')<robotDeathDuration('brute'));
 assert.equal(SHUTDOWN_CUES.length,5);
});
test('true combat models expose unique optical materials and correct form keys',()=>{
 const factory=read('enemies.js'),reco=read('reco1.js'),rem=read('enemy-rempart.js');
 assert.match(factory,/if\(form==='seer'\)return createReco1/);
 assert.match(factory,/if\(form==='bulwark'\)return createRempart/);
 assert.match(factory,/root\.userData\.optics=eyeMaterial/);
 assert.match(reco,/root\.userData\.optics=materials\.find/);
 assert.match(rem,/optics:materials\.eye/);
 const fx=read('enemy-destruction-fx.js');
 assert.match(fx,/electricFailureAnchor\(e,\(i\+stage\.stage\)%5,model,anchorScratch\)/);
 assert.match(fx,/electricBurst\(origin,low\?8:16,\.17,d\.model\)/);
 assert.match(fx,/particles\.length>=budget/);
});
