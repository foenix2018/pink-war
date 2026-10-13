import * as T from './vendor/three.webgpu.min.js';
export const BLADE_LENGTH=1.08;
export function createEnergyBlade(color=0xff80b2){
  const root=new T.Group();root.name='AURORA energy blade';root.position.set(0,.14,0);
  const coreMat=new T.MeshBasicMaterial({color:0xf8fbff,toneMapped:false}),haloMat=new T.MeshBasicMaterial({color,transparent:true,opacity:.55,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
  const core=new T.Mesh(new T.CapsuleGeometry(.010,BLADE_LENGTH-.02,5,12),coreMat),halo=new T.Mesh(new T.CapsuleGeometry(.024,BLADE_LENGTH-.048,5,14),haloMat);
  core.scale.y=halo.scale.y=.001;core.position.y=halo.position.y=BLADE_LENGTH*.001/2;
  root.add(core,halo);root.visible=false;
  let progress=0,extension=0,lastTime=null;
  const base=new T.Vector3(),tip=new T.Vector3();
  // Only the main trigger powers the blade; release retracts over 180ms.
  // Delta-time animation works in FPS, 3P and tracked-controller WebXR.
  return {root,update(time,held,accent){
    const dt=lastTime===null?0:Math.max(0,Math.min(.06,time-lastTime));
    lastTime=time;
    progress=Math.max(0,Math.min(1,progress+(held?1:-1)*dt/(held?.22:.18)));
    extension=progress*progress*(3-2*progress);
    root.visible=extension>.003;
    if(accent)haloMat.color.copy(accent);
    const length=Math.max(.001,extension);
    core.scale.y=halo.scale.y=length;core.position.y=halo.position.y=BLADE_LENGTH*length/2;
    halo.scale.x=halo.scale.z=1+Math.sin(time*73)*.065;
  },deployInstant(time){
    // A copied outgoing saber is already open at the start of holstering.
    progress=1;extension=1;lastTime=time;root.visible=true;
    core.scale.y=halo.scale.y=1;core.position.y=halo.position.y=BLADE_LENGTH/2;
  },reset(){
    progress=0;extension=0;lastTime=null;root.visible=false;
    core.scale.y=halo.scale.y=.001;core.position.y=halo.position.y=.0005;
  },get extension(){return extension;},segment(){
    root.updateWorldMatrix(true,false);root.localToWorld(base.set(0,0,0));root.localToWorld(tip.set(0,BLADE_LENGTH*extension,0));
    return {base:{x:base.x,y:base.y,z:base.z},tip:{x:tip.x,y:tip.y,z:tip.z},extension};
  },dispose(){root.removeFromParent();core.geometry.dispose();halo.geometry.dispose();coreMat.dispose();haloMat.dispose();}};
}
