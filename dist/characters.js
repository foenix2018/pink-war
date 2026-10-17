const pink = {
  rose:0xff80b2, hot:0xf24a94, pale:0xffd4e7, ink:0x212335, steel:0x51445b, white:0xd6c6d0, violet:0xa891dc
};
const blue = {
  rose:0x79bbff, hot:0x367dff, pale:0xd4edff, ink:0x15263c, steel:0x445e7e, white:0xc9dbea, violet:0x84aaff
};
export const CHARACTERS = Object.freeze([
  Object.freeze({id:'lylu',name:'LYLU',masculine:true,universe:'blue',universeName:'UNIVERS BLEU',colorWord:'bleu',accent:'#79bbff',finish:'titane',palette:Object.freeze(blue),
    armor:Object.freeze({rose:0x2478e6,pearl:0xe0e5e8,dark:0x151b22,gold:0x8c9cac,steel:0x788895,suit:0x15181d,skin:0xd8a78d,hair:0x253345,visor:0x07172a,lens:0x167bcf,glow:0x45a5ff,pale:0xf1f8ff,cyan:0x8ee7f2}),
    world:Object.freeze({background:0x192b45,fog:0x2b415c,ground:0x1b2b3d,tile:0x2c4057,structure:0x2b3d54,lightStone:0x526f89,armor:0x387cc0,armorLight:0xb2d4f3,suit:0x15263b,hair:0x253345,visor:0x091d35,monster:0x293e62,monsterElite:0x31597a,monsterFace:0x112338,cyan:0x9fe6ef,moon:0xbbdcf2,moonRing:0x7cbaed,skyLight:0xbad9f5,groundLight:0x1a3151,sun:0xd8ebff,rim:0x548bdf,fence:0x69b6ff,
      sky:['#071329','#152c49','#38689a','#81b4d8','#2d5179','#142b44'],
      portal:['rgba(231,247,255,.86)','rgba(124,196,255,.72)','rgba(66,107,222,.47)','rgba(83,161,255,.36)','rgba(181,224,255,.85)','rgba(74,149,255,0)'],portalLine:'160,215,255',star:'220,238,255'}),
    radar:Object.freeze({background:'#15253b',frame:'#547391',grid:'#243c57',wall:'#6e89a5',elite:'#76c9ff',enemy:'#a7caff',player:'#edf8ff'}),
    outfitNames:Object.freeze({4:'Éclaireur',7:'Atlas',8:'Azur',9:'Séraphin',10:'Impérateur'})}),
  Object.freeze({id:'ghju',name:'GHJU',masculine:false,universe:'pink',universeName:'UNIVERS ROSE',colorWord:'rose',accent:'#ff80b2',finish:'champagne',palette:Object.freeze(pink),
    armor:Object.freeze({rose:0xe52d83,pearl:0xe5e3e6,dark:0x1b1920,gold:0x998f9b,steel:0x85818d,suit:0x17171d,skin:0xe5adab,hair:0x8f3e70,visor:0x180e1b,lens:0xc22880,glow:0xff53a6,pale:0xfff6fa,cyan:0x9ce7de}),
    world:Object.freeze({background:0x302439,fog:0x423042,ground:0x292731,tile:0x33303d,structure:0x393442,lightStone:0x796673,armor:0xd96799,armorLight:0xf3b1cc,suit:0x292235,hair:0xf1a5cb,visor:0x251d39,monster:0x43345b,monsterElite:0x63415a,monsterFace:0x211d31,cyan:0x9fe6da,moon:0xe3b6c6,moonRing:0xc794bc,skyLight:0xcfb7db,groundLight:0x442737,sun:0xffd7da,rim:0x996acf,fence:0xff77ac,
      sky:['#0d1025','#292438','#765065','#d1909f','#5c4158','#282235'],
      portal:['rgba(255,239,250,.86)','rgba(250,139,201,.72)','rgba(163,80,197,.47)','rgba(255,112,188,.36)','rgba(255,194,225,.85)','rgba(255,91,174,0)'],portalLine:'255,198,234',star:'255,231,241'}),
    radar:Object.freeze({background:'#211a2b',frame:'#68506d',grid:'#33283f',wall:'#74627d',elite:'#fa71a6',enemy:'#caa0fa',player:'#fff0f6'}),
    outfitNames:Object.freeze({})})
]);

export function characterForId(id) {
  return CHARACTERS.find(character=>character.id===id)||CHARACTERS[1];
}
