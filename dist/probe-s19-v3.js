// Pink Wars — SONDE S-19 visual adapter (Blender V3).
// Only replaces the probe's appearance after a verified, locally hosted GLB loads.
// The existing 7-bone probe rig retains flight, targeting, hitboxes, damage, and death.
// Never blocks gameplay: a missing asset automatically falls back to original meshes.
export const S19_V3_ASSET = new URL('./assets/enemies/sonde-s19-v3-game.glb', import.meta.url).href;
export const S19_V3_ROTORS = Object.freeze(['LEFT_REAR','LEFT_FRONT','RIGHT_REAR','RIGHT_FRONT']);

let shared = null;
function source() {
  if (!shared) {
    shared = import('./vendor/s19-gltf-loader.js').then(({GLTFLoader,cloneS19}) =>
      new Promise((resolve,reject)=>{
        new GLTFLoader().load(S19_V3_ASSET,
          gltf=>resolve({scene:gltf.scene,cloneS19}),
          undefined,reject);
      })
    );
  }
  return shared;
}

export function probeS19V3State(time,flight={},simulationTime=time) {
  const destroyed=flight.rotorDestroyed||[];
  const damaged=(flight.limpUntil||0)>simulationTime;
  return {
    rotors:S19_V3_ROTORS.map((name,index)=>({
      name,index,broken:!!destroyed[index],
      angle:time*(destroyed[index]?0:damaged&&index===0?12:42)*
        ((index===0||index===3)?1:-1),
      scale:destroyed[index]?.015:1,
    })),
    eyePitch:Math.max(-.55,Math.min(.4,flight.aimPitch||0)),
    charge:Math.max(0,Math.min(1,flight.chargeProgress||0)),
    shot:simulationTime-(flight.lastShotAt??-99)<.13,
  };
}

const accentNames=['IRIS 05 / glowing ruby tracking annulus','IRIS 07 / ruby emission eye',
                   'IRIS 08 / photonic central pupil','Bottom sensor red emitter'];

/** Mount only for form='probe', keeping native rig as the gameplay authority. */
export function installProbeS19V3(root,pelvis,{load=source}={}) {
  if (typeof window==='undefined') return null;
  const originalMeshes=root.children.filter(child=>child.isSkinnedMesh);
  let attached=null,alive=true,rotors=[],accents=[],gimbal=null;

  function animate(time,flight={},simulationTime=time) {
    if(!attached)return;
    const state=probeS19V3State(time,flight,simulationTime);
    for(const rotor of state.rotors) {
      const bone=rotors[rotor.index];
      if(!bone)continue;
      bone.rotation.y=rotor.angle;
      bone.scale.setScalar(rotor.scale);
    }
    // The camera gimbal tracks the target independently of the hull's bank.
    if(gimbal)gimbal.rotation.x=state.eyePitch;
    for(const {mesh,material,strength} of accents) {
      if(!material)continue;
      material.emissiveIntensity=strength*(1+state.charge*.75+
        (state.shot?1.2:0)+Math.sin(time*5)*.035);
      mesh.visible=true;
    }
  }

  // An enemy may be destroyed while a network request is still in progress.
  const removed=()=>{alive=false;};
  root.addEventListener('removed',removed);
  const ready=load().then(({scene,cloneS19})=>{
    if(!alive)return false;
    const visual=cloneS19(scene);
    visual.name='SONDE S-19 / Blender V3 / optimized production asset';
    visual.position.set(0,-.55,0); // native pelvis pivot is y=.55.
    visual.traverse(o=>{
      if(!o.isMesh&&!o.isSkinnedMesh)return;
      o.castShadow=!o.material?.isMeshBasicMaterial;
      o.receiveShadow=false; // phone / Quest / tablet budget.
      o.frustumCulled=false;  // rotor animation can change bounds.
    });
    rotors=S19_V3_ROTORS.map(name=>visual.getObjectByName('FAN_'+name)||null);
    if(rotors.some(x=>!x))throw new Error('S-19 V3 has missing fan bones');
    gimbal=visual.getObjectByName('IRIS_STABILIZER')||null;
    accents=accentNames.map(name=>{
      const mesh=visual.getObjectByName(name);
      if(!mesh?.isMesh)return null;
      // Each drone must have independent flashing and alert materials.
      mesh.material=mesh.material.clone();
      return {mesh,material:mesh.material,strength:mesh.material.emissiveIntensity||1};
    }).filter(Boolean);
    pelvis.add(visual);
    attached=visual;
    originalMeshes.forEach(mesh=>{mesh.visible=false;});
    root.userData.probeRevision='S-19 / Blender V3 Fidelity';
    root.userData.s19V3DrawCalls=visual.children.length;
    return true;
  }).catch(error=>{
    console.warn('[Pink Wars S-19 V3] Fallback to original drone:',error?.message||error);
    if(attached){attached.removeFromParent();attached=null;}
    originalMeshes.forEach(mesh=>{mesh.visible=true;});
    return false;
  });
  const api={ready,animate,get visual(){return attached;}};
  root.userData.s19V3=api;
  return api;
}
