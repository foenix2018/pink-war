// Shared procedural surfaces. THREE is supplied by the caller; no renderer dependency.
export function createMaterials(T) {
  let seed = 21429;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  function grain(kind, repeat = 1) {
    const size = 128, pixels = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const n = random();
      let v = 125 + n * 28;
      if (kind === 'brushed') v = 132 + Math.sin(y * 2.1) * 10 + n * 9;
      if (kind === 'lens') v = ((x % 8 < 3) !== (y % 8 < 3) ? 195 : 90) + n * 7;
      if (kind === 'floor') v = n > .95 ? 210 : 110 + n * 30;
      const i = (y * size + x) * 4;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = v; pixels[i + 3] = 255;
    }
    const t = new T.DataTexture(pixels, size, size);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat, repeat);
    t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter;
    t.generateMipmaps = true; t.needsUpdate = true; return t;
  }
  const paintGrain = grain('fine', 10), plasticGrain = grain('fine', 5);
  const brushed = grain('brushed', 6), prism = grain('lens', 2), floorGrain = grain('floor', 6);
  const physical = p => {if(Number(T.REVISION)<150){p={...p};delete p.specularIntensity;delete p.ior;}return new T.MeshPhysicalMaterial(p);};
  const standard = p => new T.MeshStandardMaterial(p);
  const white = physical({color:0xe9eef1, roughness:.25, metalness:0,
    clearcoat:1, clearcoatRoughness:.14, bumpMap:paintGrain, bumpScale:.00035});
  const trim = standard({color:0xbec9cd, metalness:.78, roughness:.38, bumpMap:brushed, bumpScale:.0008});
  const dark = standard({color:0x1d242a, roughness:.72, bumpMap:plasticGrain, bumpScale:.0012});
  const rubber = standard({color:0x17191b, roughness:.94, bumpMap:plasticGrain, bumpScale:.0014});
  const metal = standard({color:0xc5cbd0, metalness:1, roughness:.23, bumpMap:brushed, bumpScale:.00045});
  // Opaque privacy glass on the patient compartment; translucent laminated cab glass.
  const glass = physical({color:0x142e39, metalness:0, roughness:.075, ior:1.52,
    clearcoat:1, clearcoatRoughness:.04, specularIntensity:1, side:T.DoubleSide});
  const cabGlass = physical({color:0x759da3, metalness:0, roughness:.065,
    transparent:true, opacity:.48, depthWrite:false, ior:1.52, clearcoat:1, clearcoatRoughness:.035,
    side:T.DoubleSide});
  const vinyl = color => physical({color, roughness:.34, metalness:0, clearcoat:.65, clearcoatRoughness:.21});
  const lens = (color, emissive) => physical({color, roughness:.18, metalness:0,
    clearcoat:1, clearcoatRoughness:.1, bumpMap:prism, bumpScale:.0018,
    emissive, emissiveIntensity:.12});
  const blue = vinyl(0x0062a5), yellow = vinyl(0xdce719), red = vinyl(0xc31b24);
  const floor = standard({color:0x8f9b9d, roughness:.92, bumpMap:floorGrain, bumpScale:.0018});
  const orange = vinyl(0xd96b28), upholstery = standard({color:0x25323b, roughness:.92, bumpMap:plasticGrain, bumpScale:.001});
  const mattress = standard({color:0xcb6d35, roughness:.63, bumpMap:paintGrain, bumpScale:.0007});
  const whiteLens = lens(0xe3eff8, 0xc0daef), blueLens = lens(0x0066c9, 0x002a72);
  const redLens = lens(0xb40c19, 0x5e0308), amberLens = lens(0xdc7b15, 0x6d3504);
  const mirror = physical({color:0xc4d3db, metalness:1, roughness:.055});
  return {white, trim, dark, rubber, metal, glass, cabGlass, blue, yellow, red, floor, orange,
    upholstery, mattress, whiteLens, blueLens, redLens, amberLens, mirror};
}


const caches = new WeakMap();
export function bevelBox(T,w,h,d,r = .025) {
  let geometries=caches.get(T);if(!geometries){geometries=new Map();caches.set(T,geometries);}
  r = Math.min(r,w*.24,h*.24,d*.24);
  const key = [w,h,d,r].join(':'); if (geometries.has(key)) return geometries.get(key);
  const g = new T.BoxGeometry(w,h,d,4,4,4), p = g.attributes.position, n = g.attributes.normal;
  const inner = new T.Vector3(w/2-r,h/2-r,d/2-r), c = new T.Vector3(), v = new T.Vector3();
  for(let i=0;i<p.count;i++) {
    v.fromBufferAttribute(p,i);
    c.set(T.MathUtils.clamp(v.x,-inner.x,inner.x),T.MathUtils.clamp(v.y,-inner.y,inner.y),T.MathUtils.clamp(v.z,-inner.z,inner.z));
    const norm = v.clone().sub(c).normalize(); v.copy(c).addScaledVector(norm,r);
    p.setXYZ(i,v.x,v.y,v.z); n.setXYZ(i,norm.x,norm.y,norm.z);
  }
  g.computeBoundingBox(); g.computeBoundingSphere(); geometries.set(key,g); return g;
}

export function chevronTexture(T) {
  const c=document.createElement('canvas');c.width=256;c.height=256;const ctx=c.getContext('2d');
  ctx.fillStyle='#e6ed26';ctx.fillRect(0,0,256,256);ctx.fillStyle='#d7212e';
  for(let y=-320;y<520;y+=85){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y+164);ctx.lineTo(256,y+204);ctx.lineTo(0,y+40);ctx.fill();}
  const t=new T.CanvasTexture(c);if(T.SRGBColorSpace)t.colorSpace=T.SRGBColorSpace;else t.encoding=T.sRGBEncoding;return t;
}
