// A fixed pair of instanced 3D batches: electric cores and their additive corona.
// No per-frame geometry allocation, screen overlays or extra shadow lights.
export function createIEMEffects(T,scene){
 const root=new T.Group();root.name='VOLTIS IEM / electrical immobilisation';scene.add(root);
 const geometry=new T.CylinderGeometry(1,1,1,6),capacity=192;
 const coreMaterial=new T.MeshBasicMaterial({color:0xc7f7ff,toneMapped:false});
 const haloMaterial=new T.MeshBasicMaterial({color:0x32baff,transparent:true,opacity:.24,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
 const core=new T.InstancedMesh(geometry,coreMaterial,capacity),halo=new T.InstancedMesh(geometry,haloMaterial,capacity);
 for(const mesh of [core,halo]){mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(mesh);}
 const up=new T.Vector3(0,1,0),a=new T.Vector3(),b=new T.Vector3(),delta=new T.Vector3(),mid=new T.Vector3(),scale=new T.Vector3(),q=new T.Quaternion(),matrix=new T.Matrix4();
 let count=0,targets=0;
 function segment(start,end,radius){
  if(count>=capacity)return;delta.subVectors(end,start);const length=delta.length();if(length<.0001)return;
  mid.addVectors(start,end).multiplyScalar(.5);q.setFromUnitVectors(up,delta.divideScalar(length));
  scale.set(radius,length,radius);matrix.compose(mid,q,scale);core.setMatrixAt(count,matrix);
  scale.set(radius*3.2,length,radius*3.2);matrix.compose(mid,q,scale);halo.setMatrixAt(count,matrix);count++;
 }
 return {update(game){
   count=targets=0;const time=game?.time||0;
   for(const e of game?.enemies||[]){
    if(!(e.iemUntil>time)||e.hp<=0||targets>=6)continue;targets++;
    const height=Math.max(.6,Math.min(3,(e.aimHeight||1.15)*1.5)),width=Math.max(.2,Math.min(.7,(e.radius||.5)*.65)),phase=Math.floor(time*12)*.73+(e.id||0)*1.71;
    const strength=Math.min(1,(e.iemUntil-time)*3),radius=(.0035+.001*Math.sin(time*45))*strength;
    for(let branch=0;branch<3;branch++){
     for(let i=0;i<8;i++){
      const u=i/7,angle=u*8+branch*2.1,noise=Math.sin(phase+i*17+branch*13);
      b.set(e.x+Math.cos(angle)*width+noise*.05,(e.elevation||0)+.12+u*height,(e.z||0)+Math.sin(angle)*width*.7+Math.cos(phase+i*7)*.035);
      if(i)segment(a,b,radius);a.copy(b);
     }
    }
   }
   for(const mesh of [core,halo]){mesh.count=count;mesh.visible=count>0;if(count)mesh.instanceMatrix.needsUpdate=true;}
  },reset(){count=targets=0;for(const mesh of [core,halo]){mesh.count=0;mesh.visible=false;}},
  stats:()=>({targets,segments:count,capacity,draws:count?2:0}),
  dispose(){root.removeFromParent();core.dispose();halo.dispose();geometry.dispose();coreMaterial.dispose();haloMaterial.dispose();}};
}
