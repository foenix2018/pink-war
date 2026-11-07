// Shared positions for substantial enclave dressing and its physical footprints.
export const ENCLAVE_STACKS=[[-29,82.5,3,.2],[-29,83.4,2,0],[-29,96.6,3,.1],[-27.8,97.2,2,.4],[10.8,96.8,3,0],[10.8,82.8,2,.3],[-11,82.4,2,0]];
export const ENCLAVE_BARRELS=[[-29.2,88.8],[-29.2,90.4],[10.9,89.2],[-11.3,97.2],[-5.2,97.3]];
export const ENCLAVE_SACKS=[[-29.1,86],[-1.2,97.2],[10.8,94.9]];
export const DOCK_PALLETS=[[22,-95.5],[26,-95.3],[42,-95.3],[44,-95.3]];
// Leave the supply cache at (-20,87) clear; furniture stays between the stall rows.
export const RATION_BENCH_Z=89,RATION_TABLE_Z=90.3;
export function enclaveLifeSolids(){
 const boxes=[],add=(x,z,hx,hz,height,surface='wood')=>boxes.push({kind:'life-solid',lifeSolid:true,extension:true,x,z,hx,hz,y:0,height,surface});
 for(const [x,z,n] of ENCLAVE_STACKS)add(x,z,.42,.42,n*.46);
 for(const [x,z] of ENCLAVE_BARRELS)add(x,z,.3,.3,.93,'metal');
 for(const [x,z] of ENCLAVE_SACKS)add(x,z,.33,.26,.65,'fabric');
 add(-18.5,RATION_BENCH_Z,1.6,.25,.54);add(-18.5,RATION_TABLE_Z,1.6,.45,.82);
 add(25.6,88.8,.45,.275,.95,'metal');add(33.1,83.6,.19,.19,.53);
 for(const x of [-10,10])add(x,-80,1.1,.25,.54,'metal');
 for(const [x,z] of DOCK_PALLETS)add(x,z,.6,.48,.84);
 return boxes;
}
