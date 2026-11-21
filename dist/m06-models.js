// CHAPITRE 06 — the foundry's cooling circuit and breaker cabinets, modelled in Blender (tools/blender/m06_assets.py):
// the coolant pump and the gate valve beside the furnace, the relay cabinets behind the three breakers of the heavy chain
// and the overhead pipe bundles of the casting hall. Loader shared with the other chapters; the code-built boxes stay
// as the fallback if a file is missing.
import { loadBlenderModels } from './blender-models.js';
export const M06_MODEL_FILES = Object.freeze({ pump: 'pump', valve: 'valve', relay: 'relay_cabinet', bundle: 'pipe_bundle' });
// Overhead bundles of the casting hall (x, z, yaw): they run over the walkways at 2.2–2.9 m, above every collider.
export const M06_BUNDLES = Object.freeze([[-20, -15.5, 0], [20, -15.5, 0], [-20, 62, 0], [20, 62, 0]]);
// The breaker cabinets face the room (west); the pump and valve face the furnace.
export const M06_YAW = Object.freeze({ pump: 0, valve: 0, relay: -Math.PI / 2 });
export const loadFoundryModels = (T, { M, base = './assets/m06/models/', low = false, fetchImpl = globalThis.fetch } = {}) =>
  loadBlenderModels(T, { files: M06_MODEL_FILES, M, base, low, fetchImpl });
