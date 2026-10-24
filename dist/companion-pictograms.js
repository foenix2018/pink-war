// Shared symbols in HUD, menu proposals and the left-wrist canvas.
const lines={
 gaby:'M16 5 25 9V16C25 22 16 27 16 27S7 22 7 16V9L16 5Z',
 cara:'M13 5 7 11V21L13 27M19 5 25 11V21L19 27M16 10V22M10 16H22'
};
export const companionSymbol=hero=>hero==='LYLU'||hero==='lylu'||hero==='Cara'?'cara':'gaby';
export function companionPictogram(hero){
 const kind=companionSymbol(hero);
 return '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><circle cx="16" cy="16" r="14" stroke-opacity=".32"/><path d="'+lines[kind]+'"/><circle cx="16" cy="16" r="2" fill="currentColor" stroke="none"/></svg>';
}
export function paintCompanionPictogram(c,hero,{x=384,y=320,size=300,color='#ff65b1'}={}){
 c.save();c.translate(x-size/2,y-size/2);c.scale(size/32,size/32);c.strokeStyle=color;c.fillStyle=color;c.lineWidth=1.5;c.lineJoin='round';c.lineCap='round';
 c.globalAlpha=.32;c.beginPath();c.arc(16,16,14,0,Math.PI*2);c.stroke();c.globalAlpha=1;c.beginPath();
 if(companionSymbol(hero)==='gaby'){
  c.moveTo(16,5);c.lineTo(25,9);c.lineTo(25,16);c.bezierCurveTo(25,22,16,27,16,27);c.bezierCurveTo(16,27,7,22,7,16);c.lineTo(7,9);c.closePath();
 }else{
  c.moveTo(13,5);c.lineTo(7,11);c.lineTo(7,21);c.lineTo(13,27);c.moveTo(19,5);c.lineTo(25,11);c.lineTo(25,21);c.lineTo(19,27);
  c.moveTo(16,10);c.lineTo(16,22);c.moveTo(10,16);c.lineTo(22,16);
 }
 c.stroke();c.beginPath();c.arc(16,16,2,0,Math.PI*2);c.fill();c.restore();
}
