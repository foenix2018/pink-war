// WebGL uses the same basin and cascade positions as the native water shader.
// Bake the shallow edge and the landing foam into the surface's only color map.
export function gardenBasinMap(T, pool, {deep, shallow, foam}) {
  const size = 128, data = new Uint8Array(size * size * 4);
  const rgb = h => [h >> 16, h >> 8 & 255, h & 255];
  const bedColor = rgb(deep), edgeColor = rgb(shallow), spray = rgb(0xd5efe8);
  const smooth = T.MathUtils.smoothstep;
  const co = Math.cos(foam?.yaw || 0), si = Math.sin(foam?.yaw || 0);
  for (let j = 0; j < size; j++) {
    const v = (j + .5) * 2 / size - 1, z = pool.z - v * pool.rz;
    for (let i = 0; i < size; i++) {
      const u = (i + .5) * 2 / size - 1, x = pool.x + u * pool.rx;
      const flow = Math.sin(.72 * x + .59 * z + Math.sin(.27 * z));
      const edge = smooth(Math.hypot(u,v) + .03 * flow, .53, .98) * .69;
      let bubbles = 0;
      if (foam) {
        const dx = x - foam.x, dz = z - foam.z;
        const lateral = dx * co - dz * si, forward = dx * si + dz * co;
        const eddies = Math.sin(.81 * lateral + Math.sin(1.12 * forward)) * .09;
        const distance = Math.hypot(lateral, forward * 1.6) / foam.radius + eddies;
        const patch = .43 + .25 * Math.sin(lateral * 2.34 + forward * 1.4) + .12 * flow;
        bubbles = (1 - smooth(distance, .12, 1)) * patch;
      }
      const at = (j * size + i) * 4;
      for (let c = 0; c < 3; c++) {
        const bed = bedColor[c] + (edgeColor[c] - bedColor[c]) * edge + 2.4 * flow;
        data[at + c] = bed + (spray[c] - bed) * bubbles;
      }
      data[at + 3] = 255;
    }
  }
  const map = new T.DataTexture(data, size, size, T.RGBAFormat);
  map.colorSpace = T.SRGBColorSpace;
  map.minFilter = T.LinearMipmapLinearFilter;
  map.magFilter = T.LinearFilter;
  map.generateMipmaps = true;
  map.needsUpdate = true;
  return map;
}

export function gardenAqueduct(T, pool, lip, low) {
  const geometry = new T.PlaneGeometry(lip.width * .965, 1, low ? 16 : 24, 4);
  geometry.rotateX(-Math.PI / 2);
  const {position, uv} = geometry.attributes;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), t = 1 - uv.getY(i);
    const span = (lip.x + x - pool.x) / pool.rx;
    const edge = pool.z + pool.rz * Math.sqrt(Math.max(0, 1 - span * span));
    const mouth = lip.z + Math.sin(uv.getX(i) * Math.PI) * .16;
    position.setXYZ(i, x, .036 * (1 - t), T.MathUtils.lerp(edge, mouth, t) - lip.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}
