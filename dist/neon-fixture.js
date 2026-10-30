// A mounted neon run: the luminous tube, its metal channel and regularly spaced clips.
// All parts belong to one group so the run can be aimed between any two points.
export function createNeonFixture(T, start, end, color, metal) {
  const delta = new T.Vector3().subVectors(end, start), length = delta.length();
  if (!length) return new T.Group();
  const group = new T.Group(); group.name = 'Néon / tube et fixations';
  group.position.copy(start).add(end).multiplyScalar(.5);
  group.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
  const body = new T.Mesh(new T.BoxGeometry(.16, length, .075), metal);
  body.position.z = -.085; group.add(body);
  const lit = new T.MeshBasicMaterial({color, toneMapped: false});
  const sections = Math.max(1, Math.ceil(length / 2.6)), span = length / sections;
  const tubeGeo = new T.CylinderGeometry(.034, .034, Math.max(.01, span - .055), 10);
  const capGeo = new T.CylinderGeometry(.047, .047, .07, 10);
  const clipGeo = new T.BoxGeometry(.14, .055, .12);
  for (let i = 0; i < sections; i++) {
    const y = -length / 2 + (i + .5) * span;
    const tube = new T.Mesh(tubeGeo, lit); tube.position.y = y; group.add(tube);
    for (const side of [-1, 1]) {
      const cap = new T.Mesh(capGeo, metal); cap.position.y = y + side * (span / 2 - .035); group.add(cap);
    }
    const clip = new T.Mesh(clipGeo, metal); clip.position.set(0, y, -.035); group.add(clip);
  }
  return group;
}
