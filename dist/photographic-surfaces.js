// Four CC0 photo-scanned materials, shipped locally with albedo, OpenGL normal
// and roughness. See assets/cc0/sources.json for provenance and source hashes.
export const PHOTO_SURFACES=Object.freeze({
  concrete:{asset:'concrete_floor',roughness:.85,metalness:.02,scale:.42},
  asphalt:{asset:'asphalt_03',roughness:.46,metalness:.02,scale:.33},
  metal:{asset:'corrugated_iron',roughness:.38,metalness:.76,scale:.4},
  rust:{asset:'rusty_painted_metal',roughness:.77,metalness:.34,scale:.5}
});
export function installPhotographicSurfaces(T,targets,{performance=false}={}){
  const textures=[],loader=new T.TextureLoader(),stats={ready:0,total:0,failed:0};
  const done=[];
  for(const [key,list] of Object.entries(targets)){
    const profile=PHOTO_SURFACES[key];if(!profile||!list?.length)continue;
    const channels=performance?['diff','rough']:['diff','normal','rough'];
    for(const channel of channels){
      stats.total++;
      done.push(new Promise(resolve=>{
        loader.load('./assets/cc0/'+profile.asset+'_'+channel+'_512.jpg',texture=>{
          textures.push(texture);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=performance?1:4;
          texture.colorSpace=channel==='diff'?T.SRGBColorSpace:T.NoColorSpace;
          for(const material of list){
            const slot=channel==='diff'?'map':channel==='normal'?'normalMap':'roughnessMap';
            material[slot]=texture;material.roughness=profile.roughness;material.metalness=profile.metalness;
            if(channel==='normal')material.normalScale.set(.36,.36);
            material.needsUpdate=true;
          }
          stats.ready++;resolve(true);
        },undefined,()=>{stats.failed++;resolve(false);});
      }));
    }
  }
  return {stats,done:Promise.all(done),dispose(){for(const t of textures)t.dispose();}};
}
