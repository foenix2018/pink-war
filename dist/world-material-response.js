// Complete matching local CC0 scan sets. Colour, normal and roughness share
// transforms; no new downloads, displacement, or change to the collision mesh.
export function surfaceSet(url){
 const m=/\/(cc0|ligne9)\/([^/]+)_diff_(512|1k)\.jpg$/.exec(url||'');if(!m)return null;
 let [,folder,asset,res]=m;
 const aliases={'vesper-asphalt':['cc0','asphalt_03'],'vesper-concrete':['cc0','concrete_floor'],'vesper-steel':['ligne9','l9-metal_plate']};
 if(aliases[asset]){[folder,asset]=aliases[asset];res='512';}
 if(folder==='cc0'&&!['asphalt_03','concrete_floor','corrugated_iron','rusty_painted_metal'].includes(asset))return null;
 const base='./assets/'+folder+'/'+asset,normal=folder==='ligne9'?'nor':'normal';
 return {diff:`${base}_diff_${res}.jpg`,normal:`${base}_${normal}_${res}.jpg`,rough:`${base}_rough_${res}.jpg`};
}
export function metricGround(T,width,depth,tile){
 const g=new T.PlaneGeometry(width,depth),uv=g.attributes.uv;
 for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*width/tile,uv.getY(i)*depth/tile);
 return g;
}
export function createPhotoResponse(T,{low=false,loader=new T.TextureLoader()}={}){
 const cache=new Map(),pending=[],owned=new Set(),stats={bindings:0,loaded:0,failed:0};let disposed=false;
 const load=(url,srgb,source)=>{const key=url+'|'+source.repeat.toArray()+'|'+source.offset.toArray();if(cache.has(key))return cache.get(key);
  const task=new Promise(resolve=>loader.load(url,t=>{if(disposed){t.dispose();resolve(null);return;}t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.copy(source.repeat);t.offset.copy(source.offset);t.center.copy(source.center);t.rotation=source.rotation;t.anisotropy=low?2:4;owned.add(t);stats.loaded++;resolve(t);},undefined,()=>{stats.failed++;resolve(null);}));cache.set(key,task);return task;
 };
 return {bind(material,url){const set=surfaceSet(url);if(!set||!material.map)return material;stats.bindings++;material.userData.photoSet=set;
  const source=material.map,slots=[['rough','roughnessMap'],...(low?[]:[['normal','normalMap']])];
  // The albedo aliases must use the same scan as its relief. Keep the chapter's tint.
  if(set.diff!==url)slots.push(['diff','map']);
  for(const [channel,slot]of slots)pending.push(load(set[channel],channel==='diff',source).then(t=>{if(!t||disposed)return;material[slot]=t;if(channel==='normal'){material.normalScale.set(.42,.42);material.bumpMap=null;}material.needsUpdate=true;}));
  return material;
 },get ready(){return Promise.all(pending);},stats:()=>({...stats,textures:owned.size}),dispose(){disposed=true;for(const t of owned)t.dispose();owned.clear();}};
}
// Small radiance probe for worlds that supplied no indirect light at all.
// Linear HDR values form broad sky/ground light and two soft practical sources.
export function createWorldRadiance(T,{cool=0xa6d8ee,warm=0xffbc85,width=64,height=32,low=false}={}){
 const data=low?new Uint8Array(width*height*4):new Uint16Array(width*height*4),a=new T.Color(cool),b=new T.Color(warm);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const u=(x+.5)/width,v=(y+.5)/height,up=Math.max(0,Math.sin((v-.5)*Math.PI));
  const dx=Math.min(Math.abs(u-.23),1-Math.abs(u-.23)),dy=v-.62,soft=Math.exp(-(dx*dx/.005+dy*dy/.015));
  const dx2=Math.min(Math.abs(u-.73),1-Math.abs(u-.73)),soft2=Math.exp(-(dx2*dx2/.009+(v-.55)**2/.025));
  const i=(y*width+x)*4;for(let k=0;k<3;k++){const c=k===0?'r':k===1?'g':'b';const value=.045+a[c]*(.11+up*.22+soft*2.1)+b[c]*(soft2*1.25);data[i+k]=low?Math.round(Math.min(1,value)*255):T.DataUtils.toHalfFloat(value);}data[i+3]=low?255:T.DataUtils.toHalfFloat(1);
 }
 const texture=new T.DataTexture(data,width,height,T.RGBAFormat,low?T.UnsignedByteType:T.HalfFloatType);texture.mapping=T.EquirectangularReflectionMapping;texture.colorSpace=T.LinearSRGBColorSpace;texture.needsUpdate=true;texture.name='Vesper / radiance diffuse et sources de travail';return texture;
}
export function fillWorldRadiance(T,parent,palette){let scene=parent;while(scene&&!scene.isScene)scene=scene.parent;if(!scene||scene.environment)return null;const texture=createWorldRadiance(T,palette);scene.environment=texture;const previous=scene.environmentIntensity;scene.environmentIntensity=.48;
 return {texture,dispose(){if(scene.environment===texture){scene.environment=null;scene.environmentIntensity=previous;}texture.dispose();}};
}
