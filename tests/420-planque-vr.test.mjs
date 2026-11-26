import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from '../dist/vendor/three.webgpu.min.js';
import {MENU,pageCount,visibleButtons,buttonRect,pickMenuTarget,activateMenuTarget,createXRMenuPanel} from '../dist/planque-vr-menu.js';
import {stationMenu,pauseMenu,archiveEntryMenu,stationHint,nearestStation,faceYaw,arrivalSpot,turnStep,stickAxis} from '../dist/planque-vr-stations.js';
import {ARMOR_STAGES} from '../dist/armor-progression.js';
import {NANO_ARMOR_TIERS} from '../dist/hideout-nano-chambers.js';
import {WEAPONS} from '../dist/game-logic.js';

const read=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');
const centre=(slot)=>{const r=buttonRect(slot);return[(r.x0+r.x1)/2,(r.y0+r.y1)/2];};
const model=(n,log=[])=>({title:'Test',buttons:Array.from({length:n},(_,i)=>({label:'B'+i,disabled:i===1,onSelect:()=>log.push(i)}))});

test('menu : six boutons par page, ◀ ▶ seulement s’il y a plusieurs pages, un bouton désactivé ne valide pas',()=>{
  const log=[],m=model(8,log);
  assert.equal(pageCount(m),2);assert.equal(pageCount(model(6)),1);assert.equal(pageCount(model(0)),1);
  assert.equal(visibleButtons(m,0).length,6);assert.deepEqual(visibleButtons(m,1).map(v=>v.index),[6,7]);
  assert.equal(pickMenuTarget(model(6),0,...[100,MENU.footerTop+10]),null,'pas de ◀ sur une page unique');
  const next=pickMenuTarget(m,0,800,MENU.footerTop+20);assert.equal(next.kind,'next');
  assert.equal(activateMenuTarget(m,0,next).page,1);assert.equal(activateMenuTarget(m,1,pickMenuTarget(m,1,800,MENU.footerTop+20)).page,1,'dernière page');
  assert.equal(activateMenuTarget(m,1,pickMenuTarget(m,1,150,MENU.footerTop+20)).page,0);
  assert.equal(activateMenuTarget(m,0,pickMenuTarget(m,0,...centre(1))).refused,true,'bouton désactivé');
  assert.deepEqual(log,[]);
  assert.equal(activateMenuTarget(m,0,pickMenuTarget(m,0,...centre(2))).fired,true);assert.deepEqual(log,[2]);
  assert.equal(activateMenuTarget(m,1,pickMenuTarget(m,1,...centre(0))).fired,true);assert.deepEqual(log,[2,6],'l’indice suit la page');
  assert.equal(pickMenuTarget(m,0,500,MENU.footerTop+20).kind,'close');assert.equal(activateMenuTarget(m,0,{kind:'close'}).closed,true);
  assert.equal(pickMenuTarget(m,0,5,5),null);
});

const ctxFor=(over={})=>{
  const calls=[],owned=new Set([0,1]),nano={profile:{suitStage:2,equippedSuit:2,balance:500,discovered:['tenue-3'],crafted:[],upgrades:{}}};
  const game={weaponIndex:0,ownedWeapons:owned,isWeaponAvailable:()=>true,nanoWeaponAllowed:i=>i<4,missionLevel:3,nano,player:{hp:70,shield:20},shieldCapacity:60};
  const recipes=[{id:'suit:3',enabled:true,reason:''},{id:'suit:4',enabled:false,reason:'Fabriquer d’abord le stade 3'},{id:'suit:5',enabled:false,reason:'Plan à découvrir · niveau 15'}];
  const rec=name=>(...a)=>calls.push([name,...a]);
  return{calls,game,weapons:WEAPONS,profile:{completed:[1,2]},tiers:NANO_ARMOR_TIERS,stages:ARMOR_STAGES,recipes,
    chapters:[{level:1,title:'Un'},{level:2,title:'Deux'},{level:3,title:'Trois'},{level:4,title:'Quatre'}],next:3,history:[{level:1,title:'Un',text:'Texte un'}],
    actions:{selectWeapon:rec('weapon'),equipTier:rec('equip'),fabricateTier:rec('fabricate'),heal:rec('heal'),depart:rec('depart'),readArchive:rec('read')},...over};
};

test('stations VR : armes, tenues, missions, archives et repos suivent les règles des panneaux HTML',()=>{
  let c=ctxFor(),w=stationMenu('weapons',c);
  assert.ok(w.buttons.length>=2&&w.buttons.length<=4,'seules les armes autorisées par la forge');
  assert.equal(w.buttons[0].active,true);assert.equal(w.buttons[1].disabled,false);assert.equal(w.buttons[2].disabled,true,'hors inventaire');
  w.buttons[1].onSelect();assert.deepEqual(c.calls,[['weapon',1]]);
  c=ctxFor();const o=stationMenu('outfits',c);assert.equal(o.buttons.length,5);
  assert.equal(o.buttons[1].active,true,'tenue 2 portée');assert.equal(o.buttons[1].disabled,true);assert.match(o.buttons[1].sub,/PORTÉE/);
  assert.equal(o.buttons[0].disabled,false);o.buttons[0].onSelect();assert.deepEqual(c.calls.pop(),['equip',1],'tenue possédée : équiper');
  assert.equal(o.buttons[2].disabled,false);assert.match(o.buttons[2].sub,/Fabriquer · /);o.buttons[2].onSelect();assert.deepEqual(c.calls.pop(),['fabricate',3]);
  assert.equal(o.buttons[3].disabled,true);assert.match(o.buttons[3].sub,/stade 3/);assert.equal(o.buttons[4].disabled,true);assert.match(o.buttons[4].sub,/Plan/);
  assert.equal(stationMenu('workshop',ctxFor()).title,'Tenues');
  c=ctxFor();const m=stationMenu('mission',c);
  assert.match(m.buttons[0].label,/PARTIR · Trois/);assert.equal(m.buttons.length,4,'le suivant puis les autres chapitres');
  assert.equal(m.buttons.find(b=>b.label.startsWith('01')).disabled,false);assert.equal(m.buttons.find(b=>b.label.startsWith('04')).disabled,true,'chapitre à venir non jouable');
  m.buttons[0].onSelect();assert.deepEqual(c.calls.pop(),['depart',3]);
  c=ctxFor();const a=stationMenu('archive',c);assert.equal(a.buttons.length,1);a.buttons[0].onSelect();assert.equal(c.calls.pop()[0],'read');
  assert.match(archiveEntryMenu({level:1,title:'Un',text:'Texte'},()=>{}).body[0],/Texte/);
  c=ctxFor();const r=stationMenu('rest',c);assert.equal(r.title,'Repos');r.buttons[0].onSelect();assert.deepEqual(c.calls.pop(),['heal',true]);
  const g=stationMenu('charging',ctxFor());assert.equal(g.title,'Recharge');
});

test('menu de pause, aide de station et station la plus proche (sans appareils de sport)',()=>{
  const calls=[],settings={snapTurn:false},stations=[{id:'weapons',name:'Armoire'},{id:'rest',name:'Lit'}];
  const p=pauseMenu({settings,stations,actions:{resume:()=>calls.push('resume'),toggleTurn:()=>calls.push('turn'),goTo:s=>calls.push(s.id),home:()=>calls.push('home'),exit:()=>calls.push('exit')}});
  assert.deepEqual(p.buttons.map(b=>b.label.split(' ')[0]),['Reprendre','Rotation','Aller','Aller','Retour','Quitter']);
  p.buttons.forEach(b=>b.onSelect());assert.deepEqual(calls,['resume','turn','weapons','rest','home','exit']);
  assert.match(pauseMenu({settings:{snapTurn:true},stations:[],actions:{}}).buttons[1].label,/30°/);
  assert.equal(stationHint(null),'');assert.match(stationHint({id:'weapons'}),/^A · /);
  const all=[{id:'fitness-bike',x:0,z:0,radius:2,room:'gym'},{id:'weapons',x:1,z:0,radius:1.5,room:'a'},{id:'rest',x:1.2,z:0,radius:1.5,room:'b'}];
  assert.equal(nearestStation(all,{x:0,z:0},()=>true).id,'weapons');
  assert.equal(nearestStation(all,{x:0,z:0},(p,room)=>room==='b').id,'rest','la pièce compte');
  assert.equal(nearestStation(all,{x:9,z:9},()=>true),null);
});

test('déplacement : cap vers la station, arrêt devant (pas dedans), rotation fluide ou par à-coups de 30°',()=>{
  assert.ok(Math.abs(faceYaw({x:0,z:0},{x:0,z:-3}))<1e-9,'vers -Z = cap 0');assert.ok(Math.abs(faceYaw({x:0,z:0},{x:3,z:0})+Math.PI/2)<1e-9);
  const s={x:0,z:-5,radius:2},route=[{x:0,z:0},{x:0,z:-2},{x:0,z:-3.5},{x:0,z:-5}];
  assert.deepEqual(arrivalSpot(route,s),{x:0,z:-3.5});assert.deepEqual(arrivalSpot([{x:9,z:9}],s),{x:9,z:9});
  assert.equal(stickAxis(.1),0);assert.equal(stickAxis(-.5),-.5);
  assert.ok(Math.abs(turnStep({value:1,yaw:0,dt:.5})+.9)<1e-9,'fluide : 1,8 rad/s');assert.equal(turnStep({value:.1,yaw:2,dt:1}),2);
  const state={held:false};let yaw=0;
  yaw=turnStep({value:1,yaw,snap:true,state});assert.ok(Math.abs(yaw+Math.PI/6)<1e-9);
  yaw=turnStep({value:1,yaw,snap:true,state});assert.ok(Math.abs(yaw+Math.PI/6)<1e-9,'maintenu : un seul cran');
  yaw=turnStep({value:.2,yaw,snap:true,state});yaw=turnStep({value:-1,yaw,snap:true,state});assert.ok(Math.abs(yaw)<1e-9,'relâché puis autre sens');
});

test('panneau 3D : le rayon de la manette droite vise un bouton et la gâchette le valide une seule fois',()=>{
  const previous=globalThis.document,noop=new Proxy(function(){},{get:(_,k)=>k==='measureText'?()=>({width:100}):noop,apply:()=>noop,set:()=>true});
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>noop})};
  try{
    const scene=new T.Scene(),log=[],closed=[];
    const panel=createXRMenuPanel(T,scene,{onClose:()=>closed.push(1)});
    const camera=new T.PerspectiveCamera();camera.position.set(0,1.6,0);camera.updateMatrixWorld(true);
    panel.show({title:'T',buttons:[{label:'A',onSelect:()=>log.push('a')},{label:'B',disabled:true,onSelect:()=>log.push('b')},{label:'C',onSelect:()=>log.push('c')}]});
    // Le rayon part de la main droite et vise le point de la toile du bouton demandé.
    const ray=new T.PerspectiveCamera();scene.add(ray);ray.position.set(.2,1.2,0);
    const aim=(slot)=>{panel.update({camera,ray:null,trigger:false});const [px,py]=centre(slot),u=px/MENU.width,v=1-py/MENU.height,target=new T.Vector3((u-.5)*1.0,(v-.5)*.75,0).applyMatrix4(panel.mesh.matrixWorld);ray.lookAt(target);ray.updateMatrixWorld(true);};
    panel.update({camera,ray,trigger:false});
    assert.ok(panel.mesh.position.z<-1&&Math.abs(panel.mesh.position.x)<1e-6,'posé devant, à la hauteur du regard');
    const placed=panel.mesh.position.clone();
    aim(0);panel.update({camera,ray,trigger:false});panel.update({camera,ray,trigger:true});panel.update({camera,ray,trigger:true});assert.deepEqual(log,['a'],'front montant uniquement');
    panel.update({camera,ray,trigger:false});aim(1);panel.update({camera,ray,trigger:true});assert.deepEqual(log,['a'],'bouton désactivé : rien');
    panel.update({camera,ray,trigger:false});aim(2);panel.update({camera,ray,trigger:true});assert.deepEqual(log,['a','c']);
    camera.position.set(3,1.6,3);camera.updateMatrixWorld(true);panel.update({camera,ray,trigger:false});assert.ok(panel.mesh.position.distanceTo(placed)<1e-9,'ancré dans la pièce, ne suit pas la tête');
    panel.hide();assert.equal(panel.update({camera,ray,trigger:false}),false);assert.equal(panel.mesh.visible,false);
    panel.dispose();
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('la planque câble la VR : rendu WebGL au casque, bouton, boucle XR, aucun dialogue HTML en casque',()=>{
  const js=read('planque.js'),html=read('planque.html'),vr=read('planque-vr.js');
  assert.match(html,/id="vr"[^>]*hidden/);
  for(const part of ['createHideoutVR','headsetAvailable','immersiveRendererPreferred','setupVR(graphics)','function vrFrame','renderer.xr.enabled=false','nearestStation','openVRStation','depart(level)'])assert.ok(js.includes(part),part);
  assert.match(js,/setView\('visit'\);\s*vr\.enter\(\)/,'la caméra de la vue visite est active avant que le rig VR ne l’emporte');
  assert.match(js,/!xrFrame\)return/,'un rappel sans image XR est ignoré');
  assert.match(js,/graphicsProfile\([^;]*params\.get\('renderer'\)==='webgl'\|\|await immersiveRendererPreferred\(\)\)/,'WebGL obligatoire pour une session immersive');
  assert.ok(!/showModal|\$\('panel'\)/.test(js.slice(js.indexOf('function vrFrame'),js.indexOf('void boot()'))),'la boucle VR n’ouvre aucun dialogue');
  for(const part of ["'immersive-vr'","'local-floor'",'syncTrackedHands','getController','setAnimationLoop(onFrame)'])assert.ok(vr.includes(part),part);
  assert.ok(!/fitness-/.test(read('planque-vr-menu.js')),'rien sur les appareils de sport dans le menu');
});
