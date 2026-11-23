// Original filtered water tiles and a single contoured sheet for each cascade.
function tile(T, width, height, fill, { srgb = false } = {}) {
  const tex = new T.DataTexture(fill, width, height, T.RGBAFormat);
  tex.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace;
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = T.LinearMipmapLinearFilter;
  tex.magFilter = T.LinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export function rippleNormalMap(T, size = 128) {
  const rgba = new Uint8Array(size * size * 4);
  const waves = [[3,1,.19,.5],[-2,4,.13,1.7],[7,3,.08,2.6],[2,-9,.054,.7],[13,11,.022,1.2]];
  for (let y=0;y<size;y++) for (let x=0;x<size;x++) {
    let dx=0, dz=0;
    for (const [kx,kz,amplitude,phase] of waves) {
      const wave=Math.cos((kx*x+kz*y)*Math.PI*2/size+phase)*amplitude;
      const length=Math.hypot(kx,kz);
      dx+=wave*kx/length;dz+=wave*kz/length;
    }
    const length=Math.hypot(dx,dz,1), i=4*(y*size+x);
    rgba[i]=Math.round(127.5*(1-dx/length));rgba[i+1]=Math.round(127.5*(1-dz/length));
    rgba[i+2]=Math.round(127.5*(1+1/length));rgba[i+3]=255;
  }
  return tile(T,size,size,rgba);
}

export function waterPuddleMask(T, size = 32) {
  const rgba=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const r=Math.hypot((x+.5)/size-.5,(y+.5)/size-.5)*2;
    const t=Math.max(0,Math.min(1,(1-r)*2.35)), value=Math.round(255*t*t*(3-2*t));
    const index=(y*size+x)*4;rgba.set([value,value,value,255],index);
  }
  const tex=tile(T,size,size,rgba);tex.wrapS=tex.wrapT=T.ClampToEdgeWrapping;
  return tex;
}

function cascadeTexture(T) {
  const width=128,height=256,rgba=new Uint8Array(width*height*4);
  const value=(x,y)=>((Math.imul((Math.imul(x+19,1836311903)^Math.imul(y+7,2971215073))>>>0,1597334677)>>>0)/4294967296);
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>t*t*(3-2*t);
  function flowNoise(x,y,wrapY){
    const i=Math.floor(x),j=Math.floor(y),u=smooth(x-i),v=smooth(y-j);
    const a=(j%wrapY+wrapY)%wrapY,b=(a+1)%wrapY;
    return lerp(lerp(value(i,a),value(i+1,a),u),lerp(value(i,b),value(i+1,b),u),v);
  }
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const u=x/width,v=y/height,spread=flowNoise(u*7,v*3,3);
    const streams=flowNoise(u*27+spread*1.8,v*7,7);
    const streaks=flowNoise(u*70+spread*3.2,v*13,13);
    const spray=flowNoise(u*89,v*83,83);
    const density=Math.max(0,Math.min(1,streams*.7+streaks*.44+spray*.26-.19));
    const edgeDistance=Math.min(x+.5,width-x-.5)/width;
    const edge=smooth(Math.max(0,Math.min(1,edgeDistance/(.039+spread*.063))));
    const i=4*(y*width+x);
    rgba[i]=Math.round(55+density*196);rgba[i+1]=Math.round(87+density*165);
    rgba[i+2]=Math.round(91+density*163);rgba[i+3]=Math.round(edge*(43+density*198));
  }
  const tex=tile(T,width,height,rgba,{srgb:true});tex.wrapS=T.ClampToEdgeWrapping;
  return tex;
}

export function cascadeGeometry(T,{width,height,run=2.6,low=false}){
  const geo=new T.PlaneGeometry(width,height,low?14:24,low?18:34);
  const pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){
    const u=pos.getX(i)/width+.5,t=.5-pos.getY(i)/height;
    const mouth=Math.sin(u*Math.PI);
    const wobble=Math.sin(u*29+.5)*.16+Math.sin(u*11+1.2)*.23;
    const x=pos.getX(i)*(.965+Math.sin(t*Math.PI*.8)*.075);
    const z=run*Math.pow(t,.72)+(.22+wobble)*Math.sin(t*Math.PI*.75)+mouth*.16;
    pos.setXYZ(i,x,pos.getY(i),z);
  }
  geo.computeVertexNormals();geo.computeBoundingSphere();
  return geo;
}

export function createCascadeWater(T,{webgpu=false,low=false,color=0xc8dde0}={}){
  const flow=cascadeTexture(T);
  const opts={color,map:flow,transparent:true,side:T.DoubleSide,depthWrite:false,
    opacity:.85,roughness:.26,metalness:.04,forceSinglePass:true};
  let material,clock;
  if(webgpu){
    const {uniform,uv,texture,vec2,vec3,sin,smoothstep,positionLocal,materialOpacity,mix,color:rgb}=T.TSL;
    clock=uniform(0);
    const u=uv();
    const t=u.y.oneMinus(), speed=clock.mul(low?.35:.48);
    const meander=sin(u.x.mul(18).add(t.mul(8)).sub(clock.mul(.8))).mul(.012);
    const primary=texture(flow,u.add(vec2(meander,speed)));
    const finer=texture(flow,vec2(u.x,u.y.mul(1.47).add(speed.mul(1.27)).add(.29)));
    material=new T.MeshStandardNodeMaterial({...opts,map:null});
    const aerated=primary.g.mul(.78).add(finer.g.mul(.42)).clamp(0,1);
    material.colorNode=mix(rgb(0x497b80),rgb(color),aerated).mul(.94);
    material.emissiveNode=material.colorNode.mul(.06).add(rgb(color).mul(aerated.pow(2).mul(.15)));
    material.opacityNode=materialOpacity.mul(primary.a.mul(.77).add(finer.a.mul(.38)).clamp(0,1));
    material.positionNode=positionLocal.add(vec3(0,0,
      sin(u.x.mul(23).add(t.mul(13)).sub(clock.mul(3.2))).mul(smoothstep(0,.72,t)).mul(.13)));
  }else{
    material=new T.MeshStandardMaterial({...opts,emissive:0x15353b,emissiveIntensity:.48});
  }
  return {
    material,
    update(time){if(clock)clock.value=time;else flow.offset.y=(time*.48)%1;},
    dispose(){material.dispose();flow.dispose();},
  };
}
