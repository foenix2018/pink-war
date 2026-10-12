import * as T from './vendor/three.webgpu.min.js';

// Small deterministic surface maps generated once. No external assets or per-frame texture work.
export function createSurfaceDetails() {
  const make = (size, paint) => {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    paint(canvas.getContext('2d'),size);
    const texture=new T.CanvasTexture(canvas);texture.wrapS=texture.wrapT=T.RepeatWrapping;
    texture.anisotropy=2;return texture;
  };
  let seed=71;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  const fabric=make(128,(c,n)=>{
    c.fillStyle='#858585';c.fillRect(0,0,n,n);
    for(let y=0;y<n;y+=4)for(let x=0;x<n;x+=4){
      const value=Math.round(104+random()*55);c.fillStyle=`rgb(${value},${value},${value})`;
      c.fillRect(x,y,(x+y)%8?2:3,(x+y)%8?3:2);
    }
  });fabric.repeat.set(5,5);
  const coating=make(128,(c,n)=>{
    const pixels=c.createImageData(n,n);
    for(let i=0;i<pixels.data.length;i+=4){const value=180+Math.floor(random()*31);pixels.data.set([value,value,value,255],i);}
    c.putImageData(pixels,0,0);
  });
  // Low-contrast digital camo is baked into the painted plates, while their
  // palette tint remains character-specific (blue for LYLU, rose for GHJU).
  const armor=make(128,(c,n)=>{
    c.fillStyle='#eeeeee';c.fillRect(0,0,n,n);
    const shades=['#dedede','#e5e5e5','#eaeaea','#f4f4f4','#d7d7d7'];
    for(let i=0;i<74;i++){
      const x=Math.floor(random()*n/4)*4,y=Math.floor(random()*n/4)*4;
      const w=(1+Math.floor(random()*4))*4,h=(1+Math.floor(random()*3))*4;
      c.fillStyle=shades[Math.floor(random()*shades.length)];c.fillRect(x,y,w,h);
    }
    for(let i=0;i<130;i++){
      const x=Math.floor(random()*n),y=Math.floor(random()*n);
      c.fillStyle=i%2?'rgba(255,255,255,.34)':'rgba(25,25,25,.22)';c.fillRect(x,y,1+Math.floor(random()*3),1);
    }
  });armor.colorSpace=T.SRGBColorSpace;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const c=canvas.getContext('2d'),gradient=c.createLinearGradient(0,0,0,256);
  for(const [stop,color] of [[0,'#7e91ac'],[.35,'#acb8c5'],[.49,'#626c80'],[.58,'#2c3343'],[1,'#101722']])gradient.addColorStop(stop,color);
  c.fillStyle=gradient;c.fillRect(0,0,512,256);
  // Baked broad light sources give the visor and brushed metal restrained reflections.
  for(const [x,w,alpha] of [[65,30,.7],[258,65,.45],[406,18,.5]]){
    const strip=c.createLinearGradient(x,0,x+w,0);strip.addColorStop(0,'rgba(245,250,255,0)');strip.addColorStop(.45,`rgba(245,250,255,${alpha})`);strip.addColorStop(1,'rgba(245,250,255,0)');
    c.fillStyle=strip;c.fillRect(x,25,w,100);
  }
  const environment=new T.CanvasTexture(canvas);environment.mapping=T.EquirectangularReflectionMapping;environment.colorSpace=T.SRGBColorSpace;
  return {fabric,coating,armor,environment};
}
