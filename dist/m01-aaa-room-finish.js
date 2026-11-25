// Baked, cheap contact and traffic-wear layer for the existing M01 room floors.
// Original procedural texture, no lights, obstacles or additional world pass.
export function roomFinishPlan(rooms){
 return rooms.filter(r=>r.ceiling>0).map(r=>({id:r.id,x:(r.x1+r.x2)/2,z:(r.z1+r.z2)/2,w:r.x2-r.x1-.04,d:r.z2-r.z1-.04}));
}
export function createM01RoomFinish(T,parent,rooms,{low=false}={}){
 const plan=roomFinishPlan(rooms),size=low?128:256,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x+.5)/size,v=(y+.5)/size,edge=Math.min(u,1-u,v,1-v),border=Math.exp(-edge*23);
  const mottled=(Math.sin(u*41+Math.cos(v*27))*Math.sin(v*37+Math.sin(u*28))+.8)*.025;
  const track=Math.exp(-Math.abs(u-.38)*35)*.035+Math.exp(-Math.abs(u-.62)*35)*.035;
  const i=(y*size+x)*4;data[i]=20;data[i+1]=19;data[i+2]=18;data[i+3]=Math.round(255*Math.min(.25,Math.max(0,border*.19+mottled+track)));
 }
 const map=new T.DataTexture(data,size,size,T.RGBAFormat);map.colorSpace=T.SRGBColorSpace;map.magFilter=T.LinearFilter;map.minFilter=T.LinearFilter;map.needsUpdate=true;
 const geometry=new T.PlaneGeometry(1,1).rotateX(-Math.PI/2),material=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const mesh=new T.InstancedMesh(geometry,material,plan.length);mesh.name='M01 / ombres de contact et usure des sols';
 const matrix=new T.Matrix4();plan.forEach((r,i)=>{matrix.makeScale(r.w,1,r.d);matrix.setPosition(r.x,.012,r.z);mesh.setMatrixAt(i,matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();parent.add(mesh);
 return {stats:()=>({rooms:plan.length,drawCalls:1,triangles:2*plan.length,textureBytes:data.byteLength,colliders:0}),dispose(){mesh.removeFromParent();geometry.dispose();material.dispose();map.dispose();}};
}
