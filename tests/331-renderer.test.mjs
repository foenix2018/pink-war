import test from 'node:test';
import assert from 'node:assert/strict';
import {graphicsProfile,renderPixelRatio,createCompatibleRenderer,warmRenderer} from '../dist/renderer-policy.js';
import {compatibleLaunchURL} from '../dist/launch-ui.js';

test('iPhone and desktop-mode iPad choose WebGL even when WebGPU exists; desktop and Quest retain their route',()=>{
  const iphone=graphicsProfile({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)',gpu:{},maxTouchPoints:5},'high');
  assert.equal(iphone.preferWebGL,true);assert.equal(iphone.antialias,false);assert.equal(iphone.shadows,false);assert.equal(iphone.artQuality,'low');
  assert.equal(iphone.skyWidth,1024);assert.equal(iphone.pixelRatioCap,1.15);
  assert.equal(graphicsProfile({userAgent:'Mozilla/5.0 Macintosh',platform:'MacIntel',maxTouchPoints:5,gpu:{}}).preferWebGL,true);
  const desktop=graphicsProfile({userAgent:'Mozilla/5.0 Macintosh',platform:'MacIntel',maxTouchPoints:0,gpu:{}});
  assert.equal(desktop.preferWebGL,false);assert.equal(desktop.shadows,true);
  const quest=graphicsProfile({userAgent:'Mozilla/5.0 (Linux; Android 12; Quest 3) OculusBrowser',gpu:{}},'high',true);
  assert.equal(quest.preferWebGL,true);assert.equal(quest.artQuality,'high');assert.equal(quest.compatible,false);
  const questMobile=graphicsProfile({userAgent:'Mozilla/5.0 (Linux; Android 12; Quest 3) OculusBrowser Mobile Safari',gpu:{}},'high',true);
  assert.equal(questMobile.phone,false);assert.equal(questMobile.artQuality,'high');
  const normal=graphicsProfile({userAgent:'iPhone',gpu:{}});
  assert.equal(renderPixelRatio(normal,3,390,844),1);
  const larger=renderPixelRatio(normal,3,1920,1080);
  assert.ok(1920*1080*larger*larger<=750001);
});

function canvas(name='first'){
  return {name,context:null,attributes:new Set(['data-controls-bound']),cloneNode(){return canvas('fresh');},
    removeAttribute(key){this.attributes.delete(key);},replaceWith(next){this.replacement=next;},
    getContext(kind){if(this.context&&this.context!==kind)throw new Error('canvas context cannot change');this.context=kind;return {};}};
}
test('a failed GPU adapter retries WebGL on a fresh canvas instead of reusing its GPU context',async()=>{
  let disposed=0;const original=canvas(),profile=graphicsProfile({gpu:{}});
  class BrokenGPU{constructor(options){this.domElement=options.canvas;this.domElement.getContext('webgpu');}async init(){throw new Error('adapter rejected');}dispose(){disposed++;}}
  class GL{constructor(options){this.domElement=options.canvas;this.domElement.getContext('webgl2');this.options=options;}}
  const result=await createCompatibleRenderer({canvas:original,WebGPU:BrokenGPU,WebGL:GL,profile});
  assert.ok(result.renderer instanceof GL);assert.equal(disposed,1);assert.equal(result.initialFailure,'adapter rejected');
  assert.notEqual(result.canvas,original);assert.equal(original.replacement,result.canvas);assert.equal(result.canvas.context,'webgl2');
  assert.equal(result.canvas.attributes.has('data-controls-bound'),false);
});
test('GPU initialisation is bounded and a late adapter completion releases its retired resources',async()=>{
  let finish,disposed=0;const original=canvas();
  class PendingGPU{constructor(o){this.domElement=o.canvas;}init(){return new Promise(resolve=>{finish=resolve});}dispose(){disposed++;}}
  class GL{constructor(o){this.domElement=o.canvas;}}
  const result=await createCompatibleRenderer({canvas:original,WebGPU:PendingGPU,WebGL:GL,profile:graphicsProfile({gpu:{}}),timeout:5});
  assert.ok(result.renderer instanceof GL);assert.match(result.initialFailure,/interrompue/);assert.equal(disposed,1);
  finish();await Promise.resolve();await Promise.resolve();assert.equal(disposed,2);
});
test('the iPhone route never constructs a GPU renderer and WebGL does not await parallel shader polling',async()=>{
  let gpu=0,compiles=0,parallel=0;const target=canvas();
  class GPU{constructor(){gpu++;}}
  class GL{constructor(o){this.domElement=o.canvas;this.isWebGLRenderer=true;}compile(){compiles++;}compileAsync(){parallel++;return new Promise(()=>{});}}
  const result=await createCompatibleRenderer({canvas:target,WebGPU:GPU,WebGL:GL,profile:graphicsProfile({userAgent:'iPhone',gpu:{}})});
  await warmRenderer(result.renderer,{},{});assert.equal(gpu,0);assert.equal(parallel,0);assert.equal(compiles,1);
});
test('safe restart uses the hosted game for a downloaded file and keeps the current host for previews',()=>{
  const file=new URL(compatibleLaunchURL('file:///private/mobile/Pink_war.html'));
  assert.equal(file.origin,'https://pink-war.vercel.app');assert.equal(file.searchParams.get('renderer'),'webgl');assert.equal(file.searchParams.get('v'),'3.33');
  const hosted=new URL(compatibleLaunchURL('https://preview.example/index.html?foo=bar'));
  assert.equal(hosted.origin,'https://preview.example');assert.equal(hosted.searchParams.get('foo'),'bar');
});
