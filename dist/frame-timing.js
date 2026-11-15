// Keep real elapsed time during ordinary mobile frame drops. Bound long stalls
// (background tabs, loading, device recovery) so returning cannot teleport a player.
export const MAX_FRAME_DELTA=.125;
export const MAX_SIMULATION_STEP=.05;
export function frameDelta(elapsed,xr=false){
 return Number.isFinite(elapsed)?Math.max(0,Math.min(elapsed,xr ? .04 : MAX_FRAME_DELTA)):0;
}
export function simulationSlices(elapsed){
 const dt=frameDelta(elapsed),count=Math.max(1,Math.ceil(dt/MAX_SIMULATION_STEP));
 return {count,dt:dt/count};
}
