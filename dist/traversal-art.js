import * as T from './vendor/three.webgpu.min.js';
import { Assembly } from './geo.js';
import { PLATFORMS, STAIRS, LIFTS, liftHeightAt, createTraversalObstacles } from './world-layout.js';

// Both geometry and collision use the same metre-based layout as locomotion.
export function createTraversalArt(scene, obstacles, mats) {
  const root=new T.Group();root.name='Reclaimed terraces and operational freight lifts';scene.add(root);
  obstacles.push(...createTraversalObstacles());
  const fixed=new Assembly();
  const block=(mat,size,pos,r=.025)=>fixed.box(mat,size,pos,[0,0,0],r);
  const rod=(mat,a,b,r=.045)=>fixed.limb(mat,a,b,r);
  const collision=(x,z,hx,hz,y,height)=>obstacles.push({x,z,hx,hz,y,height,surface:'metal',traversal:true});
  function rail(a,b,y) {
    // Narrow tubes are a physical guard; their collision does not seal the space below a deck.
    rod(mats.steel,[a[0],y+1.03,a[1]],[b[0],y+1.03,b[1]],.046);
    rod(mats.rust,[a[0],y+.52,a[1]],[b[0],y+.52,b[1]],.026);
    const length=Math.hypot(a[0]-b[0],a[1]-b[1]),count=Math.max(1,Math.ceil(length/2.4));
    for(let i=0;i<=count;i++) {const t=i/count,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;rod(mats.steel,[x,y,z],[x,y+1.08,z],.046);}
    collision((a[0]+b[0])/2,(a[1]+b[1])/2,Math.abs(a[0]-b[0])/2+.055,Math.abs(a[1]-b[1])/2+.055,y,1.09);
  }
  for(const p of PLATFORMS) {
    const y=p.height,west=p.id==='garden';
    block(mats.black,[p.hx*2,.22,p.hz*2],[p.x,y-.11,p.z],.035);
    block(west?mats.concrete:mats.steel,[p.hx*2-.10,.025,p.hz*2-.10],[p.x,y+.003,p.z],.005);
    // Construction joints, grating ribs and worn hazard edges establish scale.
    for(let z=p.z-p.hz+.25;z<p.z+p.hz;z+=.58)block(mats.black,[p.hx*2-.42,.011,.024],[p.x,y+.021,z],.002);
    for(const side of [-1,1]) {
      const x=p.x+side*(p.hx-.24);
      block(mats.yellow,[.14,.018,p.hz*2-.2],[x,y+.025,p.z],.003);
      for(const z of [p.z-p.hz+.4,p.z+p.hz-.4]) {
        block(mats.concrete,[.65,y,.65],[x,y/2,z],.035);
        collision(x,z,.325,.325,0,y);
        // Angled steel knees under the platform keep it from looking like a floating slab.
        rod(mats.rust,[x,y-2,z],[x-side*1.9,y-.25,z],.11);
      }
    }
    const stair=STAIRS.find(s=>s.platform===p.id),lift=LIFTS.find(l=>l.platform===p.id);
    rail([p.x-p.hx,p.z-p.hz],[p.x+p.hx,p.z-p.hz],y);
    rail([p.x-p.hx,p.z+p.hz],[stair.x-stair.halfWidth,p.z+p.hz],y);
    rail([stair.x+stair.halfWidth,p.z+p.hz],[p.x+p.hx,p.z+p.hz],y);
    for(const side of [-1,1]) {
      const x=p.x+side*p.hx,liftSide=Math.sign(lift.x-p.x)===side;
      if(!liftSide)rail([x,p.z-p.hz],[x,p.z+p.hz],y);
      else {rail([x,p.z-p.hz],[x,lift.z-lift.hz],y);rail([x,lift.z+lift.hz],[x,p.z+p.hz],y);}
    }
    // Terrace planting stays shallow; all walkable circulation remains unobstructed.
    if(west)for(let i=0;i<8;i++) {
      const x=p.x-p.hx+.75+(i%4)*.65,z=p.z-p.hz+.5+Math.floor(i/4)*.65;
      fixed.ball(mats.leaf,[x,y+.17,z],[.39,.21,.42]);
    }
  }
  // Sloped walkways: continuous steel deck follows the exact traversalSurfaces height.
  // Separate shallow anti-slip strips provide the look of steps without imposing
  // stair-block geometry that mismatches the player's continuous ramp collision.
  for(const stair of STAIRS) {
    const length=stair.bottomZ-stair.topZ, rise=stair.height;
    const slope=rise/length,width=stair.halfWidth*2;
    if(length<=0||rise<=0)throw Error('Invalid stair incline '+stair.id);
    const face=new T.BufferGeometry();
    const left=stair.x-stair.halfWidth,right=stair.x+stair.halfWidth;
    const y0=0,y1=rise,near=stair.bottomZ,far=stair.topZ;
    face.setAttribute('position',new T.Float32BufferAttribute([
      left,y0,near, right,y0,near, right,y1,far,
      left,y0,near, right,y1,far, left,y1,far
    ],3));
    face.setAttribute('uv',new T.Float32BufferAttribute([
      0,0, 1,0, 1,length/2,
      0,0, 1,length/2, 0,length/2
    ],2));
    face.computeVertexNormals();
    const deck=new T.Mesh(face,mats.steel);deck.name='Rampe accessible '+stair.id;
    deck.material.side=T.DoubleSide;deck.receiveShadow=true;root.add(deck);
    // Steel substructure, with a true continuous guide beam between landings.
    for(const side of [-1,1]) {
      const edgeX=stair.x+side*(stair.halfWidth+.07);
      rod(mats.rust,[edgeX,.045,near],[edgeX,rise-.04,far],.105);
      rod(mats.steel,[edgeX,1.05,near],[edgeX,rise+1.05,far],.052);
      rod(mats.steel,[edgeX,.54,near],[edgeX,rise+.54,far],.031);
      const segments=Math.ceil(length/2);
      for(let i=0;i<=segments;i++){
        const t=i/segments,z=near-length*t,y=rise*t;
        rod(mats.steel,[edgeX,y,z],[edgeX,y+1.06,z],.043);
      }
      // Colliders track the incline and do not obstruct the entry/exit landings.
      const strips=Math.ceil(length/.45),depth=length/strips;
      for(let i=0;i<strips;i++){
        const u=(i+.5)/strips,z=near-u*length,y=rise*u;
        collision(edgeX,z,.075,depth/2,y,.95);
      }
    }
    // Tactile ribs rest on the incline rather than floating above displaced treads.
    const strips=Math.ceil(length/.75);
    for(let i=1;i<strips;i++){
      const t=i/strips,z=near-length*t,top=rise*t;
      block(mats.yellow,[width-.24,.012,.049],[stair.x,top+.018,z],.003);
    }
    // Close the gap beneath the incline with light supporting trusses.
    for(let i=1;i<5;i++){
      const t=i/5,z=near-length*t,height=rise*t;
      rod(mats.rust,[left+.23,.07,z],[left+.23,height-.02,z],.061);
      rod(mats.rust,[right-.23,.07,z],[right-.23,height-.02,z],.061);
    }
  }
  const moving=[];
  for(const l of LIFTS) {
    const top=l.height+1.65;
    for(const sx of [-1,1])for(const sz of [-1,1]) {
      const x=l.x+sx*(l.hx-.13),z=l.z+sz*(l.hz-.13);
      block(mats.black,[.22,top,.22],[x,top/2,z],.035);collision(x,z,.11,.11,0,top);
    }
    for(const sz of [-1,1]) {
      const z=l.z+sz*l.hz;
      rod(mats.steel,[l.x-l.hx,top,z],[l.x+l.hx,top,z],.11);
      // Fixed wire-mesh cage on the lateral faces; entrances face the street and terrace.
      for(let x=l.x-l.hx+.45;x<l.x+l.hx;x+=.55)rod(mats.steel,[x,.15,z],[x,top,z],.022);
      for(let y=.65;y<top;y+=1.05)rod(mats.steel,[l.x-l.hx,y,z],[l.x+l.hx,y,z],.022);
      collision(l.x,z,l.hx,.045,0,top);
    }
    block(mats.steel,[l.hx*2,.22,l.hz*2],[l.x,top,l.z],.05);
    block(mats.accent,[.6,.11,.09],[l.x,top+.13,l.z+l.hz+.03],.008);
    // A weathered panel explains the automatic cycle in the world, keeping the HUD clear.
    const panelCanvas=document.createElement('canvas');panelCanvas.width=512;panelCanvas.height=256;
    const pen=panelCanvas.getContext('2d');pen.fillStyle='#172523';pen.fillRect(0,0,512,256);
    pen.strokeStyle='#a69e76';pen.lineWidth=8;pen.strokeRect(8,8,496,240);
    pen.fillStyle='#d7d4b9';pen.font='bold 49px sans-serif';pen.fillText('ASCENSEUR',25,73);
    pen.font='29px sans-serif';pen.fillText('AUTOMATIQUE',27,116);
    pen.fillStyle='#a8b99c';pen.font='24px sans-serif';pen.fillText('ATTENDRE LA PLATEFORME',26,174);
    pen.fillStyle='#d3c180';pen.font='bold 32px monospace';pen.fillText(`RUE ↔ +${String(l.height).replace('.',',')} m`,27,222);
    const panelMap=new T.CanvasTexture(panelCanvas);panelMap.colorSpace=T.SRGBColorSpace;
    const panelMaterial=new T.MeshStandardMaterial({map:panelMap,roughness:.85,metalness:.1});
    const streetSide=l.x<0?-1:1;
    for(const floor of [0,l.height]){
      const panelSide=floor===0?streetSide:-streetSide;
      const panel=new T.Mesh(new T.PlaneGeometry(1.65,.825),panelMaterial);
      panel.position.set(l.x+panelSide*(l.hx+.032),floor+1.52,l.z+l.hz-.93);
      panel.rotation.y=panelSide*Math.PI/2;root.add(panel);
    }
    // The platform moves by simulation time, exactly like the collision deck.
    const gates=[];
    for(const floor of [0,l.height]){
      const facing=floor===0?streetSide:-streetSide,x=l.x+facing*l.hx;
      const gate=new T.Group();gate.position.set(x,floor,l.z);root.add(gate);
      const gateParts=new Assembly();
      for(const y of [.18,.63,1.10])gateParts.box(y===1.10?mats.yellow:mats.steel,[.085,.07,l.hz*2-.08],[0,y,0],[0,0,0],.012);
      for(const z of [-l.hz+.08,l.hz-.08])gateParts.box(mats.steel,[.085,1.09,.085],[0,.63,z],[0,0,0],.012);
      gateParts.mount(gate);
      obstacles.push({x,z:l.z,hx:.055,hz:l.hz,y:floor,height:1.15,surface:'metal',traversal:true,liftGateId:l.id,gateFloor:floor});
      gates.push({gate,floor});
    }
    const carriage=new T.Group();carriage.position.set(l.x,0,l.z);root.add(carriage);
    const deck=new Assembly();deck.box(mats.black,[l.hx*2,.2,l.hz*2],[0,-.10,0],[0,0,0],.035);
    deck.box(mats.steel,[l.hx*2-.1,.018,l.hz*2-.1],[0,.006,0],[0,0,0],.006);
    for(let z=-l.hz+.25;z<l.hz;z+=.29)deck.box(mats.black,[l.hx*2-.3,.015,.025],[0,.022,z],[0,0,0],.002);
    for(const side of [-1,1])for(let z=-l.hz+.25;z<l.hz;z+=.62)deck.box(mats.yellow,[.25,.02,.32],[side*(l.hx-.25),.025,z],[0,.2,0],.003);
    deck.mount(carriage);
    const piston=new T.Mesh(new T.CylinderGeometry(.23,.32,1,10),mats.steel);piston.position.set(l.x,.05,l.z);root.add(piston);
    const suspension=[];
    for(const side of [-1,1]) {
      const line=new T.Mesh(new T.CylinderGeometry(.038,.038,1,6),mats.rust);line.position.set(l.x,top/2,l.z+side*(l.hz-.2));root.add(line);suspension.push(line);
    }
    moving.push({l,carriage,piston,suspension,top,gates});
  }
  fixed.mount(root);
  const art={root,update(time){for(const {l,carriage,piston,suspension,top,gates} of moving){const y=liftHeightAt(l,time);carriage.position.y=y;for(const {gate,floor} of gates)gate.position.y=floor+(Math.abs(y-floor)<.08?2.4:0);piston.position.y=y/2;piston.scale.y=Math.max(.02,y);for(const cable of suspension){cable.position.y=(top+y)/2;cable.scale.y=Math.max(.02,top-y);}}}};
  art.update(0);return art;
}
