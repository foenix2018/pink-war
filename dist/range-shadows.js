import {applyWorldShadows,createGroundOcclusion} from './world-shadows.js';
import {targetPosition} from './shooting-range.js';

export function rangeShadowBudget({low=false}={}){
  // Four 512² maps occupy the same texel budget as one outdoor 1024² map.
  return {size:low?512:1024,hz:low?6:10,lights:4};
}

// Indoor fixtures, not an outdoor sun shining through the roof. Static maps
// are cached; only fixtures near a moving target/player need another pass.
export function createRangeShadows(T,{root,lights,obstacles,low=false}){
  const budget=rangeShadowBudget({low}),occlusion=createGroundOcclusion(T,root,obstacles,{compact:low});
  let active=false,renderer=null,disposed=false,signature='',lastTime=-Infinity,passes=0;
  const history=new Map();
  for(const lamp of lights){
    lamp.castShadow=false;lamp.shadow.mapSize.set(budget.size,budget.size);
    lamp.shadow.camera.near=.15;lamp.shadow.camera.far=34;lamp.shadow.camera.updateProjectionMatrix();
    lamp.shadow.bias=-.00012;lamp.shadow.normalBias=.012;lamp.shadow.radius=2;
    lamp.shadow.autoUpdate=false;history.set(lamp,{last:-Infinity,moving:false,initialized:false});
  }
  applyWorldShadows(root);
  function setActive(value,instance=renderer){
    if(disposed)return;renderer=instance;value=!!value;
    if(value&&!active)for(const state of history.values()){state.last=-Infinity;state.initialized=false;}
    active=value;occlusion.root.visible=active;
    for(const lamp of lights)lamp.castShadow=active;
    if(active&&renderer)renderer.shadowMap.enabled=true;
  }
  function update(time,sim={},force=false){
    if(!active||disposed||!renderer)return;
    const targets=sim.targets||[],nextSignature=targets.map(t=>t.id).join(',');
    const changed=signature!==nextSignature;
    if(changed||time<lastTime||force){applyWorldShadows(root);signature=nextSignature;}
    for(const lamp of lights){
      const state=history.get(lamp),near=point=>Math.hypot(point.x-lamp.position.x,point.z-lamp.position.z)<13;
      const moving=!!sim.player&&near(sim.player)||targets.some(t=>near(targetPosition(t,time)));
      const due=force||!state.initialized||time<state.last||((moving||state.moving)&&(changed||time-state.last>=1/budget.hz));
      if(due){lamp.shadow.needsUpdate=true;renderer.shadowMap.needsUpdate=true;state.last=time;state.initialized=true;passes++;}
      state.moving=moving;
    }
    lastTime=time;
  }
  return {setActive,update,occlusion,lights,budget,
    stats:()=>({...budget,active,passes,occlusion:occlusion.stats()}),
    dispose(){if(disposed)return;disposed=true;active=false;occlusion.dispose();for(const lamp of lights){lamp.castShadow=false;lamp.shadow.dispose();}history.clear();}
  };
}
