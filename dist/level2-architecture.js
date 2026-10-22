// W02 - Bas-Niveaux de Vesper. Modular district hard-surface art v2.
// Decorative geometry deliberately does not change pathing. Collider hulls are
// placed independently of detail: no false floors, no blockage from signage.
export function createDistrictArchitecture({T,root,materials,solid,beam,sign,collisions,low,rng}){
  const C=materials;
  const ringGeo=new T.TorusGeometry(1,.07,6,32);
  const prism=(x,y,z,w,h,d,mat,top=1)=>{
    const mesh=new T.Mesh(new T.CylinderGeometry(top,1,h,8,1,false,Math.PI/8),mat);
    mesh.scale.set(w*.48,1,d*.48);mesh.position.set(x,y+h/2,z);
    mesh.castShadow=!low;mesh.receiveShadow=true;root.add(mesh);
    return mesh;
  };
  const cyl=(x,y,z,r,h,mat,seg=12)=>{
    const obj=new T.Mesh(new T.CylinderGeometry(r,r,h,seg),mat);
    obj.position.set(x,y,z);root.add(obj);return obj;
  };
  const thin=(x,y,z,w,h,d,m)=>solid(x,y,z,w,h,d,m,false,false);
  const glassBlue=C.glass,stainless=C.iron,signage=C.cyan,black=C.black;
  const darkTrim=new T.MeshStandardMaterial({color:0x111b27,roughness:.54,metalness:.62});
  const ceramic=new T.MeshStandardMaterial({color:0x536478,roughness:.44,metalness:.3});
  const pastel=new T.MeshStandardMaterial({color:0x2d5065,roughness:.58,metalness:.35});
  const brushed=new T.MeshStandardMaterial({color:0x283544,roughness:.41,metalness:.77});
  const glass=new T.MeshPhysicalMaterial({color:0x173847,metalness:.13,roughness:.13,transparent:true,opacity:.75,depthWrite:true});
  const copper=new T.MeshStandardMaterial({color:0x765c49,roughness:.55,metalness:.7});
  const runoff=new T.MeshBasicMaterial({color:0x101b27,transparent:true,opacity:.19,depthWrite:false});
  const oxidation=new T.MeshStandardMaterial({color:0x63524c,roughness:.89,metalness:.25});
  const dirty=new T.MeshStandardMaterial({color:0x41545b,metalness:.12,roughness:.92});
  const warm=new T.MeshBasicMaterial({color:0xffc38b,toneMapped:false});
  const violet=new T.MeshBasicMaterial({color:0xa567ef,toneMapped:false});
  const red=new T.MeshBasicMaterial({color:0xdd5e52,toneMapped:false});
  const lit=[signage,C.amber,C.blue,warm,violet];
  function panel(x,y,z,sx,sy,m=ceramic,side=1){
    thin(x,y,z,.10,sx,sy,m);
    thin(x-side*.08,y+sx*.45,z,.16,.08,sy,m===ceramic?darkTrim:brushed);
  }
  function archRail(ax,bx,y,z,mat=stainless){
    for(let x=ax;x<=bx+.01;x+=2.1)beam([x,y,z],[x,y+1.16,z],.048,mat,8);
    beam([ax,y+1.12,z],[bx,y+1.12,z],.066,mat,8);
  }
  function balcony(x,y,z,span,side,glowing=false){
    const front=x-side*1.2;
    thin(front,y,z,2.7,.17,span,brushed);
    thin(front-side*.15,y-.26,z,2.6,.39,span,stainless);
    const count=Math.max(2,Math.floor(span/2.1));
    for(let j=0;j<=count;j++){
      const zz=z-span/2+j*span/count;
      beam([front-side*1.12,y,zz],[front-side*1.12,y+1.18,zz],.047,stainless,8);
    }
    beam([front-side*1.12,y+1.13,z-span/2],[front-side*1.12,y+1.13,z+span/2],.055,stainless,8);
    if(glowing)thin(front-side*1.08,y-.09,z,.11,.035,span,C.cyan);
  }
  function advertisement(text,x,y,z,w,h,side=1,col='#73f4fb'){
    // Real facade-mounted emitter, not a floating UI label.
    const canvas=document.createElement('canvas');canvas.width=384;canvas.height=512;
    const g=canvas.getContext('2d');
    g.fillStyle='#070e1c';g.fillRect(0,0,384,512);
    const grad=g.createLinearGradient(0,0,384,512);grad.addColorStop(0,'#0a3041');grad.addColorStop(.55,'#101323');grad.addColorStop(1,'#2b1528');
    g.fillStyle=grad;g.fillRect(9,9,366,494);
    for(let i=0;i<40;i++){g.strokeStyle='rgba(83,203,220,.07)';g.beginPath();g.moveTo(0,i*13);g.lineTo(384,i*13);g.stroke();}
    g.lineWidth=5;g.strokeStyle=col;g.strokeRect(11,11,362,490);
    g.fillStyle=col;g.textAlign='center';g.shadowColor=col;g.shadowBlur=22;
    g.font='900 48px system-ui';g.fillText(text,192,296,350);
    g.font='18px monospace';g.fillText('VESPER / 2196',192,342);
    g.fillRect(102,367,180,7);
    const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
    const mesh=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide,toneMapped:false}));
    mesh.rotation.y=side*Math.PI/2;mesh.position.set(x,y,z);root.add(mesh);
    thin(x+side*.09,y,z,.18,h+.3,w+.3,darkTrim);
    return mesh;
  }
  function facadeFin(x,y,z,h,side,accent){
    thin(x,y,z,.22,h,.18,brushed);
    thin(x-side*.13,y,z,.08,h*.76,.08,accent);
  }
  function roofSet(x,z,y,w,d){
    thin(x,y,z,w*.79,.32,d*.85,brushed);
    for(let i=0;i<4;i++){
      const sx=x+(i%2?1:-1)*w*.17,sz=z+(i>1?1:-1)*d*.22;
      cyl(sx,y+.65,sz,.58,1.2,stainless);
      cyl(sx,y+1.3,sz,.65,.20,brushed);
      beam([sx,y+1.4,sz],[sx,y+3.4,sz],.035,copper,8);
    }
    thin(x,y+.6,z-2,3.6,1.2,1.7,stainless);
    for(let k=0;k<8;k++)thin(x-1.55+k*.43,y+1.35,z-2,.12,.1,1.76,brushed);
  }
  function techWrap(x,z,side,h,d){
    const front=x-side*.20;
    for(let y=6;y<h-3;y+=6.6) {
      const ly=(((y/6.6)|0)%3===0)?C.amber:C.cyan;
      thin(front-side*.06,y,z,.12,.055,d*.77,ly);
      if(y<h-8)balcony(front,y+.55,z,d*.80,side,y%2>0);
    }
    for(const nz of [-d*.36,d*.36]){
      beam([front-side*.38,1.6,z+nz],[front-side*.38,h-2,z+nz],.095,copper,10);
      for(let k=0;k<5;k++){const yy=4+k*(h-7)/5;beam([front-side*.38,yy,z+nz],[front-side*1.25,yy,z+nz],.047,stainless,7);}
    }
  }
  function residentialTower(side,z,idx){
    // Preserve an honest collision envelope while changing rendered architecture.
    const x=side*(23+(idx%2)*3),height=24+(idx*7%28),w=18+(idx%3)*3,d=17;
    collisions.push({x,z,hx:w/2,hz:d/2,y:0,height:height+1,surface:'concrete'});
    const front=x-side*w/2-.19;
    prism(x,.0,z,w*.97,height*.56,d*.96,idx%3===0?ceramic:dirty,.86);
    prism(x,height*.55,z,w*.87,height*.42,d*.84,idx%2?pastel:C.wall,.75);
    const rooftop=height*.97;
    prism(x,rooftop,z,w*.92,1.5,d*.91,brushed,1.02);
    // Terraced cantilever creates a distinct architectural silhouette.
    for(let i=0;i<3;i++){
      let y=5+i*7.2;
      if(y>height-3)continue;
      thin(front-side*.88,y,z,1.9,.48,d*.82,brushed);
      thin(front-side*.95,y+.3,z,2.04,.11,d*.79,darkTrim);
    }
    // Structural glass spine, segmented and recessed.
    for(let y=3.1;y<height-1;y+=3){
      const color=rng()>.48?lit[(idx+y|0)%lit.length]:glassBlue;
      for(let j=-3;j<=3;j++){
        const zz=z+j*2.13;
        if(Math.abs(zz-z)>d*.47)continue;
        thin(front-side*.28,y,zz,.12,1.82,1.18,color);
        thin(front-side*.39,y-.98,zz,.23,.12,1.46,stainless);
        thin(front-side*.39,y+.96,zz,.23,.13,1.46,brushed);
      }
    }
    for(const zz of [z-d*.42,z-d*.22,z+d*.22,z+d*.42])facadeFin(front-side*.55,height*.48,zz,height*.80,side,idx%2?C.cyan:C.amber);
    techWrap(front,z,side,height,d);
    // Localized rain trails and corroded panel seams break the texture repeat.
    // They share two materials and are instanced with the other static boxes.
    for(let n=0;n<11;n++){
      const nz=z-d*.43+n*(d*.86/10),ey=4.2+(n%5)*3.25;
      const streakLength=.85+(n%4)*.48;
      thin(front-side*.72,ey,nz,.06,streakLength,.14,n%4===0?oxidation:runoff);
      if(n%3===0)thin(front-side*.72,ey+streakLength*.58,nz,.09,.035,.52,brushed);
    }
    // External circulation and fire stairs read as real accessible envelopes.
    if(idx%3===0){
      const sx=front-side*1.70;
      for(let j=0;j<Math.floor(height/3.2);j++){
        const y=2.2+j*3.25,zz=z+(j%2?d*.25:-d*.25);
        thin(sx,y,zz,2.3,.19,4.8,brushed);
        beam([sx-side*.85,y+1.13,zz-2.4],[sx-side*.85,y+1.13,zz+2.4],.06,stainless);
      }
    }
    if(idx%2===0)advertisement(idx%4?'NEURO':'VESPER',front-side*.61,Math.min(height-8,14),z+d*.27,2.5,6.4,side,idx%4?'#eeae80':'#6bddf7');
    roofSet(x,z,height+.6,w,d);
    // Neon at the roofline makes the silhouette identifiable from the spawn.
    thin(x, height+1.42,z,w*.76,.13,d*.74,idx%2?C.amber:C.cyan);
  }
  function occupiedMarket(side,z){
    // Tented passage with *no* facade wall across the doorway.
    const x=side*21,w=13,d=16,front=side*12.2,back=side*27;
    thin(x,8.7,z,w,.38,d,brushed);
    thin(x,9.1,z,w-.4,.08,d-.4,C.iron);
    solid(back,4.1,z,.9,8.2,d,dirty,true);
    for(const zz of [z-d/2+.55,z+d/2-.55]){
      solid(side*20.5,3.9,zz,w-.5,7.8,.55,dirty,true);
      thin(side*20.5,7.6,zz,w-.5,.22,.76,brushed);
    }
    // Shutters open through a 5 m entrance, closed in side units.
    for(const zz of [z-5.4,z+5.4]){
      for(let yy=.6;yy<4.3;yy+=.30)thin(front,yy,zz,.23,.16,3.1,brushed);
    }
    beam([front,7.8,z-7.5],[front,7.8,z+7.5],.12,copper);
    for(let k=0;k<3;k++){
      const zz=z-5+k*5.1;
      thin(side*19,.92,zz,3,1.42,1.5,stainless);
      thin(side*19,1.67,zz,3.2,.08,1.68,ceramic);
      thin(side*17.4,2.4,zz,.12,1.2,2.2,k===1?C.amber:C.cyan);
      for(let j=0;j<3;j++)thin(side*(18.6+j*.55),1.77,zz, .24,.2,.65,k%2?C.warning:C.rust);
      thin(side*22,3.5,zz,1.8,.13,3.2,brushed);
      for(let j=0;j<3;j++)thin(side*(21+j*.8),3,zz-.1,.1,1.7,.1,copper);
    }
    // Folded translucent tarpaulins: organic angular profiles among metalwork.
    for(let k=0;k<3;k++){
      const cloth=new T.Mesh(new T.PlaneGeometry(4.6,3.8,3,2),
        new T.MeshStandardMaterial({color:k%2?0x436173:0x645143,roughness:.91,metalness:0,side:T.DoubleSide,transparent:true,opacity:.84}));
      cloth.position.set(side*17.8,7.5,z-5+k*5);
      cloth.rotation.set(-Math.PI/2+.2,side*.10,Math.sin(k*.7)*.11);root.add(cloth);
      beam([side*15,7.4,z-6+k*5],[side*23,7.8,z-6+k*5],.04,copper);
    }
    sign('MARCHE 07',front,6.5,z-5.3,3.8,'#f5b466',side);
    sign('RESEAU',side*24.8,5,z+4,2.9,'#60d5e6',side);
    for(let i=0;i<4;i++){
      const xx=side*(15.0+i*2.5),zz=z+5.2;
      thin(xx,.4,zz,1.55,.8,.66,copper);
      thin(xx,.84,zz,1.68,.09,.76,C.warning);
    }
  }
  function hydrant(x,z){
    cyl(x,.5,z,.19,1.0,C.rust,10);
    cyl(x,1.0,z,.25,.16,C.iron,10);
    beam([x-.34,.65,z],[x+.34,.65,z],.11,C.iron);
  }
  function generator(x,z,side){
    const obj=new T.Group();obj.position.set(x,0,z);root.add(obj);
    const parts=[
      [0,.62,0,1.5,1.2,.76,brushed],[0,1.27,0,1.45,.10,.84,C.iron],
      [-.54,.81,side*.42,.21,.6,.09,C.cyan],[.54,.81,side*.42,.21,.6,.09,C.amber]
    ];
    for(const [sx,y,sz,w,h,d,m] of parts){const me=new T.Mesh(new T.BoxGeometry(w,h,d),m);me.position.set(sx,y,sz);obj.add(me);}
    for(let a=0;a<6;a++)beam([x-.63+a*.24,.31,z+side*.45],[x-.63+a*.24,1.07,z+side*.45],.035,C.black);
    collisions.push({x,z,hx:.76,hz:.39,y:0,height:1.4,surface:'metal'});
  }
  function neonMonorail(){
    // A continuous non-blocking transit spine above the street.
    for(let z=65;z>-68;z-=12){
      for(const side of [-1,1]){
        const x=side*12.8;
        beam([x,10.5,z],[x,21,z],.22,C.iron,10);
        beam([x,20,z],[side*8.7,21.4,z],.13,C.iron,10);
      }
    }
    for(let z=65;z>-68;z-=12){
      thin(0,20.8,z,18.2,.42,.73,brushed);
      thin(0,20.55,z,17.8,.07,.3,C.cyan);
    }
    for(let side of [-1,1])beam([side*8.8,20.8,67],[side*8.8,20.8,-68],.24,stainless,10);
  }
  function coolingUnit(x,z){
    thin(x,1.3,z,2.25,2.2,1.45,dirty);
    for(let i=0;i<6;i++)thin(x,1.1+i*.25,z+.77,1.76,.065,.08,stainless);
    for(const sx of [-.77,.77])cyl(x+sx,2.48,z,.21,.32,brushed);
  }
  function narrativeClutter(){
    // Enclave / LD07 medical dormitory: stretchers, canisters, transformer,
    // captured broadcasts and emergency glow.
    for(let i=0;i<3;i++){
      const zz=56+i*2.1;
      thin(-7,.52,zz,1.65,.16,1.14,ceramic);
      for(const sx of [-.62,.62])for(const dz of [-.45,.45])beam([-7+sx,.1,zz+dz],[-7+sx,.46,zz+dz],.045,brushed);
      thin(-7,.65,zz+.23,1.2,.07,.38,C.plaster);
    }
    generator(7,48,1);
    for(let z=48;z>28;z-=7){
      hydrant(-8.5,z+1);
      coolingUnit(7.8,z-1);
    }
    for(const z of [18,7,-14,-31,-49]){
      generator(8,z,1);
      const pole=8.2;
      beam([pole,2,z+1],[pole,6.8,z+1],.09,copper);
      const hex=new T.Mesh(new T.OctahedronGeometry(.48,0),z%2?C.amber:C.cyan);
      hex.position.set(pole,6.8,z+1);root.add(hex);
    }
    // Duct clusters, stacked service boxes and low-lying local vapour.
    for(let z=38;z>-64;z-=13){
      const side=z%2?1:-1;
      for(let j=0;j<2;j++){
        thin(side*(7.5+j*.7),.85,z+j*1.5,1.05,1.7,1.5,j?copper:stainless);
        thin(side*(7.5+j*.7),1.75,z+j*1.5,1.08,.12,1.64,brushed);
      }
      const texture=document.createElement('canvas');texture.width=texture.height=128;
      const c=texture.getContext('2d'),gr=c.createRadialGradient(64,64,4,64,64,62);
      gr.addColorStop(0,'rgba(190,225,222,.23)');gr.addColorStop(.6,'rgba(116,181,187,.09)');gr.addColorStop(1,'rgba(95,130,142,0)');
      c.fillStyle=gr;c.fillRect(0,0,128,128);
      const fog=new T.Mesh(new T.PlaneGeometry(5.5,3.5),new T.MeshBasicMaterial({
        map:new T.CanvasTexture(texture),transparent:true,opacity:.35,depthWrite:false,side:T.DoubleSide
      }));
      fog.position.set(side*6.8,1.5,z-1);fog.rotation.y=side*Math.PI*.4;root.add(fog);
    }
    // Transit checkpoint gate gets an elliptical double-skin rather than cuboid.
    const torus=new T.Mesh(new T.TorusGeometry(5.25,.21,10,50,Math.PI),C.cyan);
    torus.rotation.z=Math.PI/2;torus.position.set(0,6,-62.5);root.add(torus);
    for(let i=0;i<7;i++){
      const z=-48-i*2;
      thin(-7,5.3,z,.2,.12,1.5,C.amber);
      beam([-7,0,z],[-7,10.3,z],.09,C.iron);
    }
    advertisement('HELIX',-11.9,13.1,-39,4,6.8,-1,'#f56577');
    advertisement('VESPER',13.5,15.5,29,3,7,1,'#73f7ee');
  }
  return {residentialTower,occupiedMarket,pbrTargets:{ceramic,brushed,dirty,copper,darkTrim,pastel},decorate(){neonMonorail();narrativeClutter();}};
}
