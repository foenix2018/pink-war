// Shared footprints: rendering and combat use the same continuous perimeter.
export const PERIMETER_WALLS=Object.freeze([
  {x:-99.1,z:0,hx:.1,hz:100,height:1.05},
  {x:99.1,z:0,hx:.1,hz:100,height:1.05},
  {x:0,z:-99.1,hx:100,hz:.1,height:1.05},
  {x:0,z:99.1,hx:100,hz:.1,height:1.05}
].map(w=>Object.freeze({...w,perimeter:true,surface:'metal'})));

// Whole footprints stay outside the playable square, including at corners.
// Close civic blocks and more distant towers give the skyline depth.
export const OUTER_BUILDINGS=Object.freeze(Array.from({length:64},(_,i)=>{
  const side=i%4,j=Math.floor(i/4),near=j<9;
  const along=near?-164+j*41:-230+(j-9)*76;
  const depth=near?123+(j%3)*13:197+(j%3)*20;
  const x=side===0?-depth:side===1?depth:along;
  const z=side===2?-depth:side===3?depth:along;
  return Object.freeze({id:i,x,z,width:near?13+(j%4)*2:16+(j%3)*4,depth:near?12+(j%3)*2:15+(j%4)*3,
    height:near?14+(j*11%29):38+(j*17%42),near,shape:i%4});
}));
