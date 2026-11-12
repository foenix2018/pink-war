// Film look for the story levels (after the reference « SUBLEVEL 07 »): a graded image instead of a raw render.
// Done by the compositor, so it works the same on WebGPU and WebGL and costs no render pass:
//  · grade on the canvas (contrast, saturation), a vignette and animated grain above it, below the HUD;
//  · a red pulse at the edges when the player is hit, a steady one at low health.
// Off in the headset; grain off for « reduced motion » and in Performance.
const STYLE = 'pw-film-style';
// `graded()` true = the renderer already grades the image (fps-grade.js: bloom, contact occlusion, tone, vignette):
// only the grain and the hit pulse are added then, so nothing is applied twice.
export function mountFilmLook({ canvas, doc = document, low = false, tint = 'cool', graded = () => false } = {}) {
  if (!canvas || !doc?.body) return { update() {}, hit() {}, setEnabled() {}, dispose() {} };
  if (!doc.getElementById(STYLE)) { const s = doc.createElement('style'); s.id = STYLE; s.textContent = `
.pw-film{position:fixed;inset:0;pointer-events:none}
.pw-film-vignette{background:radial-gradient(ellipse at center,transparent 46%,rgba(2,4,8,.34) 78%,rgba(1,2,5,.72) 100%)}
.pw-film-tint.cool{background:linear-gradient(180deg,rgba(40,70,120,.07),rgba(0,0,0,0) 45%,rgba(255,140,60,.045));mix-blend-mode:soft-light}
.pw-film-tint.warm{background:linear-gradient(180deg,rgba(255,150,80,.06),rgba(0,0,0,0) 45%,rgba(40,90,130,.06));mix-blend-mode:soft-light}
.pw-film-grain{inset:-64px;opacity:.07;mix-blend-mode:overlay;background-size:128px 128px;animation:pw-grain .5s steps(4) infinite}
@keyframes pw-grain{0%{transform:translate(0,0)}25%{transform:translate(-31px,17px)}50%{transform:translate(23px,-41px)}75%{transform:translate(-13px,-9px)}100%{transform:translate(0,0)}}
.pw-film-hurt{background:radial-gradient(ellipse at center,transparent 38%,rgba(190,10,20,.55) 100%);opacity:0}
@media (prefers-reduced-motion:reduce){.pw-film-grain{animation:none}}`; doc.head.append(s); }
  const layer = cls => { const d = doc.createElement('div'); d.className = 'pw-film ' + cls; d.setAttribute('aria-hidden', 'true'); canvas.after(d); return d; };
  const hurt = layer('pw-film-hurt'), grain = low ? null : layer('pw-film-grain'), tintEl = layer('pw-film-tint ' + tint), vignette = layer('pw-film-vignette');
  if (grain) { const c = doc.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), img = g?.createImageData?.(128, 128);
    if (img) { let seed = 1234567; for (let i = 0; i < img.data.length; i += 4) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; const v = seed >>> 24; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; } g.putImageData(img, 0, 0); grain.style.backgroundImage = `url(${c.toDataURL()})`; } }
  const previous = canvas.style.filter, css = low ? 'contrast(1.05) saturate(1.06)' : 'contrast(1.09) saturate(1.1) brightness(1.02)';
  let pulse = 0, enabled = true, shown = -1, gpu = null;
  const sync = () => { const g = !!graded(); if (g === gpu) return; gpu = g; canvas.style.filter = enabled && !g ? css : previous; vignette.hidden = tintEl.hidden = !enabled || g; };
  sync();
  return {
    hit(amount = .55) { pulse = Math.min(1, pulse + amount); },
    update(dt, { health = 1 } = {}) {
      sync();
      pulse = Math.max(0, pulse - dt * 1.6); const lowHp = health < .3 ? (.3 - health) / .3 : 0;
      const v = enabled ? Math.min(1, pulse + lowHp * (.35 + .15 * Math.sin(performance.now() / 200))) : 0;
      if (Math.abs(v - shown) > .01) { shown = v; hurt.style.opacity = v.toFixed(2); }
    },
    setEnabled(on) { enabled = !!on; hurt.hidden = !on; if (grain) grain.hidden = !on; gpu = null; sync(); },
    dispose() { for (const el of [hurt, grain, tintEl, vignette]) el?.remove(); canvas.style.filter = previous; }
  };
}
