// The same approved GHJU/LYLU Shadow Unit rig, kit and native animations
// used by Pink Wars (dist/scene.js). Load after the playable scene starts:
// a slow mesh decompress cannot prevent M02 from launching.
export async function installPinkWarsSoldier(T,scene,characterId,materials){
 const [{createCharacterKit,createSoldier},{installShadowUnit,applyShadowMaterials},{characterForId},{buildGun}]=await Promise.all([
  import('./soldier.js'),import('./shadow-unit-game.js'),import('./characters.js'),import('./weapons.js')
 ]);
 const character=characterForId(characterId);
 const c=document.createElement('canvas');c.width=256;c.height=128;
 const ctx=c.getContext('2d');
 ctx.fillStyle=character.masculine?'#142b42':'#281d33';ctx.fillRect(0,0,256,128);
 ctx.strokeStyle=character.accent;ctx.strokeRect(5,5,246,118);
 ctx.fillStyle=character.accent;ctx.font='900 43px monospace';ctx.textAlign='center';ctx.fillText(character.name,128,77);
 const logo=new T.CanvasTexture(c);logo.colorSpace=T.SRGBColorSpace;
 const kit=createCharacterKit(logo);
 applyShadowMaterials(kit,character);
 // Weapon materials are the same classes/slots used by the main game's
 // scene: GPU maps are shared and this does not mutate the character design.
 const mats={...materials,
   armor:kit.materials.rose,armorLight:kit.materials.pearl,
   dark:kit.materials.dark,steel:kit.materials.steel,
   suit:kit.materials.suit,rose:kit.materials.glow,pale:kit.materials.pale,
   white:kit.materials.pearl,cyan:kit.materials.cyan,
   violet:kit.materials.rose};
 const createGun=options=>buildGun({mats,gloves:kit.gloves,
   sleeve:options?.sleeve!==false,
   makeFlash:parent=>{
     const sprite=new T.Mesh(new T.SphereGeometry(.075,8,6),kit.materials.glow);
     sprite.visible=false;parent.add(sprite);return sprite;
   }});
 const model=createSoldier(kit,createGun,character);
 installShadowUnit(model,character);
 // Preserve the canonical character; do not substitute a generic soldier.
 model.setWeapon(0);model.setLevel(1);
 model.root.scale.setScalar(model.heightScale);
 model.root.visible=false;
 scene.add(model.root);
 return {model,character,kit,dispose(){
   scene.remove(model.root);model.dispose();logo.dispose();
 }};
}
