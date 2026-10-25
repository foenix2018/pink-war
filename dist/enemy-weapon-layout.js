// Metres in the unposed robot frame. Shared by art and projectile emission.
export const FIELD_RIFLE=Object.freeze({
 forms:Object.freeze(['stalker','seer','listener']),
 minPitch:-.55,maxPitch:.4,
 pivot:Object.freeze({x:.22,y:1.69,z:-.01}),
 muzzle:Object.freeze({x:.22,y:1.69,z:-.51}),
 rightGrip:Object.freeze({x:.23,y:1.60,z:.07}),
 leftGrip:Object.freeze({x:.12,y:1.68,z:-.28})
});
export const carriesFieldRifle=form=>FIELD_RIFLE.forms.includes(form);
export function fieldRifleMuzzle(pitch=0){
 pitch=Math.max(FIELD_RIFLE.minPitch,Math.min(FIELD_RIFLE.maxPitch,Number.isFinite(pitch)?pitch:0));
 const p=FIELD_RIFLE.pivot,m=FIELD_RIFLE.muzzle,dz=m.z-p.z,dy=m.y-p.y;
 return {x:m.x,y:p.y+dy*Math.cos(pitch)-dz*Math.sin(pitch),z:p.z+dy*Math.sin(pitch)+dz*Math.cos(pitch)};
}
