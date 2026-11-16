// Adapted from the user's rideau_webgpu.html: fixed pleats, three travelling
// ripples and a slow gust. The attachment row never moves with the wind.
export function sampleFabricWind(u,v,time,wind=1,out={}){
 v=Math.max(0,Math.min(1,v));
 if(v===0||wind===0){out.x=out.y=out.z=0;return out;}
 const slack=v**1.5,gust=.80+.20*Math.sin(time*.49+u*4);
 out.x=wind*slack*(.13*Math.sin(time*.90+u*3.5)+.050*Math.sin(time*1.32+v*3)) + wind*.027*v**2.1;
 out.y=wind*.012*v*v*Math.sin(time*2.10-u*12);
 out.z=wind*gust*slack*(.185*Math.sin(time*1.68-u*10+v*5.4)+.068*Math.sin(time*2.25+u*23-v*7.6)+.030*Math.sin(time*.62+u*4.5+v*13));
 return out;
}

export function sampleCurtainPoint(u,v,time,{width=2.6,height=1.95,phase=0,wind=.24}={},out={}){
 sampleFabricWind(u,v,time+phase,wind,out);
 out.x+=(u-.5)*width;
 out.y-=height*v;
 out.z+=.075*Math.cos(u*Math.PI*12);
 return out;
}
