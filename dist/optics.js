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

// Match the installed model's eyepiece rather than the procedural fallback's
// old rail height. Only a flat-screen weapon moves; XR tracking is untouched.
// `optic.hip` (optional) moves a bulky weapon at the hip so the gloved hand on its grip shows beside the receiver
// (x/y/z in metres, yaw/roll in radians); it fades out completely as the sight comes up.
export function flatSightPose(optic,blend=1){
  const t=Math.max(0,Math.min(1,blend)),height=optic?.y??.178,hip=optic?.hip||{},free=1-t;
  const depth=optic?-(optic.eyeRelief??Math.max(.12,optic.radius*7))-optic.z:-.49;
  return {x:.19*free+(hip.x||0)*free,y:-.24+(.24-height)*t+(hip.y||0)*free,z:-.56+(depth+.56)*t+(hip.z||0)*free,
    yaw:(hip.yaw||0)*free,roll:(hip.roll||0)*free};
}
