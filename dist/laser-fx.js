// Actual projectile trails, with a fixed budget of two instanced draws and three
// short-lived lights. No per-shot light allocation, shadows or full-screen bloom.
export const LASER_TRAILS=Object.freeze({
  r9:{radius:.008,length:1.9,light:105},bloom:{radius:.006,length:2.8,light:85},
  lance:{radius:.006,length:5.8,light:180},thorn:{radius:.008,length:4.4,light:210},
  nova:{radius:.030,length:1.35,light:240},aurora:{radius:.013,length:2.8,light:145}
});
// Approximate diameter (m) of the illuminated point of contact.
export const IMPACT_GLOW=Object.freeze({
  r9:.18,bloom:.21,lance:.44,thorn:.68,nova:1.30,aurora:.40
});
export function createLaserFX(T,scene,palette={}) {
  const group=new T.Group();group.name='Laser cores, halos and pulse lights';scene.add(group);
  const accent=new T.Color(palette.rose??0xff80b2),history=new Map(),residuals=[];
  const geometry=new T.CylinderGeometry(1,1,1,8,1,false),capacity=96;
  const coreMaterial=new T.MeshBasicMaterial({color:0xfff5fc,toneMapped:false});
  const haloMaterial=new T.MeshBasicMaterial({color:accent,transparent:true,opacity:.28,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
  const core=new T.InstancedMesh(geometry,coreMaterial,capacity),halo=new T.InstancedMesh(geometry,haloMaterial,capacity);
  for(const mesh of [core,halo]){mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);group.add(mesh);}
  const lights=Array.from({length:3},()=>{const light=new T.PointLight(accent,0,5,2);light.castShadow=false;light.userData.life=0;group.add(light);return light;});
  // Moving luminous footprint beneath each laser projectile, like a colored
  // shadow cast on the pavement. Fixed instanced budget; no actual shadow maps.
  const glowSize=64,texels=new Uint8Array(glowSize*glowSize*4);
  for(let y=0;y<glowSize;y++)for(let x=0;x<glowSize;x++){
    const dx=(x+.5-glowSize/2)/(glowSize/2),dy=(y+.5-glowSize/2)/(glowSize/2);
    const r=Math.hypot(dx,dy),falloff=Math.max(0,Math.exp(-r*r*5.2)-Math.exp(-5.2));
    const i=(y*glowSize+x)*4;texels[i]=255;texels[i+1]=255;texels[i+2]=255;
    texels[i+3]=Math.round(240*falloff);
  }
  const footprintTexture=new T.DataTexture(texels,glowSize,glowSize,T.RGBAFormat);footprintTexture.needsUpdate=true;
  const footprintMaterial=new T.MeshBasicMaterial({map:footprintTexture,color:0xffffff,transparent:true,
    depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,
    blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false,fog:false});
  const footprintGeometry=new T.PlaneGeometry(1,1);footprintGeometry.rotateX(-Math.PI/2);
  const footprintCapacity=20,footprints=new T.InstancedMesh(footprintGeometry,footprintMaterial,footprintCapacity);
  footprints.name='Laser / taches de lumière projetées au sol';
  footprints.frustumCulled=false;footprints.count=0;footprints.visible=false;
  footprints.instanceMatrix.setUsage(T.DynamicDrawUsage);group.add(footprints);
  const footprintColor=new T.Color(),footprintRotation=new T.Quaternion(),footprintPos=new T.Vector3(),footprintScale=new T.Vector3(),footprintMatrix=new T.Matrix4();
  const groundAfterglow=[];
  // Contact glow lies on the STRUCK surface itself, not on the ground only:
  // a cylinder of plasma on concrete, metal, robot armor, or a moving target.
  // Two instanced batches: feathered colored corona + tiny white-hot center.
  const contactCapacity=28,contactGeometry=new T.PlaneGeometry(1,1);
  const contactOuterMaterial=new T.MeshBasicMaterial({map:footprintTexture,color:0xffffff,
    transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,
    blending:T.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,toneMapped:false});
  const contactInnerMaterial=contactOuterMaterial.clone();
  const contactOuter=new T.InstancedMesh(contactGeometry,contactOuterMaterial,contactCapacity);
  const contactInner=new T.InstancedMesh(contactGeometry,contactInnerMaterial,contactCapacity);
  for(const [i,mesh] of [contactOuter,contactInner].entries()){
    mesh.name=i?'Laser / cœur blanc incandescent sur impact':'Laser / point d impact lumineux coloré sur surface';
    mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);group.add(mesh);
  }
  const contactMarks=[];
  const normalAxis=new T.Vector3(0,0,1),contactNormal=new T.Vector3(),
    contactPosition=new T.Vector3(),contactQuaternion=new T.Quaternion(),contactScale=new T.Vector3(),
    contactMatrix=new T.Matrix4(),contactTint=new T.Color(),contactWhite=new T.Color(0xfff9ef);

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
    // A muzzle a few decimetres from a wall must not flood it: the flash is a fraction of the impact light.
    illuminate(event.origin,p.light*.28*(event.power||1),.06);
  }
  function impact(event) {
    if(disposed||event.hostile)return;
    const previous=history.get(event.bulletId),profile=LASER_TRAILS[event.weapon]||LASER_TRAILS.r9;
    if(previous){residuals.push({from:previous,to:{x:event.x,y:event.y,z:event.z},profile,life:.075});if(residuals.length>capacity)residuals.shift();history.delete(event.bulletId);}
    const normal=event.normal||{x:0,y:1,z:0};
    illuminate({x:event.x+normal.x*.08,y:event.y+normal.y*.08,z:event.z+normal.z*.08},profile.light*.5,.12);
    if([event.x,event.y,event.z].every(Number.isFinite)){
      const raw=event.normal;
      contactNormal.set(raw?.x??-event.direction?.x??0,raw?.y??-event.direction?.y??1,raw?.z??-event.direction?.z??0);
      if(!Number.isFinite(contactNormal.lengthSq())||contactNormal.lengthSq()<1e-5)contactNormal.set(0,1,0);
      contactNormal.normalize();
      const diameter=(IMPACT_GLOW[event.weapon]||IMPACT_GLOW.r9)*
        Math.max(.68,Math.min(1.6,Number(event.power)||1))*
        (1+Math.min(5,Math.max(0,event.splash||0))*.075);
      contactMarks.push({x:event.x+contactNormal.x*.017,y:event.y+contactNormal.y*.017,z:event.z+contactNormal.z*.017,
        nx:contactNormal.x,ny:contactNormal.y,nz:contactNormal.z,
        diameter,life:event.surface==='robot'?.19:.42,max:event.surface==='robot'?.19:.42});
      if(contactMarks.length>contactCapacity)contactMarks.shift();
    }
    if(event.y>=-.15&&event.y<2.6){
      groundAfterglow.push({x:event.x,z:event.z,size:Math.min(2.4,.65+profile.radius*12),life:.19,max:.19});
      if(groundAfterglow.length>footprintCapacity)groundAfterglow.shift();
    }
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
    // Render live moving glows directly below laser projectiles. Height controls
    // spread and intensity: near-ground shots cast tight, saturated pools.
    let projected=0;
    const paint=(x,z,diameter,strength)=>{
      if(projected>=footprintCapacity)return;
      footprintPos.set(x,.035,z);footprintScale.set(diameter,diameter,1);
      footprintMatrix.compose(footprintPos,footprintRotation,footprintScale);
      footprints.setMatrixAt(projected,footprintMatrix);
      footprintColor.copy(accent).multiplyScalar(strength);
      footprints.setColorAt(projected,footprintColor);projected++;
    };
    for(const bullet of bullets){
      if(bullet.hostile||!Number.isFinite(bullet.y)||bullet.y<0||projected>=footprintCapacity)continue;
      const height=Math.max(0,bullet.y);
      const diameter=Math.min(2.75,.8+height*.36+(bullet.weapon==='nova'?.5:0));
      paint(bullet.x,bullet.z,diameter,Math.max(.22,1.4-height*.16));
    }
    for(let i=groundAfterglow.length-1;i>=0;i--){
      const g=groundAfterglow[i];g.life-=dt;
      if(g.life<=0){groundAfterglow.splice(i,1);continue;}
      paint(g.x,g.z,g.size*(1+(1-g.life/g.max)*.35),g.life/g.max);
    }
    footprints.count=projected;footprints.visible=projected>0;
    footprints.instanceMatrix.needsUpdate=true;
    if(footprints.instanceColor)footprints.instanceColor.needsUpdate=true;
    let countContacts=0;
    for(let i=contactMarks.length-1;i>=0;i--){
      const mark=contactMarks[i];mark.life-=dt;
      if(mark.life<=0){contactMarks.splice(i,1);continue;}
      const fade=mark.life/mark.max;
      contactPosition.set(mark.x,mark.y,mark.z);
      contactNormal.set(mark.nx,mark.ny,mark.nz);
      contactQuaternion.setFromUnitVectors(normalAxis,contactNormal);
      for(const [mesh,radius,tint,brightness] of [
        [contactOuter,mark.diameter*(1+.35*(1-fade)),accent,.9*fade],
        [contactInner,mark.diameter*.28,contactWhite,1.5*fade]]){
        contactScale.set(radius,radius,1);
        contactMatrix.compose(contactPosition,contactQuaternion,contactScale);
        mesh.setMatrixAt(countContacts,contactMatrix);
        contactTint.copy(tint).multiplyScalar(brightness);
        mesh.setColorAt(countContacts,contactTint);
      }
      countContacts++;
    }
    for(const mesh of [contactOuter,contactInner]){
      mesh.count=countContacts;mesh.visible=countContacts>0;
      if(countContacts){mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;}
    }
    for(const light of lights){light.userData.life=Math.max(0,light.userData.life-dt);light.intensity=light.userData.life?light.userData.energy*(light.userData.life/light.userData.max)**2:0;}
  }
  function reset(){history.clear();residuals.length=0;groundAfterglow.length=0;contactMarks.length=0;for(const m of [contactOuter,contactInner]){m.count=0;m.visible=false;}footprints.count=0;footprints.visible=false;for(const m of [core,halo]){m.count=0;m.visible=false;}for(const light of lights){light.intensity=0;light.userData.life=0;}}
  return {shot,impact,update,reset,setAccent(color){accent.setHex(color);haloMaterial.color.copy(accent);for(const l of lights)l.color.copy(accent);},
    stats:()=>({trails:core.count,capacity,groundGlows:footprints.count,impactGlows:contactOuter.count,lightCount:lights.length,activeLights:lights.filter(l=>l.intensity>0).length,cachedProjectiles:history.size}),
    dispose(){if(disposed)return;disposed=true;reset();group.removeFromParent();core.dispose();halo.dispose();footprints.dispose();contactOuter.dispose();contactInner.dispose();contactGeometry.dispose();contactOuterMaterial.dispose();contactInnerMaterial.dispose();footprintGeometry.dispose();footprintMaterial.dispose();footprintTexture.dispose();geometry.dispose();coreMaterial.dispose();haloMaterial.dispose();}
  };
}
