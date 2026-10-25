import test from 'node:test';
import assert from 'node:assert/strict';
import {CampaignLevel1,LEVEL1} from '../dist/campaign-level1.js';
import {createLevel1Obstacles} from '../dist/level1-layout.js';
import {LEVEL1_STORY,createLevel1Story} from '../dist/level1-story.js';
import * as T from '../dist/vendor/three.webgpu.min.js';
const bodies=[[-6,61.65,1.65,.6,0,2.1,'power'],[0,54.45,2.6,.6,0,1.93,'archive'],[-21,19.45,2.6,.6,0,1.93,'investigation'],[5,-8.55,2.6,.6,0,1.93,'sabotage'],[18,-44.55,2.6,.6,4.8,1.93,'exit']].map(([x,z,w,d,y,height,campaignTerminal])=>({x,z,hx:w/2,hz:d/2,y,height,surface:'metal',campaign:true,campaignTerminal}));
test('the objective guide walks the physical rescue, shop, sabotage and stairs route without a wall crossing',()=>{
const mat=new T.MeshStandardMaterial(),story=createLevel1Story(T,new T.Group(),{steel:mat,rust:mat,dark:mat,plaster:mat});
const g=new CampaignLevel1([...createLevel1Obstacles(),...bodies,...story.colliders],()=>.5);g.invulnerable=1e6;g.enemies=[];g.openingSpawned=8;
for(const stage of ['approach','power','archive','investigation','crossing','sabotage','exit']){
 g.setStage(stage);let i=0,stale=0,last={x:g.player.x,z:g.player.z};
 while(i++<2400){
  if(g.getInteraction()?.id===stage || stage==='approach'&&g.getInteraction()?.id.startsWith('isolate-') || stage==='crossing'&&Math.hypot(g.player.x-18,g.player.z-6)<6.5)break;
  const h=g.guidance();if(!h)throw Error('no guidance '+stage+' at '+JSON.stringify(g.player));
  const dx=h.x-g.player.x,dz=h.z-g.player.z,n=Math.hypot(dx,dz);g.step(.05,{x:dx/(n||1),z:dz/(n||1),yaw:0});
  if(Math.hypot(g.player.x-last.x,g.player.z-last.z)<.001)stale++;else stale=0;last={x:g.player.x,z:g.player.z};
  if(stale>20)throw Error('stuck '+stage+' at '+JSON.stringify({p:last,h}));
 }
 if(i>=2400)throw Error('timeout '+stage+' at '+JSON.stringify(g.player));
 if(stage==='exit')assert.ok(Math.abs(g.player.elevation-4.8)<.01);
 assert.ok(i<500,'each leg has a finite traversable path');
}

});
