// Full structural closure above the new workshop and the original lab fragments.
// Other ground-floor ceilings sit below existing concrete floor slabs.
export const M01_ROOF_PATCHES=Object.freeze([
 {id:'workshop-east-roof',x:-46.5,y:3.78,z:29,w:17,h:.16,d:20,material:'concrete'},
 {id:'workshop-north-seam',x:-54.5,y:3.78,z:15,w:1,h:.16,d:8,material:'concrete'},
 {id:'lab-roof',x:0,y:5.50,z:60,w:20.5,h:.20,d:20.5,material:'concrete'}
]);
export const M01_CEILING_ROOMS=Object.freeze([
 {id:'workshop',x:-53.5,z:25,w:30.6,d:27.6,y:3.40,roofY:3.70},
 {id:'triage',x:-24,z:59,w:17.5,d:27.5,y:3.28,roofY:3.50},
 {id:'shop',x:-23,z:20,w:19.5,d:33.5,y:3.28,roofY:3.50},
 {id:'connector',x:-12.5,z:59,w:4.6,d:6.7,y:3.20,roofY:3.46},
 {id:'laboratory',x:0,z:60,w:19.4,d:19.4,y:5.05,roofY:5.40}
]);
export const M01_ROOF_COLLIDERS=Object.freeze(M01_ROOF_PATCHES.map(p=>Object.freeze({x:p.x,z:p.z,y:p.y-p.h/2,hx:p.w/2,hz:p.d/2,height:p.h,surface:'concrete',campaign:true,ceiling:p.id})));
