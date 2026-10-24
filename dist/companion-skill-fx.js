// Two projectile slots and two short explosion slots; no per-frame allocations
// of meshes, materials or lights, and no full-screen bloom in WebXR.
export function createCompanionSkillFX(T,scene,skills){
 const root=new T.Group();root.name=skills.name+' / impulsions de phase';scene.add(root);
 const core=new T.MeshBasicMaterial({color:0xeaf5ff,toneMapped:false});
 const glow=new T.MeshBasicMaterial({color:skills.color,transparent:true,opacity:.22,depthWrite:false,toneMapped:false});
 const waveMaterial=new T.MeshBasicMaterial({color:skills.color,transparent:true,opacity:.24,depthWrite:false,side:T.DoubleSide,toneMapped:false});
 const sphere=new T.SphereGeometry(1,12,8),ring=new T.TorusGeometry(1,.025,5,28);
 const balls=Array.from({length:2},()=>{
  const group=new T.Group();group.add(new T.Mesh(sphere,core));const halo=new T.Mesh(sphere,glow);halo.scale.setScalar(1.8);group.add(halo);group.visible=false;root.add(group);return group;
 });
 const waves=Array.from({length:2},()=>{const mesh=new T.Mesh(ring,waveMaterial);mesh.rotation.x=Math.PI/2;mesh.visible=false;root.add(mesh);return mesh;});
 const light=new T.PointLight(skills.color,0,6,2);light.castShadow=false;root.add(light);
 const shieldMaterial=new T.MeshBasicMaterial({color:skills.color,transparent:true,opacity:.055,depthWrite:false,side:T.DoubleSide,toneMapped:false});
 const shield=new T.Mesh(sphere,shieldMaterial);shield.scale.setScalar(1.7);shield.visible=false;root.add(shield);
 return {update(){
  shield.visible=skills.snapshot().ward;if(shield.visible)shield.position.copy(skills.ward.position);
  for(let i=0;i<2;i++){
   const p=skills.projectiles[i],b=skills.bursts[i],ball=balls[i],wave=waves[i];ball.visible=!!p;wave.visible=!!b;
   if(p){ball.position.set(p.x,p.y,p.z);ball.scale.setScalar(.10);}
   if(b){wave.position.set(b.x,b.y+.025,b.z);wave.scale.setScalar(.15+b.radius*b.age/.65);}
  }
  const pulse=skills.bursts[0],p=skills.projectiles[0];light.intensity=pulse?24*Math.max(0,1-pulse.age/.28):p?3:0;
  if(pulse||p){const at=pulse||p;light.position.set(at.x,at.y+.25,at.z);}
  waveMaterial.opacity=pulse?.24*(1-pulse.age/.65):0;
 },dispose(){root.removeFromParent();sphere.dispose();ring.dispose();core.dispose();glow.dispose();waveMaterial.dispose();shieldMaterial.dispose();}};
}
