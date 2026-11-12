import {WebGLRenderTarget} from './vendor/three.module.min.js';
import * as T from './vendor/three.webgpu.min.js';
// Shared HDR presentation. Bounded glow, cool shadows/warm highlights and mild
// edge falloff; no blur of the aiming point. XR and offscreen/optical renders bypass it.
export function gradePolicy(profile={}){
 const enabled=!profile.phone&&!profile.headset&&!profile.compatible&&!['low','performance'].includes(profile.artQuality);
 return {enabled,bloom:.12,threshold:1.25,vignette:.13,samples:enabled?8:0};
}
export function installFPSGrade(renderer,profile={}){
 if(renderer.fpsPresentation)return renderer.fpsPresentation;
 const policy=gradePolicy(profile),native=!!renderer.backend?.isWebGPUBackend;
 let enabled=policy.enabled,busy=false,frames=0,scene=null,camera=null,pass=null,post=null,target=null,quadScene=null,quadCamera=null,material=null;
 const raw=renderer.render.bind(renderer),rawAsync=renderer.renderAsync?.bind(renderer),rawDispose=renderer.dispose.bind(renderer),size=new T.Vector2(),texel=new T.Vector2(1,1);
 const uniform=native?T.TSL.uniform(texel):null;
 function setup(nextScene,nextCamera){
  if(scene===nextScene&&camera===nextCamera&&post)return;
  post?.dispose?.();pass?.dispose?.();scene=nextScene;camera=nextCamera;
  if(native){
   const S=T.TSL;pass=S.pass(scene,camera);const image=pass.getTextureNode('output'),u=S.screenUV;
   let bloom=S.vec3(0);for(const [x,y,w]of [[1,0,.15],[-1,0,.15],[0,1,.15],[0,-1,.15],[1,1,.1],[-1,-1,.1],[-1,1,.1],[1,-1,.1]]){
    const sample=image.sample(u.add(uniform.mul(S.vec2(x*4,y*4)))).rgb;
    bloom=bloom.add(S.max(sample.sub(policy.threshold),S.vec3(0)).mul(w));
   }
   let col=image.rgb.add(bloom.mul(policy.bloom));const l=col.dot(S.vec3(.2126,.7152,.0722)),shadow=S.float(1).sub(S.smoothstep(.05,.8,l));
   const tint=S.mix(S.vec3(1.018,1.005,.984),S.vec3(.97,1.005,1.035),shadow.mul(.45));
   const edge=S.smoothstep(.12,.52,u.sub(.5).dot(u.sub(.5))).mul(policy.vignette);
   col=col.mul(tint).mul(S.float(1).sub(edge));
   post=new T.PostProcessing(renderer);post.outputNode=S.vec4(col,image.a);
  }else{
   if(!target){target=new WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:profile.antialias?4:0});quadScene=new T.Scene();quadCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
    material=new T.ShaderMaterial({uniforms:{image:{value:target.texture},texel:{value:texel}},depthTest:false,depthWrite:false,toneMapped:true,
     vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=vec4(position.xy,0.,1.);}',
     fragmentShader:`uniform sampler2D image;uniform vec2 texel;varying vec2 v;
      void main(){vec4 src=texture2D(image,v);vec3 glow=vec3(0.);vec2 offsets[8];offsets[0]=vec2(1.,0.);offsets[1]=vec2(-1.,0.);offsets[2]=vec2(0.,1.);offsets[3]=vec2(0.,-1.);offsets[4]=vec2(1.,1.);offsets[5]=vec2(-1.,-1.);offsets[6]=vec2(-1.,1.);offsets[7]=vec2(1.,-1.);
      for(int i=0;i<8;i++){glow+=max(texture2D(image,v+offsets[i]*texel*4.).rgb-vec3(1.25),vec3(0.))*(i<4?.15:.1);}
      vec3 col=src.rgb+glow*.12;float l=dot(col,vec3(.2126,.7152,.0722));col*=mix(vec3(1.018,1.005,.984),vec3(.97,1.005,1.035),(1.-smoothstep(.05,.8,l))*.45);vec2 c=v-.5;col*=1.-smoothstep(.12,.52,dot(c,c))*.13;gl_FragColor=vec4(col,src.a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
     }`});quadScene.add(new T.Mesh(new T.PlaneGeometry(2,2),material));}
   post={dispose(){}};
  }
 }
 const should=(s,c)=>enabled&&!busy&&s?.isScene&&c?.isPerspectiveCamera&&!renderer.xr?.isPresenting&&!renderer.getRenderTarget()&&!renderer.getScissorTest?.();
 function draw(s,c,async=false){
  if(!should(s,c))return async&&rawAsync?rawAsync(s,c):raw(s,c);
  setup(s,c);renderer.getDrawingBufferSize(size);texel.set(1/Math.max(1,size.x),1/Math.max(1,size.y));frames++;busy=true;
  if(native){
   if(async)return post.renderAsync().finally(()=>{busy=false;});
   try{return post.render();}finally{busy=false;}
  }
  try{if(target.width!==size.x||target.height!==size.y)target.setSize(size.x,size.y);renderer.setRenderTarget(target);raw(s,c);renderer.setRenderTarget(null);return raw(quadScene,quadCamera);}finally{renderer.setRenderTarget(null);busy=false;}
 }
 renderer.render=(s,c)=>draw(s,c,false);if(rawAsync)renderer.renderAsync=(s,c)=>draw(s,c,true);
 renderer.dispose=()=>{post?.dispose?.();pass?.dispose?.();target?.dispose();quadScene?.children[0]?.geometry.dispose();material?.dispose();rawDispose();};
 const api={async renderToTarget(s,c,output){
  setup(s,c);renderer.getDrawingBufferSize(size);texel.set(1/Math.max(1,size.x),1/Math.max(1,size.y));const previous=renderer.getRenderTarget();busy=true;
  try{if(native){renderer.setRenderTarget(output);await post.renderAsync();}else{if(target.width!==size.x||target.height!==size.y)target.setSize(size.x,size.y);renderer.setRenderTarget(target);raw(s,c);renderer.setRenderTarget(output);raw(quadScene,quadCamera);}}finally{renderer.setRenderTarget(previous);busy=false;}
 },setEnabled(value){enabled=!!value&&policy.enabled;},stats:()=>({enabled,native,frames,bloomSamples:policy.samples,xrBypass:true})};renderer.fpsPresentation=api;return api;
}
