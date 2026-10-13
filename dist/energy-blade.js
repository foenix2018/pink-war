import * as T from './vendor/three.webgpu.min.js';
export const BLADE_LENGTH=1.08;
export function createEnergyBlade(color=0xff80b2){
  const root=new T.Group();root.name='AURORA energy blade';root.position.set(0,.14,0);
  const coreMat=new T.MeshBasicMaterial({color:0xf8fbff,toneMapped:false}),haloMat=new T.MeshBasicMaterial({color,transparent:true,opacity:.55,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
  const core=new T.Mesh(new T.CapsuleGeometry(.010,BLADE_LENGTH-.02,5,12),coreMat),halo=new T.Mesh(new T.CapsuleGeometry(.024,BLADE_LENGTH-.048,5,14),haloMat);
  core.scale.y=halo.scale.y=.001;core.position.y=halo.position.y=BLADE_LENGTH*.001/2;
  root.add(core,halo);root.visible=false;let deployedAt=null,extension=0;
  const base=new T.Vector3(),tip=new T.Vector3();
  return {root,update(time,active,accent){
    root.visible=!!active;
    if(!active){deployedAt=null;extension=0;return;}
    deployedAt??=time;const progress=Math.max(0,Math.min(1,(time-deployedAt)/.22));extension=progress*progress*(3-2*progress);
    if(accent)haloMat.color.copy(accent);
    const length=Math.max(.001,extension);
    core.scale.y=halo.scale.y=length;core.position.y=halo.position.y=BLADE_LENGTH*length/2;
    halo.scale.x=halo.scale.z=1+Math.sin(time*73)*.045;
  },get extension(){return extension;},segment(){
    root.updateWorldMatrix(true,false);root.localToWorld(base.set(0,0,0));root.localToWorld(tip.set(0,BLADE_LENGTH*extension,0));
    return {base:{x:base.x,y:base.y,z:base.z},tip:{x:tip.x,y:tip.y,z:tip.z},extension};
  },dispose(){root.removeFromParent();core.geometry.dispose();halo.geometry.dispose();coreMat.dispose();haloMat.dispose();}};
}
