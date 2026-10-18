import * as T from './vendor/three.webgpu.min.js';
import {equipmentSurfaces} from './equipment-surfaces.js';

let cached;
export const ARMOR_LABELS=Object.freeze({lylu:[.515,.03,.46,.20],ghju:[.515,.28,.46,.20],core:[.515,.53,.46,.20],warning:[.515,.78,.46,.20]});
const glyphs={A:['01110','10001','10001','11111','10001','10001','10001'],E:['11111','10000','10000','11110','10000','10000','11111'],G:['01111','10000','10000','10111','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['111','010','010','010','010','010','111'],J:['00111','00010','00010','00010','10010','10010','01100'],L:['10000','10000','10000','10000','10000','10000','11111'],P:['11110','10001','10001','11110','10000','10000','10000'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100'],W:['10001','10001','10001','10101','10101','10101','01010'],Y:['10001','10001','01010','00100','00100','00100','00100'],0:['01110','10011','10101','10101','11001','10001','01110'],7:['11111','00001','00010','00100','01000','01000','01000'],'/':['00001','00010','00010','00100','01000','01000','10000'],'-':['00000','00000','00000','11111','00000','00000','00000']};
// The armour's own atlas adds painted serials to the existing metal grain.
// Gloves keep their original maps. Everything still merges into seven skins.
export function armorSurfaceAtlas(){
 if(cached)return cached;const size=512,data=new Uint8Array(size*size*4),metal=equipmentSurfaces().metal.image;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4;data[i+3]=255;if(x<256&&y<256){const j=(y*256+x)*4;data.set(metal.data.subarray(j,j+4),i);}else{data[i]=data[i+1]=data[i+2]=17;}}
 const rect=(x,y,w,h,c)=>{for(let j=Math.max(0,y);j<Math.min(size,y+h);j++)for(let k=Math.max(0,x);k<Math.min(size,x+w);k++){const i=(j*size+k)*4;data[i]=data[i+1]=data[i+2]=c;}};
 const text=(value,x,y,scale,c)=>{for(const ch of value){const rows=glyphs[ch];if(rows)for(let j=0;j<rows.length;j++)for(let k=0;k<rows[j].length;k++)if(rows[j][k]==='1')rect(x+k*scale,y+j*scale,scale,scale,c);x+=6*scale;}};
 for(const [id,region] of Object.entries(ARMOR_LABELS)){
  const [x,y,w,h]=region.map(n=>Math.round(n*size));rect(x,y,w,2,118);rect(x,y+h-2,w,2,118);rect(x,y,2,h,118);rect(x+w-2,y,2,h,118);
  text(id==='core'?'AEGIS IV':id==='warning'?'PW / 07':id.toUpperCase(),x+17,y+14,id==='core'?4:5,237);
  text(id==='warning'?'P-07':'SERIE 07',x+19,y+67,2,136);
 }
 cached=new T.DataTexture(data,size,size,T.RGBAFormat);cached.colorSpace=T.SRGBColorSpace;cached.generateMipmaps=true;cached.minFilter=T.LinearMipmapLinearFilter;cached.magFilter=T.LinearFilter;cached.needsUpdate=true;return cached;
}

export function armorLabelGeometry(width,height,id){
 // Bake clones non-indexed geometry with its stencil tag. Indexed conversion
 // discards userData and would incorrectly remap the lettering into the grain.
 const g=new T.PlaneGeometry(width,height).toNonIndexed(),uv=g.attributes.uv,[x,y,w,h]=ARMOR_LABELS[id];
 for(let i=0;i<uv.count;i++)uv.setXY(i,x+uv.getX(i)*w,y+(1-uv.getY(i))*h);
 // Native armour faces -Z; the printing has the same outward winding.
 g.rotateY(Math.PI);g.userData.armorStencil=true;return g;
}
