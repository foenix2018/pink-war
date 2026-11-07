// The small objective arrow: a bearing relative to where the player looks, and a distance. Nothing else.
// Zero heading looks down −Z, as in the movement code; a positive bearing turns the arrow clockwise on screen.
export function arrowGuidance(player, target, heading = 0) {
  if (!player || !target || ![player.x, player.z, target.x, target.z, heading].every(Number.isFinite)) return null;
  const dx = target.x - player.x, dz = target.z - player.z, distance = Math.hypot(dx, dz);
  const toward = Math.atan2(-dx, -dz), angle = Math.atan2(Math.sin(toward - heading), Math.cos(toward - heading));
  return { bearing: distance < .35 ? 0 : -angle * 180 / Math.PI, route: Math.ceil(distance) + ' m', distance, title: target.label || '' };
}
// The next place the mission wants the player at: the first main-path interaction that can be used now (the order of
// the list is the order of the mission, so the arrow does not hop between devices). Optional readings never lead.
export function nextInteraction(interactions, mission) {
  if (!interactions || !mission?.available) return null;
  const done = new Set(mission.done || []);
  return interactions.find(i => !i.log && !done.has(i.id) && mission.available(i.id)) || null;
}
export const levelArrow = (interactions, mission, player, heading) => {
  const target = nextInteraction(interactions, mission);
  return target ? arrowGuidance(player, { x: target.x, z: target.z, label: target.label }, heading) : null;
};
