// Raise a decorative service run only when it cuts through the usable headroom
// above an authored walking surface. Cables below decks stay below them.
export function overheadServiceLift(floors,a,b,{clearance=2.4,radius=.05}={}){
 let lift=0;
 for(let pass=0;pass<4;pass++){
  let extra=0;
  for(let i=0;i<=128;i++){
   const t=i/128,x=a[0]+(b[0]-a[0])*t,z=a[2]+(b[2]-a[2])*t,y=a[1]+(b[1]-a[1])*t+lift;
   for(const f of floors){if(f.height<=0||Math.abs(x-f.x)>f.hx+radius||Math.abs(z-f.z)>f.hz+radius)continue;
    if(y+radius>=f.height&&y-radius<f.height+clearance)extra=Math.max(extra,f.height+clearance+radius-y);
   }
  }
  if(extra<.0001)break;lift+=extra+.002;
 }
 return lift;
}
