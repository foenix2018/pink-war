import test from 'node:test';
import assert from 'node:assert/strict';
import {ghjuFemininePoint,FIT_PROFILE} from '../dist/ghju-feminine-fit.js';
test('identity, body height, head, hands and feet unaffected',()=>{
 const ref=[.18,1.15,-.13];assert.deepEqual(ghjuFemininePoint(...ref,0),ref);
 for(const y of [.05,.18,1.72,1.81]){
  const point=[.18,y,-.13];assert.deepEqual(ghjuFemininePoint(...point,1),point);
 }
 assert.equal(ghjuFemininePoint(.15,1.15,-.1,1)[1],1.15);
});
test('feminine shape narrows shoulders and waist, widens hips and thighs',()=>{
 assert.ok(ghjuFemininePoint(.25,1.52,-.1,1)[0]<.25);
 assert.ok(ghjuFemininePoint(.20,1.165,-.1,1)[0]<.20);
 assert.ok(ghjuFemininePoint(.20,.96,-.1,1)[0]>.20);
 assert.ok(ghjuFemininePoint(.15,.68,-.1,1)[0]>.15);
 const left=ghjuFemininePoint(-.20,.96,-.1,1)[0],right=ghjuFemininePoint(.20,.96,-.1,1)[0];
 assert.ok(Math.abs(left+right)<1e-8,'bilateral symmetry');
});
test('upper chest increases forward curvature moderately; effect scales smoothly',()=>{
 const p=[.11,1.44,-.17];
 assert.ok(ghjuFemininePoint(...p,1)[2]<p[2]);
 const a=ghjuFemininePoint(...p,.5),b=ghjuFemininePoint(...p,1);
 assert.ok(a[2]>b[2]&&a[2]<p[2]);
 assert.equal(FIT_PROFILE.head,undefined);
});
