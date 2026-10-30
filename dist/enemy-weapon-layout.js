// Metres in the unposed robot frame. Shared by art and projectile emission.
export const FIELD_RIFLE=Object.freeze({
 forms:Object.freeze(['stalker','seer','synth']),
 minPitch:-.55,maxPitch:.4,
 pivot:Object.freeze({x:.20,y:1.57,z:-.01}),
 muzzle:Object.freeze({x:.20,y:1.57,z:-.51}),
 rightGrip:Object.freeze({x:.21,y:1.48,z:.07}),
 leftGrip:Object.freeze({x:.10,y:1.56,z:-.28})
});
export const LISTENER_TOOL=Object.freeze({
 minPitch:-.55,maxPitch:.4,patrolPitch:-.9,
 pivot:Object.freeze({x:.32,y:1.16,z:-.02}),
 muzzle:Object.freeze({x:.32,y:1.16,z:-.42}),
 rightGrip:Object.freeze({x:.356,y:1.132,z:0}),
 leftGrip:Object.freeze({x:0,y:0,z:0})
});
export const carriesFieldRifle=form=>FIELD_RIFLE.forms.includes(form);
export function fieldRifleMuzzle(pitch=0){
 return weaponMuzzle(FIELD_RIFLE,pitch);
}
export function listenerToolMuzzle(pitch=0){return weaponMuzzle(LISTENER_TOOL,pitch);}
function weaponMuzzle(layout,pitch){
 pitch=Math.max(layout.minPitch,Math.min(layout.maxPitch,Number.isFinite(pitch)?pitch:0));
 const p=layout.pivot,m=layout.muzzle,dz=m.z-p.z,dy=m.y-p.y;
 return {x:m.x,y:p.y+dy*Math.cos(pitch)-dz*Math.sin(pitch),z:p.z+dy*Math.sin(pitch)+dz*Math.cos(pitch)};
}
