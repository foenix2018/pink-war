import test from 'node:test';
import assert from 'node:assert/strict';
import { MOON_SETTINGS, moonWorldPosition } from '../dist/moon.js';

test('large lunar disk stays on a constant celestial bearing as the camera moves', () => {
 assert.ok(MOON_SETTINGS.radius >= 20);
 assert.ok(MOON_SETTINGS.mapSize <= 1024,'moon map stays light enough for standalone Quest');
 const a=moonWorldPosition({x:0,y:2,z:0});
 const b=moonWorldPosition({x:110,y:17,z:-80});
 assert.ok(Math.abs((b.x-a.x)-110)<1e-8);
 assert.ok(Math.abs((b.y-a.y)-15)<1e-8);
 assert.ok(Math.abs((b.z-a.z)+80)<1e-8);
 assert.ok(Math.abs(Math.hypot(a.x,a.y-2,a.z)-MOON_SETTINGS.distance)<1e-7);
});
