import * as T from './vendor/three.webgpu.min.js';
import { Assembly, matrix, profile, loft, armorPanel } from './geo.js';
import { addClosedHelmet } from './helmet.js';
import { createGlove, GRIP, syncGloveMaterials } from './hands.js';
import { WEAPON_FRAME } from './weapons.js';
import { createRLHSoldier, syncRLHFirefighterMaterials } from './rlh-firefighter.js';
import { equipmentSurfaces } from './equipment-surfaces.js';
import {pearlMetal,tintPearl} from './pearl-metal.js';

export function createCharacterKit(emblem, surfaces = {}) {
  const geometries = { sphere: new T.SphereGeometry(1, 20, 14), tube: new T.CylinderGeometry(1, 1, 1, 16),
    ring: new T.TorusGeometry(1, .06, 8, 36), halo: new T.TorusGeometry(.32, .008, 6, 52),
    torso: loft([[1.055,.205,.135],[1.13,.197,.134],[1.25,.205,.143],[1.38,.238,.164],[1.49,.255,.171],[1.575,.237,.147],[1.625,.15,.103],[1.658,.079,.074]],24),
    pelvis: loft([[.905,.16,.105],[.935,.229,.15],[.99,.259,.17],[1.055,.25,.156],[1.10,.208,.134]],24),
    chest: armorPanel([[-.13,-.145],[.13,-.145],[.205,-.055],[.224,.092],[.15,.143],[.068,.12],[-.068,.12],[-.15,.143],[-.224,.092],[-.205,-.055]],.036,.025),
    thigh: armorPanel([[-.065,-.155],[.064,-.155],[.088,-.075],[.086,.124],[.045,.158],[-.052,.151],[-.086,.11],[-.085,-.065]],.023,.019),
    shin: armorPanel([[-.05,-.145],[.05,-.145],[.069,.10],[.051,.14],[-.051,.14],[-.069,.10]],.025,.017),
    upperArm: armorPanel([[-.044,-.097],[.044,-.097],[.064,.047],[.034,.093],[-.034,.093],[-.064,.047]],.018,.012),
    patch: new T.PlaneGeometry(.13,.06), cone: new T.ConeGeometry(1, 1, 6),
    crown: armorPanel([[-.105,-.052],[.105,-.052],[.126,.062],[.057,.012],[0,.108],[-.057,.012],[-.126,.062]],.008,.001),
    breastGuard:armorPanel([[-.172,-.075],[.172,-.075],[.208,.01],[.149,.102],[.067,.083],[0,.045],[-.067,.083],[-.149,.102],[-.208,.01]],.026,.016),
    rearBack:armorPanel([[-.185,-.17],[.185,-.17],[.221,-.037],[.16,.17],[-.16,.17],[-.221,-.037]],.028,.013),
    pauldrons:armorPanel([[-.116,-.057],[.111,-.057],[.13,.03],[.077,.089],[-.065,.094],[-.127,.034]],.025,.012),
    tabard:armorPanel([[-.095,0],[.083,0],[.105,-.36],[.012,-.47],[-.052,-.386]],.007,.003),
    tabardInset:armorPanel([[-.033,-.04],[.031,-.04],[.058,-.322],[.010,-.385],[-.022,-.32]],.004,.001),
    sideHip:armorPanel([[-.078,.096],[.06,.105],[.112,.039],[.1,-.124],[-.046,-.136],[-.106,-.048]],.016,.008),
    bootToe:armorPanel([[-.093,-.043],[.093,-.043],[.10,.021],[.068,.052],[-.069,.052],[-.102,.021]],.016,.008)
 };
  geometries.ringFlat=geometries.ring.clone().rotateX(Math.PI/2);
  const physical = (color, metalness=.48, roughness=.43) => new T.MeshPhysicalMaterial({ color, metalness, roughness, clearcoat:.22, clearcoatRoughness:.38, roughnessMap:surfaces.coating||null,envMap:surfaces.environment||null,envMapIntensity:.42 });
  const materials = {
    rose: physical(0xda6798), pearl: physical(0xffd6e7,.32,.46), dark: physical(0x202438,.22,.56),
    gold: physical(0xdcc392,.78,.34), steel: physical(0x6c607d,.72,.42),
    suit: new T.MeshStandardMaterial({color:0x2d233b,roughness:.94,metalness:0,bumpMap:surfaces.fabric||null,bumpScale:.0009}),
    visor: new T.MeshPhysicalMaterial({color:0x110f1a,metalness:.72,roughness:.18,clearcoat:.65,clearcoatRoughness:.13,opacity:1,transparent:false,envMap:surfaces.environment||null,envMapIntensity:.42}),
    lens:new T.MeshPhysicalMaterial({color:0xb71772,metalness:.68,roughness:.09,clearcoat:1,clearcoatRoughness:.05,
      emissive:0x170713,emissiveIntensity:.28,envMap:surfaces.environment||null,envMapIntensity:.9}), glow:new T.MeshBasicMaterial({color:0xff88c2,toneMapped:false}),
    pale:new T.MeshBasicMaterial({color:0xffe7f4,toneMapped:false}),
    cyan:new T.MeshBasicMaterial({color:0x9ce7de,toneMapped:false}),
    emblem: new T.MeshBasicMaterial({map:emblem,transparent:true,depthWrite:false,toneMapped:false})
  };
  materials.rose.map=materials.pearl.map=surfaces.armor||null;
  const equipment=equipmentSurfaces();
  for(const key of ['rose','pearl','dark','steel']){materials[key].map=equipment.metal;materials[key].roughnessMap=equipment.rough;materials[key].bumpMap=equipment.rough;materials[key].bumpScale=.00012;}
  materials.suit.bumpMap=equipment.cloth;materials.suit.bumpScale=.0006;
  materials.lens.emissiveIntensity=.45;
  materials.rose.needsUpdate=materials.pearl.needsUpdate=true;
  // Materials of the gloved hands: fabric, knuckle plates, trim, light strips, scanner and metal.
  const gloves = { fabric: materials.suit, plate: materials.rose, trim: materials.pearl, glow: materials.glow, accent: materials.cyan, metal: materials.gold };
  // Separate shell materials preserve the approved RLH gloves and cloth finish.
  const armorMaterials={...materials};
  for(const key of ['rose','pearl']){const m=materials[key].clone();Object.assign(m,pearlMetal(0xe52d83,key==='pearl'));m.color=pearlMetal(0xe52d83,key==='pearl').color;m.name='AÉGIS pearlescent '+key;armorMaterials[key]=m;}
  const kit={geometries,materials,armorMaterials,gloves,setPalette(colors){
    for(const [name,color] of Object.entries(colors))materials[name]?.color.setHex(color);
    tintPearl(armorMaterials.rose,colors.rose);tintPearl(armorMaterials.pearl,colors.rose,true);
    syncGloveMaterials(gloves);syncRLHFirefighterMaterials(kit);
  }};return kit;
}

// Where each weapon is carried (palm position, body space) and where the idle hand rests with a one-handed weapon.
const STANCE = Object.freeze([[.24, 1.4, -.5], [.12, 1.38, -.36], [.12, 1.38, -.36], [.1, 1.38, -.3], [.1, 1.36, -.32]]);
const REST = Object.freeze([-.25, 1.08, -.16]);
const UPPER = .31, FORE = .35, CARRY = 1.2;

// The suit is a few hundred rounded pieces, merged per bone and material. Pieces carry the armour level that
// unlocks them; changing level re-merges the few meshes of each bone instead of drawing hundreds of instances.
export const createSoldier=createRLHSoldier;
export function createLegacySoldier(kit, createGun, profileInfo) {
  const masculine=!!profileInfo?.masculine, side=masculine?.257:.243, width=masculine?1.05:1.015;
  // Heights are measured from the boots to the top of the suit, including antennae.
  const measuredUnscaledHeight=masculine?1.9728206886417337:1.9628380986029441;
  const targetHeight=masculine?1.80:1.70;
  const heightScale=targetHeight/measuredUnscaledHeight;
  const root=new T.Group(),hips=new T.Group(),spine=new T.Group(),body=new T.Group(),rig=new T.Group(),head=new T.Group(),hair=new T.Group();
  root.name=profileInfo?.name||'GHJU';hips.name='Pelvis';spine.name='Spine';body.name='ChestPivot';rig.name='ArmorRig';
  hips.position.y=.97;spine.position.y=.03;rig.position.y=-1;
  root.add(hips);hips.add(spine);spine.add(body);body.add(rig);rig.add(head);
  head.name='ClosedHelmet';head.position.y=masculine?1.785:1.775;
  // Anatomical readability: human-sized head, broad enough hips and legs, not stick limbs.
  head.scale.setScalar(1.07);
  const {geometries:g,materials:m}=kit, assemblies=[];
  const builder=(bone,offsetY=0)=>{
    const asm=new Assembly();assemblies.push({asm,bone});
    const radius=scale=>Math.max(.003,Math.min(.06,Math.min(...scale)*.34));
    const point=pos=>offsetY?[pos[0],pos[1]+offsetY,pos[2]]:pos;
    return {
      plate:(mat,pos,scale,level=1,rot=[0,0,0],max=10)=>asm.box(mat,scale,point(pos),rot,radius(scale),true,level,max),
      sphere:(mat,pos,scale,level=1,max=10)=>asm.ball(mat,point(pos),scale,true,level,max),
      link:(mat,a,b,r1,r2=r1,level=1)=>asm.limb(mat,point(a),point(b),r1,r2,true,level),
      part:(geometry,mat,pos,scale,level=1,rot=[0,0,0],max=10)=>asm.add(geometry,mat,matrix(point(pos),rot,scale),true,level,max),
      add:(geometry,mat,m4,level=1,max=10)=>asm.add(geometry,mat,offsetY?new T.Matrix4().makeTranslation(0,offsetY,0).multiply(m4):m4,true,level,max),
      ell:(mat,pos,radii,rot=[0,0,0],level=1,max=10)=>asm.ellipsoid(mat,point(pos),radii,rot,true,level,max),
      dome:(mat,pos,radii,rot=[0,0,0],level=1,max=10)=>asm.dome(mat,point(pos),radii,rot,true,level,max)
    };
  };
  const PI=Math.PI;
  // ----------------------------------------------------------------- torso
  {
    const {part,sphere,plate,link,add,ell}=builder(rig);
    part(g.torso,m.suit,[0,0,0],[width,1,1]);
    // A fitted cloth harness sits under angular white/coloured plates, as in LYLU/GHJU reference designs.
    // Articulated visual plates stay bound to the same existing skeleton: no separate 2D impostor.
    part(g.rearBack,m.dark,[0,1.46,.245],[1.1,1.16,1],1,[0,PI,0]);
    part(g.rearBack,m.pearl,[0,1.455,.268],[.93,.96,.62],1,[0,PI,0]);
    part(g.crown,m.rose,[0,1.47,.292],[.9,.9,.45],1,[0,PI,0]);
    for(const k of [-1,1]){
      link(m.dark,[k*.215,1.64,.08],[k*.176,1.14,.16],.022,.024);
      plate(m.steel,[k*.218,1.45,.19],[.041,.27,.023],1,[0,0,k*.075]);
      plate(m.rose,[k*.213,1.453,.206],[.012,.12,.008],1);
      plate(m.dark,[k*.235,1.18,.1],[.115,.135,.1],1);
    }
    // Back panel with a spine ridge and harness bars, front chest shells, pearl shoulder yoke and dark straps.
    plate(m.dark,[0,1.46,.15],[.39,.32,.095],1,[-.06,0,0]);
    part(g.chest,m.pearl,[0,1.47,-.166],[width,1,1]);
    part(g.chest,m.rose,[0,1.49,-.203],[.54,.67,.32],1);
    part(g.breastGuard,m.dark,[0,1.485,-.229],[.96,.96,.68]);
    part(g.breastGuard,m.rose,[0,1.484,-.255],[.83,.78,.57]);
    // The crowned chest emblem is present from level 1, not an optional high-tier sticker.
    part(g.crown,m.pearl,[0,1.52,-.273],[.66,.66,.45]);
    plate(m.dark,[0,1.365,-.201],[.31,.035,.018],1);
    plate(m.pearl,[0,1.615,-.209],[.11,.032,.012],1,[0,0,0]);
    plate(m.steel,[0,1.475,-.216],[.024,.21,.012]);
    plate(m.glow,[0,1.56,-.218],[.009,.04,.006]);
    for(const x of [-.185,.185])for(const y of [1.39,1.54])sphere(m.steel,[x,y,-.205],[.009,.009,.005]);
    link(m.steel,[0,1.64,.178],[0,1.14,.2],.014,.018);
    for(let i=0;i<4;i++)plate(m.dark,[0,1.56-i*.1,.175+i*.004],[.26,.03,.03],1);
    for(const s of [-1,1]){
      plate(m.pearl,[s*.135,1.568,-.177],[.16,.025,.045],1,[0,0,s*-.12]);
      link(m.dark,[s*.2,1.61,.04],[s*.13,1.16,-.125],.017);
      plate(m.steel,[s*.211,1.265,.018],[.037,.17,.15],1,[0,0,s*.1]);
      plate(m.rose,[s*.11,1.24,-.132],[.12,.058,.034],1,[-.1,0,s*-.05]);
      for(let i=0;i<3;i++)plate(m.dark,[s*.192,1.20+i*.05,.076],[.04,.01,.11],1,[0,0,s*.1]);
    }
    // Load-bearing webbing, buckles and power-cell sockets around the central insignia.
    for(const sign of [-1,1]){
      link(m.steel,[sign*.228,1.61,-.103],[sign*.176,1.14,-.177],.013,.014);
      plate(m.dark,[sign*.168,1.325,-.198],[.056,.046,.025]);
      plate(m.pearl,[sign*.169,1.329,-.216],[.029,.017,.007]);
      plate(m.glow,[sign*.229,1.52,-.145],[.008,.038,.009]);
    }
    // Four hard-shell rifle magazines and their fabric retention loops give the chest rig
    // the layered, load-bearing silhouette of the LYLU/GHJU field-design references.
    for(const x of [-.168,-.056,.056,.168]){
      plate(m.dark,[x,1.274,-.163],[.061,.104,.069],1,[.06,0,0]);
      plate(m.steel,[x,1.275,-.202],[.043,.077,.012],1,[.06,0,0]);
      plate(m.rose,[x,1.263,-.211],[.012,.046,.006],1,[.06,0,0]);
      plate(m.dark,[x,1.324,-.207],[.066,.014,.014],1);
    }
    // Abdomen bands, belt and buckle.
    for(const y of [1.205,1.155])plate(m.dark,[0,y,-.132],[.29,.043,.043],1,[-.05,0,0]);
    plate(m.dark,[0,1.07,0],[.47,.062,.33]);plate(m.pearl,[0,1.07,-.178],[.082,.055,.025]);
    plate(m.glow,[0,1.07,-.194],[.037,.013,.005]);
    // Neck and collar.
    link(m.suit,[0,1.63,0],[0,1.72,0],.072,.066);
    part(g.ring,m.dark,[0,1.644,0],[.087,.087,.087],1,[PI/2,0,0]);
    // Level 2: one curved composite plastron, with a recessed core and back brace.
    part(g.chest,m.pearl,[0,1.49,-.19],[width*.94,.81,.58],2);
    for(const s of [-1,1]){
      plate(m.steel,[s*.15,1.34,-.182],[.11,.067,.035],2,[0,0,s*.15]);
      plate(m.rose,[s*.1,1.44,.20],[.13,.33,.075],2);
      plate(m.dark,[s*.07,1.52,-.216],[.012,.106,.008],2,[0,0,s*.08]);
    }
    plate(m.dark,[0,1.50,-.222],[.051,.066,.012],2);plate(m.glow,[0,1.50,-.231],[.015,.035,.005],2);
    part(g.ring,m.glow,[0,1.50,-.232],[.032,.032,.032],2,[0,0,0]);
    // Level 3: insignia, radio and antenna.
    part(g.patch,m.emblem,[0,1.565,-.235],[1,1,1],1,[0,PI,0]);
    plate(m.dark,[-.26,1.49,.13],[.1,.18,.09],3);link(m.steel,[-.27,1.57,.13],[-.27,1.83,.13],.008,.005,3);
    sphere(m.glow,[-.27,1.83,.13],[.012,.018,.012],3);
    // Tactile belt buckle, reinforced waistline and a hanging tactical ID mount.
    plate(m.dark,[0,1.06,-.206],[.11,.086,.026]);
    plate(m.rose,[0,1.06,-.228],[.065,.05,.012]);
    plate(m.pearl,[0,1.063,-.237],[.025,.016,.006]);
    for(const x of [-.175,.175]){
      plate(m.steel,[x,1.071,-.18],[.037,.038,.014]);
      plate(m.dark,[x,1.044,-.199],[.071,.018,.017]);
    }
    // Level 5: laser-cell utility belt and symmetric medical pouches.
    for(const s of [-1,1]){
      plate(m.dark,[s*.27,1.07,.01],[.13,.16,.19],5);plate(m.rose,[s*.285,1.07,-.09],[.095,.11,.035],5);
      link(m.pale,[s*.24,1.13,-.13],[s*.24,1.02,-.13],.018,.018,5);
      plate(m.steel,[s*.355,1.07,.01],[.02,.1,.14],5);
    }
    // A compact radio and utility pouches stay visible on the starter loadout.
    for(const s of [-1,1]){
      plate(m.dark,[s*.30,1.015,-.005],[.105,.13,.17],1,[0,0,s*-.1]);
      plate(m.steel,[s*.30,1.018,-.094],[.072,.095,.018],1,[0,0,s*-.1]);
      plate(m.rose,[s*.30,1.026,-.106],[.012,.05,.006],1);
      plate(m.dark,[s*.36,1.018,.02],[.018,.07,.12],1,[0,0,s*-.08]);
    }
    // Level 7: a compact reactor, visible in the third-person view.
    plate(m.dark,[0,1.43,.245],[.34,.39,.16],7);plate(m.pearl,[0,1.44,.337],[.28,.31,.07],7);
    for(const s of [-1,1]){
      link(m.steel,[s*.13,1.30,.36],[s*.13,1.60,.36],.058,.058,7);
      link(m.glow,[s*.13,1.33,.411],[s*.13,1.56,.411],.022,.022,7);
      ell(m.rose,[s*.15,1.64,.30],[.07,.045,.1],[0,0,s*.18],7);
    }
    part(g.patch,m.emblem,[0,1.44,.381],[.9,.9,.9],7);
    // Level 8: rose-gold seam work ties all the armor pieces together.
    for(const s of [-1,1]){
      plate(m.gold,[s*.13,1.625,-.16],[.22,.025,.08],8,[0,0,s*-.12]);
      plate(m.gold,[s*.26,1.46,-.15],[.024,.23,.05],8,[0,0,s*.12]);
      plate(m.gold,[s*.23,1.08,-.16],[.11,.024,.10],8);
    }
    // Level 9: folded dorsal wings (layered feathers with light edges) and beacons.
    for(const s of [-1,1]){
      [[.0,.7],[.12,.62],[.24,.52]].forEach(([x,len],i)=>{
        const base=[s*(.24+x*.5),1.62-i*.02,.31+i*.03],blade=profile([[0,0],[.1,.05+i*.015],[.1+i*.01,len*.55],[.03,len],[-.02,len*.8],[-.04,.1]],.014,.003);
        const turn=[.16,s*(.3+i*.12),s*-.34-i*.05];
        add(blade,i===1?m.rose:m.pearl,matrix(base,turn),9);
        add(blade,m.glow,matrix([base[0],base[1],base[2]+.012],turn,[.55,.9,.4]),9);
      });
      link(m.glow,[s*.25,1.44,.43],[s*.45,1.91,.35],.012,.012,9);
      sphere(m.pale,[s*.48,1.94,.33],[.022,.029,.023],9);
    }
  }
  {
    const {part,ell,plate}=builder(hips,-.97);
    // Continuous, tapered anatomical pelvis bridges the two femur sockets.
    // Hip shells do not float with the weapon or detach when the thigh rotates.
    part(g.pelvis,m.suit,[0,0,0],[masculine?1.035:1.065,1,1]);
    ell(m.suit,[0,.91,0],[masculine?.205:.224,.105,.135]);
    ell(m.dark,[0,.973,-.09],[masculine?.19:.203,.069,.072]);
    for(const side of [-1,1]){
      ell(m.suit,[side*(masculine?.155:.165),.884,0],[.094,.098,.112]);
      plate(m.dark,[side*.175,.963,-.038],[.085,.036,.09],1,[0,0,side*-.09]);
    }
  }
  // ----------------------------------------------------------------- sealed helmet
  {
    const asm=new Assembly();assemblies.push({asm,bone:head});
    addClosedHelmet(asm,{armor:m.rose,trim:m.pearl,visor:m.visor,lens:m.lens,fabric:m.suit,glow:m.glow,metal:m.steel},{scale:masculine?.76:.74});
    const {plate,sphere,link,part}=builder(head);
    // Command crest follows the shell rather than extending it into a large crown.
    for(const s of [-1,0,1]){
      plate(m.gold,[s*.055,.157,-.095],[.035,.035-Math.abs(s)*.005,.025],10,[0,0,s*-.13]);
      sphere(m.pale,[s*.055,.17,-.109],[.006,.008,.004],10);
    }
    // Close-fit comms pods, a raised rear rail and paired sensor stalks finish the helmet silhouette.
    for(const s of [-1,1]){
      plate(m.dark,[s*.12,.008,.028],[.034,.07,.074],1,[0,0,s*-.1]);
      plate(m.steel,[s*.143,.008,-.012],[.014,.047,.038],1,[0,0,s*-.1]);
      plate(m.glow,[s*.152,.008,-.017],[.005,.022,.018],1);
      link(m.steel,[s*.105,.134,.052],[s*.115,.191,.065],.005,.004,1);
      sphere(m.pale,[s*.115,.192,.065],[.008,.01,.008],1);
    }
    part(g.crown,m.glow,[0,.152,-.143],[.36,.36,.28],1,[0,0,0]);
    plate(m.dark,[0,.158,.061],[.18,.018,.046],1,[.04,0,0]);
    plate(m.rose,[0,.169,.059],[.105,.004,.018],1,[.04,0,0]);
  }
  const orbit=new T.Group();orbit.position.set(0,.236,.025);head.add(orbit);
  {
    const {part}=builder(orbit);
    part(g.halo,m.glow,[0,0,0],[.68,.68,.68],10,[PI/2-.14,0,0]);
  }
  // Fabric pennants are bound to the pelvis, as in both reference images.
  // They sway independently of the thigh armour and never become rigid leg extensions.
  const pennants=[];
  for(const side of [-1,1]){
    const pivot=new T.Group();
    pivot.position.set(side*(masculine?.285:.278),-.035,side===1?.09:.045);
    pivot.rotation.z=side*.06;hips.add(pivot);
    const {part,plate}=builder(pivot);
    part(g.tabard,m.suit,[0,-.245,.006],[side===1?1.13:.8,side===1?1.03:.78,1]);
    part(g.tabardInset,side===1?m.rose:m.dark,[0,-.245,-.007],[side===1?1:.7,1,.7]);
    plate(m.pearl,[0,-.268,-.019],[side===1?.072:.043,.013,.015]);
    plate(m.rose,[0,-.065,-.009],[.139,.027,.02],1,[0,0,side*.07]);
    pennants.push({pivot,side});
  }
  // ----------------------------------------------------------------- legs
  const legs=[],knees=[],feet=[];
  for(const s of [-1,1]){
    const leg=new T.Group();leg.name=s<0?'LeftThigh':'RightThigh';leg.position.set(s*(masculine?.155:.165),0,0);leg.scale.set(1.01,1,1.015);hips.add(leg);legs.push(leg);
    const shin=new T.Group();shin.name=s<0?'LeftShin':'RightShin';shin.position.set(0,-.425,0);shin.scale.set(1.01,1,1.02);leg.add(shin);knees.push(shin);
    {
      const {plate,sphere,link,part,ell}=builder(leg);
      part(loft([[-.405,.078,.076],[-.33,.093,.091],[-.21,.117,.11],[-.07,.121,.119],[-.025,.095,.086]],18),m.suit,[0,0,0],[1,1,1]);
      ell(m.suit,[s*.002,-.061,-.025],[.099,.146,.11]);
      // Smooth suit wraps the hip socket; segmented hard-shell armour begins below the joint.
      part(g.thigh,m.pearl,[s*.01,-.19,-.132],[1,1,1],1,[.08,0,s*-.05]);
      // Sewn tension folds belong to the cloth under the shell, not floating
      // armour cubes. They break up the uniform cylindrical thigh silhouette.
      for(const y of [-.072,-.095,-.126]){
        link(m.suit,[s*-.060,y,.094],[s*.055,y-.014,.098],.004,.003);
      }
      part(g.sideHip,m.rose,[s*.12,-.102,-.045],[.83,.94,.93],1,[0,s*.45,s*-.20]);
      plate(m.dark,[s*.10,-.17,-.081],[.058,.033,.04]);
      plate(m.rose,[s*.012,-.19,-.153],[.025,.235,.012],1,[.08,0,s*-.05]);
      plate(m.steel,[s*.015,-.095,-.159],[.104,.018,.013],1,[.08,0,s*-.05]);
      plate(m.dark,[0,-.31,-.083],[.147,.026,.026],1);
      for(const yy of [-.235,-.288])plate(m.dark,[0,yy,-.104],[.145,.019,.026]);
      plate(m.steel,[s*.104,-.21,-.093],[.033,.14,.022],1,[0,0,s*-.1]);
      // Level 5: thigh strap and plates.
      part(g.ring,m.dark,[0,-.12,0],[.135,.135,.135],5,[PI/2,0,0]);plate(m.pearl,[s*.14,-.15,0],[.08,.16,.16],5);
      // Level 8: separate hip guards follow each moving leg.
      plate(m.gold,[s*.13,-.04,-.02],[.11,.30,.22],8,[0,0,s*-.13]);
      plate(m.pearl,[s*.10,-.10,-.12],[.14,.23,.06],8,[0,0,s*-.1]);
    }
    {
      const {plate,sphere,link,part,ell}=builder(shin);
      sphere(m.suit,[0,0,0],[.089,.079,.084]);
      part(loft([[-.375,.053,.058,.01],[-.31,.064,.068,.014],[-.23,.082,.081,.020],[-.14,.085,.076,.015],[-.07,.079,.070],[0,.073,.067]],20),m.suit,[0,0,0],[1,1,1]);
      for(const y of [-.041,-.063,-.085])link(m.suit,[-.056,y,.061],[.058,y-.010,.066],.0035,.0025);
      part(g.shin,m.pearl,[0,-.208,-.078],[1,1,1]);
      plate(m.rose,[0,-.208,-.103],[.026,.21,.016],1);
      ell(m.pearl,[0,.006,-.074],[.078,.063,.028]);
      part(g.crown,m.rose,[0,.001,-.109],[.19,.17,.24]);
      plate(m.pearl,[0,-.16,-.098],[.052,.11,.013]);
    }
    const foot=new T.Group();foot.name=s<0?'LeftFoot':'RightFoot';foot.position.set(0,-.36,0);shin.add(foot);feet.push(foot);
    {
      // The boot pivots from the ankle, separate from the shin so toe-off and landing read clearly.
      const {part,ell,plate}=builder(foot,.36);
      part(g.ring,m.dark,[0,-.36,-.01],[.075,.075,.075],1,[PI/2,0,0]);
      ell(m.dark,[0,-.435,-.041],[.087,.075,.14]);
      plate(m.pearl,[0,-.448,-.131],[.162,.065,.145],1,[.10,0,0]);
      part(g.bootToe,m.dark,[0,-.448,-.215],[1,1,.8]);
      plate(m.rose,[0,-.439,-.204],[.09,.019,.012],1,[.10,0,0]);
      plate(m.dark,[0,-.492,-.059],[.194,.031,.307]);ell(m.dark,[0,-.455,.064],[.073,.064,.055]);
      for(const x of [-.065,.065])plate(m.steel,[x,-.478,-.053],[.023,.013,.273]);
      for(let i=0;i<4;i++){
        plate(m.dark,[0,-.409+i*.016,-.105-i*.019],[.105,.008,.014],1,[.08,0,0]);
        plate(m.pearl,[0,-.519,-.171+i*.075],[.148,.012,.028]);
      }
      for(const side of [-1,1]){
        plate(m.pearl,[side*.085,-.432,-.15],[.022,.012,.118]);
        plate(m.rose,[side*.103,-.507,-.135],[.013,.017,.19]);
      }
      part(g.crown,m.rose,[0,-.369,-.139],[.17,.16,.14]);
      plate(m.glow,[0,-.365,.076],[.037,.015,.008]);
    }
    {
      const {part,ell,plate}=builder(shin);
      // Level 5: pronounced shin shells, articulated knee caps and straps.
      part(g.shin,m.pearl,[0,-.208,-.098],[1.07,1.06,.72],5,[.04,0,0]);ell(m.rose,[0,.015,-.097],[.086,.067,.034],[0,0,0],5);
      plate(m.glow,[0,-.20,-.123],[.009,.17,.005],5);
    }
  }
  // ----------------------------------------------------------------- arms (two bones solved to the weapon)
  const arms=[];
  for(const s of [-1,1]){
    const shoulder=new T.Group();shoulder.name=s<0?'LeftShoulder':'RightShoulder';shoulder.position.set(s*side,1.57,0);rig.add(shoulder);
    const upper=new T.Group(),fore=new T.Group();upper.name=s<0?'LeftUpperArm':'RightUpperArm';fore.name=s<0?'LeftForearm':'RightForearm';shoulder.add(upper,fore);
    {
      // The shoulder cap and pauldrons stay with the torso; only the arm below them turns.
      const {plate,part,ell,dome,sphere}=builder(shoulder);
      ell(m.suit,[s*.002,-.02,0],[.091,.102,.10]);
      dome(m.pearl,[s*.014,.01,0],[masculine?.109:.101,.078,.11],[0,0,s*-.16]);
      part(g.pauldrons,m.pearl,[s*.022,.027,-.108],[1,1,.85],1,[0,0,s*-.12]);
      part(g.pauldrons,m.rose,[s*.032,.03,-.132],[.70,.67,.55],1,[0,0,s*-.12]);
      part(g.crown,m.pearl,[s*.038,.04,-.145],[.27,.27,.45],1,[0,0,s*-.13]);
      plate(m.rose,[s*.055,.017,-.10],[.091,.027,.035],1,[0,0,s*-.15]);
      plate(m.dark,[s*.02,.067,.012],[.085,.014,.035],1,[0,0,s*-.2]);
      for(const x of [-.035,.035])sphere(m.steel,[s*.014+x,.022,-.102],[.008,.008,.005]);
      // Level 3: layered curved pauldrons, not a single sphere.
      dome(m.steel,[s*.02,.02,0],[.137,.084,.137],[0,0,s*-.2],3);
      dome(m.pearl,[s*.027,.042,-.01],[.125,.078,.125],[0,0,s*-.2],3);
      part(g.ringFlat,m.rose,[s*.027,.017,0],[.125,.125,.125],3,[0,0,s*-.2]);
      ell(m.rose,[s*.079,-.016,.01],[.034,.066,.108],[0,0,s*-.24],3);
      plate(m.glow,[s*.041,.1,-.133],[.07,.007,.005],3);
      part(g.patch,m.emblem,[s*.032,.046,-.132],[.55,.55,.55],3,[0,PI,s*-.15]);
      // Level 8: gold pauldron rim.
      part(g.ringFlat,m.gold,[s*.027,.042,-.005],[.125,.125,.125],8,[0,0,s*-.2]);
    }
    {
      const {plate,sphere,link,ell,part}=builder(upper);
      part(loft([[-.31,.054,.057],[-.26,.065,.068,.005],[-.16,.078,.076,.008],[-.07,.082,.078,.005],[-.025,.072,.07]],20),m.suit,[0,0,0],[1,1,1]);
      part(g.upperArm,m.rose,[0,-.14,.084],[1,1,1],1,[0,PI,0]);
      plate(m.pearl,[0,-.13,.103],[.051,.051,.012]);
      sphere(m.suit,[0,-.31,0],[.073,.069,.074]);
      ell(m.rose,[0,-.31,-.06],[.061,.052,.024]);
    }
    {
      const {plate,sphere,link,part,ell}=builder(fore);
      // Broad extensor muscles taper into a slim wrist; the glove cuff overlaps
      // that wrist so the hand reads as part of the arm during IK and reloads.
      part(loft([[-.35,.033,.036],[-.31,.042,.044],[-.25,.052,.054,.002],[-.14,.068,.064,.005],[-.07,.070,.061],[0,.056,.053]],20),m.suit,[0,0,0],[1,1,1]);
      for(const y of [-.022,-.043,-.067]){
        link(m.suit,[-.047,y,-.038],[.049,y-.008,-.041],.004,.0028);
      }
      part(g.ringFlat,m.dark,[0,-.327,0],[.041,.041,.041]);
      part(g.ringFlat,m.pearl,[0,-.334,0],[.039,.039,.039]);
      plate(m.pearl,[0,-.18,.054],[.087,.20,.035],1,[.065,0,0]);
      plate(m.rose,[0,-.18,.076],[.018,.14,.008],1,[.065,0,0]);
      sphere(m.dark,[0,-.35,0],[.038,.035,.039]);
      // Level 4: armoured gauntlet, wrist scanner and hologram (kept small enough not to hide the weapon).
      link(m.pearl,[0,-.07,0],[0,-.3,0],.08,.06,4);
      part(g.ring,m.rose,[0,-.075,0],[.083,.083,.083],4,[PI/2,0,0]);part(g.ring,m.rose,[0,-.295,0],[.065,.065,.065],4,[PI/2,0,0]);
      plate(m.dark,[0,-.2,.064],[.103,.12,.025],4);
      plate(m.cyan,[0,-.2,.08],[.065,.039,.007],4);
      part(g.ring,m.gold,[0,-.19,0],[.072,.072,.072],8,[PI/2,0,0]);
      if(s===-1)plate(m.cyan,[0,-.3,.066],[.053,.025,.032],4,[-.2,0,0]);
      part(g.patch,m.emblem,[0,-.12,.12],[.65,.65,.65],10,[0,0,0]);
    }
    arms.push({s,shoulder,upper,fore,elbow:new T.Vector3(),wrist:new T.Vector3()});
  }
  // ----------------------------------------------------------------- weapon and hands
  const mount=new T.Group();rig.add(mount);
  const gun=createGun({sleeve:false});gun.scale.setScalar(CARRY);mount.add(gun);
  const rest=createGlove(kit.gloves,{mirror:true,sleeve:false});rest.scale.multiplyScalar(CARRY);rest.rotation.x=-PI/2;rest.userData.setBasePosition(REST);rig.add(rest);rest.visible=false;
  let weaponIndex=0,currentWeaponPose=-1,currentSupportPose=-1,currentWeaponKick=-1;
  const unit=new T.Vector3(),pole=new T.Vector3(),dir=new T.Vector3(),hint=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3(),inverseShoulder=new T.Quaternion();
  const poseEuler=new T.Euler(),wristR=new T.Vector3(),wristL=new T.Vector3();
  const aim=(group,toward,upHint)=>{
    // Local -y follows `toward`; local +z leans toward `upHint`.
    const y=a.copy(toward).negate().normalize(),z=b.copy(upHint).addScaledVector(y,-upHint.dot(y));
    if(z.lengthSq()<1e-6)z.set(0,0,1);z.normalize();
    const x=new T.Vector3().crossVectors(y,z);group.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));
  };
  function solve(arm,wrist){
    const {s,shoulder,upper,fore}=arm,to=dir.copy(wrist).sub(shoulder.position).applyQuaternion(inverseShoulder.copy(shoulder.quaternion).invert());
    const reach=UPPER+FORE-.004,d=Math.min(Math.max(to.length(),Math.abs(UPPER-FORE)+.01),reach);
    unit.copy(to).normalize();
    const along=(UPPER*UPPER-FORE*FORE+d*d)/(2*d),h=Math.sqrt(Math.max(0,UPPER*UPPER-along*along));
    // RLH V692: elbow guide deliberately outside the torso, instead of under the armpit.
    pole.set(s*.65,-.28,.27);pole.addScaledVector(unit,-pole.dot(unit)).normalize();
    arm.elbow.copy(unit).multiplyScalar(along).addScaledVector(pole,h);
    arm.wrist.copy(unit).multiplyScalar(d);
    upper.position.set(0,0,0);aim(upper,arm.elbow,hint.set(s*.4,.5,-.1));
    fore.position.copy(arm.elbow);aim(fore,b.copy(arm.wrist).sub(arm.elbow),hint.set(0,1,0));
    fore.userData.length=arm.wrist.clone().sub(arm.elbow).length();
  }
  function solveArms(){
    const hand=gun.userData.hand,supportHand=gun.userData.support,support=WEAPON_FRAME[weaponIndex].support;
    wristR.set(...GRIP.wrist).multiply(hand.scale).applyEuler(hand.rotation).add(hand.position).applyEuler(poseEuler).multiplyScalar(CARRY).add(mount.position);
    if(support)wristL.set(...GRIP.wrist).multiply(supportHand.scale).applyEuler(supportHand.rotation).add(supportHand.position).applyEuler(poseEuler).multiplyScalar(CARRY).add(mount.position);
    else wristL.set(...GRIP.wrist).multiply(rest.scale).applyEuler(rest.rotation).add(rest.position);
    solve(arms[0],wristL);solve(arms[1],wristR);
    for(const arm of arms)arm.fore.scale.set(1,arm.fore.userData.length/FORE,1);
  }
  function poseWeapon(reload=0,kick=0){
    reload=Math.max(0,Math.min(1,reload));
    const hand=gun.userData.hand,supportHand=gun.userData.support,support=WEAPON_FRAME[weaponIndex].support,supportPose=support?(supportHand.userData.pose?.reload||0):0;
    if(Math.abs(reload-currentWeaponPose)<.004&&Math.abs(supportPose-currentSupportPose)<.004&&Math.abs(kick-currentWeaponKick)<.002)return;
    currentWeaponPose=reload;currentSupportPose=supportPose;currentWeaponKick=kick;
    const angle=reload*PI/2+kick*.055*(1-reload);
    gun.rotation.set(angle,0,0);poseEuler.set(angle,0,0);
    solveArms();
  }
  // Adapted from RLH firefighter-motion V692: pinned feet and a two-segment knee solver.
  // Pink War is procedural (not Mixamo): each computed thigh/shin angle drives an actual pivot.
  const thighLength=.425,shinLength=.36,ankleRest=.185;
  function resolveLeg(index,ankleY,ankleZ,footRoll){
    const hipY=hips.position.y;
    let dy=ankleY-hipY,dz=ankleZ;
    const dist=Math.max(.001,Math.hypot(dy,dz));
    const reach=thighLength+shinLength-.009;
    const clamped=Math.min(reach,Math.max(Math.abs(thighLength-shinLength)+.008,dist));
    const ny=dy/dist,nz=dz/dist;
    const along=(thighLength*thighLength-shinLength*shinLength+clamped*clamped)/(2*clamped);
    const bend=Math.sqrt(Math.max(0,thighLength*thighLength-along*along));
    // Knees track forward in local -Z, ankles remain at ground height during stance.
    const ky=ny*along-nz*bend,kz=nz*along+ny*bend;
    const upper=Math.atan2(-kz,-ky);
    const lower=Math.atan2(-(nz*clamped-kz),-(ny*clamped-ky));
    legs[index].rotation.x=upper;
    knees[index].rotation.x=lower-upper;
    feet[index].rotation.x=footRoll-lower;
    legs[index].rotation.z=0;
    knees[index].rotation.y=0;
  }
  const stanceCycle=(phase,beta,stride,lift)=>{
    const p=(phase%1+1)%1;
    if(p<beta){
      const u=p/beta,e=Math.max(0,(u-.72)/.28);
      return {z:stride*(.5-u),y:0,roll:-.045+.18*e*e*(3-2*e)};
    }
    const t=(p-beta)/(1-beta),smooth=t*t*(3-2*t);
    return {z:stride*(-.5+smooth),y:lift*Math.sin(Math.PI*t)**2,roll:.15*(1-smooth)-.08*smooth};
  };
  const soldierApi={
    root,hips,spine,body,rig,head,hair,legs,knees,feet,gun,arms,pennants,
    targetHeight,heightScale,measuredUnscaledHeight,
    // Expose calculated joints for the lab; elbow/wrist are virtual IK pivots, not forearm origins.
    jointPositions(){
      root.updateWorldMatrix(true,true);
      const at=o=>o.getWorldPosition(new T.Vector3());
      const joints={pelvis:at(hips),chest:rig.localToWorld(new T.Vector3(0,1.45,0)),head:at(head)};
      for(let i=0;i<2;i++){
        const side=i===0?'left':'right',arm=arms[i];
        joints[side+'Hip']=at(legs[i]);joints[side+'Knee']=at(knees[i]);
        joints[side+'Ankle']=at(feet[i]);
        joints[side+'Toe']=feet[i].localToWorld(new T.Vector3(0,-.16,-.14));
        joints[side+'Shoulder']=at(arm.shoulder);
        joints[side+'Elbow']=arm.shoulder.localToWorld(arm.elbow.clone());
        joints[side+'Wrist']=arm.shoulder.localToWorld(arm.wrist.clone());
      }
      return joints;
    },
    // Choose the weapon in the hands: the right palm takes the grip, the free hand takes the support or rests.
    setWeapon(index){
      gun.userData.setVariant(index);
      const frame=WEAPON_FRAME[index],p=new T.Vector3(...STANCE[index]),support=frame.support;
      // Wrists where the gloves actually are on this weapon (its own grip and foregrip).
      const wristOf=glove=>new T.Vector3(...GRIP.wrist).multiply(glove.scale).applyEuler(glove.rotation).add(glove.position).multiplyScalar(CARRY);
      const wristR=()=>p.clone().add(wristOf(gun.userData.hand));
      const wristL=()=>support?p.clone().add(wristOf(gun.userData.support)):new T.Vector3(-GRIP.wrist[0],GRIP.wrist[2],-GRIP.wrist[1]).multiplyScalar(CARRY).add(new T.Vector3(...REST));
      // Pull the weapon toward the body until both hands can reach it.
      for(let i=0;i<40;i++){
        const left=wristL().sub(arms[0].shoulder.position).length(),right=wristR().sub(arms[1].shoulder.position).length();
        if(Math.max(left,right)<=UPPER+FORE-.01)break;p.z+=.01;
      }
      mount.position.copy(p);
      this._weaponAnchor=p.clone();
      rest.visible=!support;
      weaponIndex=index;currentWeaponPose=currentSupportPose=currentWeaponKick=-1;soldierApi.weapon=index;poseWeapon(0);
    },
    setLevel(level){
      level=Math.max(1,Math.min(10,Math.floor(Number(level)||1)));if(level===state.level)return;state.level=level;
      for(const {asm} of assemblies)asm.setLevel(level);
      gun.userData.setLevel?.(level);rest.userData.setLevel(level);
    },
    get equipmentLevel(){return state.level;},
    get visibleParts(){return assemblies.reduce((n,{asm})=>n+asm.count,0);},
    get batchCount(){return assemblies.reduce((n,{asm})=>n+asm.meshes.length,0);},
    animate(time,moving,recoil=0,reload=0,trigger=0,dt=.016,flight=null){
      const elapsed=Math.max(.001,Math.min(.08,dt||.016));
      const firstSample=!this._lastRootPosition;if(firstSample)this._lastRootPosition=root.position.clone();
      let vx=0,vz=0;
      if(moving){
        const dx=root.position.x-this._lastRootPosition.x,dz=root.position.z-this._lastRootPosition.z,maxDelta=.18+12*elapsed;
        if(Math.hypot(dx,dz)<=maxDelta){vx=dx/elapsed;vz=dz/elapsed;}
        if(firstSample){vx=-Math.sin(root.rotation.y)*7;vz=-Math.cos(root.rotation.y)*7;}
      }
      this._lastRootPosition.copy(root.position);
      const yaw=root.rotation.y,turnDelta=this._lastYaw===undefined?0:Math.atan2(Math.sin(yaw-this._lastYaw),Math.cos(yaw-this._lastYaw));
      this._lastYaw=yaw;
      const turn=Math.max(-1,Math.min(1,turnDelta/elapsed/3));
      const forward=-(vx*Math.sin(yaw)+vz*Math.cos(yaw)),lateral=vx*Math.cos(yaw)-vz*Math.sin(yaw);
      // RLH firefighter-motion V692 uses grounded stance/swing phases, pelvis counter-rotation
      // and stable IK grips. Adapt that kinematic model to Pink War's lightweight joint hierarchy.
      const speed=Math.hypot(vx,vz), airborne=!!flight?.airborne, rising=(flight?.verticalSpeed||0)>0;
      const crouched=!!flight?.crouched,aiming=!!flight?.firing||trigger>.1||!!flight?.aim;
      const run=!crouched&&(!!flight?.sprint||speed>8);
      const targetWeight=moving&&!airborne?Math.min(1,speed/(crouched?2.6:4.5)):0;
      this._gaitWeight=(this._gaitWeight??0)+(targetWeight-(this._gaitWeight??0))*Math.min(1,elapsed*9);
      const step=this._gaitWeight;
      if(this._gaitPhase===undefined)this._gaitPhase=0;
      const strideLength=crouched?.16:run?.42:.29;
      const cycleRate=Math.max(.01,speed)/Math.max(.15,strideLength);
      if(speed>.06&&!airborne)this._gaitPhase+=cycleRate*elapsed*PI*2*(forward<-.25?-1:1);
      const phase=this._gaitPhase/(2*PI),beta=crouched?.7:run?.4:.63;
      const l=stanceCycle(phase,beta,strideLength*step,(crouched?.035:run?.13:.075)*step);
      const r=stanceCycle(phase+.5,beta,strideLength*step,(crouched?.035:run?.13:.075)*step);
      const sway=Math.sin(this._gaitPhase)*step;
      // Smooth blending of standing -> low shooting stance, no pose teleport.
      this._low=(this._low??0)+(Number(crouched)-(this._low??0))*Math.min(1,elapsed*8);
      const low=this._low;
      const ready=aiming||!!flight?.aim;
      const kick=Math.max(0,Math.min(1,recoil/.16));
      // Recoil is transmitted through the grip, braced shoulders and torso.
      // Recovery lags slightly behind the gun instead of moving the entire
      // character like one rigid block. The camera/controller remains external.
      this._recoilBody=(this._recoilBody??0)+(kick-(this._recoilBody??0))*(1-Math.exp(-elapsed*(kick>(this._recoilBody??0)?34:16)));
      const absorbed=this._recoilBody;
      const hipHeight=.97-low*.265-step*(run?.07:.048)*(1-low*.8);
      const bob=step*(run?.011:.007)*(1-Math.cos(this._gaitPhase*2));
      const breathe=Math.sin(time*1.6)*.005;
      const idleShift=(1-step)*(1-low)*(ready?0:Math.sin(time*.48)*.010);
      hips.position.set((low*.022)+sway*.009+idleShift,hipHeight-bob,low*.06);
      hips.rotation.set((ready?.065:.016)+low*.085+sway*.01,sway*.048,sway*.015);
      spine.rotation.set(low*.19+(ready?.058:0)-hips.rotation.x*.42+absorbed*.018,-hips.rotation.y*.65,-sway*.012);
      body.position.y=breathe+step*Math.abs(sway)*.004;
      body.rotation.set((ready?.024:0)+absorbed*.019,0,-sway*.012);
      head.rotation.x=-low*.18+Math.sin(time*1.35)*.005-absorbed*.012;
      head.rotation.y=turn*.028+(1-step)*Math.sin(time*.67)*.008;
      if(airborne){
        hips.position.y=.92;
        hips.rotation.x=rising?-.07:.08;
        spine.rotation.x=rising?-.09:.04;
        resolveLeg(0,ankleRest+.23,-.13,-.12);
        resolveLeg(1,ankleRest+.19,.06,-.05);
      } else {
        const relaxedStagger=(1-step)*(1-low)*(ready?0:.032);
        resolveLeg(0,ankleRest+l.y,l.z-relaxedStagger,l.roll*step);
        resolveLeg(1,ankleRest+r.y,r.z+relaxedStagger,r.roll*step);
      }
      // Arms remain weapon-bound through two-bone IK while shoulders absorb stride/recoil.
      for(let i=0;i<arms.length;i++){
        const arm=arms[i],opposition=i===0?1:-1;
        arm.shoulder.rotation.set(step*opposition*Math.sin(this._gaitPhase)*.017,
          step*sway*opposition*.017+opposition*absorbed*.014,-opposition*low*.045-step*sway*.016-opposition*absorbed*.015);
        arm.shoulder.position.z=absorbed*.007;
      }
      body.position.z=absorbed*.015;
      if(this._weaponAnchor){
        mount.position.copy(this._weaponAnchor);
        mount.position.y+=breathe-low*.1+step*sway*.007+kick*.003;
        mount.position.z+=low*.18+(ready?-.025:0)+kick*.025;
        mount.position.x+=step*sway*.009;
        if(flight?.preview){mount.position.y-=.24;mount.position.x+=.07;mount.position.z+=.12;}
      }
      if(rest.visible)rest.userData.animate({relax:.65},dt);
      gun.userData.animateHands?.(trigger,kick>.05?.48:.18,reload,dt);poseWeapon(reload,kick);solveArms();
      hair.rotation.x=Math.sin(time*3)*.045;hair.rotation.z=Math.sin(time*2)*.025;
      for(const {pivot,side} of pennants){
        pivot.rotation.x=.035+Math.sin(time*2.1+side)*.04+step*Math.sin(this._gaitPhase+side)*.095;
        pivot.rotation.y=side*.04+step*Math.sin(this._gaitPhase+.45)*.07;
        pivot.rotation.z=side*(.065+.025*Math.sin(time*1.7))+step*sway*side*.05;
      }
      orbit.rotation.y=time*.24;
    }
  };
  const state={level:0};
  for(const {asm,bone} of assemblies)asm.mount(bone);
  soldierApi.setLevel(1);soldierApi.setWeapon(0);
  if(masculine)body.scale.set(1.02,1,1.03);
  return soldierApi;
}
