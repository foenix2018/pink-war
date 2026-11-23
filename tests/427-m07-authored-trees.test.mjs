// M07 imported user-authored WebGPU tree models; tested without a GPU or DOM.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createM07SourceTreeGeometry } from '../dist/m07-source-trees.js';

class Float32BufferAttribute {
  constructor(values, itemSize) {
    this.array = new Float32Array(values);
    this.itemSize = itemSize;
    this.count = this.array.length / itemSize;
  }
}
class BufferGeometry {
  constructor() { this.attributes = {}; this.userData = {}; }
  setAttribute(name, attribute) { this.attributes[name] = attribute; return this; }
  setIndex(indices) { this.index = { array: indices, count: indices.length }; return this; }
  computeBoundingSphere() { this.boundingSphere = { computed: true }; }
}
const T = { Float32BufferAttribute, BufferGeometry };

for (const species of ['oak', 'spruce']) {
  test(`M07 ${species} source geometry keeps its branches and authored foliage`, () => {
    const mid = createM07SourceTreeGeometry(T, species, 'mid');
    assert.equal(mid.userData.species, species);
    assert.equal(mid.userData.detail, 'mid');
    assert.ok(mid.userData.leaves > 50);
    assert.ok(mid.attributes.position.count > 1000);
    assert.ok(mid.index.count > 3000);
    assert.equal(mid.attributes.color.count, mid.attributes.position.count);
    assert.equal(mid.attributes.normal.count, mid.attributes.position.count);
    assert.ok(Math.max(...mid.index.array.slice(0, 1000)) < mid.attributes.position.count);
    for (let i=0;i<mid.attributes.position.array.length;i+=Math.max(1,Math.floor(mid.attributes.position.array.length/100))) {
      assert.ok(Number.isFinite(mid.attributes.position.array[i]));
    }
    assert.equal(mid.boundingSphere.computed, true);
    const near = createM07SourceTreeGeometry(T, species, 'near');
    assert.ok(near.userData.leaves > mid.userData.leaves);
    assert.ok(near.attributes.position.count > mid.attributes.position.count);
  });
}
