// Actual projectile trails, with a fixed budget of two instanced draws and three
// short-lived lights. No per-shot light allocation, shadows or full-screen bloom.
export const LASER_TRAILS=Object.freeze({
  r9:{radius:.008,length:1.9,light:105},bloom:{radius:.006,length:2.8,light:85},
  lance:{radius:.006,length:5.8,light:180},thorn:{radius:.008,length:4.4,light:210},
  nova:{radius:.030,length:1.35,light:240},aurora:{radius:.013,length:2.8,light:145}
});
export function createLaserFX(T,scene,palette={}) {
  const group=new T.Group();group.name='Laser cores, halos and pulse lights';scene.add(group);
  const accent=new T.Color(palette.rose??0xff80b2),history=new Map(),residuals=[];
  const geometry=new T.CylinderGeometry(1,1,1,8,1,false),capacity=96;
  const coreMaterial=new T.MeshBasicMaterial({color:0xfff5fc,toneMapped:false});
  const haloMaterial=new T.MeshBasicMaterial({color:accent,transparent:true,opacity:.28,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
  const core=new T.InstancedMesh(geometry,coreMaterial,capacity),halo=new T.InstancedMesh(geometry,haloMaterial,capacity);
  for(const mesh of [core,halo]){mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);group.add(mesh);}
  const lights=Array.from({length:3},()=>{const light=new T.PointLight(accent,0,7,2);light.castShadow=false;light.userData.life=0;group.add(light);return light;});
  const up=new T.Vector3(0,1,0),a=new T.Vector3(),b=new T.Vector3(),delta=new T.Vector3(),mid=new T.Vector3(),scale=new T.Vector3(),q=new T.Quaternion(),matrix=new T.Matrix4();
  let cursor=0,clock=0,disposed=false;
  function illuminate(p,energy,life=.09) {
    if(!p||![p.x,p.y,p.z].every(Number.isFinite))return;
    const light=lights[cursor++%lights.length];light.position.set(p.x,p.y,p.z);
    light.userData.life=life;light.userData.max=life;light.userData.energy=energy;light.intensity=energy;
  }
  function shot(event) {
    if(disposed||!event.origin)return;
    const p=LASER_TRAILS[event.weapon]||LASER_TRAILS.r9;
    history.set(event.bulletId,{...event.origin,weapon:event.weapon,at:clock});
    illuminate(event.origin,p.light*(event.power||1));
  }
  function impact(event) {
    if(disposed||event.hostile)return;
    const previous=history.get(event.bulletId),profile=LASER_TRAILS[event.weapon]||LASER_TRAILS.r9;
    if(previous){residuals.push({from:previous,to:{x:event.x,y:event.y,z:event.z},profile,life:.075});if(residuals.length>capacity)residuals.shift();history.delete(event.bulletId);}
    const normal=event.normal||{x:0,y:1,z:0};
    illuminate({x:event.x+normal.x*.08,y:event.y+normal.y*.08,z:event.z+normal.z*.08},profile.light*.7,.12);
  }
  function renderTrail(from,to,profile,index,fade=1) {
    a.set(from.x,from.y,from.z);b.set(to.x,to.y,to.z);delta.subVectors(b,a);
    let length=delta.length();if(length<.001)return index;
    delta.divideScalar(length);length=Math.min(length,profile.length);a.copy(b).addScaledVector(delta,-length);
    mid.addVectors(a,b).multiplyScalar(.5);q.setFromUnitVectors(up,delta);
    scale.set(profile.radius*fade,length,profile.radius*fade);matrix.compose(mid,q,scale);core.setMatrixAt(index,matrix);
    scale.set(profile.radius*3.2*fade,length,profile.radius*3.2*fade);matrix.compose(mid,q,scale);halo.setMatrixAt(index,matrix);return index+1;
  }
  function update(bullets=[],dt=0) {
    if(disposed)return;dt=Math.max(0,Math.min(.1,dt));clock+=dt;let count=0;
    for(const bullet of bullets) {
      if(bullet.hostile||count>=capacity)continue;
      const previous=history.get(bullet.id),origin=Number.isFinite(bullet.originX)?{x:bullet.originX,y:bullet.originY,z:bullet.originZ}:previous;
      if(origin)count=renderTrail(origin,bullet,LASER_TRAILS[bullet.weapon]||LASER_TRAILS.r9,count);
      history.set(bullet.id,{x:bullet.x,y:bullet.y,z:bullet.z,at:clock,weapon:bullet.weapon});
    }
    for(let i=residuals.length-1;i>=0;i--){const p=residuals[i];p.life-=dt;if(p.life<=0){residuals.splice(i,1);continue;}if(count<capacity)count=renderTrail(p.from,p.to,p.profile,count,p.life/.075);}
    for(const [id,p] of history)if(clock-p.at>3)history.delete(id);
    for(const mesh of [core,halo]){mesh.count=count;mesh.visible=count>0;mesh.instanceMatrix.needsUpdate=true;}
    for(const light of lights){light.userData.life=Math.max(0,light.userData.life-dt);light.intensity=light.userData.life?light.userData.energy*(light.userData.life/light.userData.max)**2:0;}
  }
  function reset(){history.clear();residuals.length=0;for(const m of [core,halo]){m.count=0;m.visible=false;}for(const light of lights){light.intensity=0;light.userData.life=0;}}
  return {shot,impact,update,reset,setAccent(color){accent.setHex(color);haloMaterial.color.copy(accent);for(const l of lights)l.color.copy(accent);},
    stats:()=>({trails:core.count,capacity,lightCount:lights.length,activeLights:lights.filter(l=>l.intensity>0).length,cachedProjectiles:history.size}),
    dispose(){if(disposed)return;disposed=true;reset();group.removeFromParent();core.dispose();halo.dispose();geometry.dispose();coreMaterial.dispose();haloMaterial.dispose();}
  };
}
