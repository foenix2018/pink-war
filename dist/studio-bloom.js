import {WebGLRenderTarget,HalfFloatType,ShaderMaterial,Scene,OrthographicCamera,PlaneGeometry,Mesh,Vector2} from './vendor/three.module.min.js';

// Studio inspection only; the game and headset renderers keep their own budgets.
export function createStudioBloom(renderer){
  if(!renderer.getContext().getExtension('EXT_color_buffer_float'))
    return {render:(scene,camera)=>renderer.render(scene,camera),resize(){},dispose(){}};
  const source=new WebGLRenderTarget(1,1,{type:HalfFloatType});
  const ping=new WebGLRenderTarget(1,1,{type:HalfFloatType,depthBuffer:false});
  const pong=new WebGLRenderTarget(1,1,{type:HalfFloatType,depthBuffer:false});
  const vertexShader='varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  const blur=new ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,
    uniforms:{inputMap:{value:null},stepSize:{value:new Vector2()},extract:{value:1}},vertexShader,
    fragmentShader:`uniform sampler2D inputMap;uniform vec2 stepSize;uniform float extract;varying vec2 vUv;
      vec3 sampleLight(vec2 uv){
        vec3 c=texture2D(inputMap,uv).rgb;
        if(extract<.5)return c;
        float hi=max(c.r,max(c.g,c.b)),lo=min(c.r,min(c.g,c.b));
        float saturation=(hi-lo)/max(hi,.001);
        return c*max(hi-.58,0.)*smoothstep(.30,.70,saturation);
      }
      void main(){
        vec3 sum=vec3(0.);float total=0.;
        for(int i=-6;i<=6;i++){
          float n=float(i),w=exp(-n*n/10.);
          sum+=sampleLight(vUv+stepSize*n)*w;total+=w;
        }
        gl_FragColor=vec4(sum/total,1.);
      }`});
  const composite=new ShaderMaterial({depthTest:false,depthWrite:false,
    uniforms:{sceneMap:{value:source.texture},glowMap:{value:pong.texture}},vertexShader,
    fragmentShader:`uniform sampler2D sceneMap;uniform sampler2D glowMap;varying vec2 vUv;
      void main(){
        vec3 base=texture2D(sceneMap,vUv).rgb;
        vec3 glow=texture2D(glowMap,vUv).rgb;
        gl_FragColor=vec4(base+glow*1.45,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
  const screen=new Scene(),quad=new Mesh(new PlaneGeometry(2,2),blur),camera=new OrthographicCamera(-1,1,1,-1,0,1);
  screen.add(quad);let w=1,h=1;
  return {
    resize(width,height){
      w=Math.max(1,Math.floor(width/2));h=Math.max(1,Math.floor(height/2));
      source.setSize(width,height);ping.setSize(w,h);pong.setSize(w,h);
    },
    render(scene,view){
      const previous=renderer.getRenderTarget();
      renderer.setRenderTarget(source);renderer.render(scene,view);
      quad.material=blur;blur.uniforms.inputMap.value=source.texture;
      blur.uniforms.extract.value=1;blur.uniforms.stepSize.value.set(1/w,0);
      renderer.setRenderTarget(ping);renderer.render(screen,camera);
      blur.uniforms.inputMap.value=ping.texture;blur.uniforms.extract.value=0;
      blur.uniforms.stepSize.value.set(0,1/h);
      renderer.setRenderTarget(pong);renderer.render(screen,camera);
      quad.material=composite;renderer.setRenderTarget(previous);renderer.render(screen,camera);
    },
    dispose(){source.dispose();ping.dispose();pong.dispose();blur.dispose();composite.dispose();quad.geometry.dispose();}
  };
}
