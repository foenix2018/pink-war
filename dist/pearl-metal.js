import * as T from './vendor/three.webgpu.min.js';

// Tinted metal under a thin pearlescent lacquer. The light, not emission,
// reveals the finish as the equipment turns; black mechanisms stay readable.
export function pearlMetal(accent,light=false){
  return {color:new T.Color(accent).lerp(new T.Color(0xf3f1f5),light?.64:.19),
    metalness:light?.74:.82,roughness:light?.30:.27,clearcoat:.92,
    clearcoatRoughness:.18,iridescence:.24,iridescenceIOR:1.34,
    iridescenceThicknessRange:[185,305],envMapIntensity:.8};
}
export function tintPearl(material,accent,light=false){
  material.color.copy(pearlMetal(accent,light).color);
}
