// One translucent surface with a Fresnel rim, hexagonal cells and local impact waves.
// TSL is used on WebGPU; the equivalent GLSL shader supports the standalone WebGL preview.
export function createShieldMaterial(T,{native=true}={}){
 const data={inside:{value:0},hemisphere:{value:0},clock:{value:0},deployment:{value:0},strength:{value:1},tint:{value:new T.Color(0xff4aab)},impact:{value:new T.Vector3(0,0,1)},age:{value:10}};
 let material;
 if(native){
  const S=T.TSL,{vec2,vec3,float,uv,positionLocal,positionWorld,cameraPosition,normalWorld,color,sin,abs,max,min,smoothstep,exp,select}=S;
  const u=Object.fromEntries(Object.entries(data).map(([k,v])=>[k,S.uniform(v.value)]));
  const p=uv().mul(vec2(34.641016,20)),period=vec2(1.7320508,1);
  const a=p.mod(period).sub(period.mul(.5)),b=p.sub(period.mul(.5)).mod(period).sub(period.mul(.5));
  const gv=select(a.dot(a).lessThan(b.dot(b)),a,b).abs();
  const dist=max(gv.dot(vec2(.8660254,.5)),gv.y),hex=smoothstep(.45,.495,dist);
  const fresnel=float(1).sub(abs(normalWorld.normalize().dot(cameraPosition.sub(positionWorld).normalize()))).pow(2.5);
  const scan=sin(positionLocal.y.mul(37).sub(u.clock.mul(2.0))).mul(.5).add(.5).pow(9);
  const d=positionLocal.normalize().distance(u.impact),ring=float(1).sub(smoothstep(.018,.085,abs(d.sub(u.age.mul(2.1))))).mul(exp(u.age.mul(-2.8)));
  const localGlow=exp(d.mul(-12)).mul(exp(u.age.mul(-4)));
  const reveal=S.mix(float(1).sub(smoothstep(u.deployment.mul(2.5).sub(1.18),u.deployment.mul(2.5).sub(1.04),positionLocal.y)),float(1),u.hemisphere);
  const bottom=smoothstep(.025,.13,positionWorld.y),fade=smoothstep(0,.12,u.deployment);
  const critical=float(1).sub(smoothstep(.16,.46,u.strength));
  const fracture=smoothstep(.965,.999,abs(sin(uv().x.mul(138).add(sin(uv().y.mul(45)).mul(6))))).mul(critical);
  const pulse=sin(u.clock.mul(10)).mul(.15).add(.85);
  material=new T.MeshBasicNodeMaterial({transparent:true,side:T.DoubleSide,depthWrite:false,blending:T.NormalBlending,toneMapped:false});
  material.colorNode=u.tint.mul(float(.63).add(hex.mul(.30)).add(fresnel.mul(.72))).add(S.mix(u.tint,vec3(1),.75).mul(ring.mul(1.5).add(localGlow).add(fracture.mul(.65))));
  material.opacityNode=float(1).sub(u.inside.mul(.55)).mul(min(.83,float(.045).add(hex.mul(.12)).add(fresnel.mul(.36)).add(scan.mul(.015)).add(ring.mul(.42)).add(localGlow.mul(.2)).add(fracture.mul(.25))).mul(reveal).mul(bottom).mul(fade).mul(float(1).sub(critical.mul(.12)).mul(pulse.mul(critical).add(float(1).sub(critical)))));
  return {material,data,update(values){for(const [k,v]of Object.entries(values)){if(k==='tint')u[k].value.set(v);else if(k==='impact')u[k].value.copy(v);else u[k].value=v;}},native:true};
 }
 material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false,uniforms:data,
 vertexShader:`varying vec2 vUv; varying vec3 vP; varying vec3 vW; varying vec3 vN; void main(){vUv=uv;vP=position;vW=(modelMatrix*vec4(position,1.)).xyz;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.);}`,
 fragmentShader:`precision highp float; uniform float clock,deployment,strength,age,hemisphere,inside;uniform vec3 tint,impact;varying vec2 vUv;varying vec3 vP,vW,vN;void main(){vec2 p=vUv*vec2(34.641016,20.),period=vec2(1.7320508,1.);vec2 a=mod(p,period)-period*.5,b=mod(p-period*.5,period)-period*.5;vec2 gv=abs(dot(a,a)<dot(b,b)?a:b);float dist=max(dot(gv,vec2(.8660254,.5)),gv.y),hex=smoothstep(.45,.495,dist);float fresnel=pow(1.-abs(dot(normalize(vN),normalize(cameraPosition-vW))),2.5);float scan=pow(sin(vP.y*37.-clock*2.)*.5+.5,9.);float d=distance(normalize(vP),impact),ring=(1.-smoothstep(.018,.085,abs(d-age*2.1)))*exp(-age*2.8),localGlow=exp(-d*12.)*exp(-age*4.);float reveal=mix(1.-smoothstep(deployment*2.5-1.18,deployment*2.5-1.04,vP.y),1.,hemisphere),bottom=smoothstep(.025,.13,vW.y),fade=smoothstep(0.,.12,deployment),critical=1.-smoothstep(.16,.46,strength),fracture=smoothstep(.965,.999,abs(sin(vUv.x*138.+sin(vUv.y*45.)*6.)))*critical,pulse=sin(clock*10.)*.15+.85;vec3 col=tint*(.63+hex*.30+fresnel*.72)+mix(tint,vec3(1.),.75)*(ring*1.5+localGlow+fracture*.65);float alpha=min(.83,.045+hex*.12+fresnel*.36+scan*.015+ring*.42+localGlow*.2+fracture*.25)*reveal*bottom*fade*(1.-critical*.12)*(pulse*critical+1.-critical);gl_FragColor=vec4(col,alpha*(1.-inside*.55));}`});
 return{material,data,update(values){for(const[k,v]of Object.entries(values)){if(k==='tint')data[k].value.set(v);else if(k==='impact')data[k].value.copy(v);else data[k].value=v;}},native:false};
}
