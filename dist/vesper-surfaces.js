// Original, deterministic PBR micro-surfaces. Shared channels per material
// family, generated once; no external download and no per-frame uploads.
export function createVesperSurfaces(T, {low = false} = {}) {
  const size = low ? 64 : 128, cache = new Map(), textures = [];
  const clamp = n => Math.max(0, Math.min(255, Math.round(n)));
  const noise = (x, y) => { let n = Math.imul(x + 13, 374761393) ^ Math.imul(y + 37, 668265263); n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296; };
  function channels(kind) {
    if (cache.has(kind)) return cache.get(kind);
    const color = new Uint8Array(size * size * 4), orm = new Uint8Array(color.length), relief = new Uint8Array(color.length);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size, n = noise(x, y), coarse = noise(Math.floor(x / 7), Math.floor(y / 7));
      let value = .92 + (n - .5) * .06, rough = .72, metal = 0, h = .5, rgb = [1, 1, 1];
      if (kind === 'steel' || kind === 'copper') {
        const grain = Math.sin(v * Math.PI * 2 * 47) * .025, scratch = n > .992 ? .07 : 0;
        value = .91 + grain + scratch; rough = .34 + (n - .5) * .10; metal = kind === 'copper' ? .84 : .9; h += grain * .3;
      } else if (kind === 'paint') {
        const chip = coarse > .965 && n > .75, scrape = n > .9994;
        value = chip ? .74 + n * .08 : .96 + (n - .5) * .035; rough = chip ? .65 : .57 + (n - .5) * .07; metal = chip ? .8 : .035; h += chip ? -.07 : (n - .5) * .025;
        if (scrape) { value = .85; rough = .38; metal = .65; }
      } else if (kind === 'wood') {
        const warp = Math.sin(u * Math.PI * 4) * .35 + Math.sin(v * Math.PI * 2) * .16;
        const grain = Math.sin((u * 17 + warp) * Math.PI * 2), pore = Math.pow(Math.abs(Math.sin((u * 71 + warp) * Math.PI * 2)), 16);
        value = .86 + grain * .035 - pore * .035 + (n - .5) * .02; rough = .79 + pore * .08; h += grain * .025 - pore * .04; rgb = [1, .96, .89];
      } else if (kind === 'fabric') {
        const thread = ((x % 4 < 2) === (y % 4 < 2) ? 1 : -1), seam = x % 4 === 0 || y % 4 === 0;
        value = .87 + thread * .055 + (n - .5) * .06; rough = .96; h += thread * .08 + (seam ? -.06 : 0);
      } else if (kind === 'rubber') {
        value = .83 + n * .13; rough = .91 + (n - .5) * .05; h += (n - .5) * .055;
      } else if (kind === 'paper') {
        value = .9 + (n - .5) * .08 + Math.sin(v * Math.PI * 2) * .025; rough = .94; h += (n - .5) * .03;
      } else if (kind === 'soil') {
        value = .62 + coarse * .30 + (n - .5) * .12; rough = 1; h = .25 + coarse * .4 + n * .12; rgb = [1, .91, .76];
      } else if (kind === 'bark') {
        const ridge = Math.abs(Math.sin((u * 11 + Math.sin(v * Math.PI * 4) * .15) * Math.PI));
        value = .62 + ridge * .3 + (n - .5) * .08; rough = .98; h = .26 + ridge * .4;
      } else if (kind === 'leaf') {
        const vein = Math.exp(-Math.abs(u - .5) * 150), branches = Math.pow(Math.max(0, Math.cos((v * 11 + Math.abs(u - .5) * 3) * Math.PI * 2)), 20);
        value = .75 + Math.sin(v * Math.PI) * .16 + vein * .12 + branches * .045 + (n - .5) * .04;
        rough = .64 + v * .16; h += vein * .15 + branches * .05; rgb = [1, 1, .88];
      } else if (kind === 'ceramic') {
        value = .97 + (n - .5) * .02; rough = .24 + (n - .5) * .025; h += (n - .5) * .01;
      }
      const i = (y * size + x) * 4;
      for (let k = 0; k < 3; k++) { color[i + k] = clamp(value * rgb[k] * 255); relief[i + k] = clamp(h * 255); }
      orm[i] = 255; orm[i + 1] = clamp(rough * 255); orm[i + 2] = clamp(metal * 255); color[i + 3] = orm[i + 3] = relief[i + 3] = 255;
    }
    const tex = (data, srgb = false) => {
      const t = new T.DataTexture(data, size, size, T.RGBAFormat); t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace;
      t.wrapS = t.wrapT = T.RepeatWrapping; t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter;
      t.generateMipmaps = true; t.anisotropy = low ? 1 : 4; t.needsUpdate = true; textures.push(t); return t;
    };
    const result = {color: tex(color, true), orm: tex(orm), bump: low ? null : tex(relief)}; cache.set(kind, result); return result;
  }
  return {
    apply(material, kind) {
      const t = channels(kind); material.map = t.color; material.roughnessMap = material.metalnessMap = t.orm;
      material.roughness = material.metalness = 1; material.bumpMap = t.bump;
      material.bumpScale = kind === 'soil' || kind === 'bark' ? .008 : kind === 'fabric' ? .0015 : .0007;
      material.userData.tile = ({wood:.24,fabric:.045,steel:.08,copper:.08,paper:.15,rubber:.12,soil:.35,bark:.5})[kind] || .45;
      material.userData.surfaceFamily = kind; material.needsUpdate = true; return material;
    },
    stats: () => ({families: cache.size, textures: textures.length, size, bytes: textures.reduce((n, t) => n + t.image.data.byteLength, 0)}),
    dispose() { for (const t of textures) t.dispose(); cache.clear(); textures.length = 0; }
  };
}
