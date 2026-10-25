// Original deterministic surface channels for close-up equipment. No network.
export function createMachineFinishes(T,{performance=false}={}){
 const textures=[],materials=[],size=performance?128:256;
 function finish(name,base,roughness,metalness){
  const color=new Uint8Array(size*size*4),orm=new Uint8Array(color.length),height=new Uint8Array(color.length);let seed=357;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/4294967296;
   const brushed=name==='steel',grain=brushed?Math.sin(y*2.7)*.025:(noise-.5)*.035;
   const scratch=brushed&&noise>.985?.13:0,chip=name==='paint'&&noise>.995;
   const weave=name==='fabric'?((x%4<2)===(y%4<2)?.065:-.065):0;
   const v=1+grain+scratch+weave,offset=(y*size+x)*4;
   for(let k=0;k<3;k++){color[offset+k]=Math.min(255,Math.round((chip?[91,96,94][k]:base[k])*v));height[offset+k]=Math.round(127+(noise-.5)*(brushed?8:18));}
   color[offset+3]=orm[offset+3]=height[offset+3]=255;orm[offset]=255;orm[offset+1]=Math.round(Math.min(1,roughness+(noise-.5)*.09)*255);orm[offset+2]=Math.round((chip?.75:metalness)*255);
  }
  const tex=(data,srgb=false)=>{const t=new T.DataTexture(data,size,size,T.RGBAFormat);t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;t.needsUpdate=true;textures.push(t);return t;};
  const m=new T.MeshStandardMaterial({map:tex(color,true),roughnessMap:tex(orm),metalnessMap:null,bumpMap:tex(height),bumpScale:name==='rubber'?.0007:.0015,roughness:1,metalness:1});m.metalnessMap=m.roughnessMap;m.name='Vesper / '+name;materials.push(m);return m;
 }
 const paint=finish('paint',[101,113,110],.68,.12),steel=finish('steel',[143,151,154],.39,.86),rubber=finish('rubber',[27,32,33],.91,0);
 const fabric=finish('fabric',[91,101,83],.96,0);
 return {paint,steel,rubber,fabric,dispose(){for(const m of materials)m.dispose();for(const t of textures)t.dispose();}};
}
