// MISSION 04 — the station's centrepieces modelled in Blender (tools/blender/m04_assets.py): the reactor, the oil
// transformers and the drone racks, on the scanned surfaces of m04-station.js. Loader shared with the other chapters.
import { loadBlenderModels, parsePWM, boxUV } from './blender-models.js';
export { parsePWM, boxUV };
export const M04_MODEL_FILES = Object.freeze({ reactor: 'reactor', transformer: 'transformer', rack: 'drone_rack' });
export const loadStationModels = (T, { M, base = './assets/m04/models/', low = false, fetchImpl = globalThis.fetch } = {}) =>
  loadBlenderModels(T, { files: M04_MODEL_FILES, M, alias: { glowMagenta: 'ledMagenta' }, base, low, fetchImpl });
