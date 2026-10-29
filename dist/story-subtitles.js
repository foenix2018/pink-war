// Subtitled dialogue for the missions: a DOM line on screen and a camera-attached panel in the headset.
// Lines are { who, speaker: { name, color }, text }; durations come from the text length.
export function createSubtitles({ T, camera, seconds = text => Math.max(3.2, Math.min(9, text.length / 15)) } = {}) {
  const queue = []; let current = null;
  const box = document.createElement('div'); box.className = 'pw-subtitle'; box.setAttribute('aria-live', 'polite');
  box.style.cssText = 'position:fixed;left:50%;bottom:max(122px,calc(env(safe-area-inset-bottom) + 112px));transform:translateX(-50%);width:min(720px,calc(100vw - 28px));padding:10px 16px;background:rgba(5,9,15,.8);border-radius:10px;font:15px/1.45 system-ui,sans-serif;color:#eef1f6;text-align:center;z-index:6;pointer-events:none;display:none;text-shadow:0 1px 2px #000';
  if (matchMedia?.('(pointer:coarse)').matches) Object.assign(box.style, { bottom: '40vh', fontSize: '13px', width: 'min(560px,calc(100vw - 28px))' });
  document.body.append(box);
  let plane = null;
  if (T && camera) {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 200;
    const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
    plane = new T.Mesh(new T.PlaneGeometry(.62, .121), new T.MeshBasicMaterial({ map, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    plane.position.set(0, -.16, -1.05); plane.renderOrder = 101; plane.visible = false; plane.frustumCulled = false; plane.userData.canvas = canvas; camera.add(plane);
  }
  function draw(line) {
    box.innerHTML = ''; const who = document.createElement('b'); who.textContent = (line.speaker?.name || String(line.who).toUpperCase()) + ' ';
    who.style.cssText = `color:${line.speaker?.color || '#fff'};font-weight:900;letter-spacing:.06em`; box.append(who, document.createTextNode(line.text));
    if (!plane) return;
    const c = plane.userData.canvas.getContext('2d'); c.clearRect(0, 0, 1024, 200); c.fillStyle = 'rgba(6,10,18,.82)'; c.beginPath(); c.roundRect(0, 0, 1024, 200, 26); c.fill();
    c.font = '800 30px system-ui,sans-serif'; c.fillStyle = line.speaker?.color || '#fff'; c.fillText(line.speaker?.name || '', 34, 50);
    c.font = '500 30px system-ui,sans-serif'; c.fillStyle = '#eef1f6'; let y = 98, row = '';
    for (const word of line.text.split(/\s+/)) { if (c.measureText(row + word).width > 950) { c.fillText(row, 34, y); y += 38; row = ''; } row += word + ' '; }
    c.fillText(row, 34, y); plane.material.map.needsUpdate = true;
  }
  return {
    say(lines) { for (const line of lines) queue.push(line); },
    clear() { queue.length = 0; current = null; box.style.display = 'none'; if (plane) plane.visible = false; },
    update(dt, { xr = false, hidden = false } = {}) {
      if (current && !hidden) { current.left -= dt; if (current.left <= 0) current = null; }
      if (!current && queue.length && !hidden) { const line = queue.shift(); current = { ...line, left: seconds(line.text) }; draw(current); }
      box.style.display = current && !xr && !hidden ? 'block' : 'none';
      if (plane) plane.visible = !!(current && xr && !hidden);
    },
    get current() { return current && { who: current.who, text: current.text }; }, get queued() { return queue.length; }
  };
}
