// Local, deterministic surface maps. No downloads during a mission.
export function createBreachTextures(T){
 const owned=[];let seed=991;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 function texture(kind){const cv=document.createElement('canvas');cv.width=cv.height=512;const c=cv.getContext('2d');
 const colors={steel:['#62717b','#202c34'],wall:['#626770','#252c37'],floor:['#626668','#272d32'],crate:['#6d7265','#2d3c39'],rock:['#66616b','#302c3e'],concrete:['#8c9295','#51585f'],tarmac:['#40474c','#222a32']};const [base,dark]=colors[kind];c.fillStyle=base;c.fillRect(0,0,512,512);
 for(let i=0;i<13000;i++){const v=Math.floor(30+random()*110);c.fillStyle=`rgba(${v},${v},${v},${.08+random()*.22})`;c.fillRect(random()*512,random()*512,kind==='rock'?2+random()*8:1+random()*3,1+random()*2);}
 if(kind==='concrete'){c.fillStyle='#555f65';c.fillRect(0,0,512,3);c.fillRect(0,0,3,512);for(let i=0;i<60;i++){c.fillStyle='rgba(30,35,40,.12)';c.fillRect(random()*512,random()*512,1+random()*18,1);}}
 else if(kind==='tarmac'){for(let i=0;i<7000;i++){c.fillStyle=i%2?'#566068':'#29323a';c.fillRect(random()*512,random()*512,1+random()*2,1+random()*2);}}
 else if(kind==='floor'){for(let y=0;y<512;y+=32)for(let x=0;x<512;x+=32){c.save();c.translate(x+8,y+8);c.rotate(Math.PI/4);c.fillStyle='#a3a6a0';c.fillRect(-1,-1,15,3);c.fillStyle=dark;c.fillRect(0,3,15,2);c.restore();}}
 else if(kind==='crate'){for(let x=12;x<512;x+=32){c.fillStyle=dark;c.fillRect(x,0,7,512);c.fillStyle='#969d89';c.fillRect(x+8,0,2,512);}}
 else if(kind==='wall'){for(let x=0;x<512;x+=128){c.fillStyle=dark;c.fillRect(x,0,4,512);c.fillRect(x,254,128,5);}for(let i=0;i<18;i++){c.fillStyle='rgba(21,25,30,.20)';c.fillRect(random()*512,random()*512,4+random()*20,30+random()*120);}}
 else if(kind==='steel'){c.fillStyle=dark;c.fillRect(0,0,512,6);c.fillRect(0,0,6,512);for(const y of [17,495])for(const x of [17,495]){c.fillStyle='#c5c9cb';c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fill();c.fillStyle=dark;c.fillRect(x-2,y,4,1);}}
 if(kind!=='rock'){for(let i=0;i<150;i++){c.fillStyle=i%3?'rgba(201,194,168,.23)':'rgba(60,31,14,.28)';c.fillRect(random()*512,random()*512,1+random()*35,1);}c.fillStyle='rgba(73,37,16,.3)';c.fillRect(2,5,4,502);}
 const t=new T.CanvasTexture(cv);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;owned.push(t);return t;}
 const maps=Object.fromEntries(['steel','wall','floor','crate','rock','concrete','tarmac'].map(k=>[k,texture(k)]));return {maps,owned};
}
