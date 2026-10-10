import * as T from './vendor/three.webgpu.min.js';
import { Assembly, matrix, profile } from './geo.js';
import { createGlove, GRIP } from './hands.js';
import { WEAPON_FRAME } from './weapons.js';

export function createCharacterKit(emblem) {
  const geometries = { sphere: new T.SphereGeometry(1, 20, 14), tube: new T.CylinderGeometry(1, 1, 1, 16),
    ring: new T.TorusGeometry(1, .06, 8, 36), halo: new T.TorusGeometry(.32, .008, 6, 52),
    torso: new T.LatheGeometry([[.22,1.04],[.215,1.15],[.225,1.29],[.285,1.46],[.29,1.55],[.22,1.63],[.12,1.66]].map(p=>new T.Vector2(...p)),24),
    hair: new T.SphereGeometry(1, 24, 14, 0, Math.PI*2, 0, Math.PI*.43),
    visor: new T.SphereGeometry(1, 24, 10, Math.PI*1.12, Math.PI*.76, Math.PI*.34, Math.PI*.34),
    patch: new T.PlaneGeometry(.13,.06), cone: new T.ConeGeometry(1, 1, 6) };
  geometries.ringFlat=geometries.ring.clone().rotateX(Math.PI/2);
  geometries.maleHead=geometries.sphere.clone();
  const face=geometries.maleHead.attributes.position;
  for(let i=0;i<face.count;i++){
    const y=face.getY(i),jaw=y<0?Math.sin(-y*Math.PI)*.16:0;
    face.setXYZ(i,face.getX(i)*(1+jaw),y<-.6?-.6+(y+.6)*.72:y,face.getZ(i)*(1+jaw*.3));
  }
  geometries.maleHead.computeVertexNormals();
  const physical = (color, metalness=.42, roughness=.3) => new T.MeshPhysicalMaterial({ color, metalness, roughness, clearcoat:.6, clearcoatRoughness:.24 });
  const materials = {
    rose: physical(0xda6798), pearl: physical(0xffd6e7,.26,.24), dark: physical(0x202438,.3,.38),
    gold: physical(0xdcc392,.68,.25), steel: physical(0x6c607d,.66,.3),
    suit: new T.MeshStandardMaterial({color:0x2d233b,roughness:.92,metalness:.05}),
    skin: new T.MeshStandardMaterial({color:0xe5adab,roughness:.6,metalness:0}),
    hair: new T.MeshStandardMaterial({color:0x8f3e70,roughness:.58,metalness:.12}),
    visor: physical(0x25132e,.6,.14), glow:new T.MeshBasicMaterial({color:0xff88c2,toneMapped:false}),
    pale:new T.MeshBasicMaterial({color:0xffe7f4,toneMapped:false}),
    cyan:new T.MeshBasicMaterial({color:0x9ce7de,toneMapped:false}),
    emblem: new T.MeshBasicMaterial({map:emblem,transparent:true,depthWrite:false,toneMapped:false})
  };
  // Materials of the gloved hands: fabric, knuckle plates, trim, light strips, scanner and metal.
  const gloves = { fabric: materials.dark, plate: materials.rose, trim: materials.pearl, glow: materials.glow, accent: materials.cyan, metal: materials.gold };
  return { geometries, materials, gloves, setPalette(colors){for(const [name,color] of Object.entries(colors))materials[name].color.setHex(color);} };
}

// Where each weapon is carried (palm position, body space) and where the idle hand rests with a one-handed weapon.
const STANCE = Object.freeze([[.24, 1.4, -.5], [.12, 1.38, -.36], [.12, 1.38, -.36], [.1, 1.38, -.3], [.1, 1.36, -.32]]);
const REST = Object.freeze([-.25, 1.08, -.16]);
const UPPER = .31, FORE = .35, CARRY = 1.2;

// The suit is a few hundred rounded pieces, merged per bone and material. Pieces carry the armour level that
// unlocks them; changing level re-merges the few meshes of each bone instead of drawing hundreds of instances.
export function createSoldier(kit, createGun, profileInfo) {
  const masculine=!!profileInfo?.masculine, side=masculine?.355:.31, width=masculine?1.08:1;
  const root=new T.Group(),body=new T.Group(),head=new T.Group(),hair=new T.Group();root.name=profileInfo?.name||'GHJU';root.add(body);body.add(head);
  head.position.y=1.84;hair.position.set(0,.12,.13);head.add(hair);
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
    part(g.torso,m.suit,[0,0,0],[width,1,.66]);
    sphere(m.suit,[0,.985,0],[masculine?.27:.29,.16,.19]);
    // Back panel with a spine ridge and harness bars, front chest shells, pearl shoulder yoke and dark straps.
    plate(m.rose,[0,1.46,.06],[.49,.34,.22],1,[-.06,0,0]);
    link(m.steel,[0,1.64,.178],[0,1.14,.2],.014,.018);
    for(let i=0;i<4;i++)plate(m.dark,[0,1.56-i*.1,.175+i*.004],[.26,.03,.03],1);
    for(const s of [-1,1]){
      ell(m.rose,[s*.14,1.47,-.125],[.135,.14,.095],[-.14,0,s*-.08]);
      ell(m.pearl,[s*.14,1.48,-.18],[.1,.095,.04],[-.14,0,s*-.08]);
      ell(m.pearl,[s*.205,1.585,-.05],[.105,.05,.13],[0,0,s*-.15]);
      link(m.dark,[s*.2,1.61,.07],[s*.12,1.16,-.15],.025);
      plate(m.steel,[s*.195,1.25,.02],[.065,.22,.21],1,[0,0,s*.12]);
      ell(m.rose,[s*.12,1.2,-.125],[.1,.04,.065],[-.1,0,s*-.05]);
    }
    // Abdomen bands, belt and buckle.
    for(const y of [1.17,1.12])plate(m.dark,[0,y,-.12],[.34,.035,.12],1);
    plate(m.dark,[0,1.07,0],[.52,.07,.38]);plate(m.pearl,[0,1.07,-.205],[.105,.07,.04]);
    plate(m.glow,[0,1.07,-.23],[.065,.025,.012]);
    // Neck and collar.
    link(m.skin,[0,1.64,0],[0,1.74,0],.075,.062);
    sphere(m.suit,[0,1.69,0],[.095,.12,.085]);
    part(g.ring,m.pearl,[0,1.635,0],[.13,.13,.13],1,[PI/2,0,0]);
    // Level 2: sculpted chest plate with a recessed energy core and back brace.
    for(const s of [-1,1]){
      ell(m.pearl,[s*.125,1.5,-.175],[.15,.15,.085],[-.14,0,s*-.1],2);
      plate(m.steel,[s*.18,1.35,-.185],[.12,.11,.075],2,[0,0,s*.35]);
      plate(m.rose,[s*.1,1.44,.20],[.13,.33,.075],2);
      plate(m.dark,[s*.07,1.52,-.255],[.022,.15,.012],2,[0,0,s*.08]);
    }
    plate(m.dark,[0,1.50,-.255],[.075,.12,.035],2);plate(m.glow,[0,1.50,-.276],[.025,.08,.01],2);
    part(g.ring,m.glow,[0,1.50,-.272],[.075,.075,.075],2,[0,0,0]);
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
  // ----------------------------------------------------------------- head
  const eyes=builder(head);
  {
    const {part,sphere,plate}=eyes;
    part(masculine?g.maleHead:g.sphere,m.skin,[0,0,0],[masculine?.185:.18,.23,.175]);
    sphere(m.skin,[0,-.05,-.168],[.022,.041,.037]);
    plate(masculine?m.dark:m.rose,[0,-.106,masculine?-.169:-.157],[.064,.009,.015]);
    for(const s of [-1,1]){
      sphere(m.dark,[s*.061,.011,-.164],[.034,.017,.013]);sphere(m.pale,[s*.056,.014,-.176],[.008,.008,.004]);
      plate(m.hair,[s*.06,.056,-.163],[.075,.013,.018],1,[0,0,s*.12]);
      sphere(m.skin,[s*.171,-.002,.001],[.025,.048,.03]);
      plate(m.dark,[s*.191,.018,.004],[.052,.105,.09]);
      plate(m.glow,[s*.22,.024,-.02],[.012,.048,.028]);
    }
    if(masculine){
      part(g.hair,m.hair,[0,.034,.014],[.19,.225,.188]);
      plate(m.hair,[0,.18,-.07],[.25,.06,.18],1,[.1,0,0]);
    }else{
      sphere(m.hair,[0,-.02,.09],[.17,.185,.09]);
      part(g.hair,m.hair,[0,.017,.012],[.187,.233,.188]);
      plate(m.hair,[.10,.14,-.13],[.17,.075,.09],1,[.1,0,-.32]);
    }
    // Level 6: a curved panoramic visor sits outside the facial features, with a shell, cheek filters and chin guard.
    part(g.hair,m.pearl,[0,.035,.01],[.202,.245,.202],6);
    part(g.visor,m.visor,[0,.007,-.033],[.202,.235,.20],6);
    plate(m.glow,[0,.056,-.232],[.24,.014,.012],6);
    plate(m.steel,[0,.2,-.02],[.04,.02,.2],6,[.05,0,0]);
    for(const s of [-1,1]){
      plate(m.pearl,[s*.18,-.03,.02],[.07,.16,.17],6,[0,0,s*-.08]);
      plate(m.rose,[s*.08,-.135,-.13],[.12,.08,.08],6,[0,s*.2,0]);
      plate(m.pale,[s*.1,-.136,-.182],[.04,.015,.012],6);
      plate(m.steel,[s*.2,.05,.02],[.012,.06,.1],6);
    }
    // Level 10: command crown and orbiting halo, wide enough to read from a distance.
    for(const s of [-1,0,1]){
      plate(m.gold,[s*.082,.205,-.15],[.06,.12-Math.abs(s)*.025,.045],10,[0,0,s*-.15]);
      sphere(m.pale,[s*.082,.255-Math.abs(s)*.015,-.178],[.017,.025,.012],10);
    }
    plate(m.gold,[0,.17,-.14],[.2,.026,.05],10);
  }
  const orbit=new T.Group();orbit.position.set(0,.30,.025);head.add(orbit);
  {
    const {part}=builder(orbit);
    part(g.halo,m.glow,[0,0,0],[1,1,1],10,[PI/2-.14,0,0]);
  }
  if(!masculine){
    const {sphere,part}=builder(hair);
    // Overlapping soft volumes give the ponytail a continuous curved silhouette.
    sphere(m.pearl,[0,0,.06],[.045,.045,.06]);
    part(g.sphere,m.hair,[.013,-.09,.12],[.072,.15,.075],1,[-.38,0,0]);
    part(g.sphere,m.hair,[.018,-.25,.16],[.06,.13,.059],1,[.1,0,0]);
    sphere(m.hair,[.01,-.34,.15],[.045,.065,.043]);
  }
  // ----------------------------------------------------------------- legs
  const legs=[],knees=[];
  for(const s of [-1,1]){
    const leg=new T.Group();leg.position.set(s*.17,.97,0);root.add(leg);legs.push(leg);
    const shin=new T.Group();shin.position.set(0,-.425,0);leg.add(shin);knees.push(shin);
    {
      const {plate,sphere,link,part,ell}=builder(leg);
      link(m.suit,[0,-.025,0],[0,-.405,0],.128,.098);
      ell(m.rose,[s*.025,-.185,-.025],[.13,.195,.105]);
      plate(m.pearl,[s*.043,-.17,-.15],[.13,.26,.065],1,[.05,0,s*-.12]);
      plate(m.dark,[0,-.31,-.1],[.17,.04,.03],1);
      // Level 5: thigh strap and plates.
      part(g.ring,m.dark,[0,-.12,0],[.135,.135,.135],5,[PI/2,0,0]);plate(m.pearl,[s*.14,-.15,0],[.08,.16,.16],5);
      // Level 8: separate hip guards follow each moving leg.
      plate(m.gold,[s*.13,-.04,-.02],[.11,.30,.22],8,[0,0,s*-.13]);
      plate(m.pearl,[s*.10,-.10,-.12],[.14,.23,.06],8,[0,0,s*-.1]);
    }
    {
      const {plate,sphere,link,part,ell}=builder(shin);
      sphere(m.dark,[0,0,0],[.118,.11,.115]);link(m.suit,[0,-.03,0],[0,-.37,0],.095,.07);
      plate(m.rose,[0,-.21,-.045],[.14,.30,.14]);plate(m.pearl,[0,-.18,-.118],[.075,.23,.04]);
      // Boot: ankle cuff, shaped upper, toe cap, heel block and a thick sole with light strips.
      part(g.ring,m.rose,[0,-.36,-.01],[.105,.105,.105],1,[PI/2,0,0]);
      ell(m.dark,[0,-.44,-.04],[.112,.08,.17]);ell(m.rose,[0,-.447,-.17],[.1,.07,.1]);
      plate(m.steel,[0,-.492,-.06],[.235,.04,.37]);ell(m.dark,[0,-.455,.075],[.09,.07,.06]);
      plate(m.glow,[0,-.365,.095],[.06,.045,.015]);plate(m.glow,[0,-.49,-.248],[.12,.012,.012]);
      // Level 5: pronounced shin shells, articulated knee caps and straps.
      plate(m.pearl,[0,-.20,-.115],[.20,.34,.08],5,[.04,0,0]);ell(m.rose,[0,.015,-.12],[.105,.075,.065],[0,0,0],5);
      plate(m.glow,[0,-.20,-.16],[.024,.20,.012],5);
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
      ell(m.rose,[s*.012,-.02,0],[masculine?.15:.13,.115,.15]);
      // Level 3: layered curved pauldrons, not a single sphere.
      dome(m.steel,[s*.025,.01,0],[.2,.12,.2],[0,0,s*-.2],3);
      dome(m.pearl,[s*.035,.05,-.01],[.17,.1,.17],[0,0,s*-.2],3);
      part(g.ringFlat,m.rose,[s*.03,.012,0],[.2,.2,.2],3,[0,0,s*-.2]);
      ell(m.rose,[s*.105,-.02,.01],[.07,.095,.15],[0,0,s*-.24],3);
      plate(m.glow,[s*.045,.125,-.165],[.14,.018,.012],3);
      // Level 8: gold pauldron rim.
      part(g.ringFlat,m.gold,[s*.036,.05,-.005],[.17,.17,.17],8,[0,0,s*-.2]);
    }
    {
      const {plate,sphere,link,ell}=builder(upper);
      link(m.suit,[0,-.03,0],[0,-.31,0],.082,.07);
      ell(m.pearl,[0,-.15,.07],[.068,.115,.055]);
      sphere(m.dark,[0,-.31,0],[.105,.1,.105]);
      ell(m.rose,[0,-.31,-.088],[.07,.065,.05]);
    }
    {
      const {plate,sphere,link,part,ell}=builder(fore);
      link(m.rose,[0,0,0],[0,-.35,0],.085,.062);
      sphere(m.dark,[0,-.35,0],[.075,.085,.075]);
      // Level 4: armoured gauntlet, wrist scanner and hologram (kept small enough not to hide the weapon).
      link(m.pearl,[0,-.07,0],[0,-.3,0],.11,.088,4);
      part(g.ring,m.rose,[0,-.075,0],[.115,.115,.115],4,[PI/2,0,0]);part(g.ring,m.rose,[0,-.295,0],[.092,.092,.092],4,[PI/2,0,0]);
      plate(m.dark,[0,-.2,.085],[.17,.16,.045],4);
      plate(m.cyan,[0,-.2,.108],[.10,.075,.015],4);
      part(g.ring,m.gold,[0,-.19,0],[.103,.103,.103],8,[PI/2,0,0]);
      if(s===-1)plate(m.cyan,[0,-.3,.1],[.10,.045,.07],4,[-.2,0,0]);
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
    animate(time,moving){
      const stride=moving?Math.sin(time*10)*.48:0;legs[0].rotation.x=stride;legs[1].rotation.x=-stride;
      knees.forEach((knee,i)=>{knee.rotation.x=moving?Math.max(0,Math.sin(time*10+i*Math.PI))*.42:.06;});
      body.position.y=moving?Math.abs(Math.sin(time*10))*.025:Math.sin(time*2)*.007;
      hair.rotation.x=Math.sin(time*3)*.045;hair.rotation.z=Math.sin(time*2)*.025;
      orbit.rotation.y=time*.24;
    }
  };
  const state={level:0};
  for(const {asm,bone} of assemblies)asm.mount(bone);
  soldierApi.setLevel(1);soldierApi.setWeapon(0);
  if(masculine)body.scale.set(1.07,1,1.04);
  return soldierApi;
}
