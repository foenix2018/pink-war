import * as T from './vendor/three.webgpu.min.js';

// Lightweight instanced back-pack exhaust, attached to the authentic chest bone.
// Shared geometry/material: two nozzles + one instanced smoke draw call per hero.
export function createJetpackFX(root,chest,{masculine=false}={}){
  root.updateMatrixWorld(true);
  const mount=new T.Group();mount.name='AÉGIS · mini jetpack / smoke';
  const back=root.localToWorld(new T.Vector3(0,1.38,.245));
  mount.position.copy(chest.worldToLocal(back));chest.add(mount);
  const casing=new T.MeshStandardMaterial({color:0x273342,metalness:.72,roughness:.35});
  const trim=new T.MeshStandardMaterial({color:masculine?0x79b9ed:0xeeb4d5,metalness:.38,roughness:.32});
  const light=new T.MeshBasicMaterial({color:masculine?0x8acbff:0xf9b7db,toneMapped:false});
  const housing=new T.Mesh(new T.BoxGeometry(.25,.19,.085),casing);housing.position.set(0,.025,0);mount.add(housing);
  const collar=new T.CylinderGeometry(.037,.041,.068,12),glowGeometry=new T.CylinderGeometry(.021,.027,.011,10);
  const fireGeometry=new T.ConeGeometry(.035,.21,10),fireMaterial=new T.MeshBasicMaterial({color:masculine?0x8cddff:0xffc6e4,transparent:true,opacity:.75,depthWrite:false,toneMapped:false});
  const flames=[];
  for(const sign of [-1,1]){
    const nozzle=new T.Mesh(collar,casing);nozzle.position.set(sign*.092,-.096,.027);mount.add(nozzle);
    const ring=new T.Mesh(glowGeometry,trim);ring.position.set(sign*.092,-.139,.027);mount.add(ring);
    const flame=new T.Mesh(fireGeometry,fireMaterial);flame.position.set(sign*.092,-.241,.027);flame.rotation.z=Math.PI;flame.visible=false;mount.add(flame);flames.push(flame);
  }
  const geometry=new T.SphereGeometry(1,7,5);
  const material=new T.MeshBasicMaterial({color:0xbcc6d2,transparent:true,opacity:.29,depthWrite:false,depthTest:true});
  const count=36,smoke=new T.InstancedMesh(geometry,material,count);
  smoke.name='Jetpack / smoke particles';smoke.frustumCulled=false;smoke.count=0;mount.add(smoke);
  const m=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),sc=new T.Vector3();
  let age=0,output=0;
  function update(dt,active){
    if(dt<=0)return;
    age+=dt;output+=(Number(!!active)-output)*(1-Math.exp(-dt*(active?22:7)));
    for(const f of flames){f.visible=output>.08;f.scale.y=.65+output*.42+Math.sin(age*34)*.07;f.material.opacity=.68*output;}
    if(output<.015){smoke.count=0;return;}
    smoke.count=count;material.opacity=.3*output;
    for(let i=0;i<count;i++){
      const nozzle=i%2,seed=Math.floor(i/2),t=(age*.85+seed/18)%1,sign=nozzle===0?-1:1;
      const width=(.012+t*.090)*(seed%3===0?1.25:1);
      p.set(sign*.092+Math.sin(seed*7.3+age*4)*width,
        -.19-t*.76,
        .04+t*.18+Math.cos(seed*3.9+age*3)*width);
      const size=(.018+.10*t)*(1-.45*t)*output;
      sc.set(size*1.25,size*1.8,size*1.25);m.compose(p,q,sc);smoke.setMatrixAt(i,m);
    }
    smoke.instanceMatrix.needsUpdate=true;
  }
  return {root:mount,update,dispose(){
    mount.removeFromParent();
    for(const g of [housing.geometry,collar,glowGeometry,fireGeometry,geometry])g.dispose();
    for(const mat of [casing,trim,light,fireMaterial,material])mat.dispose();
  }};
}
