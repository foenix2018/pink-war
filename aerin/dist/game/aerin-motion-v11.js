/* Aerin V11 — bibliothèque de mouvements de combat à l'épée.
 * Clips créés pour le squelette Mixamo d'Aerin (41 os), d'après les références de mouvements
 * Mixamo « Sword And Shield » (idle, strafe, slash, spin, jump attack, dodge) et la grammaire
 * des jeux d'action à l'épée : anticipation, coup, prolongement, retour en garde.
 * Aucune donnée Mixamo n'est copiée : chaque pose est écrite ici puis convertie en clip.
 *
 * Écriture : rotations en DEGRÉS dans le repère du PERSONNAGE (+Y haut, +Z devant, +X gauche
 * d'Aerin), appliquées sur la pose neutre « Idle » de l'os à son propre pivot. L'enfant hérite.
 *   x > 0 : bascule vers l'avant (le haut va vers +Z)   y > 0 : rotation vers la gauche d'Aerin
 *   z > 0 : inclinaison vers la droite d'Aerin (le haut part vers -X)
 * hips: [x,y,z] = décalage du bassin en mètres (repère personnage).
 * Une clé qui omet un os garde la valeur précédente de cet os ; l'interpolation est une
 * spline de Catmull-Rom (passage souple entre les poses, sans arrêt robotique). */
(function(){
'use strict';
const DEG=Math.PI/180;
const B={hips:'Hips',sp:'Spine',sp1:'Spine1',sp2:'Spine2',nk:'Neck',hd:'Head',
 lSh:'LeftShoulder',lA:'LeftArm',lF:'LeftForeArm',lH:'LeftHand',
 rSh:'RightShoulder',rA:'RightArm',rF:'RightForeArm',rH:'RightHand',
 lU:'LeftUpLeg',lL:'LeftLeg',lFt:'LeftFoot',lT:'LeftToeBase',
 rU:'RightUpLeg',rL:'RightLeg',rFt:'RightFoot',rT:'RightToeBase'};

/* ---------------------------------------------------------------- poses de référence
   Garde « chevalier » : buste de trois quarts, bouclier levé devant le cœur,
   épée tenue basse et pointe vers l'avant, genoux fléchis, appuis décalés. */
const GUARD={hips:[0,-.075,0],
 hipsR:[10,-16,0], sp:[4,4,0], sp1:[7,6,0], sp2:[2,4,0], nk:[-4,3,0], hd:[-7,5,0],
 lA:[-50,-4,-20], lF:[-22,0,0], lH:[0,-10,0],
 rA:[-14,4,-16], rF:[-66,0,0], rH:[-26,0,-8],
 lU:[-30,-4,-6], lL:[42,0,0], lFt:[-14,0,0],
 rU:[8,10,8], rL:[34,0,0], rFt:[-15,0,0]};
function P(base,over){const o=Object.assign({},base);for(const k in over)o[k]=over[k];return o;}
function mix(a,b,w){const o={};for(const k of new Set([...Object.keys(a),...Object.keys(b)])){const va=a[k]||[0,0,0],vb=b[k]||[0,0,0];o[k]=va.map((v,i)=>v+(vb[i]-v)*w);}return o;}

/* ---------------------------------------------------------------- clips */
const DEFS={};
function def(name,dur,loop,keys,opt={}){DEFS[name]={name,dur,loop,keys,opt};}

// Garde vivante : respiration, rebond léger des genoux, épée qui « cherche ».
def('K_Guard',1.6,true,[
 {t:0,  p:GUARD},
 {t:.4, p:P(GUARD,{hips:[0,-.085,.005],sp1:[7,4,0],rH:[-22,4,-14],rA:[-24,10,30],lL:[38,0,0],rL:[30,0,0]})},
 {t:.8, p:P(GUARD,{hips:[.006,-.065,0],sp2:[2,6,0],hd:[-7,4,0]})},
 {t:1.2,p:P(GUARD,{hips:[0,-.082,-.004],rH:[-14,-4,-12],rA:[-20,6,28],lA:[-60,-8,-22],lL:[37,0,0],rL:[29,0,0]})},
 {t:1.6,p:GUARD}]);

// Pas chassés en garde (verrouillage de cible) : les pieds ne se croisent jamais.
function strafe(side){ // side = +1 vers la gauche d'Aerin, -1 vers la droite
 const s=side, lead=s>0?'l':'r', trail=s>0?'r':'l';
 const k=(o)=>P(GUARD,o);
 const up=(leg,ab,knee)=>({[leg+'U']:[-30,0,-ab*(leg==='l'?1:-1)],[leg+'L']:[knee,0,0],[leg+'Ft']:[-6,0,0]});
 return [
  {t:0,   p:k({hips:[0,-.075,0],...up(lead,0,30),...up(trail,0,28)})},
  {t:.18, p:k({hips:[s*.03,-.04,0],hipsR:[4,-14,-s*4],...up(lead,22,58),[trail+'U']:[-10,0,0],[trail+'L']:[20,0,0]})},
  {t:.36, p:k({hips:[s*.05,-.085,0],hipsR:[4,-14,s*2],[lead+'U']:[-14,0,s>0?-14:14],[lead+'L']:[32,0,0],[trail+'U']:[-18,0,s>0?-10:10],[trail+'L']:[36,0,0]})},
  {t:.54, p:k({hips:[s*.02,-.05,0],hipsR:[4,-14,s*4],[trail+'U']:[-34,0,0],[trail+'L']:[56,0,0],[lead+'U']:[-12,0,s>0?-6:6],[lead+'L']:[24,0,0]})},
  {t:.72, p:k({hips:[0,-.075,0],...up(lead,0,30),...up(trail,0,28)})}];
}
def('K_StrafeL',.72,true,strafe(1));
def('K_StrafeR',.72,true,strafe(-1));

// Marche en garde, avant et arrière (pas courts, bouclier tenu).
function guardWalk(dir){const d=dir;return [
 {t:0,  p:P(GUARD,{hips:[0,-.08,0],lU:[-34*d,0,-6],lL:[18,0,0],rU:[14*d,0,4],rL:[22,0,0]})},
 {t:.25,p:P(GUARD,{hips:[0,-.05,0],lU:[-8*d,0,-6],lL:[22,0,0],rU:[-28*d+8,0,4],rL:[62,0,0]})},
 {t:.5, p:P(GUARD,{hips:[0,-.08,0],rU:[-34*d,0,4],rL:[18,0,0],lU:[14*d,0,-6],lL:[22,0,0]})},
 {t:.75,p:P(GUARD,{hips:[0,-.05,0],rU:[-8*d,0,4],rL:[22,0,0],lU:[-28*d+8,0,-6],lL:[62,0,0]})},
 {t:1,  p:P(GUARD,{hips:[0,-.08,0],lU:[-34*d,0,-6],lL:[18,0,0],rU:[14*d,0,4],rL:[22,0,0]})}];}
def('K_GuardFwd',.9,true,guardWalk(1));
def('K_GuardBack',1.0,true,guardWalk(-1));

/* Attaques (haut du corps + appuis). Chaque coup : armé, frappe rapide, prolongement, retour.
   meta.hit = fraction de la durée où la lame touche, meta.lunge = avancée du corps (m). */
const LUNGE_L={lU:[-38,0,-6],lL:[44,0,0],lFt:[-8,0,0],rU:[10,10,8],rL:[22,0,0],rFt:[-6,0,0]};
const SLASH_A=[ // taille horizontale : armé à droite, balayage vers la gauche
 {t:0,   p:GUARD},
 {t:.17, p:P(GUARD,{hips:[0,-.09,-.02],hipsR:[8,-40,0],sp1:[4,-20,0],sp2:[2,-14,0],hd:[-4,24,0],rA:[-70,-95,0],rF:[-75,0,0],rH:[-10,0,0],lA:[-56,10,-28],lF:[-30,0,0]})},
 {t:.31, p:P(GUARD,{hips:[0,-.11,.09],hipsR:[10,8,0],sp1:[8,14,0],sp2:[4,10,0],hd:[-6,-10,0],rA:[-84,-10,0],rF:[-10,0,0],rH:[0,0,0],lA:[-40,20,-10],lF:[-50,0,0],...LUNGE_L})},
 {t:.45, p:P(GUARD,{hips:[0,-.11,.1],hipsR:[10,34,0],sp1:[8,26,0],sp2:[4,16,0],hd:[-6,-24,0],rA:[-82,70,0],rF:[-14,0,0],rH:[0,10,0],lA:[-30,30,-6],lF:[-50,0,0],...LUNGE_L})},
 {t:.74, p:P(GUARD,{hips:[0,-.09,.04],hipsR:[10,8,0],sp1:[7,10,0],rA:[-50,30,0],rF:[-56,0,0],rH:[-20,0,0]})},
 {t:1,   p:GUARD}];
const SLASH_B=[ // revers : armé à gauche de l'épaule, balayage vers la droite
 {t:0,   p:GUARD},
 {t:.18, p:P(GUARD,{hips:[0,-.09,0],hipsR:[8,30,0],sp1:[6,24,0],sp2:[4,16,0],hd:[-6,-26,0],rA:[-80,75,0],rF:[-95,0,0],rH:[-20,0,0],lA:[-40,-10,-6],lF:[-40,0,0]})},
 {t:.32, p:P(GUARD,{hips:[0,-.11,.09],hipsR:[10,-14,0],sp1:[6,-18,0],sp2:[2,-12,0],hd:[-6,14,0],rA:[-86,0,0],rF:[-12,0,0],rH:[0,0,0],lA:[-58,-6,-30],lF:[-30,0,0],rU:[-36,6,4],rL:[46,0,0],rFt:[-8,0,0],lU:[8,-8,-8],lL:[24,0,0],lFt:[-8,0,0]})},
 {t:.46, p:P(GUARD,{hips:[0,-.11,.1],hipsR:[10,-36,0],sp1:[6,-26,0],sp2:[2,-18,0],hd:[-6,26,0],rA:[-84,-85,0],rF:[-12,0,0],rH:[0,-10,0],lA:[-58,-6,-30],lF:[-30,0,0],rU:[-36,6,4],rL:[46,0,0],rFt:[-8,0,0],lU:[8,-8,-8],lL:[24,0,0],lFt:[-8,0,0]})},
 {t:.76, p:P(GUARD,{hipsR:[10,-14,0],sp1:[7,-6,0],rA:[-40,-30,0],rF:[-60,0,0]})},
 {t:1,   p:GUARD}];
const SLASH_C=[ // coup vertical en deux temps (armé haut, tombée lourde)
 {t:0,   p:GUARD},
 {t:.24, p:P(GUARD,{hips:[0,-.04,-.02],hipsR:[-6,-8,0],sp:[-6,0,0],sp1:[-10,-6,0],sp2:[-6,0,0],hd:[-10,0,0],rA:[-170,20,10],rF:[-60,0,0],rH:[-30,0,0],lA:[-40,0,-20]})},
 {t:.40, p:P(GUARD,{hips:[0,-.16,.11],hipsR:[16,-4,0],sp:[14,0,0],sp1:[18,0,0],sp2:[10,0,0],hd:[2,0,0],rA:[-112,10,6],rF:[-4,0,0],rH:[0,0,0],lA:[-24,0,-24],lU:[-50,0,-8],lL:[60,0,0],rU:[14,0,6],rL:[24,0,0]})},
 {t:.56, p:P(GUARD,{hips:[0,-.17,.12],hipsR:[18,-4,0],sp:[16,0,0],sp1:[20,0,0],sp2:[10,0,0],rA:[-96,10,6],rF:[-6,0,0],rH:[4,0,0],lA:[-24,0,-24],lU:[-50,0,-8],lL:[60,0,0],rU:[14,0,6],rL:[24,0,0]})},
 {t:.8,  p:P(GUARD,{hips:[0,-.1,.04],hipsR:[8,-10,0],sp1:[10,4,0],rA:[-28,8,30],rF:[-50,0,0]})},
 {t:1,   p:GUARD}];
const SLASH_D=[ // estoc fendu
 {t:0,   p:GUARD},
 {t:.22, p:P(GUARD,{hips:[0,-.08,-.04],hipsR:[2,-30,0],sp1:[2,-22,0],rA:[-30,-10,40],rF:[-110,0,0],rH:[-30,0,0],lA:[-70,-10,-20]})},
 {t:.38, p:P(GUARD,{hips:[0,-.17,.2],hipsR:[10,18,0],sp1:[12,16,0],sp2:[6,8,0],rA:[-86,4,4],rF:[-2,0,0],rH:[-6,0,0],lA:[-30,-6,-40],lF:[-30,0,0],lU:[-60,0,-6],lL:[62,0,0],rU:[22,0,8],rL:[12,0,0],rFt:[10,0,0]})},
 {t:.54, p:P(GUARD,{hips:[0,-.17,.21],hipsR:[10,20,0],sp1:[12,18,0],rA:[-88,4,2],rF:[0,0,0],rH:[-6,0,0],lA:[-30,-6,-40],lF:[-30,0,0],lU:[-60,0,-6],lL:[62,0,0],rU:[22,0,8],rL:[12,0,0],rFt:[10,0,0]})},
 {t:.8,  p:P(GUARD,{hips:[0,-.1,.06],rA:[-34,8,30],rF:[-58,0,0]})},
 {t:1,   p:GUARD}];
def('K_Slash1',.62,false,SLASH_A,{hit:.36,lunge:.5});
def('K_Slash2',.64,false,SLASH_B,{hit:.38,lunge:.45});
def('K_Slash3',.8,false,SLASH_C,{hit:.44,lunge:.65});
def('K_Slash4',.7,false,SLASH_D,{hit:.42,lunge:.95});

// Attaque tournoyante (relâcher après charge) : le corps fait 360° (rotation pilotée par le jeu).
def('K_Spin',.82,false,[
 {t:0,   p:P(GUARD,{hips:[0,-.16,0],hipsR:[10,-40,0],sp1:[10,-30,0],sp2:[4,-20,0],rA:[-40,-120,0],rF:[-20,0,0],rH:[10,0,0],lA:[-40,0,-50],lU:[-40,0,-14],lL:[60,0,0],rU:[-20,0,14],rL:[50,0,0]})},
 {t:.2,  p:P(GUARD,{hips:[0,-.2,0],hipsR:[12,10,0],sp1:[10,20,0],sp2:[6,16,0],rA:[-86,-80,0],rF:[0,0,0],rH:[0,0,0],lA:[-20,0,-70],lF:[-10,0,0],lU:[-40,0,-24],lL:[56,0,0],rU:[-30,0,24],rL:[56,0,0]})},
 {t:.6,  p:P(GUARD,{hips:[0,-.2,0],hipsR:[12,14,0],sp1:[10,22,0],sp2:[6,16,0],rA:[-88,-80,0],rF:[0,0,0],rH:[0,0,0],lA:[-20,0,-70],lF:[-10,0,0],lU:[-40,0,-24],lL:[56,0,0],rU:[-30,0,24],rL:[56,0,0]})},
 {t:.82, p:GUARD}],{hit:.3});
// Charge de l'attaque tournoyante : posture basse, épée ramenée derrière, tremblement.
def('K_Charge',.6,true,[
 {t:0,  p:P(GUARD,{hips:[0,-.16,0],hipsR:[10,-40,0],sp1:[10,-30,0],sp2:[4,-20,0],rA:[-40,-120,0],rF:[-20,0,0],rH:[10,0,0],lA:[-40,0,-50],lU:[-40,0,-14],lL:[60,0,0],rU:[-20,0,14],rL:[50,0,0]})},
 {t:.3, p:P(GUARD,{hips:[0,-.17,0],hipsR:[10,-42,0],sp1:[11,-31,0],sp2:[4,-21,0],rA:[-42,-122,0],rF:[-20,0,0],rH:[10,0,0],lA:[-40,0,-50],lU:[-40,0,-14],lL:[62,0,0],rU:[-20,0,14],rL:[52,0,0]})},
 {t:.6, p:P(GUARD,{hips:[0,-.16,0],hipsR:[10,-40,0],sp1:[10,-30,0],sp2:[4,-20,0],rA:[-40,-120,0],rF:[-20,0,0],rH:[10,0,0],lA:[-40,0,-50],lU:[-40,0,-14],lL:[60,0,0],rU:[-20,0,14],rL:[50,0,0]})}]);

// Saut frappé : bond, épée levée à deux temps, frappe plongeante à la réception.
def('K_JumpSlash',1.0,false,[
 {t:0,   p:P(GUARD,{hips:[0,-.18,0],sp1:[14,0,0],lU:[-50,0,-8],lL:[80,0,0],rU:[-40,0,8],rL:[80,0,0],rA:[-30,0,40],lA:[-40,0,-20]})},
 {t:.22, p:P(GUARD,{hips:[0,.05,0],hipsR:[-8,0,0],sp1:[-12,0,0],sp2:[-8,0,0],hd:[-12,0,0],rA:[-176,10,6],rF:[-70,0,0],rH:[-30,0,0],lA:[-60,0,-30],lU:[-70,0,-6],lL:[100,0,0],rU:[-30,0,6],rL:[70,0,0]})},
 {t:.48, p:P(GUARD,{hips:[0,.02,.05],hipsR:[-4,0,0],sp1:[-8,0,0],rA:[-186,10,6],rF:[-80,0,0],rH:[-34,0,0],lU:[-60,0,-6],lL:[90,0,0],rU:[-50,0,6],rL:[90,0,0]})},
 {t:.62, p:P(GUARD,{hips:[0,-.24,.14],hipsR:[20,0,0],sp:[16,0,0],sp1:[22,0,0],sp2:[10,0,0],rA:[-112,10,6],rF:[-2,0,0],rH:[0,0,0],lA:[-20,0,-30],lU:[-70,0,-8],lL:[90,0,0],rU:[10,0,8],rL:[60,0,0]})},
 {t:.8,  p:P(GUARD,{hips:[0,-.22,.12],hipsR:[18,0,0],sp:[14,0,0],sp1:[20,0,0],rA:[-98,10,6],rF:[-4,0,0],rH:[4,0,0],lU:[-70,0,-8],lL:[90,0,0],rU:[10,0,8],rL:[60,0,0]})},
 {t:1,   p:GUARD}],{hit:.62,lunge:1.2});

// Esquive latérale (bond de côté) et salto arrière en cible verrouillée.
function sideHop(s){return [
 {t:0,  p:P(GUARD,{hips:[0,-.14,0],lU:[-30,0,0],lL:[56,0,0],rU:[-30,0,0],rL:[56,0,0]})},
 {t:.2, p:P(GUARD,{hips:[s*.05,.06,0],hipsR:[4,-14,-s*16],sp1:[0,0,s*10],lU:[-20,0,s>0?-24:-10],lL:[50,0,0],rU:[-20,0,s>0?10:24],rL:[50,0,0],lA:[-50,0,s>0?-50:-20],rA:[-20,0,s>0?30:60]})},
 {t:.48,p:P(GUARD,{hips:[s*.02,0,0],hipsR:[4,-14,-s*8],lU:[-36,0,s>0?-18:-6],lL:[70,0,0],rU:[-36,0,s>0?6:18],rL:[70,0,0]})},
 {t:.62,p:P(GUARD,{hips:[0,-.15,0],lU:[-34,0,-4],lL:[60,0,0],rU:[-30,0,4],rL:[58,0,0]})},
 {t:.8, p:GUARD}];}
def('K_HopL',.8,false,sideHop(1));
def('K_HopR',.8,false,sideHop(-1));
// Salto arrière : la rotation complète du corps est appliquée par le jeu au bassin (repère du personnage).
def('K_Backflip',.86,false,[
 {t:0,  p:P(GUARD,{hips:[0,-.16,0],sp1:[10,0,0],lU:[-40,0,-6],lL:[70,0,0],rU:[-40,0,6],rL:[70,0,0],lA:[-20,0,-30],rA:[-20,0,30]})},
 {t:.18,p:P(GUARD,{hips:[0,.12,0],sp:[-14,0,0],sp1:[-18,0,0],sp2:[-10,0,0],hd:[-20,0,0],lA:[-160,0,-20],rA:[-150,0,20],lU:[10,0,-6],lL:[10,0,0],rU:[10,0,6],rL:[10,0,0]})},
 {t:.42,p:P(GUARD,{hips:[0,.2,0],sp:[10,0,0],sp1:[16,0,0],hd:[16,0,0],lU:[-110,0,-6],lL:[120,0,0],rU:[-110,0,6],rL:[120,0,0],lA:[-60,0,-30],rA:[-60,0,30]})},
 {t:.66,p:P(GUARD,{hips:[0,-.2,0],sp1:[14,0,0],lU:[-50,0,-8],lL:[80,0,0],rU:[-46,0,8],rL:[78,0,0]})},
 {t:.86,p:GUARD}]);

// Coup de bouclier (repousse le mannequin).
def('K_ShieldBash',.6,false,[
 {t:0,  p:GUARD},
 {t:.16,p:P(GUARD,{hips:[0,-.09,-.04],hipsR:[2,20,0],sp1:[2,16,0],lA:[-50,-30,-10],lF:[-50,0,0]})},
 {t:.3, p:P(GUARD,{hips:[0,-.13,.16],hipsR:[10,-10,0],sp1:[12,-12,0],lA:[-84,10,-6],lF:[-6,0,0],lU:[-50,0,-8],lL:[56,0,0],rU:[14,0,8],rL:[18,0,0]})},
 {t:.42,p:P(GUARD,{hips:[0,-.13,.16],hipsR:[10,-12,0],sp1:[12,-14,0],lA:[-86,12,-6],lF:[-6,0,0],lU:[-50,0,-8],lL:[56,0,0],rU:[14,0,8],rL:[18,0,0]})},
 {t:.6, p:GUARD}],{hit:.3,lunge:.35});

// Course de combat (épée tenue basse en arrière, bouclier près du corps).
def('K_Run',.62,true,[
 {t:0,   p:{hips:[0,-.04,0],hipsR:[10,8,0],sp1:[8,-6,0],sp2:[4,-4,0],hd:[-10,0,0],lU:[-60,0,-4],lL:[30,0,0],lFt:[-10,0,0],rU:[24,0,4],rL:[40,0,0],rFt:[20,0,0],lA:[10,0,-24],lF:[-70,0,0],rA:[-14,0,-14],rF:[-26,0,0],rH:[40,0,0]}},
 {t:.155,p:{hips:[0,.02,0],hipsR:[10,0,0],lU:[-30,0,-4],lL:[20,0,0],lFt:[0,0,0],rU:[-10,0,4],rL:[100,0,0],rFt:[10,0,0],lA:[-6,0,-24],rA:[6,0,-14]}},
 {t:.31, p:{hips:[0,-.04,0],hipsR:[10,-8,0],sp1:[8,6,0],sp2:[4,4,0],rU:[-60,0,4],rL:[30,0,0],rFt:[-10,0,0],lU:[24,0,-4],lL:[40,0,0],lFt:[20,0,0],lA:[-22,0,-24],lF:[-70,0,0],rA:[24,0,-14],rF:[-26,0,0]}},
 {t:.465,p:{hips:[0,.02,0],hipsR:[10,0,0],rU:[-30,0,4],rL:[20,0,0],rFt:[0,0,0],lU:[-10,0,-4],lL:[100,0,0],lFt:[10,0,0],lA:[-6,0,-24],rA:[6,0,-14]}},
 {t:.62, p:{hips:[0,-.04,0],hipsR:[10,8,0],sp1:[8,-6,0],sp2:[4,-4,0],lU:[-60,0,-4],lL:[30,0,0],lFt:[-10,0,0],rU:[24,0,4],rL:[40,0,0],rFt:[20,0,0],lA:[10,0,-24],lF:[-70,0,0],rA:[-14,0,-14],rF:[-26,0,0],rH:[40,0,0]}}]);

// Réactions : impact de face lourd, chute et relevé rapide.
def('K_Stagger',.7,false,[
 {t:0,  p:GUARD},
 {t:.12,p:P(GUARD,{hips:[0,-.1,-.12],hipsR:[-12,10,0],sp1:[-16,8,0],sp2:[-10,0,0],hd:[-20,10,0],lA:[-30,0,-50],rA:[-10,0,60],lU:[-10,0,-8],lL:[30,0,0],rU:[-40,0,6],rL:[50,0,0]})},
 {t:.4, p:P(GUARD,{hips:[0,-.12,-.08],hipsR:[-4,4,0],sp1:[-6,4,0],hd:[-6,4,0]})},
 {t:.7, p:GUARD}]);

/* ---------------------------------------------------------------- conversion en clips */
function catmull(p0,p1,p2,p3,t){const t2=t*t,t3=t2*t;return .5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3);}
function sample(def,name,t){
 // valeurs successives de l'os (maintien des clés absentes)
 const ks=def.keys,vals=[];let last=null;
 for(const k of ks){if(k.p[name]!==undefined)last=k.p[name];vals.push(last);}
 const first=vals.find(v=>v);if(!first)return null;
 for(let i=0;i<vals.length;i++)if(!vals[i])vals[i]=[0,0,0]; // avant sa première clé, l'os reste en pose neutre
 let i=0;while(i<ks.length-2&&t>ks[i+1].t)i++;
 const t0=ks[i].t,t1=ks[i+1].t,u=t1>t0?Math.min(1,Math.max(0,(t-t0)/(t1-t0))):0;
 const n=ks.length,get=j=>def.loop?vals[((j%(n-1))+(n-1))%(n-1)]:vals[Math.max(0,Math.min(n-1,j))];
 const a=get(i-1),b=vals[i],c=vals[i+1],d=get(i+2);
 return [0,1,2].map(c3=>catmull(a[c3],b[c3],c[c3],d[c3],u));
}

function build(T,actor,neutralClip){
 const bones={};actor.traverse(o=>{if(o.isBone)bones[o.name.replace(/^mixamorig:?/,'')]=o;});
 const hips=bones.Hips;if(!hips)throw new Error('Os Hips introuvable');
 // Pose neutre : premier instant du clip Idle, lu sur une copie du squelette.
 const rest={},restPos=new T.Vector3();
 const mixer=new T.AnimationMixer(actor),act=mixer.clipAction(neutralClip);act.play();mixer.update(0);
 actor.updateWorldMatrix(true,false);actor.updateMatrixWorld(true);
 for(const k in bones)rest[k]=bones[k].quaternion.clone();restPos.copy(hips.position);
 act.stop();mixer.uncacheRoot(actor);
 // Repère du personnage vu depuis le parent du bassin (rotation + échelle de l'armature).
 const actorInv=new T.Matrix4().copy(actor.matrixWorld).invert();
 const parentM=new T.Matrix4().multiplyMatrices(actorInv,hips.parent.matrixWorld);
 const parentQ=new T.Quaternion(),parentS=new T.Vector3(),tmpP=new T.Vector3();parentM.decompose(tmpP,parentQ,parentS);
 const parentQInv=parentQ.clone().invert();
 const order=[];(function walk(b){const k=b.name.replace(/^mixamorig:?/,'');order.push([k,b]);for(const c of b.children)if(c.isBone)walk(c);})(hips);
 const parentOf={};for(const [k,b] of order){const p=b.parent;parentOf[k]=p&&p.isBone?p.name.replace(/^mixamorig:?/,''):null;}
 const qR=new T.Quaternion(),eul=new T.Euler(),world={},qa=new T.Quaternion();
 function poseAt(def,t,outQ,outP){
  for(const [k] of order){
   const parentWorld=parentOf[k]?world[parentOf[k]]:parentQ;
   const key=k==='Hips'?'hipsR':Object.keys(B).find(n=>B[n]===k);
   const v=key?sample(def,key,t):null;
   qa.copy(parentWorld).multiply(rest[k]); // orientation héritée, repère personnage
   if(v){eul.set(v[0]*DEG,v[1]*DEG,v[2]*DEG,'YXZ');qR.setFromEuler(eul);qa.premultiply(qR);}
   world[k]=(world[k]||new T.Quaternion()).copy(qa);
   outQ[k]=parentWorld.clone().invert().multiply(qa);
  }
  const h=sample(def,'hips',t)||[0,0,0];
  outP.copy(restPos).add(new T.Vector3(h[0],h[1],h[2]).applyQuaternion(parentQInv).divide(parentS));
 }
 const clips={},meta={};
 for(const name in DEFS){
  const d=DEFS[name],fps=30,n=Math.max(2,Math.round(d.dur*fps)+1),times=new Float32Array(n);
  const qs={},ps=new Float32Array(n*3);for(const [k] of order)qs[k]=new Float32Array(n*4);
  const oq={},op=new T.Vector3();
  for(let i=0;i<n;i++){const t=i/(n-1)*d.dur;times[i]=t;poseAt(d,t,oq,op);
   for(const [k] of order){const q=oq[k];if(i>0){const pv=qs[k];const j=(i-1)*4;if(pv[j]*q.x+pv[j+1]*q.y+pv[j+2]*q.z+pv[j+3]*q.w<0)q.set(-q.x,-q.y,-q.z,-q.w);}qs[k].set([q.x,q.y,q.z,q.w],i*4);}
   ps.set([op.x,op.y,op.z],i*3);}
  const tracks=[];
  for(const [k,b] of order){if(/_End$|Thumb|Index/.test(k))continue;tracks.push(new T.QuaternionKeyframeTrack(b.name+'.quaternion',times,qs[k]));}
  tracks.push(new T.VectorKeyframeTrack(hips.name+'.position',times,ps));
  clips[name]=new T.AnimationClip(name,d.dur,tracks);meta[name]=Object.assign({loop:d.loop,dur:d.dur},d.opt);
 }
 return {clips,meta};
}
window.AerinMotionV11={build,DEFS,GUARD,def,P,mix,version:11};
})();
