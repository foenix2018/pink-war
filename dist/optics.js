const degrees = radians => radians * 180 / Math.PI;
export function magnifiedFov(fov, magnification = 1) {
  return degrees(2 * Math.atan(Math.tan(fov * Math.PI / 360) / Math.max(1, magnification)));
}
export function lensFov(radius, eyeDistance, magnification) {
  const distance = Math.max(.035, eyeDistance);
  return degrees(2 * Math.atan(radius / distance / Math.max(1, magnification)));
}
export function aimSensitivity(magnification = 1, blend = 1) {
  return 1 + (1 / Math.pow(Math.max(1, magnification), .7) - 1) * Math.max(0, Math.min(1, blend));
}
