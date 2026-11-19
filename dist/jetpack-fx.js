import * as T from './vendor/three.webgpu.min.js';
import {loadBlenderModels} from './blender-models.js';

// Mini-jetpack of GHJU and LYLU: the pack modelled in Blender (tools/blender/jetpack_asset.py), a two-layer flame under each
// bell nozzle, a soft smoke trail and a fuel gauge on the back of the housing. It hangs from the lumbar bone, low on the back
// (the rifle is slung across the shoulder blades, clear of it), and costs three draw calls beyond the pack itself:
// two flame cones per nozzle (shared geometry), one instanced smoke mesh, one gauge bar.
// If the model cannot be fetched, a plain housing with two nozzles stands in for it.
export const JETPACK_MOUNT=Object.freeze({x:0,y:1.17,z:.235});          // rig frame (bind pose), metres
export const JETPACK_NOZZLES=Object.freeze({x:.07,y:-.1435,z:.02});    // exit rings, relative to the mount; x is mirrored
export const JETPACK_GAUGE=Object.freeze({x:0,y:.075,z:.0535,width:.066,height:.012});
const SMOKE=56,LOW_FUEL=.2;

// Vertical gradient on a cone: opaque and hot at the nozzle, fully transparent at the tip (vertex RGBA).
function flameGeometry(radius,length,hot,cool,{segments=12}={}){
  const g=new T.ConeGeometry(radius,length,segments,1,true);g.rotateZ(Math.PI);g.translate(0,-length/2,0);
  const p=g.attributes.position,color=new Float32Array(p.count*4),a=new T.Color(),h=new T.Color(hot),c=new T.Color(cool);
  for(let i=0;i<p.count;i++){const t=Math.min(1,Math.max(0,-p.getY(i)/length));a.copy(h).lerp(c,Math.pow(t,.7));color.set([a.r,a.g,a.b,Math.pow(1-t,1.4)*.95],i*4);}
  g.setAttribute('color',new T.BufferAttribute(color,4));return g;
}

export function createJetpackFX(root,anchor,{masculine=false,models=true,fetchImpl=globalThis.fetch}={}){
  root.updateMatrixWorld(true);
  const mount=new T.Group();mount.name='AÉGIS · mini jetpack';
  mount.position.copy(anchor.worldToLocal(root.localToWorld(new T.Vector3(JETPACK_MOUNT.x,JETPACK_MOUNT.y,JETPACK_MOUNT.z))));
  // The bone's own axes are not the rig's (the spine chain is turned half a turn): carry the root's orientation to the pack.
  mount.quaternion.copy(anchor.getWorldQuaternion(new T.Quaternion()).invert().multiply(root.getWorldQuaternion(new T.Quaternion())));
  anchor.add(mount);
  const accent=masculine?0x79b9ed:0xf27ab8,lightColor=masculine?0x8acbff:0xf9b7db;
  const casing=new T.MeshStandardMaterial({color:0x273342,metalness:.72,roughness:.35}),
    trim=new T.MeshStandardMaterial({color:accent,metalness:.38,roughness:.32}),
    dark=new T.MeshStandardMaterial({color:0x10141a,metalness:.5,roughness:.5}),
    steel=new T.MeshStandardMaterial({color:0x6b7686,metalness:.85,roughness:.3}),
    label=new T.MeshStandardMaterial({color:0xc9ccd2,roughness:.6}),
    light=new T.MeshBasicMaterial({color:lightColor,toneMapped:false});
  const owned=[casing,trim,dark,steel,label,light],geometries=[];

  // Fallback pack, replaced as soon as the Blender model is in.
  const fallback=new T.Group();fallback.name='mini jetpack / repli';mount.add(fallback);
  const box=new T.BoxGeometry(.215,.13,.07),collar=new T.CylinderGeometry(.034,.042,.12,14);geometries.push(box,collar);
  const housing=new T.Mesh(box,casing);housing.position.set(0,.03,.015);fallback.add(housing);
  for(const s of [-1,1]){const n=new T.Mesh(collar,casing);n.position.set(s*JETPACK_NOZZLES.x,-.085,JETPACK_NOZZLES.z);fallback.add(n);}
  let modelReady=false;
  const ready=!models?Promise.resolve(false):loadBlenderModels(T,{files:{jetpack:'jetpack'},M:{casing,trim,dark,steel,label,glow:light},
    base:new URL('./assets/heroes/',import.meta.url).href,fetchImpl}).then(lib=>{
    if(disposed)return false;
    const group=lib.place('jetpack',[{x:0,y:0,z:0}],mount);if(!group)return false;
    fallback.visible=false;modelReady=true;return true;
  }).catch(()=>false); // no model: the plain housing stays
  let disposed=false;

  // Flames: a long soft outer cone and a short white core under each nozzle, additive, fading to nothing at the tip.
  const outerGeometry=flameGeometry(.040,.34,lightColor,accent),coreGeometry=flameGeometry(.020,.19,0xffffff,lightColor,{segments:10});geometries.push(outerGeometry,coreGeometry);
  const flameMaterial=new T.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,side:T.DoubleSide});owned.push(flameMaterial);
  const flames=[];
  for(const s of [-1,1]){
    const group=new T.Group();group.position.set(s*JETPACK_NOZZLES.x,JETPACK_NOZZLES.y,JETPACK_NOZZLES.z);group.visible=false;mount.add(group);
    const outer=new T.Mesh(outerGeometry,flameMaterial),core=new T.Mesh(coreGeometry,flameMaterial);outer.name=core.name='Jetpack / flame';
    group.add(outer,core);flames.push({group,outer,core,phase:s*1.7});
  }

  // Smoke: soft round puffs that start hot and white at the nozzle, cool to the hero's tint then to grey, and swell as they thin out.
  const puffGeometry=new T.IcosahedronGeometry(1,1),puffMaterial=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.13,depthWrite:false,depthTest:true});geometries.push(puffGeometry);owned.push(puffMaterial);
  const smoke=new T.InstancedMesh(puffGeometry,puffMaterial,SMOKE);smoke.name='Jetpack / smoke particles';smoke.frustumCulled=false;smoke.count=0;mount.add(smoke);
  smoke.setColorAt(0,new T.Color(1,1,1));
  const m=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),sc=new T.Vector3(),hot=new T.Color(0xfff2e0),tint=new T.Color(lightColor),grey=new T.Color(0x8d96a3),col=new T.Color();

  // Fuel gauge: a bar in the window on the back of the housing, hero-coloured, amber then flashing red at the end.
  const barGeometry=new T.BoxGeometry(JETPACK_GAUGE.width,JETPACK_GAUGE.height-.004,.003);barGeometry.translate(JETPACK_GAUGE.width/2,0,0);geometries.push(barGeometry);
  const barMaterial=new T.MeshBasicMaterial({color:lightColor,toneMapped:false});owned.push(barMaterial);
  const bar=new T.Mesh(barGeometry,barMaterial);bar.name='Jetpack / fuel gauge';bar.position.set(JETPACK_GAUGE.x-JETPACK_GAUGE.width/2,JETPACK_GAUGE.y,JETPACK_GAUGE.z);mount.add(bar);

  let age=0,output=0,gauge=1;
  const amber=new T.Color(0xffb347),red=new T.Color(0xff3b30),base=new T.Color(lightColor);
  function update(dt,active,fuel=1){
    if(dt<=0)return;
    age+=dt;output+=(Number(!!active)-output)*(1-Math.exp(-dt*(active?22:7)));
    const low=active&&fuel<LOW_FUEL,sputter=low?(Math.sin(age*2*Math.PI*(14+(1-fuel/LOW_FUEL)*10))>-.15?1:.2):1;
    // Gauge: follows the fuel; the bar is the pack's own readout, so it eases rather than jumps.
    gauge+=(Math.max(0,Math.min(1,fuel))-gauge)*(1-Math.exp(-dt*12));
    bar.scale.x=Math.max(.001,gauge);
    barMaterial.color.copy(gauge>.5?base:gauge>.2?amber.clone().lerp(base,(gauge-.2)/.3):red);
    bar.visible=low?Math.sin(age*40)>-.2:true;
    for(const f of flames){
      const flicker=.9+.1*Math.sin(age*43+f.phase)+.06*Math.sin(age*71+f.phase*2);
      f.group.visible=output>.06;
      const length=(.72+.36*output)*flicker*sputter;
      f.outer.scale.set(.85+.25*output,length,.85+.25*output);f.core.scale.set(.9+.2*flicker,length*.9,.9+.2*flicker);
    }
    if(output<.015){smoke.count=0;return;}
    smoke.count=SMOKE;puffMaterial.opacity=.13*output;
    for(let i=0;i<SMOKE;i++){
      const nozzle=i%2,seed=Math.floor(i/2),t=(age*.9+seed/(SMOKE/2))%1,sign=nozzle===0?-1:1,spread=.012+t*.085*(seed%3===0?1.25:1);
      p.set(sign*JETPACK_NOZZLES.x+Math.sin(seed*7.3+age*4)*spread,
        JETPACK_NOZZLES.y-.16-t*.85,
        JETPACK_NOZZLES.z+.02+t*.2+Math.cos(seed*3.9+age*3)*spread);
      const swell=(.014+.07*Math.sqrt(t))*(1-.6*t*t)*output;
      sc.set(swell*1.15,swell*1.55,swell*1.15);m.compose(p,q,sc);smoke.setMatrixAt(i,m);
      col.copy(hot).lerp(tint,Math.min(1,t*3.2)).lerp(grey,Math.min(1,Math.max(0,(t-.2)*2.0)));col.multiplyScalar(1-.3*t);smoke.setColorAt(i,col);
    }
    smoke.instanceMatrix.needsUpdate=true;smoke.instanceColor.needsUpdate=true;
  }
  return {root:mount,update,ready,get modelReady(){return modelReady;},dispose(){
    disposed=true;mount.removeFromParent();
    for(const g of geometries)g.dispose();for(const mat of owned)mat.dispose();
    mount.traverse(o=>{if(o.isMesh&&o.geometry?.userData?.webgpuShape==='blender')o.geometry.dispose();});
  }};
}
