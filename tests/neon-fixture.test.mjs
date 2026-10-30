import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {createNeonFixture} from '../dist/neon-fixture.js';

test('mounted neon runs follow their endpoints and split long tubes with capped segments', () => {
  const a = new T.Vector3(-2, 1, 3), b = new T.Vector3(4, 5, 3);
  const metal = new T.MeshStandardMaterial();
  const group = createNeonFixture(T, a, b, 0x5fe0f0, metal);
  const length = a.distanceTo(b);
  group.updateMatrixWorld(true);
  const endpoint = y => group.localToWorld(new T.Vector3(0, y, 0));
  assert.ok(endpoint(-length / 2).distanceTo(a) < 1e-6);
  assert.ok(endpoint(length / 2).distanceTo(b) < 1e-6);
  const tubes = group.children.filter(c => c.material !== metal);
  assert.equal(tubes.length, Math.ceil(length / 2.6));
  assert.equal(group.children.length, 1 + tubes.length * 4);
  assert.equal(createNeonFixture(T, a, a, 0xffffff, metal).children.length, 0);
});
