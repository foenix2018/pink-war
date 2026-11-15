# VOLTIS IEM — 3.86.0

VOLTIS IEM is an additional weapon (slot 9). Existing weapon IDs, hero starters,
movement and rendering budgets are preserved. The accepted long prototype is
reused, transformed into the shared palm/barrel frame for FPS, third person and
tracked Quest aiming. The armory has nine separate physical bays.

## Access and operation

- Arena and shooting range: available immediately, through the equipment menu,
  normal weapon cycling, the range armory and its VR controls.
- Campaign: available from chapter 10. Encounter waves in earlier chapters do
  not grant access. Selection, pickups, firing and restored M01 inventories
  enforce the same rule. This release does not add a new campaign chapter.
- 8 base damage, one pulse every 1.3 seconds, six cells, 2.4-second reload.
- A damaging body hit immobilizes an enemy for three seconds: no movement,
  turning, firing or articulated animation. Another hit refreshes the duration
  instead of accumulating it. Armor and damage scaling still apply; headshots
  do not multiply IEM damage. Projected shields absorb the pulse normally.
- Walls stop the projectile and immobilization. Defense turrets retain their
  existing sniper/close-range armor rule.
- Blue discharge, electrical shot sound and real instanced 3D arcs around
  immobilized enemies. Two additional draw calls only while arcs are visible;
  fixed capacity of 192 segments, at most six simultaneous visual targets.
  All affected enemies remain immobilized even when that visual budget is full.

## Validation

- 64 existing and integration checks pass: projectile impact, wall occlusion,
  all twenty arena waves, range selection, HUD inventory, audio synthesis,
  weapon frames and Quest aiming.
- Additional checks pass for finite firing transforms and pose freeze/resume
  on all nine enemy chassis, including detached RECO1/Rempart skeletons.
- Native WebGPU rendering verified in Chromium with software Vulkan: accepted
  gun, blue projectile and live electrical arcs, 26 draws / 23,964 triangles in
  the isolated test scene, no JavaScript errors. GPU readback image saved in
  `/workspace/livraison/pink-wars-iem-integration-20261115/`.
- Twelve focused checkpoint, inventory restore and projected-shield regression
  checks pass.
- Real-game browser selection at the shooting range passes with the long model
  visible in FPS and six available cells (WebGL 2 compatibility renderer).
- Quest alignment is tested mathematically; no physical headset or iPhone is
  attached to this execution environment.
