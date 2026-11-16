// Reliable local startup. WebGPU remains available with ?renderer=webgpu.
const status = document.querySelector('#renderer-status');
function limit(promise, milliseconds, cancel = () => {}) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => { cancel(); reject(new Error('Délai du moteur WebGPU dépassé')); }, milliseconds);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}
async function localEngine() {
  window.aerinRenderMode = 'WebGL';
  if (status) status.textContent = 'RENDU · WEBGL';
  for (const path of ['../preview/three.min.js', '../preview/GLTFLoader.js', './aerin-game-webgl.js']) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL(path, import.meta.url).href;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Moteur local introuvable : ' + path));
      document.body.append(script);
    });
  }
}
try {
  const requested = new URL(location.href).searchParams.get('renderer') === 'webgpu';
  if (requested && navigator.gpu) {
    try {
      const [core, gpu, loaders, game] = await limit(Promise.all([
        import('three'), import('three/webgpu'), import('three/addons/loaders/GLTFLoader.js'), import('./aerin-game-webgpu.js')
      ]), 4000);
      window.THREE = {...core, WebGPURenderer:gpu.WebGPURenderer, GLTFLoader:loaders.GLTFLoader};
      const controller = new AbortController();
      await limit(game.startAerin({signal:controller.signal}), 6000, () => controller.abort());
    } catch (error) {
      console.warn('[Aerin] Passage au moteur local.', error);
      await localEngine();
    }
  } else {
    await localEngine();
  }
} catch (error) {
  console.error('[Aerin] Démarrage impossible', error);
  window.aerinBoot?.fail('Le moteur 3D n’a pas pu démarrer. Recharge la page dans Safari ou Chrome.');
}
