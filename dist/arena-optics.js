// Feathered optics work in both WebGL and WebGPU with ordinary materials.
export function createArenaOptics(T,{low=false}={}){
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x+.5)/size*2-1,v=(y+.5)/size;
  const alpha=Math.exp(-u*u*7)*Math.sin(Math.PI*v)**.5*Math.min(1,(1-v)*7);
  const k=(y*size+x)*4;data[k]=data[k+1]=data[k+2]=255;data[k+3]=Math.round(alpha*255);
 }
 const map=new T.DataTexture(data,size,size);map.needsUpdate=true;
 const beamMat=new T.MeshBasicMaterial({map,color:0xbad8ff,transparent:true,opacity:.065,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false});
 const beamGeo=new T.BufferGeometry();beamGeo.setAttribute('position',new T.Float32BufferAttribute([-.015,0,0,.015,0,0,-.13,1,0,.13,1,0],3));beamGeo.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,0,1,1,1],2));beamGeo.setIndex([0,1,2,2,1,3]);beamGeo.computeVertexNormals();
 const axis=new T.Vector3(),view=new T.Vector3(),right=new T.Vector3(),normal=new T.Vector3(),basis=new T.Matrix4();
 function searchlight(parent){const mesh=new T.Mesh(beamGeo,beamMat);mesh.name='Projecteur / diffusion dans la brume';mesh.userData.noWorldShadow=true;parent.add(mesh);return mesh;}
 function aim(mesh,origin,target,eye){
  axis.copy(target).sub(origin);const length=axis.length();if(length<.001){mesh.visible=false;return;}mesh.visible=true;axis.divideScalar(length);
  view.set(eye.x,eye.y??1.7,eye.z).sub(origin);right.crossVectors(axis,view);
  if(right.lengthSq()<1e-7)right.crossVectors(axis,Math.abs(axis.y)<.9?new T.Vector3(0,1,0):new T.Vector3(1,0,0));
  right.normalize();normal.crossVectors(right,axis).normalize();basis.makeBasis(right,axis,normal);
  mesh.position.copy(origin);mesh.quaternion.setFromRotationMatrix(basis);mesh.scale.set(length,length,1);
 }
 const coreGeo=new T.CylinderGeometry(1,1,1,low?6:8),coreMat=new T.MeshBasicMaterial({color:0xffb7bc,toneMapped:false});
 const glowMat=new T.MeshBasicMaterial({color:0xff2857,transparent:true,opacity:.14,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,toneMapped:false});
 const spotData=data.slice();for(let y=0;y<size;y++)for(let x=0;x<size;x++){const d=Math.hypot((x+.5)/size*2-1,(y+.5)/size*2-1);spotData[(y*size+x)*4+3]=Math.round(Math.max(0,Math.exp(-d*d*9)-Math.exp(-9))*255);}
 const spotMap=new T.DataTexture(spotData,size,size);spotMap.needsUpdate=true;
 const spotMat=new T.SpriteMaterial({map:spotMap,color:0xff5970,transparent:true,blending:T.AdditiveBlending,depthWrite:false,depthTest:true,toneMapped:false});
 const up=new T.Vector3(0,1,0),direction=new T.Vector3();
 function laser(parent){
  const group=new T.Group();group.name='Visée / cœur laser et diffusion';parent.add(group);group.visible=false;
  const core=new T.Mesh(coreGeo,coreMat),glow=new T.Mesh(coreGeo,glowMat),contact=new T.Sprite(spotMat);contact.scale.set(.16,.16,1);group.add(core,glow,contact);
  for(const o of [core,glow])o.userData.noWorldShadow=true;
  return {group,aim(origin,target){direction.copy(target).sub(origin);const length=direction.length();group.visible=length>.001;if(!group.visible)return;direction.divideScalar(length);for(const [o,r] of [[core,.006],[glow,.025]]){o.position.copy(origin).addScaledVector(direction,length/2);o.quaternion.setFromUnitVectors(up,direction);o.scale.set(r,length,r);}contact.position.copy(target).addScaledVector(direction,-.025);}};
 }
 let disposed=false;return {searchlight,aim,laser,dispose(){if(disposed)return;disposed=true;for(const o of [map,spotMap,beamMat,beamGeo,coreGeo,coreMat,glowMat,spotMat])o.dispose();}};
}
