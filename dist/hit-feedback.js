// The same brief, number-free hit confirmation in screen play and immersive XR.
// It follows the camera, never its pose: no aiming correction or dynamic light.
export function createHitFeedback(T,camera){
  const vertices=[];
  for(const x of [-1,1])for(const y of [-1,1])vertices.push(x*.006,y*.006,0,x*.013,y*.013,0);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  const material=new T.LineBasicMaterial({color:0xffffff,transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
  const mesh=new T.LineSegments(geometry,material);mesh.name='Confirmation de touche / zones';mesh.position.z=-1;mesh.renderOrder=220;mesh.frustumCulled=false;mesh.visible=false;camera.add(mesh);
  let age=0,priority=0,timeout=null,disposed=false,size=1;
  const scaleToView=()=>mesh.scale.setScalar(size*Math.max(.2,Math.min(1.5,Math.tan((camera.fov||72)*Math.PI/360)/Math.tan(72*Math.PI/360))));
  const hide=()=>{mesh.visible=false;priority=0;clearTimeout(timeout);timeout=null;};
  return {mesh,
    hit(event){
      if(disposed||event?.type!=='hit'||event.playerSource===false||!(event.damage>0))return false;
      const head=event.zone==='head',next=head?2:1;
      // A shotgun pellet hitting a limb cannot immediately erase a head hit.
      if(mesh.visible&&age<.12&&priority>next)return false;
      age=0;priority=next;mesh.visible=true;mesh.userData.zone=event.zone;
      material.color.setHex(head?0xffcf7a:0xf4f6f8);material.opacity=event.zone==='limb'?.48:.9;
      size=head?1.12:event.zone==='limb'?.85:1;scaleToView();
      clearTimeout(timeout);timeout=setTimeout(hide,180);return true;
    },
    update(dt){if(!mesh.visible)return;age+=Math.max(0,dt||0);if(age>=.18){hide();return;}scaleToView();material.opacity=(mesh.userData.zone==='limb'?.48:.9)*(1-age/.18);},
    reset:hide,
    dispose(){if(disposed)return;disposed=true;hide();mesh.removeFromParent();geometry.dispose();material.dispose();}
  };
}
