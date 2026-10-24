// PINK WARS / W02 lean CC0 PBR surface atlas.
// Five local CC0 photo sets (Poly Haven, source 1K, packaged at 512px),
// plus the existing CC0 Quaternius brick maps reused from M01, are resized
// once to 512px desktop / 256px Performance. Desktop receives albedo, normal
// and roughness; mobile omits normals. No displacement, transmission or SSR.
// If a local image fails, procedural albedo keeps the mission playable.
// Direct asset references: https://polyhaven.com/a/{asset}
export const PBR_ASSETS=Object.freeze({
 asphalt: Object.freeze({asset:'asphalt_03',hex:0xbac4c7,repeat:[8,56],roughness:.43,metalness:.07}),
 concrete: Object.freeze({asset:'concrete_floor',hex:0xb8baba,repeat:[4,8],roughness:.82,metalness:.025}),
 blueMetal: Object.freeze({asset:'corrugated_iron',hex:0xaebfc9,repeat:[3,4],roughness:.52,metalness:.59}),
 chequer: Object.freeze({asset:'corrugated_iron',hex:0xc3c7c3,repeat:[8,3],roughness:.60,metalness:.66}),
 rust: Object.freeze({asset:'rusty_painted_metal',hex:0xd0b6ab,repeat:[2,2],roughness:.82,metalness:.32}),
 masonry:Object.freeze({asset:'Quaternius T_RedBrick',source:'https://quaternius.com',prefix:'m01-brick-',hex:0xb7aba0,repeat:[1,1],roughness:.95,metalness:0})
});
const src=name=>'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/'+name+'/'+name+'_diff_1k.jpg';
const localSource=(name,channel='diff')=>'./assets/cc0/'+name+'_'+channel+'_512.jpg';
const profileSource=(profile,channel='diff')=>profile.prefix?'./assets/cc0/'+profile.prefix+(channel==='rough'?'orm':channel)+'_512.jpg':localSource(profile.asset,channel);
function proceduralCanvas(size,kind){
 const c=document.createElement('canvas');c.width=c.height=size;
 const ctx=c.getContext('2d');const data=ctx.createImageData(size,size);let seed=kind.split('').reduce((n,c)=>Math.imul(n,31)+c.charCodeAt(0)|0,46730);
 const pick=()=>{
   seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296;
 };
 const bases={asphalt:[70,79,81],concrete:[119,123,123],blueMetal:[43,68,82],chequer:[103,94,80],rust:[91,78,68]};
 const base=bases[kind]||[100,100,100];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   let i=(y*size+x)*4,n=(pick()-.5)*51+(Math.sin(x*.17+y*.24)*4);
   if(kind==='asphalt')n+=(pick()>.93?19:0);
   else if(kind==='concrete')n+=x%80<2?-24:4;
   else if(kind==='chequer')n+=Math.sin((x+y)*.09)*9;
   else if(kind==='rust')n+=Math.sin(x*.11)*10+Math.sin(y*.08)*8;
   for(let ch=0;ch<3;ch++)data.data[i+ch]=Math.max(0,Math.min(255,base[ch]+n));
   data.data[i+3]=255;
 }
 ctx.putImageData(data,0,0);
 return c;
}
function downsample(source,size){
 const canvas=document.createElement('canvas');
 canvas.width=canvas.height=size;
 const ctx=canvas.getContext('2d',{alpha:false});
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(source,0,0,size,size);
 return canvas;
}
function image(url){
 return new Promise((resolve,reject)=>{
   const img=new Image();
   img.crossOrigin='anonymous';img.decoding='async';
   img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('PBR asset CORS/network unavailable'));
   img.src=url;
 });
}
function apply(T,source,size,targets,profile,channel='diff'){
 const texture=new T.CanvasTexture(downsample(source,size));
 texture.name='M02 PBR albedo / '+profile.asset;
 texture.wrapS=texture.wrapT=T.RepeatWrapping;
 texture.colorSpace=channel==='diff'?T.SRGBColorSpace:T.NoColorSpace;
 texture.generateMipmaps=true;
 texture.minFilter=T.LinearMipmapLinearFilter;
 texture.magFilter=T.LinearFilter;
 texture.anisotropy=2;
 texture.repeat.set(...profile.repeat);
 for(const material of targets){
   // Keep same texture instance across all compatible meshes for GPU economy.
   if(!material?.isMeshStandardMaterial&&!material?.isMeshPhysicalMaterial)continue;
   if(channel==='normal'){material.normalMap=texture;material.normalScale.set(.3,.3);}
   else if(channel==='rough')material.roughnessMap=texture;
   else material.map=texture;
   material.color.setHex(profile.hex);
   material.roughness=profile.roughness;
   material.metalness=profile.metalness;
   material.needsUpdate=true;
 }
 return texture;
}
export function installLeanPBR(T,materials,architecture,{performance=false,onProgress=()=>{},fallbackAfter=4000}={}){
 const targets={
   asphalt:[materials.asphalt],
   concrete:[materials.concrete,materials.wall,materials.plaster,architecture?.pbrTargets?.ceramic,architecture?.pbrTargets?.dirty],
   blueMetal:[materials.dark,materials.iron,architecture?.pbrTargets?.brushed,architecture?.pbrTargets?.darkTrim,architecture?.pbrTargets?.pastel],
   chequer:[materials.road],
   rust:[materials.rust,architecture?.pbrTargets?.copper],
   masonry:[architecture?.pbrTargets?.masonry]
 };
 const size=performance?256:512;
 const textures=[];
 const stats={ready:0,requested:Object.keys(targets).length,loadedFromSource:0,fallback:0,size,totalEstimatedGPUMiB:Math.round((5*size*size+(performance?128:512)**2)*4*1.34*(performance?2:3)/1048576*10)/10};
 onProgress({...stats});
 // Parallel, bounded loading. No PBR network promise blocks the level boot.
 const jobs=Object.entries(targets).map(async ([key,materials])=>{
   const mapSize=performance&&key==='masonry'?128:size;
   let texSource=null,timer;const pending=image(profileSource(PBR_ASSETS[key]));
   let fallback=false;
   try {
     // Prevent one slow host from delaying the rest of the game.
     // Requests may continue in browser cache, but this material keeps its fallback.
     texSource=await Promise.race([pending,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('PBR timeout')),fallbackAfter);})]);
     stats.loadedFromSource++;
   } catch {
     texSource=proceduralCanvas(size,key);
     stats.fallback++;fallback=true;
   }finally{clearTimeout(timer);}
   const albedo=apply(T,texSource,mapSize,materials,PBR_ASSETS[key]);textures.push(albedo);
   // Shader compilation can hold the main thread longer than the boot budget.
   // Keep the level playable, then upgrade the SAME GPU texture when its local
   // photograph finishes decoding. A temporary fallback must not become final.
   if(fallback)pending.then(source=>{albedo.image=downsample(source,mapSize);albedo.needsUpdate=true;stats.fallback--;stats.loadedFromSource++;onProgress({...stats});}).catch(()=>{});
   // A missing optional relief map never blocks a playable frame. Mobile keeps
   // roughness and albedo; desktop also receives the scanned surface normals.
   await Promise.allSettled((performance?['rough']:['normal','rough']).map(async channel=>{
     const source=await image(profileSource(PBR_ASSETS[key],channel));
     textures.push(apply(T,source,mapSize,materials,PBR_ASSETS[key],channel));
   }));
   stats.ready++;
   onProgress({...stats});
   return key;
 });
 return {textures,stats,done:Promise.allSettled(jobs),sources:Object.fromEntries(Object.entries(PBR_ASSETS).map(([id,v])=>[id,v.source||src(v.asset)]))};
}
