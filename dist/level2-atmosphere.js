// M02 / W02 : atmospheric cues without post-processing, SSR, volumetric fog
// or per-droplet geometry. Two instanced decal batches + tiny sprite pools.
export function createStreetAtmosphere(T,root,{performance=false,seed=2196}={}){
 let state=seed>>>0;
 const rand=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
 const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2);
 const matrix=new T.Matrix4(),p=new T.Vector3(),scale=new T.Vector3();
 const counts={puddleClusters:performance?18:45,ripples:performance?11:30,steam:performance?3:8,halos:performance?8:17};
 const neutral=new T.MeshBasicMaterial({color:0x9ab9b8,transparent:true,opacity:.24,depthWrite:false,side:T.DoubleSide});
 const floor=new T.PlaneGeometry(1,1);
 const pools=[],spriteMats=[],fx=[];
 const canvas=(size,draw)=>{
   const c=document.createElement('canvas');c.width=c.height=size;
   const ctx=c.getContext('2d');draw(ctx,size);const tex=new T.CanvasTexture(c);
   tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.ClampToEdgeWrapping;
   tex.generateMipmaps=true;tex.minFilter=T.LinearMipmapLinearFilter;
   return tex;
 };
 const reflection=canvas(128,(g,s)=>{
   g.clearRect(0,0,s,s);
   const grad=g.createRadialGradient(s/2,s/2,2,s/2,s/2,61);
   grad.addColorStop(0,'rgba(240,253,255,.76)');
   grad.addColorStop(.28,'rgba(179,220,238,.31)');
   grad.addColorStop(.68,'rgba(119,167,196,.085)');
   grad.addColorStop(1,'rgba(90,130,155,0)');
   g.fillStyle=grad;g.fillRect(0,0,s,s);
 });
 const haze=canvas(96,(g,s)=>{
   const grad=g.createRadialGradient(48,48,2,48,48,47);
   grad.addColorStop(0,'rgba(255,255,255,.9)');grad.addColorStop(.25,'rgba(255,255,255,.34)');
   grad.addColorStop(.75,'rgba(255,255,255,.045)');grad.addColorStop(1,'rgba(255,255,255,0)');
   g.fillStyle=grad;g.fillRect(0,0,s,s);
 });
 // Reflections stretch on the road *beneath* signage, not random emissive bars.
 // All tiles reuse one map, only three material variants and three draw calls.
 const colors=[0x58e5eb,0xe4b37f,0x799ec5];
 for(let palette=0;palette<colors.length;palette++){
   const quantity=Math.floor(counts.puddleClusters/colors.length);
   const m=new T.MeshBasicMaterial({color:colors[palette],map:reflection,transparent:true,
     blending:T.AdditiveBlending,depthWrite:false,opacity:performance?.18:.27,
     side:T.DoubleSide,fog:true,toneMapped:false});
   spriteMats.push(m);
   const batch=new T.InstancedMesh(floor,m,quantity);
   batch.name='M02 / neon reflection atlas batch '+palette;
   batch.frustumCulled=false;
   for(let i=0;i<quantity;i++){
     const z=64-(i*3+palette)*132/(quantity*3)+rand()*3;
     const x=(rand()-.5)*15;
     const w=.7+rand()*2.0,d=1.6+rand()*4;
     matrix.compose(p.set(x,.034,z),q,scale.set(w,d,1));
     batch.setMatrixAt(i,matrix);
   }
   batch.instanceMatrix.needsUpdate=true;root.add(batch);pools.push(batch);
 }
 // Low-cost white road paint, slightly faded and kept out of collider space.
 const crossing=new T.MeshBasicMaterial({color:0x82969a,transparent:true,opacity:.3,depthWrite:false,side:T.DoubleSide});
 const strips=new T.InstancedMesh(floor,crossing,performance?16:28);
 let idx=0;
 for(const z of [47,2,-38,-60]){
   for(let j=-3;j<=3;j++){
     const x=j*2.15;
     if(performance&&j%2===0)continue;
     matrix.compose(p.set(x,.032,z),q,scale.set(.53,1.55,1));
     strips.setMatrixAt(idx++,matrix);
   }
 }
 strips.count=idx;strips.instanceMatrix.needsUpdate=true;root.add(strips);
 // Rain impact rings, refreshed in a *single* draw call.
 const ringGeo=new T.RingGeometry(.81,.89,14);
 const rings=new T.InstancedMesh(ringGeo,new T.MeshBasicMaterial({
   color:0x8caeb6,transparent:true,opacity:performance?.12:.20,
   depthWrite:false,side:T.DoubleSide
 }),counts.ripples);
 rings.name='M02 / rain impact single-instanced ring pass';
 rings.frustumCulled=false;
 const rippleSeeds=[];
 for(let i=0;i<counts.ripples;i++)rippleSeeds.push({x:(rand()-.5)*16,z:(rand()-.5)*139,offset:rand()*3});
 root.add(rings);
 const steamMat=new T.SpriteMaterial({map:haze,color:0xaccad4,transparent:true,
    opacity:performance?.08:.12,depthWrite:false,fog:true});
 for(let i=0;i<counts.steam;i++){
   const sprite=new T.Sprite(steamMat);
   const z=48-i*(performance?47:18.2),x=(i%2?1:-1)*7.4;
   const base=.95+rand()*.5;
   sprite.position.set(x,base,z);sprite.scale.set(4.4,3.6,1);
   root.add(sprite);fx.push({sprite,base,phase:rand()*8});
 }
 const haloMaterials=[
   new T.SpriteMaterial({map:haze,color:0x66f0e6,blending:T.AdditiveBlending,opacity:performance?.13:.26,depthWrite:false,fog:true}),
   new T.SpriteMaterial({map:haze,color:0xffc08f,blending:T.AdditiveBlending,opacity:performance?.10:.19,depthWrite:false,fog:true})
 ];
 const haloSprites=[];
 for(let i=0;i<counts.halos;i++){
   const cyan=i%3!==1,z=63-i*8.4,side=i%2?1:-1;
   const sprite=new T.Sprite(haloMaterials[cyan?0:1]);
   sprite.name='M02 / cheap emissive spill';
   sprite.position.set(side*11.9,4.5+(i%4)*1.6,z);
   sprite.scale.set(3.0+(i%3)*.4,4.0,1);
   root.add(sprite);haloSprites.push(sprite);
 }
 let fade=0;
 function update(time){
   const wind=Math.sin(time*.12);
   for(const steam of fx){
     const age=time*.30+steam.phase;
     steam.sprite.position.y=steam.base+Math.sin(age)*.33;
     steam.sprite.position.x+=wind*.0007;
     const pulse=1+Math.sin(age*1.6)*.11;
     steam.sprite.scale.set(4.6*pulse,3.5*pulse,1);
   }
   // Stagger rings via 3-second phases; no geometry allocations in animation.
   for(let i=0;i<rippleSeeds.length;i++){
     const r=rippleSeeds[i],phase=(time*1.24+r.offset)%2.6;
     const rad=.09+phase*.24;
     matrix.compose(p.set(r.x,.039,r.z),q,scale.set(rad,rad,1));
     rings.setMatrixAt(i,matrix);
   }
   rings.instanceMatrix.needsUpdate=true;
   fade=.98+.02*Math.sin(time*3.1);
   // Flicker only material opacity; no shadow/render target updates.
   haloMaterials[0].opacity=(performance?.13:.26)*fade;
 }
 return {update,stats:{...counts,additionalLights:0,postProcessingPasses:0,proceduralMaps:2},dispose(){
   reflection.dispose();haze.dispose();
   floor.dispose();ringGeo.dispose();
   [...spriteMats,steamMat,...haloMaterials,crossing,rings.material].forEach(m=>m.dispose());
 }};
}
