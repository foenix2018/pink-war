// Metres in the unposed robot frame. Shared by art and projectile emission.
export const FIELD_RIFLE=Object.freeze({
 forms:Object.freeze(['stalker','seer','listener','synth']),
 minPitch:-.55,maxPitch:.4,
 pivot:Object.freeze({x:.20,y:1.57,z:-.01}),
 muzzle:Object.freeze({x:.20,y:1.57,z:-.51}),
 rightGrip:Object.freeze({x:.21,y:1.48,z:.07}),
 leftGrip:Object.freeze({x:.10,y:1.56,z:-.28})
});
export const carriesFieldRifle=form=>FIELD_RIFLE.forms.includes(form);
export function fieldRifleMuzzle(pitch=0){
 pitch=Math.max(FIELD_RIFLE.minPitch,Math.min(FIELD_RIFLE.maxPitch,Number.isFinite(pitch)?pitch:0));
 const p=FIELD_RIFLE.pivot,m=FIELD_RIFLE.muzzle,dz=m.z-p.z,dy=m.y-p.y;
 return {x:m.x,y:p.y+dy*Math.cos(pitch)-dz*Math.sin(pitch),z:p.z+dy*Math.sin(pitch)+dz*Math.cos(pitch)};
}
