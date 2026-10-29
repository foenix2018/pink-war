import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { graphicsProfile, renderPixelRatio } from '../dist/renderer-policy.js';

const source = path => readFileSync(new URL('../dist/' + path, import.meta.url), 'utf8');
const tablet = { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', gpu: {} };

test('Balanced+ preserves detail while placing a hard pixel budget', () => {
  const low = graphicsProfile(tablet, 'low');
  const balanced = graphicsProfile(tablet, 'balanced');
  const high = graphicsProfile(tablet, 'high');
  assert.equal(balanced.artQuality, 'high');
  assert.equal(balanced.skyWidth, 2048);
  assert.equal(balanced.maxPixels, 2_000_000);
  assert.ok(low.pixelRatioCap < balanced.pixelRatioCap);
  assert.ok(balanced.pixelRatioCap < high.pixelRatioCap);
  assert.ok(renderPixelRatio(balanced, 2, 2560, 1440) < 1);
  assert.ok(renderPixelRatio(balanced, 2, 1920, 1080) <= 1.4);
});

test('iPhone fallback retains mobile GPU safety limits', () => {
  const profile = graphicsProfile({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)',gpu:{}},'balanced');
  assert.equal(profile.ios,true);
  assert.equal(profile.preferWebGL,true);
  assert.equal(profile.maxPixels,750000);
});

test('gallery allows a genuine original-style vs enhanced-style comparison', () => {
  const html = source('galerie.html');
  assert.match(html, /id="gallery-enhanced-style"/);
  assert.match(html, /\?compare=before/);
  assert.match(html, /\?compare=after/);
  assert.match(html, /gallery-enhanced-style'\)\.disabled=true/);
  assert.match(html, /id="reset-view"/);
});

test('native viewer uses original character, enemy and weapon builders', () => {
  const js = source('gallery-3d.js');
  assert.match(js, /createSoldier/);
  assert.match(js, /createEnemyFactory/);
  assert.match(js, /createWeaponModels/);
  assert.match(js, /renderPending/);
  assert.match(js, /galleryResetView/);
});

test('M02 exposes and uses the Balanced+ mode', () => {
  assert.match(source('level2-test.html'), /value="balanced"/);
  assert.match(source('level2-test.js'), /renderingQuality\(\)/);
  assert.match(source('entry.js'), /balanced/);
});
