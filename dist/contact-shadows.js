// Soft grounding independent of shadow-map support; one draw call per pool.
export function contactShadowPose(entity,surfaceHeight,time=0){
  const elevation=entity.elevation||0;
  const floor=surfaceHeight(entity.x,entity.z,time,elevation+.08);
  const gap=Math.max(0,elevation-floor);
  return {x:entity.x,y:floor+.022,z:entity.z,visible:Number.isFinite(floor)&&gap<1.8,
    scale:1+Math.min(gap,1.8)*.22,strength:Math.max(0,1-gap/1.8)};
}
export function createContactShadows(T,parent,capacity=64){
  const size=64,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const r=Math.hypot((x+.5-size/2)/(size/2),(y+.5-size/2)/(size/2));
    const i=(y*size+x)*4;data[i]=5;data[i+1]=6;data[i+2]=14;
    data[i+3]=Math.round(150*Math.pow(Math.max(0,1-r*r),2));
  }
  const texture=new T.DataTexture(data,size,size);texture.needsUpdate=true;
  texture.magFilter=texture.minFilter=T.LinearFilter;
  const material=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  const geometry=new T.PlaneGeometry(1,1);geometry.rotateX(-Math.PI/2);
  const mesh=new T.InstancedMesh(geometry,material,capacity);mesh.name='Ombres de contact douces';
  mesh.count=0;mesh.frustumCulled=false;mesh.renderOrder=1;parent.add(mesh);
  const dummy=new T.Object3D();
  return {mesh,texture,update(items){let n=0;for(const p of items){if(n>=capacity)break;if(p.visible===false)continue;
    dummy.position.set(p.x,p.y??.022,p.z);dummy.scale.set(p.w??1.3,1,p.d??1);dummy.rotation.y=p.yaw||0;
    dummy.updateMatrix();mesh.setMatrixAt(n++,dummy.matrix);
  }mesh.count=n;mesh.instanceMatrix.needsUpdate=true;},clear(){mesh.count=0;},dispose(){parent.remove(mesh);geometry.dispose();material.dispose();texture.dispose();}};
}
