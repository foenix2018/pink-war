// Lightweight still portrait of the existing companion shell. No extra GPU renderer or per-frame textures.
export function paintCompanionPortrait(ctx,hero='ghju',size=128){
 const blue=hero==='lylu',accent=blue?'#65caff':'#ff78bf',glow=blue?'#348dc8':'#d9489e',petals=blue?6:4;
 const c=ctx.canvas;c.width=size;c.height=size;ctx.clearRect(0,0,size,size);ctx.save();ctx.scale(size/128,size/128);
 const radial=(x,y,r,stops)=>{const g=ctx.createRadialGradient(x-13,y-17,1,x,y,r);for(const [a,b] of stops)g.addColorStop(a,b);return g;};
 const bg=ctx.createRadialGradient(62,44,3,64,64,72);bg.addColorStop(0,blue?'#23577b':'#723051');bg.addColorStop(.65,'#121f32');bg.addColorStop(1,'#060d19');
 ctx.fillStyle=bg;ctx.beginPath();ctx.arc(64,64,64,0,Math.PI*2);ctx.fill();
 ctx.save();ctx.shadowColor=glow;ctx.shadowBlur=17;ctx.strokeStyle=accent;ctx.globalAlpha=.6;ctx.lineWidth=1.7;ctx.beginPath();ctx.arc(64,64,53,0,Math.PI*2);ctx.stroke();ctx.restore();
 ctx.fillStyle=radial(64,64,43,[[0,'#b4c6d3'],[.42,blue?'#3c566b':'#777b8c'],[.79,'#121c2a'],[1,'#030813']]);
 ctx.beginPath();ctx.arc(64,64,43,0,Math.PI*2);ctx.fill();
 for(let i=0;i<petals;i++){
   const a=i*Math.PI*2/petals-Math.PI/2;ctx.save();ctx.translate(64,64);ctx.rotate(a);
   const surface=ctx.createLinearGradient(-21,-41,18,-12);surface.addColorStop(0,'#d2d9dc');surface.addColorStop(.38,blue?'#637987':'#abb1b9');surface.addColorStop(.65,blue?'#26394c':'#4a5061');surface.addColorStop(1,'#0a1420');
   ctx.beginPath();ctx.moveTo(-14,-15);ctx.quadraticCurveTo(-26,-39,-12,-45);ctx.quadraticCurveTo(0,-50,12,-45);ctx.quadraticCurveTo(26,-39,14,-15);ctx.quadraticCurveTo(0,-8,-14,-15);ctx.closePath();ctx.fillStyle=surface;ctx.fill();
   ctx.strokeStyle='#dce7f0';ctx.globalAlpha=.7;ctx.lineWidth=1.1;ctx.stroke();ctx.globalAlpha=1;
   ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.shadowColor=accent;ctx.shadowBlur=8;ctx.beginPath();ctx.moveTo(-9,-36);ctx.lineTo(0,-40);ctx.lineTo(9,-36);ctx.stroke();ctx.shadowBlur=0;ctx.restore();
 }
 ctx.fillStyle='#09121e';ctx.strokeStyle='#8796a4';ctx.lineWidth=3.2;ctx.beginPath();ctx.arc(64,64,25,0,Math.PI*2);ctx.fill();ctx.stroke();
 ctx.strokeStyle=accent;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(64,64,21,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle=radial(64,64,19,[[0,accent],[.14,blue?'#78d8ff':'#ff9dd9'],[.4,blue?'#265779':'#79305a'],[.85,'#07121f'],[1,'#040910']]);
 ctx.beginPath();ctx.arc(64,64,18,0,Math.PI*2);ctx.fill();
 ctx.shadowColor=accent;ctx.shadowBlur=14;ctx.fillStyle='#e9faff';ctx.beginPath();ctx.arc(64,64,5.5,0,Math.PI*2);ctx.fill();ctx.restore();
}
