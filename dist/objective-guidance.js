const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// The waypoint comes from campaign navigation, not a straight line through a
// facade. Zero heading looks down -Z, as in Three and the movement controls.
// Returning presentation data keeps the headset and flat HUD on the same route.
export function objectiveIndicator(waypoint, player, heading, state = 'playing') {
  if (state !== 'playing' || !waypoint || !player ||
      ![waypoint.x, waypoint.z, player.x, player.z, heading].every(Number.isFinite)) return null;
  const dx = waypoint.x - player.x, dz = waypoint.z - player.z;
  const distance = Math.hypot(dx, dz), dy = (waypoint.y || 0) - (player.elevation ?? player.y ?? 0);
  // A waypoint directly above us should ask for elevation, never make its
  // horizontal dot oscillate at atan2(0, 0) as the tracked head moves slightly.
  const angle = distance < .35 ? 0 : Math.atan2(
    Math.sin(Math.atan2(-dx, -dz) - heading), Math.cos(Math.atan2(-dx, -dz) - heading));
  const offset = clamp(-angle / (Math.PI / 2), -1, 1);
  return {
    offset: Object.is(offset, -0) ? 0 : offset,
    behind: Math.abs(angle) > Math.PI / 2,
    turn: Math.abs(angle) < .06 ? 0 : Math.sign(offset),
    elevation: Math.abs(dy) > 1.1 ? Math.sign(dy) : 0,
    distance,
    arrived: distance < 1.2 && Math.abs(dy) < 1.1,
    label: waypoint.label || 'Objectif',
    kind: waypoint.kind || 'objective'
  };
}

// Six degrees above the central sight line. A small geometry marker has no
// canvas texture to upload at every head movement and is legible in both eyes.
export function createObjectiveGuide(T, camera) {
  const group = new T.Group(); group.name = 'campaign-objective-guide';
  group.position.set(0, .115, -1.05); group.visible = false;
  const material = new T.MeshBasicMaterial({ color: 0xffe5ac, transparent: true,
    opacity: .96, depthTest: false, depthWrite: false, toneMapped: false });
  const haloMaterial = material.clone(); haloMaterial.opacity = .55;
  const dot = new T.Mesh(new T.CircleGeometry(.0037, 16), material);
  const halo = new T.Mesh(new T.RingGeometry(.006, .007, 20), haloMaterial);
  const arrowShape = new T.Shape();
  arrowShape.moveTo(.0038, 0); arrowShape.lineTo(-.002, .0035); arrowShape.lineTo(-.002, -.0035); arrowShape.closePath();
  const arrowGeometry = new T.ShapeGeometry(arrowShape);
  const turn = new T.Mesh(arrowGeometry, material), level = new T.Mesh(arrowGeometry, material);
  level.position.y = .014;
  group.add(dot, halo, turn, level);
  group.traverse(object => { object.frustumCulled = false; object.renderOrder = 110; });
  camera.add(group);
  return {
    group,
    update(hint) {
      group.visible = !!hint;
      if (!hint) return;
      group.position.x = hint.offset * .15;
      halo.visible = hint.arrived;
      turn.visible = hint.behind;
      turn.position.x = hint.turn * .013;
      turn.rotation.z = hint.turn < 0 ? Math.PI : 0;
      level.visible = !!hint.elevation;
      level.rotation.z = hint.elevation > 0 ? Math.PI / 2 : -Math.PI / 2;
    },
    dispose() {
      group.removeFromParent();
      dot.geometry.dispose(); halo.geometry.dispose(); arrowGeometry.dispose();
      material.dispose(); haloMaterial.dispose();
    }
  };
}
