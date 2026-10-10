import * as T from './vendor/three.webgpu.min.js';
import { Assembly, matrix, profile, loft, armorPanel } from './geo.js';
import { addClosedHelmet } from './helmet.js';
import { createGlove, GRIP } from './hands.js';
import { WEAPON_FRAME } from './weapons.js';

export function createCharacterKit(emblem, surfaces = {}) {
  const geometries = { sphere: new T.SphereGeometry(1, 20, 14), tube: new T.CylinderGeometry(1, 1, 1, 16),
    ring: new T.TorusGeometry(1, .06, 8, 36), halo: new T.TorusGeometry(.32, .008, 6, 52),
    torso: loft([[1.055,.205,.135],[1.13,.197,.134],[1.25,.205,.143],[1.38,.238,.164],[1.49,.255,.171],[1.575,.237,.147],[1.625,.15,.103],[1.658,.079,.074]],24),
    pelvis: loft([[.905,.16,.105],[.935,.229,.15],[.99,.259,.17],[1.055,.25,.156],[1.10,.208,.134]],24),
    chest: armorPanel([[-.13,-.145],[.13,-.145],[.205,-.055],[.224,.092],[.15,.143],[.068,.12],[-.068,.12],[-.15,.143],[-.224,.092],[-.205,-.055]],.036,.025),
    thigh: armorPanel([[-.065,-.155],[.064,-.155],[.088,-.075],[.086,.124],[.045,.158],[-.052,.151],[-.086,.11],[-.085,-.065]],.023,.019),
    shin: armorPanel([[-.05,-.145],[.05,-.145],[.069,.10],[.051,.14],[-.051,.14],[-.069,.10]],.025,.017),
    upperArm: armorPanel([[-.044,-.097],[.044,-.097],[.064,.047],[.034,.093],[-.034,.093],[-.064,.047]],.018,.012),
    patch: new T.PlaneGeometry(.13,.06), cone: new T.ConeGeometry(1, 1, 6) };
  geometries.ringFlat=geometries.ring.clone().rotateX(Math.PI/2);
  const physical = (color, metalness=.48, roughness=.43) => new T.MeshPhysicalMaterial({ color, metalness, roughness, clearcoat:.22, clearcoatRoughness:.38, roughnessMap:surfaces.coating||null,envMap:surfaces.environment||null,envMapIntensity:.42 });
  const materials = {
    rose: physical(0xda6798), pearl: physical(0xffd6e7,.32,.46), dark: physical(0x202438,.22,.56),
    gold: physical(0xdcc392,.78,.34), steel: physical(0x6c607d,.72,.42),
    suit: new T.MeshStandardMaterial({color:0x2d233b,roughness:.96,metalness:0,bumpMap:surfaces.fabric||null,bumpScale:.0014}),
    visor: new T.MeshPhysicalMaterial({color:0x110f1a,metalness:.72,roughness:.18,clearcoat:.65,clearcoatRoughness:.13,opacity:1,transparent:false,envMap:surfaces.environment||null,envMapIntensity:.42}), glow:new T.MeshBasicMaterial({color:0xff88c2,toneMapped:false}),
    pale:new T.MeshBasicMaterial({color:0xffe7f4,toneMapped:false}),
    cyan:new T.MeshBasicMaterial({color:0x9ce7de,toneMapped:false}),
    emblem: new T.MeshBasicMaterial({map:emblem,transparent:true,depthWrite:false,toneMapped:false})
  };
  // Materials of the gloved hands: fabric, knuckle plates, trim, light strips, scanner and metal.
  const gloves = { fabric: materials.suit, plate: materials.rose, trim: materials.pearl, glow: materials.glow, accent: materials.cyan, metal: materials.gold };
  return { geometries, materials, gloves, setPalette(colors){for(const [name,color] of Object.entries(colors))materials[name]?.color.setHex(color);} };
}

// Where each weapon is carried (palm position, body space) and where the idle hand rests with a one-handed weapon.
const STANCE = Object.freeze([[.24, 1.4, -.5], [.12, 1.38, -.36], [.12, 1.38, -.36], [.1, 1.38, -.3], [.1, 1.36, -.32]]);
const REST = Object.freeze([-.25, 1.08, -.16]);
const UPPER = .31, FORE = .35, CARRY = 1.2;

// The suit is a few hundred rounded pieces, merged per bone and material. Pieces carry the armour level that
// unlocks them; changing level re-merges the few meshes of each bone instead of drawing hundreds of instances.
export function createSoldier(kit, createGun, profileInfo) {
  const masculine=!!profileInfo?.masculine, side=masculine?.245:.235, width=masculine?1.07:1;
  const root=new T.Group(),body=new T.Group(),head=new T.Group(),hair=new T.Group();root.name=profileInfo?.name||'GHJU';root.add(body);body.add(head);
  head.name='ClosedHelmet';head.position.y=masculine?1.785:1.765;
  const {geometries:g,materials:m}=kit, assemblies=[];
  const builder=bone=>{
    const asm=new Assembly();assemblies.push({asm,bone});
    const radius=scale=>Math.max(.003,Math.min(.06,Math.min(...scale)*.34));
    return {
      plate:(mat,pos,scale,level=1,rot=[0,0,0],max=10)=>asm.box(mat,scale,pos,rot,radius(scale),true,level,max),
      sphere:(mat,pos,scale,level=1,max=10)=>asm.ball(mat,pos,scale,true,level,max),
      link:(mat,a,b,r1,r2=r1,level=1)=>asm.limb(mat,a,b,r1,r2,true,level),
      part:(geometry,mat,pos,scale,level=1,rot=[0,0,0],max=10)=>asm.add(geometry,mat,matrix(pos,rot,scale),true,level,max),
      add:(geometry,mat,m4,level=1,max=10)=>asm.add(geometry,mat,m4,true,level,max),
      ell:(mat,pos,radii,rot=[0,0,0],level=1,max=10)=>asm.ellipsoid(mat,pos,radii,rot,true,level,max),
      dome:(mat,pos,radii,rot=[0,0,0],level=1,max=10)=>asm.dome(mat,pos,radii,rot,true,level,max)
    };
  };
  const PI=Math.PI;
  // ----------------------------------------------------------------- torso
  {
    const {part,sphere,plate,link,add,ell}=builder(body);
    part(g.torso,m.suit,[0,0,0],[width,1,1]);
    part(g.pelvis,m.suit,[0,0,0],[masculine?.97:1.035,1,1]);
    // Back panel with a spine ridge and harness bars, front chest shells, pearl shoulder yoke and dark straps.
    plate(m.dark,[0,1.46,.15],[.39,.32,.095],1,[-.06,0,0]);
    part(g.chest,m.pearl,[0,1.47,-.166],[width,1,1]);
    part(g.chest,m.rose,[0,1.49,-.203],[.54,.67,.32],1);
    plate(m.dark,[0,1.365,-.201],[.31,.035,.018],1);
    plate(m.pearl,[0,1.615,-.209],[.11,.032,.012],1,[0,0,0]);
    plate(m.steel,[0,1.475,-.216],[.024,.21,.012]);
    plate(m.glow,[0,1.56,-.218],[.009,.04,.006]);
    link(m.steel,[0,1.64,.178],[0,1.14,.2],.014,.018);
    for(let i=0;i<4;i++)plate(m.dark,[0,1.56-i*.1,.175+i*.004],[.26,.03,.03],1);
    for(const s of [-1,1]){
      plate(m.pearl,[s*.135,1.568,-.177],[.16,.025,.045],1,[0,0,s*-.12]);
      link(m.dark,[s*.2,1.61,.04],[s*.13,1.16,-.125],.017);
      plate(m.steel,[s*.211,1.265,.018],[.037,.17,.15],1,[0,0,s*.1]);
      plate(m.rose,[s*.11,1.24,-.132],[.12,.058,.034],1,[-.1,0,s*-.05]);
      for(let i=0;i<3;i++)plate(m.dark,[s*.192,1.20+i*.05,.076],[.04,.01,.11],1,[0,0,s*.1]);
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
    part(g.patch,m.emblem,[.12,1.555,-.247],[1,1,1],3,[0,PI,0]);
    plate(m.dark,[-.26,1.49,.13],[.1,.18,.09],3);link(m.steel,[-.27,1.57,.13],[-.27,1.83,.13],.008,.005,3);
    sphere(m.glow,[-.27,1.83,.13],[.012,.018,.012],3);
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
  // ----------------------------------------------------------------- sealed helmet
  {
    const asm=new Assembly();assemblies.push({asm,bone:head});
    addClosedHelmet(asm,{armor:m.rose,trim:m.pearl,visor:m.visor,fabric:m.suit,glow:m.glow,metal:m.steel},{scale:masculine?.76:.74});
    const {plate,sphere}=builder(head);
    // Command crest follows the shell rather than extending it into a large crown.
    for(const s of [-1,0,1]){
      plate(m.gold,[s*.055,.157,-.095],[.035,.035-Math.abs(s)*.005,.025],10,[0,0,s*-.13]);
      sphere(m.pale,[s*.055,.17,-.109],[.006,.008,.004],10);
    }
  }
  const orbit=new T.Group();orbit.position.set(0,.236,.025);head.add(orbit);
  {
    const {part}=builder(orbit);
    part(g.halo,m.glow,[0,0,0],[.68,.68,.68],10,[PI/2-.14,0,0]);
  }
  // ----------------------------------------------------------------- legs
  const legs=[],knees=[];
  for(const s of [-1,1]){
    const leg=new T.Group();leg.position.set(s*.17,.97,0);root.add(leg);legs.push(leg);
    const shin=new T.Group();shin.position.set(0,-.425,0);leg.add(shin);knees.push(shin);
    {
      const {plate,sphere,link,part,ell}=builder(leg);
      part(loft([[-.405,.078,.076],[-.33,.093,.091],[-.21,.117,.11],[-.07,.121,.119],[-.025,.095,.086]],18),m.suit,[0,0,0],[1,1,1]);
      part(g.thigh,m.pearl,[s*.01,-.19,-.132],[1,1,1],1,[.08,0,s*-.05]);
      plate(m.rose,[s*.012,-.19,-.153],[.025,.235,.012],1,[.08,0,s*-.05]);
      plate(m.steel,[s*.015,-.095,-.159],[.104,.018,.013],1,[.08,0,s*-.05]);
      plate(m.dark,[0,-.31,-.083],[.147,.026,.026],1);
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
      part(loft([[-.375,.057,.057,.01],[-.31,.064,.068,.016],[-.19,.081,.084,.022],[-.07,.082,.075],[0,.073,.067]],18),m.suit,[0,0,0],[1,1,1]);
      part(g.shin,m.pearl,[0,-.208,-.078],[1,1,1]);
      plate(m.rose,[0,-.208,-.103],[.026,.21,.016],1);
      ell(m.pearl,[0,.006,-.074],[.078,.063,.028]);
      plate(m.pearl,[0,-.16,-.098],[.052,.11,.013]);
      // Boot: ankle cuff, shaped upper, toe cap, heel block and a thick sole with light strips.
      part(g.ring,m.dark,[0,-.36,-.01],[.075,.075,.075],1,[PI/2,0,0]);
      ell(m.dark,[0,-.435,-.041],[.087,.075,.14]);
      plate(m.pearl,[0,-.448,-.131],[.162,.065,.145],1,[.10,0,0]);
      plate(m.rose,[0,-.439,-.204],[.09,.019,.012],1,[.10,0,0]);
      plate(m.dark,[0,-.492,-.059],[.194,.031,.307]);ell(m.dark,[0,-.455,.064],[.073,.064,.055]);
      for(const x of [-.065,.065])plate(m.steel,[x,-.478,-.053],[.023,.013,.273]);
      for(let i=0;i<4;i++){
        plate(m.dark,[0,-.409+i*.016,-.105-i*.019],[.105,.008,.014],1,[.08,0,0]);
        plate(m.pearl,[0,-.519,-.171+i*.075],[.148,.012,.028]);
      }
      plate(m.glow,[0,-.365,.076],[.037,.015,.008]);
      // Level 5: pronounced shin shells, articulated knee caps and straps.
      part(g.shin,m.pearl,[0,-.208,-.098],[1.07,1.06,.72],5,[.04,0,0]);ell(m.rose,[0,.015,-.097],[.086,.067,.034],[0,0,0],5);
      plate(m.glow,[0,-.20,-.123],[.009,.17,.005],5);
    }
  }
  // ----------------------------------------------------------------- arms (two bones solved to the weapon)
  const arms=[];
  for(const s of [-1,1]){
    const shoulder=new T.Group();shoulder.position.set(s*side,1.57,0);body.add(shoulder);
    const upper=new T.Group(),fore=new T.Group();shoulder.add(upper,fore);
    {
      // The shoulder cap and pauldrons stay with the torso; only the arm below them turns.
      const {plate,part,ell,dome}=builder(shoulder);
      ell(m.suit,[s*.002,-.02,0],[.091,.102,.10]);
      dome(m.pearl,[s*.014,.01,0],[masculine?.116:.106,.078,.112],[0,0,s*-.16]);
      plate(m.rose,[s*.055,.017,-.10],[.091,.027,.035],1,[0,0,s*-.15]);
      plate(m.dark,[s*.02,.067,.012],[.085,.014,.035],1,[0,0,s*-.2]);
      // Level 3: layered curved pauldrons, not a single sphere.
      dome(m.steel,[s*.02,.02,0],[.137,.084,.137],[0,0,s*-.2],3);
      dome(m.pearl,[s*.027,.042,-.01],[.125,.078,.125],[0,0,s*-.2],3);
      part(g.ringFlat,m.rose,[s*.027,.017,0],[.125,.125,.125],3,[0,0,s*-.2]);
      ell(m.rose,[s*.079,-.016,.01],[.034,.066,.108],[0,0,s*-.24],3);
      plate(m.glow,[s*.041,.1,-.133],[.07,.007,.005],3);
      // Level 8: gold pauldron rim.
      part(g.ringFlat,m.gold,[s*.027,.042,-.005],[.125,.125,.125],8,[0,0,s*-.2]);
    }
    {
      const {plate,sphere,link,ell,part}=builder(upper);
      part(loft([[-.31,.056,.06],[-.26,.066,.071],[-.16,.079,.075],[-.07,.082,.076],[-.025,.072,.07]],18),m.suit,[0,0,0],[1,1,1]);
      part(g.upperArm,m.rose,[0,-.14,.084],[1,1,1],1,[0,PI,0]);
      plate(m.pearl,[0,-.13,.103],[.051,.051,.012]);
      sphere(m.suit,[0,-.31,0],[.073,.069,.074]);
      ell(m.rose,[0,-.31,-.06],[.061,.052,.024]);
    }
    {
      const {plate,sphere,link,part,ell}=builder(fore);
      part(loft([[-.35,.043,.047],[-.28,.052,.052],[-.14,.068,.063],[-.04,.064,.057],[0,.056,.053]],18),m.suit,[0,0,0],[1,1,1]);
      plate(m.pearl,[0,-.18,.054],[.087,.20,.035],1,[.065,0,0]);
      plate(m.rose,[0,-.18,.076],[.018,.14,.008],1,[.065,0,0]);
      sphere(m.dark,[0,-.35,0],[.05,.046,.05]);
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
  const mount=new T.Group();body.add(mount);
  const gun=createGun({sleeve:false});gun.scale.setScalar(CARRY);mount.add(gun);
  const rest=createGlove(kit.gloves,{mirror:true,sleeve:false});rest.scale.multiplyScalar(CARRY);rest.rotation.x=-PI/2;rest.position.set(...REST);body.add(rest);rest.visible=false;
  const unit=new T.Vector3(),pole=new T.Vector3(),dir=new T.Vector3(),hint=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3();
  const aim=(group,toward,upHint)=>{
    // Local -y follows `toward`; local +z leans toward `upHint`.
    const y=a.copy(toward).negate().normalize(),z=b.copy(upHint).addScaledVector(y,-upHint.dot(y));
    if(z.lengthSq()<1e-6)z.set(0,0,1);z.normalize();
    const x=new T.Vector3().crossVectors(y,z);group.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));
  };
  function solve(arm,wrist){
    const {s,shoulder,upper,fore}=arm,to=dir.copy(wrist).sub(shoulder.position);
    const reach=UPPER+FORE-.004,d=Math.min(Math.max(to.length(),Math.abs(UPPER-FORE)+.01),reach);
    unit.copy(to).normalize();
    const along=(UPPER*UPPER-FORE*FORE+d*d)/(2*d),h=Math.sqrt(Math.max(0,UPPER*UPPER-along*along));
    pole.set(s*.55,-.8,.3);pole.addScaledVector(unit,-pole.dot(unit)).normalize();
    arm.elbow.copy(unit).multiplyScalar(along).addScaledVector(pole,h);
    arm.wrist.copy(unit).multiplyScalar(d);
    upper.position.set(0,0,0);aim(upper,arm.elbow,hint.set(s*.4,.5,-.1));
    fore.position.copy(arm.elbow);aim(fore,b.copy(arm.wrist).sub(arm.elbow),hint.set(0,1,0));
    fore.userData.length=arm.wrist.clone().sub(arm.elbow).length();
  }
  const soldierApi={
    root,body,head,hair,legs,knees,gun,arms,
    // Choose the weapon in the hands: the right palm takes the grip, the free hand takes the support or rests.
    setWeapon(index){
      gun.userData.setVariant(index);
      const frame=WEAPON_FRAME[index],p=new T.Vector3(...STANCE[index]),support=frame.support;
      const wristR=()=>p.clone().add(new T.Vector3(...GRIP.wrist).multiplyScalar(CARRY));
      const wristL=()=>support?p.clone().add(new T.Vector3(-GRIP.wrist[0]+support[0],GRIP.wrist[1]+support[1],GRIP.wrist[2]+support[2]).multiplyScalar(CARRY)):new T.Vector3(-GRIP.wrist[0],GRIP.wrist[2],-GRIP.wrist[1]).multiplyScalar(CARRY).add(new T.Vector3(...REST));
      // Pull the weapon toward the body until both hands can reach it.
      for(let i=0;i<40;i++){
        const left=wristL().sub(arms[0].shoulder.position).length(),right=wristR().sub(arms[1].shoulder.position).length();
        if(Math.max(left,right)<=UPPER+FORE-.01)break;p.z+=.01;
      }
      mount.position.copy(p);
      rest.visible=!support;
      solve(arms[0],wristL());solve(arms[1],wristR());
      // Stretch each forearm piece between its elbow and wrist.
      for(const arm of arms)arm.fore.scale.set(1,arm.fore.userData.length/FORE,1);
      soldierApi.weapon=index;
    },
    setLevel(level){
      level=Math.max(1,Math.min(10,Math.floor(Number(level)||1)));if(level===state.level)return;state.level=level;
      for(const {asm} of assemblies)asm.setLevel(level);
      gun.userData.setLevel?.(level);rest.userData.setLevel(level);
    },
    get equipmentLevel(){return state.level;},
    get visibleParts(){return assemblies.reduce((n,{asm})=>n+asm.count,0);},
    get batchCount(){return assemblies.reduce((n,{asm})=>n+asm.meshes.length,0);},
    animate(time,moving,recoil=0){
      const stride=moving?Math.sin(time*10)*.48:0;legs[0].rotation.x=stride;legs[1].rotation.x=-stride;
      knees.forEach((knee,i)=>{knee.rotation.x=moving?Math.max(0,Math.sin(time*10+i*Math.PI))*.42:.06;});
      body.position.y=moving?Math.abs(Math.sin(time*10))*.025:Math.sin(time*2)*.007;
      const kick=Math.min(1,recoil/.16);body.position.z=kick*.035;body.rotation.x=kick*.035;
      hair.rotation.x=Math.sin(time*3)*.045;hair.rotation.z=Math.sin(time*2)*.025;
      orbit.rotation.y=time*.24;
    }
  };
  const state={level:0};
  for(const {asm,bone} of assemblies)asm.mount(bone);
  soldierApi.setLevel(1);soldierApi.setWeapon(0);
  if(masculine)body.scale.set(1.02,1,1.03);
  return soldierApi;
}
