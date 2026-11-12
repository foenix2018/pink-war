/* RLH V942 — CCRM GALLIN (Euro 3) 4x4 double cabine, pompiers de l'air — véhicule OPEX.
 * Modèle procédural conforme à la fiche d'analyse « FORMATION COD — CCRM GALLIN EURO 3 » (2020, 62 pages)
 * fournie le 11 novembre 2026, et aux six photos du véhicule 71930008 fournies le 10 novembre 2026.
 * Cotes hors tout de la fiche : 8,15 × 2,54 × 3,32 m, empattement 3,80 m. Le détail des formes reste
 * estimé d'après les photos (aucun plan coté) : voir docs/V944_CCRM.md.
 * Repère : +X = avant, +Y = haut, +Z = droite du véhicule ; origine au sol.
 * Compatible Three r128 (jeu, WebGL2) et three.webgpu (WebGPURenderer).
 * Aucune lumière dynamique : phares, gyrophares et projecteurs du mât sont des matériaux émissifs.
 * Les logos de marques (constructeur, carrossier) ne sont pas reproduits.
 */
const CCRM = (function () {
  const root = {};
  'use strict';
  var VERSION = 942;
  var DIMS = {
    longueur: 8.15, largeur: 2.54, hauteur: 3.32, empattement: 3.80,
    essieuAvantX: 2.05, essieuArriereX: -1.75, voie: 2.10, rayonRoue: 0.58,
    avantX: 3.87, arriereX: -4.28, source: 'FA CCRM GALLIN EURO 3 (2020)'
  };
  /* Données de la fiche d'analyse, à l'usage de la logique de jeu (rien n'est inventé ici). */
  var FICHE = {
    designation: 'CCRM GALLIN EURO 3', emploi: 'Véhicule déployé uniquement en opérations extérieures',
    missions: ['Interventions de type urbain', 'Interventions de type industriel', "Interventions sur dépôts d'hydrocarbures moyens", 'Feux de végétation'],
    ptacT: 14, gueM: 0.70, deversPentesPct: 30, anglesAttaqueFuiteDeg: 30,
    moteur: { puissanceCv: 280, regimeTrMin: 2300, type: 'turbo diesel Euro 3', reservoirGazoleL: 150, transmission: '4x4 permanent' },
    boite: { type: 'manuelle', avant: 6, arriere: 1, priseDeMouvement: 'intégrée à la boîte' },
    blocages: ['différentiel boîte de transfert', 'différentiel pont arrière', 'différentiel pont avant', 'gamme courte'],
    branchements: ['Alimentation électrique 230 V (démarrage impossible prise raccordée)', 'Prise OTAN 24 V 200 A maxi'],
    pompe: { type: 'centrifuge monocellulaire', debitLMin: 2000, pressionBar: 15, aspirationM: 3, hauteurAspirationMaxM: 6, calorstatC: 55, amorceur: 'piston double effet, débrayage automatique à 0,8 bar', regimeAmorcageTrMin: [1100, 1400] },
    citerneEauL: 2940, citerneEmulseurL: 140, alimentationCiterneMaxBar: 6, aspirationExterieureMaxBar: 10,
    proportionneur: { debitLMin: 225, pressionBar: 10, taux: [0.25, 0.5, 1, 3, 6], tauxMoussePct: 3, rincageMaxBar: 5 },
    refoulements: [{ dn: 110, nb: 1 }, { dn: 65, nb: 2 }, { dn: 45, nb: 1 }], ldt: { dn: 22, longueurM: 40 },
    pompeEnRoulant: { vitesseMaxKmH: 6, pressionMaxBar: 12, distanceMiniPorteLanceM: 5, regimes: [{ trMin: 1400, bar: 7 }, { trMin: 1900, bar: 12 }] },
    treuil: { type: 'électrique', longueurM: 40, forceKg: 5400, diametreMm: 12, cable: 'synthétique' },
    mat: { hauteurM: 6, projecteurs: 4, puissanceW: 100, commande: 'électropneumatique' },
    regles: ['Remplissage par le trou d\'homme interdit', 'Support échelle : descente du dévidoir gauche obligatoire', 'Roue de secours : retirer le dévidoir de droite', 'Feux de pénétration : uniquement sans le frein de parc', 'Régulateur de vitesse inactif']
  };

  function create(opt) {
    opt = opt || {};
    var T = opt.THREE || root.THREE;
    if (!T) throw new Error('RLH_CCRM_V942 : THREE manquant');
    var plaque = opt.plaque || '71930008';
    var segs = opt.segments || 28;
    var hasDom = typeof document !== 'undefined' && !!document.createElement;
    var PI = Math.PI;

    /* ---------- matériaux ---------- */
    function std(color, rough, metal, extra) {
      var m = new T.MeshStandardMaterial({ color: color, roughness: rough, metalness: metal || 0 });
      if (extra) for (var k in extra) m[k] = extra[k];
      return m;
    }
    var M = {
      rouge: std(0xc21a1c, 0.34, 0.08), jaune: std(0xd9d81f, 0.42, 0.05),
      blanc: std(0xf1f1ee, 0.42, 0.05), noir: std(0x17181a, 0.72, 0.05),
      plastique: std(0x25272a, 0.85, 0), caoutchouc: std(0x101010, 0.93, 0),
      alu: std(0xb9bdc0, 0.38, 0.75), acier: std(0x7d8286, 0.5, 0.6),
      jante: std(0x8b9095, 0.55, 0.45), chassis: std(0x1b1c1e, 0.7, 0.3),
      siege: std(0x3a2a25, 0.9, 0), interieur: std(0x34373b, 0.9, 0),
      vitre: std(0x1c2a30, 0.08, 0.1, { transparent: true, opacity: 0.38, depthWrite: false }),
      bandeJaune: std(0xe2b616, 0.45, 0.05),
      phare: std(0xdfe6ea, 0.15, 0.2, { emissive: new T.Color(0xfff2d0), emissiveIntensity: 0 }),
      clignotant: std(0xe07a10, 0.3, 0, { emissive: new T.Color(0xff8a10), emissiveIntensity: 0 }),
      feuRouge: std(0x8e1010, 0.3, 0, { emissive: new T.Color(0xff1508), emissiveIntensity: 0 }),
      gabarit: std(0xd97a12, 0.35, 0, { emissive: new T.Color(0xff7a10), emissiveIntensity: 0 }),
      bleuG: std(0x1b3fa8, 0.2, 0, { emissive: new T.Color(0x1a55ff), emissiveIntensity: 0, transparent: true, opacity: 0.9 }),
      bleuD: std(0x1b3fa8, 0.2, 0, { emissive: new T.Color(0x1a55ff), emissiveIntensity: 0, transparent: true, opacity: 0.9 })
    };

    /* ---------- textures dessinées ---------- */
    function tex(w, h, draw) {
      if (!hasDom) return null;
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var g = c.getContext('2d'); if (!g) return null; draw(g, w, h);
      var t = new T.CanvasTexture(c);
      if ('colorSpace' in t && T.SRGBColorSpace) t.colorSpace = T.SRGBColorSpace; else if (T.sRGBEncoding) t.encoding = T.sRGBEncoding;
      t.anisotropy = 4; return t;
    }
    function texMat(t, fallback, rough) {
      return new T.MeshStandardMaterial({ color: t ? 0xffffff : fallback, map: t || null, roughness: rough == null ? 0.5 : rough, metalness: 0.02 });
    }
    function chevrons(g, w, h, band, vee) {
      g.fillStyle = '#d8ec1c'; g.fillRect(0, 0, w, h); g.fillStyle = '#d3121b';
      function half(x0, dir) {
        g.save(); g.beginPath(); g.rect(x0, 0, w / 2, h); g.clip();
        for (var i = -8; i < 16; i++) {
          var x = (dir > 0 ? x0 : x0 + w / 2) + dir * i * band * 2;
          g.beginPath();
          g.moveTo(x, h); g.lineTo(x + dir * band, h); g.lineTo(x + dir * band + dir * h * vee, 0); g.lineTo(x + dir * h * vee, 0);
          g.closePath(); g.fill();
        }
        g.restore();
      }
      half(0, -1); half(w / 2, 1);
    }
    var tChevAvant = tex(1024, 256, function (g, w, h) { chevrons(g, w, h, 74, -1.0); });
    var tChevBoite = tex(512, 256, function (g, w, h) { chevrons(g, w, h, 60, -1.0); });
    var tChevArr = tex(1024, 128, function (g, w, h) { chevrons(g, w, h, 46, -1.0); });
    function bandeau(gauche) {
      return tex(2048, 144, function (g, w, h) {
        g.fillStyle = '#f4f4f1'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#c4161c'; g.textBaseline = 'middle';
        g.font = 'bold 96px Arial, Helvetica, sans-serif';
        var a = "POMPIERS ARMEE DE L'AIR", b = 'CCRM';
        if (gauche) { g.textAlign = 'left'; g.fillText(a, 70, h / 2 + 4); g.textAlign = 'right'; g.fillText(b, w - 110, h / 2 + 4); }
        else { g.textAlign = 'left'; g.fillText(b, 110, h / 2 + 4); g.textAlign = 'right'; g.fillText(a, w - 70, h / 2 + 4); }
      });
    }
    function tPoteau(dir) { return tex(128, 512, function (g, w, h) { g.fillStyle = '#d8ec1c'; g.fillRect(0, 0, w, h); g.fillStyle = '#d3121b'; for (var i = -4; i < 12; i++) { var y = i * 96; g.beginPath(); if (dir > 0) { g.moveTo(0, y); g.lineTo(w, y - w); g.lineTo(w, y - w + 48); g.lineTo(0, y + 48); } else { g.moveTo(0, y - w); g.lineTo(w, y); g.lineTo(w, y + 48); g.lineTo(0, y - w + 48); } g.closePath(); g.fill(); } }); }
    var tPlaque = tex(512, 112, function (g, w, h) {
      g.fillStyle = '#f2f2ee'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f47a5'; g.fillRect(0, 0, 44, h);
      g.fillStyle = '#fff'; g.font = 'bold 26px Arial'; g.textAlign = 'center'; g.fillText('F', 22, h - 14);
      g.strokeStyle = '#111'; g.lineWidth = 5; g.strokeRect(3, 3, w - 6, h - 6);
      g.fillStyle = '#111'; g.font = 'bold 84px Arial, Helvetica, sans-serif'; g.textBaseline = 'middle';
      g.fillText(plaque, w / 2 + 22, h / 2 + 6);
    });
    var tRideau = tex(64, 256, function (g, w, h) {
      for (var y = 0; y < h; y += 16) { var gr = g.createLinearGradient(0, y, 0, y + 16); gr.addColorStop(0, '#d5d8da'); gr.addColorStop(0.75, '#a9adb0'); gr.addColorStop(1, '#5e6266'); g.fillStyle = gr; g.fillRect(0, y, w, 16); }
    });
    var tGaufre = tex(128, 128, function (g, w, h) {
      g.fillStyle = '#b4b8bb'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e3e6e8'; g.lineWidth = 5; g.lineCap = 'round';
      for (var y = 0; y < 4; y++) for (var x = 0; x < 4; x++) { var cx = x * 32 + 16, cy = y * 32 + 16, d = ((x + y) & 1) ? 1 : -1; g.beginPath(); g.moveTo(cx - 9, cy - 9 * d); g.lineTo(cx + 9, cy + 9 * d); g.stroke(); }
    });
    if (tGaufre) { tGaufre.wrapS = tGaufre.wrapT = T.RepeatWrapping; tGaufre.repeat.set(4, 2); }
    M.ecran = std(0x0b1622, 0.25, 0.1, { emissive: new T.Color(0x2a78c8), emissiveIntensity: 0.55 });
    M.led = std(0xe8eef2, 0.2, 0.1, { emissive: new T.Color(0xf4f8ff), emissiveIntensity: 0 });
    M.orange = std(0xe07a10, 0.3, 0, { transparent: true, opacity: 0.92 });
    M.bleuCap = std(0x1d5fc0, 0.5, 0.05); M.laiton = std(0xb08a3a, 0.4, 0.7); M.rougeVif = std(0xd0141a, 0.55, 0);
    M.bleuAR = std(0x1b3fa8, 0.2, 0, { emissive: new T.Color(0x1a55ff), emissiveIntensity: 0, transparent: true, opacity: 0.9 });
    M.gaufre = new T.MeshStandardMaterial({ color: tGaufre ? 0xffffff : 0xb4b8bb, map: tGaufre, roughness: 0.45, metalness: 0.6 });
    M.rideau = new T.MeshStandardMaterial({ color: tRideau ? 0xffffff : 0xa9adb0, map: tRideau, roughness: 0.4, metalness: 0.6 });

    /* ---------- aides de construction ---------- */
    var racine = new T.Group(); racine.name = 'CCRM_V942';
    var caisse = new T.Group(); caisse.name = 'CCRM_CAISSE'; racine.add(caisse);
    function reg(m) { m.castShadow = true; m.receiveShadow = true; return m; }
    function box(p, w, h, d, x, y, z, mat, name) {
      var m = reg(new T.Mesh(new T.BoxGeometry(w, h, d), mat)); m.position.set(x, y, z); if (name) m.name = name; p.add(m); return m;
    }
    function cyl(p, r1, r2, len, x, y, z, mat, axis, n) {
      var m = reg(new T.Mesh(new T.CylinderGeometry(r1, r2, len, n || 20), mat));
      if (axis === 'z') m.rotation.x = PI / 2; else if (axis === 'x') m.rotation.z = PI / 2;
      m.position.set(x, y, z); p.add(m); return m;
    }
    var vA = new T.Vector3(), vB = new T.Vector3(), vUp = new T.Vector3(0, 1, 0);
    function rod(p, a, b, r, mat, joints) {
      vA.set(a[0], a[1], a[2]); vB.set(b[0], b[1], b[2]);
      var len = vA.distanceTo(vB), m = reg(new T.Mesh(new T.CylinderGeometry(r, r, len, 10), mat));
      m.position.copy(vA).add(vB).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(vUp, vB.clone().sub(vA).normalize()); p.add(m);
      if (joints !== false) { var s = new T.Mesh(new T.SphereGeometry(r, 10, 8), mat); s.position.copy(vB); p.add(s); }
      return m;
    }
    function tube(p, pts, r, mat) {
      var s0 = new T.Mesh(new T.SphereGeometry(r, 10, 8), mat); s0.position.set(pts[0][0], pts[0][1], pts[0][2]); p.add(s0);
      for (var i = 0; i < pts.length - 1; i++) rod(p, pts[i], pts[i + 1], r, mat);
    }
    function plaqueTex(p, w, h, x, y, z, rotY, mat, name) {
      var m = new T.Mesh(new T.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = rotY; m.receiveShadow = true; if (name) m.name = name; p.add(m); return m;
    }
    function extr(shape, depth, mat, bevel) {
      var g = new T.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: !!bevel, bevelSize: bevel || 0, bevelThickness: bevel || 0, bevelSegments: 2, curveSegments: 18 });
      return reg(new T.Mesh(g, mat));
    }
    function poly(pts) { var s = new T.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath(); return s; }
    function holeRect(s, x0, y0, x1, y1) { var h = new T.Path(); h.moveTo(x0, y0); h.lineTo(x0, y1); h.lineTo(x1, y1); h.lineTo(x1, y0); h.closePath(); s.holes.push(h); }
    function rrect(w, h, r) { var s = new T.Shape(), a = -w / 2, b = -h / 2; s.moveTo(a + r, b); s.lineTo(a + w - r, b); s.quadraticCurveTo(a + w, b, a + w, b + r); s.lineTo(a + w, b + h - r); s.quadraticCurveTo(a + w, b + h, a + w - r, b + h); s.lineTo(a + r, b + h); s.quadraticCurveTo(a, b + h, a, b + h - r); s.lineTo(a, b + r); s.quadraticCurveTo(a, b, a + r, b); return s; }

    /* Fusion par matériau des pièces fixes d'un groupe (enfants directs, sans nom) : ~520 maillages -> quelques dizaines d'appels. */
    function fusion(g) {
      if (opt.fusion === false) return;
      var lots = {}, i, c;
      for (i = g.children.length - 1; i >= 0; i--) {
        c = g.children[i];
        if (!c.isMesh || c.isInstancedMesh || c.name || c.renderOrder || Array.isArray(c.material)) continue;
        var a = c.geometry.attributes; if (!a.position || !a.normal || !a.uv) continue;
        (lots[c.material.uuid] = lots[c.material.uuid] || { mat: c.material, list: [] }).list.push(c);
      }
      for (var id in lots) {
        var L = lots[id]; if (L.list.length < 2) continue;
        var n = 0, geos = [], ombre = false;
        L.list.forEach(function (m) { m.updateMatrix(); var ge = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); ge.applyMatrix4(m.matrix); geos.push(ge); n += ge.attributes.position.count; ombre = ombre || m.castShadow; g.remove(m); m.geometry.dispose(); });
        var P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2), o = 0;
        geos.forEach(function (ge) { P.set(ge.attributes.position.array, o * 3); N.set(ge.attributes.normal.array, o * 3); U.set(ge.attributes.uv.array, o * 2); o += ge.attributes.position.count; ge.dispose(); });
        var G = new T.BufferGeometry(); G.setAttribute('position', new T.BufferAttribute(P, 3)); G.setAttribute('normal', new T.BufferAttribute(N, 3)); G.setAttribute('uv', new T.BufferAttribute(U, 2));
        var M2 = new T.Mesh(G, L.mat); M2.castShadow = ombre; M2.receiveShadow = true; g.add(M2);
      }
    }

    var records = {}, parts = {}, wheels = [], poste = null, hote = { ccrm: null };
    function ouvrant(key, group, axis, angle, label, apply) {
      records[key] = { key: key, obj: group, axis: axis, angle: angle, amount: 0, target: 0, open: false, label: label, apply: apply || null };
      parts[key] = group;
      group.traverse(function (m) { if (m.isMesh) { m.userData.rlhCcrmV942 = key; m.userData.interactionLabel = label; } });
    }
    function poser(r) { if (r.apply) r.apply(r.amount); else r.obj.rotation[r.axis] = r.angle * r.amount; }
    /* groupe pivotant autour de (px,py) : les pièces se construisent en coordonnées véhicule dans .int */
    function pivot(parent, px, py, pz, name) { var P = new T.Group(); P.position.set(px, py, pz || 0); P.name = name; var I = new T.Group(); I.position.set(-px, -py, -(pz || 0)); P.add(I); parent.add(P); P.int = I; return P; }
    function lisse(a) { a = Math.max(0, Math.min(1, a)); return a * a * (3 - 2 * a); }

    var AX_AV = DIMS.essieuAvantX, AX_AR = DIMS.essieuArriereX, RW = DIMS.rayonRoue, ZW = DIMS.voie / 2;
    var CW = 1.17;           // demi-largeur cabine
    var BW = 1.25;           // demi-largeur cellule (2,54 m hors tout avec feux et logements d'aspiraux)
    var CAB_X0 = 0.50, CAB_X1 = 3.25, TOIT = 2.86;

    /* ---------- châssis, ponts, transmission ---------- */
    (function () {
      var g = new T.Group(); g.name = 'CCRM_CHASSIS'; caisse.add(g);
      [-0.42, 0.42].forEach(function (z) { box(g, 6.55, 0.24, 0.09, -0.08, 0.93, z, M.chassis); });
      [-2.9, -1.0, 0.4, 1.4, 3.0].forEach(function (x) { box(g, 0.10, 0.16, 0.84, x, 0.93, 0, M.chassis); });
      [AX_AV, AX_AR].forEach(function (x) {
        cyl(g, 0.075, 0.075, 1.86, x, RW, 0, M.chassis, 'z', 14);
        var d = reg(new T.Mesh(new T.SphereGeometry(0.21, 16, 12), M.chassis)); d.position.set(x, RW, x > 0 ? 0.18 : 0); d.scale.set(1, 0.92, 0.85); g.add(d);
        [-0.5, 0.5].forEach(function (z) { box(g, 1.35, 0.075, 0.09, x, RW + 0.15, z, M.acier); box(g, 0.09, 0.2, 0.11, x, RW + 0.06, z, M.chassis); rod(g, [x + 0.2, RW + 0.2, z + 0.1], [x + 0.14, 0.95, z + 0.1], 0.03, M.jaune, false); });
      });
      box(g, 0.5, 0.42, 0.5, 0.2, 0.72, 0, M.chassis);                         // boîte de transfert
      rod(g, [0.4, 0.7, 0.1], [AX_AV - 0.2, RW, 0.18], 0.045, M.acier, false);
      rod(g, [0.0, 0.7, 0], [AX_AR + 0.2, RW, 0], 0.05, M.acier, false);
      box(g, 1.0, 0.62, 0.72, 2.45, 0.92, 0, M.chassis);                        // moteur (sous cabine)
      box(g, 0.75, 0.2, 0.6, 2.9, 0.56, 0, M.chassis);                          // carter / protection
      // côté droit : réservoir de gazole 150 L (alu, bouchon jaune) + réservoir hydraulique de secours des dévidoirs (5 L)
      cyl(g, 0.27, 0.27, 0.95, -0.15, 0.74, 0.90, M.alu, 'x', 20);
      [-0.45, 0.15].forEach(function (x) { box(g, 0.04, 0.6, 0.6, x, 0.76, 0.90, M.chassis); });
      cyl(g, 0.055, 0.055, 0.06, 0.12, 1.02, 1.0, M.jaune, 'y', 12).name = 'CCRM_BOUCHON_GAZOLE';
      box(g, 0.2, 0.26, 0.16, -0.86, 0.9, 1.0, M.acier, 'CCRM_HYDRAULIQUE_SECOURS');
      // côté gauche : batteries (coffre) et deux bouteilles d'air (purges), prise OTAN
      box(g, 0.78, 0.36, 0.5, -0.1, 0.9, -0.92, M.plastique, 'CCRM_BATTERIES');
      cyl(g, 0.12, 0.12, 0.72, -0.1, 0.58, -0.80, M.chassis, 'x', 12); cyl(g, 0.12, 0.12, 0.72, -0.1, 0.58, -1.04, M.chassis, 'x', 12);
      cyl(g, 0.05, 0.05, 0.05, 0.42, 0.82, -1.17, M.acier, 'z', 12).name = 'CCRM_PRISE_OTAN';
      box(g, 0.08, 0.1, 0.06, 0.98, 0.5, -1.0, M.rougeVif, 'CCRM_COUPURE_AIR_SERVITUDES');
      box(g, 0.34, 0.2, 0.3, CAB_X1 + 0.3, 0.84, 0, M.plastique, 'CCRM_TREUIL');
      cyl(g, 0.085, 0.085, 0.26, CAB_X1 + 0.3, 0.84, 0, M.acier, 'z', 14);
      cyl(g, 0.09, 0.09, 1.3, -0.6, 0.62, 0.35, M.acier, 'x', 12);             // échappement
      fusion(g);
    })();

    /* ---------- roues (simples à l'arrière, comme sur les photos) ---------- */
    function roue(x, side, front) {
      var steer = new T.Group(); steer.position.set(x, RW, side * ZW); caisse.add(steer);
      var roll = new T.Group(); steer.add(roll); roll.name = 'CCRM_ROUE_' + (front ? 'AV' : 'AR') + (side > 0 ? 'D' : 'G');
      var W = 0.36, h = W / 2, prof = [[0.30, -h + 0.03], [0.44, -h], [0.53, -h + 0.02], [0.565, -h + 0.07], [0.572, 0], [0.565, h - 0.07], [0.53, h - 0.02], [0.44, h], [0.30, h - 0.03]];
      var pneu = reg(new T.Mesh(new T.LatheGeometry(prof.map(function (p) { return new T.Vector2(p[0], p[1]); }), segs), M.caoutchouc)); pneu.rotation.x = PI / 2; roll.add(pneu);
      // crampons : deux rangées décalées (profil tout-terrain)
      var n = 22, lug = new T.BoxGeometry(0.11, 0.03, 0.15);
      if (T.InstancedMesh) {
        var im = new T.InstancedMesh(lug, M.caoutchouc, n * 2), o = new T.Object3D();
        for (var i = 0; i < n * 2; i++) {
          var row = i < n ? -1 : 1, a = ((i % n) + (row > 0 ? 0.5 : 0)) / n * PI * 2;
          o.position.set(Math.cos(a) * 0.576, Math.sin(a) * 0.576, row * 0.092);
          o.rotation.set(0, 0, a + PI / 2 + row * 0.0); o.rotation.z = a - PI / 2; o.rotateY(row * 0.35); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
        }
        im.castShadow = true; roll.add(im);
      }
      var out = side;   // côté extérieur
      cyl(roll, 0.305, 0.305, 0.30, 0, 0, 0, M.jante, 'z', segs);
      var voile = cyl(roll, 0.29, 0.2, 0.05, 0, 0, out * 0.085, M.jante, 'z', segs); if (out < 0) voile.rotation.x = -PI / 2;
      var rebord = reg(new T.Mesh(new T.TorusGeometry(0.30, 0.018, 8, segs), M.jante)); rebord.position.z = out * 0.155; roll.add(rebord);
      cyl(roll, 0.135, 0.15, front ? 0.20 : 0.13, 0, 0, out * (front ? 0.17 : 0.13), M.chassis, 'z', 18);   // moyeu (réducteur)
      cyl(roll, 0.07, 0.085, 0.05, 0, 0, out * (front ? 0.29 : 0.21), M.acier, 'z', 12);
      for (var k = 0; k < 10; k++) { var b = k / 10 * PI * 2; cyl(roll, 0.016, 0.016, 0.04, Math.cos(b) * 0.215, Math.sin(b) * 0.215, out * 0.125, M.acier, 'z', 6); }
      for (var j = 0; j < 8; j++) { var c = (j + 0.5) / 8 * PI * 2; var t = cyl(roll, 0.026, 0.026, 0.012, Math.cos(c) * 0.255, Math.sin(c) * 0.255, out * 0.108, M.chassis, 'z', 10); t.castShadow = false; }
      fusion(roll);
      wheels.push({ steer: steer, roll: roll, front: front, side: side });
    }
    roue(AX_AV, -1, true); roue(AX_AV, 1, true); roue(AX_AR, -1, false); roue(AX_AR, 1, false);

    /* ---------- cabine double ---------- */
    var cab = new T.Group(); cab.name = 'CCRM_CABINE'; caisse.add(cab);
    (function () {
      box(cab, CAB_X1 - CAB_X0, 0.08, CW * 2 - 0.1, (CAB_X0 + CAB_X1) / 2, 1.28, 0, M.interieur);          // plancher
      box(cab, 0.06, TOIT - 1.0, CW * 2, CAB_X0 + 0.03, (TOIT + 1.0) / 2, 0, M.rouge);                     // paroi arrière
      // toit arrondi
      var toit = extr(rrect(CW * 2, 0.16, 0.07), 2.52, M.rouge); toit.rotation.y = PI / 2; toit.position.set(CAB_X0, TOIT, 0); cab.add(toit);
      // pare-soleil / casquette blanche (marquage carrossier non reproduit)
      var vis = extr(rrect(CW * 2 - 0.06, 0.24, 0.06), 0.24, M.blanc); vis.rotation.y = PI / 2; vis.position.set(2.92, TOIT - 0.03, 0); cab.add(vis);
      // face avant : bandeau bas rouge, tablier à chevrons, calandre
      box(cab, 0.08, 0.52, CW * 2, CAB_X1 - 0.01, 1.70, 0, M.rouge);
      plaqueTex(cab, CW * 2 - 0.22, 0.44, CAB_X1 + 0.033, 1.70, 0, PI / 2, texMat(tChevAvant, 0xd3121b, 0.45), 'CCRM_CHEVRONS_AVANT');
      plaqueTex(cab, 0.50, 0.11, CAB_X1 + 0.037, 1.74, 0.52, PI / 2, texMat(tPlaque, 0xf2f2ee, 0.5), 'CCRM_PLAQUE_AV');
      box(cab, 0.08, 0.47, CW * 2, CAB_X1 - 0.01, 1.21, 0, M.rouge);
      box(cab, 0.05, 0.40, 1.34, CAB_X1 + 0.03, 1.22, 0, M.noir);                                           // calandre
      for (var i = 0; i < 5; i++) box(cab, 0.03, 0.022, 1.26, CAB_X1 + 0.06, 1.07 + i * 0.075, 0, M.plastique);
      [-1, 1].forEach(function (s) {
        // coins avant arrondis + montants A inclinés
        cyl(cab, 0.06, 0.06, 0.98, CAB_X1 - 0.03, 1.47, s * (CW - 0.06), M.rouge, 'y', 12);
        rod(cab, [CAB_X1 - 0.03, 1.96, s * (CW - 0.05)], [3.02, TOIT - 0.02, s * (CW - 0.05)], 0.055, M.rouge);
        box(cab, 0.07, 0.9, 0.06, 1.875, 2.38, s * (CW - 0.03), M.noir);                                    // montant B
        box(cab, 0.10, TOIT - 1.0, 0.06, CAB_X0 + 0.07, (TOIT + 1.0) / 2, s * (CW - 0.03), M.rouge);        // montant C
        box(cab, 2.5, 0.07, 0.06, 1.77, TOIT - 0.04, s * (CW - 0.03), M.rouge);                             // longeron de pavillon
        // aile / passage de roue avant (plastique noir) avec découpe en arc
        var a = new T.Shape(); a.moveTo(1.20, 0.98); a.lineTo(1.20, 1.40); a.lineTo(CAB_X1, 1.40); a.lineTo(CAB_X1, 0.98); a.lineTo(AX_AV + 0.74, 0.98);
        a.absarc(AX_AV, 0.60, 0.74, Math.asin(0.38 / 0.74), PI - Math.asin(0.38 / 0.74), false); a.lineTo(1.20, 0.98);
        var aile = extr(a, 0.07, M.rouge); aile.position.z = s > 0 ? CW - 0.07 : -CW; cab.add(aile);
        var arc = reg(new T.Mesh(new T.CylinderGeometry(0.78, 0.78, 0.42, 22, 1, true, PI / 2 + 0.25, PI - 0.5), M.plastique)); arc.material.side = T.DoubleSide; arc.rotation.x = PI / 2; arc.rotation.y = 0; arc.position.set(AX_AV, 0.60, s * (CW - 0.2)); arc.rotation.z = 0; cab.add(arc);
        box(cab, 0.72, 0.17, 0.06, 0.86, 1.07, s * (CW - 0.03), M.rouge);                                    // bas de caisse sous porte AR
        // marchepieds : un devant la roue (porte avant), deux derrière (porte arrière)
        box(cab, 0.30, 0.04, 0.30, 3.05, 0.60, s * (CW - 0.12), M.acier); rod(cab, [3.05, 0.60, s * (CW - 0.2)], [3.05, 0.95, s * (CW - 0.2)], 0.018, M.chassis, false);
        box(cab, 0.52, 0.04, 0.26, 0.98, 0.62, s * (CW - 0.06), M.acier); box(cab, 0.52, 0.04, 0.22, 0.98, 0.93, s * (CW - 0.10), M.acier);
        box(cab, 0.03, 0.36, 0.20, 0.71, 0.78, s * (CW - 0.1), M.chassis); box(cab, 0.03, 0.36, 0.20, 1.25, 0.78, s * (CW - 0.1), M.chassis);
        // rétroviseurs
        var rz = s * 1.47;
        tube(cab, [[3.12, 2.72, s * (CW - 0.02)], [3.38, 2.72, s * 1.36], [3.38, 2.06, s * 1.36], [3.14, 1.98, s * (CW - 0.02)]], 0.018, M.noir);
        var r1 = extr(rrect(0.24, 0.46, 0.05), 0.09, M.noir); r1.rotation.y = PI / 2 - s * 0.25; r1.position.set(3.36, 2.50, rz); cab.add(r1);
        var r2 = extr(rrect(0.24, 0.22, 0.05), 0.09, M.noir); r2.rotation.y = PI / 2 - s * 0.25; r2.position.set(3.36, 2.14, rz); cab.add(r2);
        // feux de gabarit orange
        box(cab, 0.10, 0.04, 0.02, 1.62, 1.44, s * (CW + 0.005), M.gabarit); box(cab, 0.05, 0.05, 0.02, 2.62, 1.5, s * (CW + 0.005), M.clignotant);
        // filet jaune de ceinture de caisse
        box(cab, 0.06, 0.03, 0.012, CAB_X0 + 0.08, 1.56, s * (CW + 0.004), M.bandeJaune);
      });
      // pare-brise incliné, joint, essuie-glaces
      var ang = Math.atan2(CAB_X1 - 3.03, TOIT - 0.06 - 1.96), hpb = Math.hypot(CAB_X1 - 3.03, TOIT - 0.06 - 1.96);
      var pb = new T.Mesh(new T.PlaneGeometry(CW * 2 - 0.2, hpb), M.vitre); pb.rotation.order = 'YXZ'; pb.rotation.y = PI / 2; pb.rotation.x = -ang; pb.position.set((CAB_X1 + 3.03) / 2 + 0.01, (1.96 + TOIT - 0.06) / 2, 0); pb.name = 'CCRM_PARE_BRISE'; pb.renderOrder = 2; cab.add(pb);
      box(cab, 0.07, 0.07, CW * 2 - 0.1, CAB_X1 - 0.02, 1.965, 0, M.noir);
      [-0.55, 0.15].forEach(function (z) { rod(cab, [CAB_X1 + 0.03, 2.0, z], [CAB_X1 - 0.02, 2.32, z + 0.52], 0.012, M.noir, false); });
      // poste de conduite : module détaillé ccrm-cockpit-v942.js s'il est chargé, sinon planche de bord simplifiée
      var CK = opt.poste === false ? null : (opt.cockpit || root.RLH_CCRM_COCKPIT_V942);
      if (CK) { poste = CK.build({ THREE: T, cab: cab, M: M, box: box, cyl: cyl, rod: rod, tube: tube, fusion: fusion, CW: CW, host: hote, onCommande: opt.onCommande }); parts.volant = poste.volant; }
      else {
        box(cab, 0.42, 0.32, CW * 2 - 0.16, 2.95, 1.80, 0, M.interieur);
        var col = new T.Group(); col.position.set(2.66, 2.02, -0.62); col.rotation.z = -0.55; cab.add(col);
        var vol = reg(new T.Mesh(new T.TorusGeometry(0.21, 0.02, 8, 24), M.noir)); vol.rotation.y = PI / 2; col.add(vol);
        box(col, 0.02, 0.38, 0.04, 0, 0, 0, M.noir); box(col, 0.02, 0.04, 0.38, 0, 0, 0, M.noir); cyl(col, 0.03, 0.03, 0.35, 0.17, 0, 0, M.noir, 'x', 8);
        parts.volant = vol; box(cab, 0.9, 0.42, 0.55, 2.3, 1.5, 0, M.interieur);
      }
      function siege(x, z, w) { box(cab, 0.48, 0.14, w, x, 1.66, z, M.siege); box(cab, 0.12, 0.72, w, x - 0.26, 2.06, z, M.siege); box(cab, 0.08, 0.18, w * 0.55, x - 0.27, 2.5, z, M.siege); box(cab, 0.3, 0.3, w * 0.7, x, 1.45, z, M.interieur); }
      siege(2.25, -0.62, 0.5); siege(2.25, 0.62, 0.5);
      [-0.78, -0.26, 0.26, 0.78].forEach(function (z) { siege(1.02, z, 0.44); });                           // 4 places ARI à l'arrière
      box(cab, 0.07, 0.17, 0.02, 1.875, 1.78, -(CW + 0.006), M.noir); cyl(cab, 0.035, 0.035, 0.03, 1.875, 1.77, -(CW + 0.02), M.bleuCap, 'z', 12).name = 'CCRM_PRISE_DE_CHARGE_230V';
                                                   // capot moteur intérieur
      fusion(cab);
    })();

    /* portes de cabine (charnières à l'avant) */
    function porteCab(key, hingeX, len, yBas, side, avant, label) {
      var g = new T.Group(); g.name = 'CCRM_' + key; g.position.set(hingeX, 0, side * CW); cab.add(g);
      var yH = TOIT - 0.08, yV = 1.96, out;
      if (avant) out = [[0, yBas], [0, yV], [-0.20, yH], [-len, yH], [-len, yBas]];
      else out = [[0, yBas], [0, yH], [-len, yH], [-len, yBas]];
      var s = poly(out), h = new T.Path();
      if (avant) { h.moveTo(-0.10, yV + 0.02); h.lineTo(-0.27, yH - 0.09); h.lineTo(-len + 0.09, yH - 0.09); h.lineTo(-len + 0.09, yV + 0.02); }
      else { h.moveTo(-0.09, yV + 0.02); h.lineTo(-0.09, yH - 0.09); h.lineTo(-len + 0.12, yH - 0.09); h.lineTo(-len + 0.12, yV + 0.02); }
      h.closePath(); s.holes.push(h);
      var p = extr(s, 0.05, M.rouge); p.position.z = side > 0 ? -0.05 : 0; g.add(p);
      var vs = new T.Shape(); var pts = h.getPoints(); vs.moveTo(pts[0].x, pts[0].y); for (var i = 1; i < pts.length; i++) vs.lineTo(pts[i].x, pts[i].y);
      var v = new T.Mesh(new T.ShapeGeometry(vs), M.vitre); v.material.side = T.DoubleSide; v.position.z = side * -0.025; v.renderOrder = 2; g.add(v);
      // encadrement noir de vitre, poignée, filet jaune, garniture intérieure
      box(g, len - 0.2, 0.035, 0.012, -len / 2 - 0.02, yV, side * 0.004, M.noir);
      box(g, 0.16, 0.05, 0.03, -len + 0.16, 1.72, side * 0.012, M.noir);
      box(g, len, 0.03, 0.012, -len / 2, 1.56, side * 0.005, M.bandeJaune);
      box(g, len - 0.1, yV - yBas - 0.08, 0.02, -len / 2, (yV + yBas) / 2, side * -0.055, M.interieur);
      if (avant) box(g, 0.012, yV - yBas, 0.012, -0.012, (yV + yBas) / 2, side * 0.004, M.bandeJaune);
      if (key === 'porteAVD') box(g, 0.09, 0.05, 0.02, -0.5, 1.62, -0.07, M.noir, 'CCRM_HORAMETRE_MOTEUR');
      fusion(g); ouvrant(key, g, 'y', side * 1.15, label);
    }
    porteCab('porteAVG', 3.19, 1.29, 1.40, -1, true, 'Porte conducteur');
    porteCab('porteAVD', 3.19, 1.29, 1.40, 1, true, 'Porte chef d\'agrès');
    porteCab('porteARG', 1.84, 1.24, 1.16, -1, false, 'Porte arrière gauche');
    porteCab('porteARD', 1.84, 1.24, 1.16, 1, false, 'Porte arrière droite');

    /* ---------- pare-chocs, phares, pare-buffle, boîtier à chevrons ---------- */
    (function () {
      var g = new T.Group(); g.name = 'CCRM_AVANT'; caisse.add(g);
      var pc = extr(rrect(2.40, 0.30, 0.09), 0.26, M.blanc); pc.rotation.y = PI / 2; pc.position.set(CAB_X1 - 0.02, 0.86, 0); g.add(pc);
      box(g, 0.2, 0.12, 1.3, CAB_X1 + 0.08, 0.66, 0, M.plastique);
      [-1, 1].forEach(function (s) {
        var ph = extr(rrect(0.40, 0.19, 0.05), 0.04, M.phare); ph.rotation.y = PI / 2; ph.position.set(CAB_X1 + 0.225, 0.89, s * 0.86); ph.castShadow = false; g.add(ph);
        box(g, 0.03, 0.15, 0.10, CAB_X1 + 0.24, 0.89, s * 1.09, M.clignotant);
        for (var i = 0; i < 4; i++) rod(g, [CAB_X1 + 0.29, 0.815 + i * 0.05, s * 0.64], [CAB_X1 + 0.29, 0.815 + i * 0.05, s * 1.12], 0.008, M.blanc, false);  // grille de phare
        rod(g, [CAB_X1 + 0.29, 0.80, s * 0.64], [CAB_X1 + 0.29, 0.98, s * 0.64], 0.008, M.blanc, false); rod(g, [CAB_X1 + 0.29, 0.80, s * 1.12], [CAB_X1 + 0.29, 0.98, s * 1.12], 0.008, M.blanc, false);
        box(g, 0.05, 0.035, 0.12, CAB_X1 + 0.07, 1.47, s * 0.52, M.bleuG === M.bleuD ? M.bleuG : (s < 0 ? M.bleuG : M.bleuD));   // feux bleus de calandre
      });
      // pare-buffle basculant vers l'avant (accès aux niveaux et au treuil), couvercle du treuil à chevrons
      var PB = pivot(g, CAB_X1 + 0.33, 0.60, 0, 'CCRM_pareBuffle'), pb = PB.int;
      [-1, 1].forEach(function (s) { box(pb, 0.05, 0.42, 0.16, CAB_X1 + 0.33, 0.80, s * 0.60, M.blanc); rod(pb, [CAB_X1 + 0.38, 0.64, s * 0.60], [CAB_X1 + 0.40, 1.62, s * 0.60], 0.032, M.blanc); });
      var X = CAB_X1 + 0.40;
      [1.14, 1.30, 1.46].forEach(function (y) { rod(pb, [X, y, -0.60], [X, y, 0.60], 0.022, M.blanc, false); });
      tube(pb, [[X - 0.2, 1.02, -1.08], [X, 1.02, -0.98], [X, 1.02, 0.98], [X - 0.2, 1.02, 1.08]], 0.032, M.blanc);
      tube(pb, [[X - 0.2, 1.62, -1.08], [X, 1.62, -0.98], [X, 1.62, 0.98], [X - 0.2, 1.62, 1.08]], 0.032, M.blanc);
      [-1, 1].forEach(function (s) { rod(pb, [X - 0.2, 1.02, s * 1.08], [X - 0.2, 1.62, s * 1.08], 0.032, M.blanc); rod(pb, [X - 0.2, 1.3, s * 1.08], [CAB_X1 + 0.02, 1.3, s * 1.06], 0.025, M.blanc, false); });
      // boîtier (treuil) à chevrons rouge / jaune
      var bx = box(pb, 0.34, 0.42, 0.98, CAB_X1 + 0.45, 0.72, 0, M.blanc, 'CCRM_BOITIER_TREUIL');
      plaqueTex(pb, 0.96, 0.40, CAB_X1 + 0.622, 0.72, 0, PI / 2, texMat(tChevBoite, 0xd3121b, 0.45));
      [-1, 1].forEach(function (s) { plaqueTex(pb, 0.30, 0.38, CAB_X1 + 0.45, 0.72, s * 0.492, s > 0 ? 0 : PI, M.gabarit); });
      parts.boitierTreuil = bx; fusion(pb);
      ouvrant('pareBuffle', PB, 'z', -1.45, 'Pare-buffle basculant');
      // arceau de protection du pare-brise et du pavillon (tubes blancs)
      var yb = 2.02, yt = 3.04, xb = CAB_X1 + 0.20, xt = 3.12, z = CW - 0.02;
      tube(g, [[xb, yb, -z], [xb, yb, z], [xt, yt, z], [xt, yt, -z], [xb, yb, -z]], 0.03, M.blanc);
      [-1, 1].forEach(function (s) {
        tube(g, [[xt, yt, s * z], [0.78, yt + 0.02, s * (z - 0.04)], [0.60, TOIT + 0.06, s * (z - 0.04)]], 0.03, M.blanc);
        rod(g, [xb, yb, s * z], [CAB_X1 - 0.02, 1.9, s * (z - 0.02)], 0.024, M.blanc, false);
        rod(g, [2.0, yt + 0.01, s * (z - 0.02)], [2.0, TOIT + 0.06, s * (z - 0.08)], 0.02, M.blanc, false);
        rod(g, [xt - 0.02, yt, s * z], [2.95, TOIT + 0.06, s * (z - 0.08)], 0.02, M.blanc, false);
      });
      rod(g, [0.78, yt + 0.02, -(z - 0.04)], [0.78, yt + 0.02, z - 0.04], 0.026, M.blanc, false);
      // gyrophares bleus sur mâts courts, à l'arrière du pavillon
      [[-0.78, M.bleuG, 'gyroG'], [0.78, M.bleuD, 'gyroD']].forEach(function (b) {
        cyl(g, 0.07, 0.085, 0.05, 0.72, TOIT + 0.105, b[0], M.noir, 'y', 14);
        var d = new T.Mesh(new T.CylinderGeometry(0.062, 0.075, 0.13, 16), b[1]); d.position.set(0.72, TOIT + 0.195, b[0]); g.add(d);
        var c = new T.Mesh(new T.SphereGeometry(0.062, 14, 8, 0, PI * 2, 0, PI / 2), b[1]); c.position.set(0.72, TOIT + 0.26, b[0]); g.add(c); d.name = 'CCRM_' + b[2]; parts[b[2]] = d;
      });
      fusion(g);
    })();

    /* ---------- cellule : citerne, coffres jaunes, bandeau, plateforme ---------- */
    var cel = new T.Group(); cel.name = 'CCRM_CELLULE'; caisse.add(cel);
    var CX0 = -3.42, CX1 = 0.20, CLEN = CX1 - CX0, CMID = (CX0 + CX1) / 2;
    var Y_J0 = 1.42, Y_J1 = 2.60, Y_B1 = 2.86, YG = Y_B1 + 0.19;
    var POSTE = 0.40;                      // tranche arrière : commandes (droite) / aspiraux (gauche)
    var BAIE_Z = 0.80, BAIE_X = CX0 + 0.78; // baie arrière ouverte du bloc hydraulique
    var hydraulique = {};
    (function () {
      box(cel, CLEN - 0.06, 0.06, BW * 2 - 0.08, CMID, 1.40, 0, M.interieur);
      box(cel, CLEN - 0.06, 0.05, BW * 2 - 0.04, CMID, Y_B1 + 0.005, 0, M.gaufre, 'CCRM_PLATEFORME');
      box(cel, 0.06, Y_B1 - 1.0, BW * 2, CX1 - 0.03, (Y_B1 + 1.0) / 2, 0, M.rouge);
      box(cel, CX1 - 0.15 - (CX0 + 0.85), 1.12, 1.36, (CX1 - 0.15 + CX0 + 0.85) / 2, 1.99, 0, M.acier, 'CCRM_CITERNE_EAU_2940L');
      [-1, 1].forEach(function (s) {
        var zs = s * BW, xJ = (CX0 + POSTE + CX1) / 2, lJ = CX1 - CX0 - POSTE;
        box(cel, lJ, 0.07, 0.06, xJ, Y_J1 - 0.035, zs - s * 0.03, M.rouge);
        box(cel, lJ, 0.06, 0.06, xJ, Y_J0 + 0.03, zs - s * 0.03, M.rouge);
        [CX0 + POSTE + 0.04, xJ, CX1 - 0.04].forEach(function (x) { box(cel, 0.08, Y_J1 - Y_J0, 0.06, x, (Y_J0 + Y_J1) / 2, zs - s * 0.03, M.rouge); });
        box(cel, CLEN, 0.035, 0.014, CMID, Y_J0 + 0.03, zs + s * 0.004, M.bandeJaune);
        box(cel, CLEN, 0.03, 0.014, CMID, Y_J1 - 0.02, zs + s * 0.004, M.bandeJaune);
        // jupe basse rouge avec passage de roue
        var a = new T.Shape(); a.moveTo(CX0, 0.74); a.lineTo(CX0, Y_J0); a.lineTo(CX1, Y_J0); a.lineTo(CX1, 1.02); a.lineTo(-0.72, 1.02); a.lineTo(-0.72, 0.74); a.lineTo(AX_AR + 0.74, 0.74);
        a.absarc(AX_AR, 0.60, 0.755, Math.asin(0.14 / 0.755), PI - Math.asin(0.14 / 0.755), false); a.lineTo(CX0, 0.74);
        var j = extr(a, 0.05, M.rouge); j.position.z = s > 0 ? BW - 0.05 : -BW; cel.add(j);
        var arc = new T.Mesh(new T.CylinderGeometry(0.77, 0.77, 0.46, 22, 1, true, PI / 2 + 0.15, PI - 0.3), M.plastique); arc.material.side = T.DoubleSide; arc.rotation.x = PI / 2; arc.position.set(AX_AR, 0.60, s * (BW - 0.23)); cel.add(arc);
        [[-0.42, 1.2], [-2.98, 1.08], [-0.42, 0.9], [-2.98, 0.9]].forEach(function (c) { cyl(cel, 0.03, 0.03, 0.02, c[0], c[1], zs + s * 0.008, M.alu, 'z', 10); });
        box(cel, 0.5, 0.012, 0.012, -0.42, 1.31, zs + s * 0.004, M.noir); box(cel, 0.66, 0.012, 0.012, -3.0, 1.31, zs + s * 0.004, M.noir);
        box(cel, 0.10, 0.04, 0.02, -2.2, 1.34, zs + s * 0.006, M.gabarit); box(cel, 0.10, 0.04, 0.02, -1.25, 1.34, zs + s * 0.006, M.gabarit);
        // bandeau blanc à marquage
        box(cel, CLEN, Y_B1 - Y_J1, 0.05, CMID, (Y_J1 + Y_B1) / 2, zs - s * 0.03, M.blanc);
        plaqueTex(cel, CLEN - 0.08, Y_B1 - Y_J1 - 0.03, CMID, (Y_J1 + Y_B1) / 2, zs + s * 0.002, s > 0 ? 0 : PI, texMat(bandeau(s < 0), 0xf4f4f1, 0.5), 'CCRM_BANDEAU_' + (s < 0 ? 'G' : 'D'));
        // garde-corps de plateforme
        tube(cel, [[CX1 - 0.02, Y_B1, zs - s * 0.06], [CX1 - 0.02, YG, zs - s * 0.06], [CX0 + 0.05, YG, zs - s * 0.06], [CX0 + 0.05, Y_B1, zs - s * 0.06]], 0.02, M.blanc);
        for (var x = CX1 - 0.55; x > CX0 + 0.3; x -= 0.58) rod(cel, [x, Y_B1, zs - s * 0.06], [x, YG, zs - s * 0.06], 0.014, M.blanc, false);
        // intérieur des coffres (inventaire non détaillé par la fiche : agencement simplifié)
        box(cel, lJ - 0.2, 0.03, 0.42, xJ, 1.98, s * (BW - 0.27), M.alu).castShadow = false;
        for (var i = 0; i < 4; i++) { var t = cyl(cel, 0.20, 0.20, 0.09, CX1 - 0.45 - (i % 2) * 0.48, 1.66 + (i > 1 ? 0.56 : 0), s * (BW - 0.16), i > 1 ? M.jaune : M.blanc, 'z', 16); t.castShadow = false; }
        box(cel, 0.5, 0.36, 0.34, xJ - 0.5, 1.62, s * (BW - 0.24), M.rouge).castShadow = false;
        box(cel, 0.44, 0.3, 0.34, xJ - 1.0, 2.16, s * (BW - 0.24), M.plastique).castShadow = false;
      });
      // tranche arrière gauche : rangement des aspiraux (quatre logements)
      box(cel, POSTE, Y_J1 - Y_J0, 0.05, CX0 + POSTE / 2, (Y_J0 + Y_J1) / 2, -BW + 0.025, M.rouge);
      box(cel, 0.24, 1.0, 0.02, CX0 + POSTE / 2, 2.02, -BW - 0.008, M.noir, 'CCRM_RANGEMENT_ASPIRAUX');
      for (var k = 0; k < 4; k++) cyl(cel, 0.085, 0.085, 0.02, CX0 + POSTE / 2, 1.66 + k * 0.24, -BW - 0.012, M.plastique, 'z', 16);
      box(cel, 0.3, 0.2, 0.02, CX0 + 0.3, 1.2, -BW - 0.008, M.rouge, 'CCRM_COFFRE_REMPLISSAGE_EMULSEUR');
      // tranche arrière droite : fond du coffre des commandes dévidoirs et mât
      box(cel, POSTE, Y_J1 - Y_J0, 0.03, CX0 + POSTE / 2, (Y_J0 + Y_J1) / 2, BW - 0.14, M.acier);
      box(cel, 0.11, 0.3, 0.07, CX0 + 0.25, 1.92, BW - 0.09, M.noir, 'CCRM_COMMANDE_DEVIDOIRS');
      [[2.01, M.noir], [1.92, M.rougeVif], [1.83, M.blanc]].forEach(function (b) { cyl(cel, 0.022, 0.022, 0.02, CX0 + 0.25, b[0], BW - 0.05, b[1], 'z', 10); });
      box(cel, 0.16, 0.16, 0.03, CX0 + 0.14, 2.3, BW - 0.11, M.blanc, 'CCRM_COMMANDE_MAT'); cyl(cel, 0.03, 0.03, 0.06, CX0 + 0.14, 2.3, BW - 0.08, M.noir, 'z', 10);
      var cone = cyl(cel, 0.02, 0.09, 0.34, CX0 + 0.14, 1.66, BW - 0.07, M.clignotant.clone(), 'y', 12); cone.material.emissiveIntensity = 0; cone.name = 'CCRM_CONE';
      // plateforme : caisson gaufré (lot de bord), trou d'homme eau (interdit au remplissage), émulseur 140 L, sondes
      box(cel, 0.9, 0.24, BW * 2 - 0.7, CX1 - 0.52, Y_B1 + 0.14, 0, M.gaufre);
      cyl(cel, 0.27, 0.27, 0.07, -1.55, Y_B1 + 0.06, 0.05, M.rougeVif, 'y', 24).name = 'CCRM_TROU_D_HOMME_EAU';
      box(cel, 0.5, 0.03, 0.05, -1.55, Y_B1 + 0.11, 0.05, M.alu);
      cyl(cel, 0.11, 0.11, 0.07, -1.02, Y_B1 + 0.06, -0.42, M.rougeVif, 'y', 16).name = 'CCRM_CITERNE_EMULSEUR_140L';
      cyl(cel, 0.05, 0.05, 0.08, -1.25, Y_B1 + 0.06, 0.45, M.rougeVif, 'y', 12); cyl(cel, 0.05, 0.05, 0.08, -0.98, Y_B1 + 0.06, -0.12, M.rougeVif, 'y', 12);
      tube(cel, [[CX1 + 0.06, Y_B1 - 0.02, 1.06], [CX1 + 0.06, Y_B1 + 0.36, 1.06], [CX1 + 0.06, Y_B1 + 0.36, 0.84], [CX1 + 0.06, Y_B1 - 0.02, 0.84]], 0.02, M.jaune);
      // échelle d'accès au toit, entre cabine et cellule, côté droit
      var ex = CX1 + 0.13;
      rod(cel, [ex, 1.05, 1.10], [ex, Y_B1, 1.10], 0.016, M.blanc, false); rod(cel, [ex, 1.05, 0.80], [ex, Y_B1, 0.80], 0.016, M.blanc, false);
      for (var y = 1.2; y < Y_B1 - 0.05; y += 0.27) box(cel, 0.05, 0.02, 0.30, ex, y, 0.95, M.alu);
      box(cel, 0.2, 1.5, 0.26, CX1 + 0.14, 2.1, -0.95, M.noir); cyl(cel, 0.06, 0.06, 0.25, CX1 + 0.14, 2.96, -0.95, M.acier, 'y', 12);
      // roue de secours à plat sur la plateforme, arrière droit, avec potence à treuil manuel
      var rs = new T.Group(); rs.name = 'CCRM_ROUE_DE_SECOURS'; rs.position.set(CX0 + 0.82, Y_B1 + 0.22, 0.60); cel.add(rs);
      var pr = [[0.30, -0.15], [0.44, -0.18], [0.53, -0.16], [0.572, -0.10], [0.572, 0.10], [0.53, 0.16], [0.44, 0.18], [0.30, 0.15]];
      rs.add(reg(new T.Mesh(new T.LatheGeometry(pr.map(function (q) { return new T.Vector2(q[0], q[1]); }), 24), M.caoutchouc)));
      cyl(rs, 0.305, 0.305, 0.26, 0, 0, 0, M.jante, 'y', 24); cyl(rs, 0.14, 0.14, 0.3, 0, 0, 0, M.chassis, 'y', 14);
      var pot = new T.Group(); pot.name = 'CCRM_POTENCE_ROUE'; cel.add(pot);
      rod(pot, [CX0 + 0.14, Y_B1, 1.12], [CX0 + 0.14, Y_B1 + 0.40, 1.12], 0.035, M.alu); rod(pot, [CX0 + 0.14, Y_B1 + 0.40, 1.12], [CX0 + 0.70, Y_B1 + 0.42, 0.72], 0.028, M.alu);
      box(pot, 0.12, 0.1, 0.1, CX0 + 0.14, Y_B1 + 0.2, 1.05, M.acier);
      // feu bleu arrière gauche
      cyl(cel, 0.05, 0.06, 0.1, CX0 + 0.5, Y_B1 + 0.07, -(BW - 0.10), M.bleuAR, 'y', 12).name = 'CCRM_FEU_BLEU_AR';

      /* --- face arrière : baie ouverte du compartiment hydraulique (repères de la fiche n°4) --- */
      var H = new T.Group(); H.name = 'CCRM_BLOC_HYDRAULIQUE'; cel.add(H);
      box(H, 0.04, Y_J1 - 0.95, BAIE_Z * 2, BAIE_X, (Y_J1 + 0.95) / 2, 0, M.interieur);
      box(H, 0.78, 0.05, BAIE_Z * 2, CX0 + 0.39, 0.97, 0, M.gaufre);
      box(cel, 0.08, Y_B1 - Y_J1, BW * 2, CX0 + 0.04, (Y_J1 + Y_B1) / 2, 0, M.rouge);
      box(cel, 0.10, 0.16, BW * 2 - 0.1, CX0 + 0.05, 0.86, 0, M.chassis);
      [-1, 1].forEach(function (s) {
        var zc = s * (BAIE_Z + BW) / 2, wz = BW - BAIE_Z;
        box(cel, 0.5, Y_J1 - 0.95, wz - (s > 0 ? 0.14 : 0), CX0 + 0.25, (Y_J1 + 0.95) / 2, zc - (s > 0 ? 0.07 : 0), M.rouge);
        var pm = texMat(tPoteau(s), 0xd3121b, 0.45); if (pm.map) { pm.map.wrapT = T.RepeatWrapping; }
        plaqueTex(cel, wz - 0.03, Y_J1 - 1.0, CX0 - 0.004, (Y_J1 + 1.0) / 2, s * (BAIE_Z + BW) / 2, -PI / 2, pm, 'CCRM_CHEVRONS_AR_' + (s < 0 ? 'G' : 'D'));
        box(cel, 0.03, 0.26, 0.10, CX0 - 0.012, 1.22, s * (BW - 0.10), M.feuRouge); box(cel, 0.03, 0.09, 0.10, CX0 - 0.012, 1.42, s * (BW - 0.10), M.clignotant);
        box(cel, 0.03, 0.06, 0.14, CX0 - 0.012, Y_J1 + 0.13, s * (BW - 0.16), s < 0 ? M.bleuG : M.bleuD);
        box(cel, 0.14, 0.09, 0.06, CX0 - 0.05, 0.84, s * 0.42, M.rouge);
      });
      plaqueTex(cel, 0.50, 0.11, CX0 - 0.012, 0.88, -0.78, -PI / 2, texMat(tPlaque, 0xf2f2ee, 0.5), 'CCRM_PLAQUE_AR');
      box(cel, 0.06, 0.07, 0.3, CX0 - 0.02, Y_J1 + 0.13, 0, M.led, 'CCRM_PROJECTEUR_ARRIERE');
      function organe(n, nom, m) { m.name = 'CCRM_HYD_' + n + '_' + nom; hydraulique[n] = m; m.userData.rlhCcrmV942Organe = n; return m; }
      // 11 : dévidoir tournant LDT DN 22, 40 m ; 14 : frein ; 15 : manivelle de secours
      var ldt = new T.Group(); ldt.position.set(CX0 + 0.42, 2.22, -0.10); H.add(ldt); organe(11, 'LDT_DN22_40M', ldt);
      cyl(ldt, 0.27, 0.27, 0.86, 0, 0, 0, M.rougeVif, 'z', 24); [-0.45, 0.45].forEach(function (z) { cyl(ldt, 0.33, 0.33, 0.025, 0, 0, z, M.rouge, 'z', 24); });
      for (var q = 0; q < 9; q++) { var an = reg(new T.Mesh(new T.TorusGeometry(0.275, 0.012, 6, 24), M.rouge)); an.position.z = -0.38 + q * 0.095; ldt.add(an); }
      organe(14, 'FREIN_DEVIDOIR', cyl(H, 0.03, 0.03, 0.08, CX0 + 0.42, 2.34, 0.42, M.noir, 'z', 10));
      organe(15, 'MANIVELLE_SECOURS', box(H, 0.04, 0.3, 0.04, CX0 + 0.12, 2.05, -(BAIE_Z - 0.06), M.acier));
      // 1 : collecteur de refoulement (1 × DN 110, 2 × DN 65, 1 × DN 45, bouchons bleus)
      var col = new T.Group(); H.add(col); organe(1, 'COLLECTEUR_REFOULEMENT', col);
      cyl(col, 0.075, 0.075, 0.95, CX0 + 0.42, 1.66, -0.18, M.alu, 'z', 16);
      [[-0.56, 0.085, 110], [-0.30, 0.058, 65], [-0.07, 0.058, 65], [0.14, 0.044, 45]].forEach(function (r) {
        cyl(col, r[1] * 0.8, r[1] * 0.8, 0.34, CX0 + 0.26, 1.60, r[0], M.alu, 'x', 14).rotation.y = 0.0;
        cyl(col, r[1] * 1.15, r[1] * 1.15, 0.06, CX0 + 0.09, 1.60, r[0], M.alu, 'x', 16);
        cyl(col, r[1], r[1], 0.05, CX0 + 0.04, 1.60, r[0], M.bleuCap, 'x', 16).name = 'CCRM_REFOULEMENT_DN' + r[2] + (r[0] === -0.07 ? '_B' : '');
        box(col, 0.03, 0.02, 0.16, CX0 + 0.3, 1.60 + r[1] + 0.06, r[0], M.jaune);
      });
      organe(2, 'VANNE_RETOUR_CITERNE', box(H, 0.05, 0.03, 0.16, CX0 + 0.5, 1.98, 0.28, M.rougeVif)); rod(H, [CX0 + 0.5, 1.7, 0.28], [CX0 + 0.5, 2.1, 0.28], 0.03, M.alu, false); rod(H, [CX0 + 0.5, 2.1, 0.28], [BAIE_X, 2.1, 0.28], 0.03, M.alu, false);
      organe(3, 'VANNE_LDT', box(H, 0.05, 0.03, 0.14, CX0 + 0.34, 1.86, 0.36, M.rougeVif));
      organe(4, 'VANNE_PROPORTIONNEUR', box(H, 0.05, 0.03, 0.14, CX0 + 0.3, 1.72, 0.40, M.jaune));
      // 5 / 6 : alimentation-aspiration extérieure DN 110 (10 bar maxi) et sa vanne
      var asp = new T.Group(); H.add(asp); organe(5, 'ASPIRATION_DN110', asp);
      cyl(asp, 0.11, 0.11, 0.42, CX0 + 0.3, 1.22, 0.02, M.alu, 'x', 18); cyl(asp, 0.14, 0.14, 0.07, CX0 + 0.07, 1.22, 0.02, M.alu, 'x', 18); cyl(asp, 0.115, 0.115, 0.05, CX0 + 0.02, 1.22, 0.02, M.acier, 'x', 18);
      organe(6, 'VANNE_ASPIRATION', box(H, 0.04, 0.03, 0.24, CX0 + 0.34, 1.38, 0.02, M.rougeVif));
      // 7 : proportionneur 225 L/min ; 8 : vanne 3 voies additif (émulseur / rinçage / arrêt)
      var prop = new T.Group(); H.add(prop); organe(7, 'PROPORTIONNEUR_225', prop);
      cyl(prop, 0.05, 0.05, 0.3, CX0 + 0.26, 1.34, 0.42, M.laiton, 'x', 14); cyl(prop, 0.06, 0.06, 0.04, CX0 + 0.14, 1.34, 0.42, M.noir, 'x', 14); cyl(prop, 0.045, 0.045, 0.05, CX0 + 0.06, 1.34, 0.42, M.jaune, 'x', 14);
      organe(8, 'VANNE_3_VOIES_ADDITIF', box(H, 0.04, 0.03, 0.14, CX0 + 0.3, 1.5, 0.52, M.rougeVif));
      organe(9, 'VIDANGE_CITERNE_EAU', cyl(H, 0.03, 0.03, 0.12, CX0 + 0.3, 1.06, -0.5, M.rougeVif, 'y', 10));
      organe(10, 'VIDANGE_CITERNE_EMULSEUR', cyl(H, 0.03, 0.03, 0.12, CX0 + 0.3, 1.06, 0.3, M.jaune, 'y', 10));
      // 12 : pupitre de commande et de contrôle ; 13 : alimentation citerne par l'extérieur (6 bar maxi)
      var pup = new T.Group(); cel.add(pup); organe(12, 'PUPITRE', pup);
      box(pup, 0.05, 0.56, 0.36, CX0 - 0.02, 2.0, (BAIE_Z + BW) / 2 - 0.02, M.noir); box(pup, 0.02, 0.24, 0.28, CX0 - 0.05, 2.08, (BAIE_Z + BW) / 2 - 0.02, M.ecran);
      for (var b = 0; b < 8; b++) cyl(pup, 0.012, 0.012, 0.015, CX0 - 0.05, 1.86, (BAIE_Z + BW) / 2 - 0.15 + b * 0.037, M.alu, 'x', 8);
      cyl(pup, 0.03, 0.03, 0.03, CX0 - 0.05, 1.78, (BAIE_Z + BW) / 2 + 0.1, M.rougeVif, 'x', 12).name = 'CCRM_ARRET_URGENCE';
      organe(13, 'ALIMENTATION_CITERNE', cyl(H, 0.05, 0.05, 0.14, CX0 + 0.06, 1.5, BAIE_Z - 0.1, M.alu, 'x', 14)); cyl(H, 0.052, 0.052, 0.04, CX0 - 0.02, 1.5, BAIE_Z - 0.1, M.bleuCap, 'x', 14);
      [H, ldt, col, asp, prop, pup, rs, pot].forEach(fusion);
      fusion(cel);
    })();

    /* portes de coffres jaunes : deux paires par côté ; coffre des commandes à l'arrière droit */
    (function () {
      var marge = 0.085, x1 = CX1, x0 = CX0 + POSTE, wPaire = (x1 - x0 - 0.08 * 3) / 2, wV = wPaire / 2 - 0.006, h = Y_J1 - Y_J0 - 0.13, yc = (Y_J0 + Y_J1) / 2;
      [-1, 1].forEach(function (s) {
        [0, 1].forEach(function (pi) {
          var xAv = x1 - marge - pi * (wPaire + 0.08), xAr = xAv - wPaire;
          [0, 1].forEach(function (li) {
            var avant = li === 0, g = new T.Group(), dir = avant ? -1 : 1;
            g.position.set(avant ? xAv : xAr, yc, s * BW); cel.add(g);
            box(g, wV, h, 0.035, dir * wV / 2, 0, -s * 0.012, M.jaune);
            box(g, wV - 0.06, h - 0.06, 0.012, dir * wV / 2, 0, s * 0.008, M.jaune);
            [-0.36, 0.36].forEach(function (y) { box(g, 0.035, 0.11, 0.022, dir * 0.03, y, s * 0.012, M.alu); });
            box(g, 0.07, 0.10, 0.02, dir * (wV - 0.07), avant ? 0.0 : -0.02, s * 0.014, M.alu);
            if (!avant) { rod(g, [wV - 0.02, -h / 2 + 0.05, s * 0.016], [wV - 0.02, h / 2 - 0.05, s * 0.016], 0.008, M.alu, false); }
            var num = pi * 2 + li + 1, key = 'coffre' + (s < 0 ? 'G' : 'D') + num;
            g.name = 'CCRM_' + key;
            fusion(g); g.children.forEach(function (m) { if (m.isMesh && !m.name && m.material === M.jaune) m.name = g.name + '_PANNEAU'; });
            ouvrant(key, g, 'y', (avant ? 1 : -1) * s * 1.62, 'Coffre ' + (s < 0 ? 'gauche' : 'droit') + ' ' + num);
          });
        });
      });
      var c = new T.Group(); c.name = 'CCRM_coffreCommandes'; c.position.set(CX0 + POSTE - 0.01, yc, BW); cel.add(c);
      box(c, POSTE - 0.03, h + 0.1, 0.03, -(POSTE - 0.03) / 2, 0, -0.012, M.rouge); box(c, 0.06, 0.1, 0.02, -(POSTE - 0.09), 0, 0.012, M.alu);
      fusion(c); ouvrant('coffreCommandes', c, 'y', 1.62, 'Coffre arrière droit : commandes dévidoirs et mât');
    })();

    /* ---------- dévidoirs mobiles arrière (descente hydraulique, bras repliables) ---------- */
    function devidoir(side, key, label) {
      var px = CX0 - 0.06, py = 0.95, cx = CX0 - 0.50, cy = 1.57, zc = side * 0.62, ANG = 1.653;
      var P = pivot(cel, px, py, 0, 'CCRM_' + key), I = P.int;
      [-0.30, 0.30].forEach(function (dz) { var z = zc + dz; rod(I, [px, py, z], [cx, cy, z], 0.03, M.blanc); box(I, 0.05, 0.24, 0.05, (px + cx) / 2, (py + cy) / 2, z, M.bandeJaune).rotation.z = 0.62; });
      rod(I, [px, py, zc - 0.30], [px, py, zc + 0.30], 0.035, M.acier, false);
      var C = new T.Group(); C.position.set(cx, cy, zc); C.name = 'CCRM_' + key + '_CHARIOT'; I.add(C);
      cyl(C, 0.25, 0.25, 0.56, 0, 0, 0, M.rougeVif, 'z', 20); cyl(C, 0.255, 0.255, 0.07, 0, 0, 0, M.jaune, 'z', 20);
      [-0.30, 0.30].forEach(function (z) { cyl(C, 0.30, 0.30, 0.02, 0, 0, z, M.rouge, 'z', 20); });
      cyl(C, 0.02, 0.02, 0.98, 0, 0, 0, M.acier, 'z', 8);
      [-0.45, 0.45].forEach(function (z) {
        var t = reg(new T.Mesh(new T.TorusGeometry(0.335, 0.026, 8, 28), M.caoutchouc)); t.position.z = z; C.add(t);
        var j = reg(new T.Mesh(new T.TorusGeometry(0.30, 0.014, 6, 28), M.alu)); j.position.z = z; C.add(j);
        cyl(C, 0.05, 0.05, 0.05, 0, 0, z, M.alu, 'z', 10);
        for (var i = 0; i < 8; i++) { var a = i / 8 * PI * 2; rod(C, [0, 0, z], [Math.cos(a) * 0.30, Math.sin(a) * 0.30, z], 0.007, M.alu, false); }
      });
      tube(C, [[0, 0, -0.36], [0.06, 0.52, -0.36], [0.06, 0.52, 0.36], [0, 0, 0.36]], 0.016, M.rougeVif);   // timon / poignée
      box(C, 0.03, 0.03, 0.5, 0.06, 0.40, 0, M.jaune).name = 'CCRM_' + key + '_BARRE_DEVERROUILLAGE';
      fusion(I); fusion(C);
      ouvrant(key, P, 'z', ANG, label, function (a) { var r = lisse(a) * ANG; P.rotation.z = r; C.rotation.z = -r; });
    }
    devidoir(-1, 'devidoirG', 'Dévidoir mobile gauche'); devidoir(1, 'devidoirD', 'Dévidoir mobile droit');

    /* ---------- support d'échelles basculant (côté gauche de la plateforme) ---------- */
    (function () {
      var px = CX0 - 0.05, py = YG + 0.07, zc = -0.80;
      [-0.2, 0.2].forEach(function (dz) { rod(cel, [CX1 - 0.4, py - 0.05, zc + dz], [px, py - 0.05, zc + dz], 0.018, M.blanc, false); });
      [CX1 - 0.5, CMID, CX0 + 0.2].forEach(function (x) { rod(cel, [x, Y_B1, zc - 0.2], [x, py - 0.05, zc - 0.2], 0.014, M.blanc, false); rod(cel, [x, Y_B1, zc + 0.2], [x, py - 0.05, zc + 0.2], 0.014, M.blanc, false); });
      var P = pivot(cel, px, py, 0, 'CCRM_supportEchelle'), S = new T.Group(); P.int.add(S);
      var xa = 0.38, xb = -3.92;                         // échelle à coulisse : dépasse de 4 échelons derrière le support
      [-0.21, 0.21].forEach(function (dz) { box(S, xa - xb, 0.07, 0.028, (xa + xb) / 2, py + 0.01, zc + dz, M.alu); box(S, (xa - xb) * 0.9, 0.06, 0.024, (xa + xb) / 2 + 0.1, py + 0.075, zc + dz * 0.86, M.alu); });
      for (var x = xb + 0.14; x < xa; x += 0.28) { box(S, 0.03, 0.03, 0.42, x, py + 0.01, zc, M.alu); }
      for (var x2 = xb + 0.5; x2 < xa; x2 += 0.28) { box(S, 0.03, 0.025, 0.36, x2, py + 0.075, zc, M.alu); }
      [-0.12, 0.12].forEach(function (dz) { box(S, 3.6, 0.045, 0.022, -1.75, py + 0.13, zc + dz, M.alu); });           // échelle à crochets
      for (var x3 = -3.4; x3 < 0; x3 += 0.3) box(S, 0.025, 0.02, 0.24, x3, py + 0.13, zc, M.alu);
      [-0.12, 0.12].forEach(function (dz) { rod(S, [0.05, py + 0.13, zc + dz], [0.16, py + 0.13, zc + dz], 0.012, M.acier, false); rod(S, [0.16, py + 0.13, zc + dz], [0.16, py + 0.02, zc + dz], 0.012, M.acier, false); });
      [-2.6, -0.9].forEach(function (x4) { box(S, 0.05, 0.19, 0.5, x4, py + 0.07, zc, M.noir); });                     // sangles de maintien
      box(S, 0.06, 0.2, 0.5, xa + 0.02, py + 0.06, zc, M.rougeVif).name = 'CCRM_BUTEE_ECHELLES';
      fusion(S);
      ouvrant('supportEchelle', P, 'z', 1.13, 'Support échelles basculant', function (a) { S.position.x = -2.85 * lisse(a / 0.5); P.rotation.z = 1.13 * lisse((a - 0.5) / 0.5); });
    })();

    /* ---------- mât d'éclairage télescopique (6 m, 4 projecteurs LED de 100 W) ---------- */
    (function () {
      var g = new T.Group(); g.name = 'CCRM_mat'; g.position.set(CX0 + 0.26, 0, -0.28); cel.add(g);
      var y0 = Y_B1 + 0.02, H0 = 3.32, sec = [];
      cyl(g, 0.055, 0.055, 0.2, 0, y0 + 0.1, 0, M.alu, 'y', 12);
      for (var i = 0; i < 3; i++) { var s = new T.Group(); (i ? sec[i - 1] : g).add(s); cyl(s, 0.045 - i * 0.008, 0.045 - i * 0.008, 1.0, 0, y0 - 0.35, 0, M.alu, 'y', 10); sec.push(s); }
      var tete = sec[2];
      box(tete, 0.06, 0.05, 0.5, 0, H0 - 0.21, 0, M.noir);
      [-0.19, -0.065, 0.065, 0.19].forEach(function (z) { box(tete, 0.07, 0.11, 0.11, 0, H0 - 0.13, z, M.noir); box(tete, 0.012, 0.09, 0.09, -0.04, H0 - 0.13, z, M.led).castShadow = false; });
      cyl(tete, 0.035, 0.045, 0.07, 0, H0 - 0.035, 0, M.orange, 'y', 12).name = 'CCRM_FEU_ORANGE_MAT';
      g.children.concat(sec).forEach(function (o) { if (o.isGroup) fusion(o); }); fusion(g);
      var course = (6.0 - H0) / 3;
      ouvrant('mat', g, 'y', 0, "Mât d'éclairage", function (a) { var e = lisse(a); for (var i = 0; i < 3; i++) sec[i].position.y = course * e; M.led.emissiveIntensity = a > 0.97 ? 3.2 : 0; });
    })();

    /* ---------- état, animation ---------- */
    var etat = { gyro: false, feux: false, t: 0, spin: 0 };
    function setOpen(key, on) { var r = records[key]; if (!r) return false;
      if (on && key === 'supportEchelle' && records.devidoirG.target < 0.5) setOpen('devidoirG', true);   // fiche n°14 : descente du dévidoir gauche obligatoire
      r.target = on ? 1 : 0; r.open = !!on; if (opt.onToggle) opt.onToggle(key, !!on, r); return true; }
    function toggle(key) { var r = records[key]; return r ? (setOpen(key, r.target < 0.5), r.open) : false; }
    function setAmount(key, v) { var r = records[key]; if (!r) return false; v = Math.max(0, Math.min(1, Number(v) || 0)); r.target = r.amount = v; r.open = v > 0.5; poser(r); return true; }
    function setGroupe(prefixe, on) { for (var k in records) if (k.indexOf(prefixe) === 0) setOpen(k, on); }
    function setGyrophares(on) { etat.gyro = !!on; if (!on) { M.bleuG.emissiveIntensity = 0; M.bleuD.emissiveIntensity = 0; M.bleuAR.emissiveIntensity = 0; } }
    function setFeux(on) { etat.feux = !!on; M.phare.emissiveIntensity = on ? 2.2 : 0; M.feuRouge.emissiveIntensity = on ? 1.1 : 0; M.gabarit.emissiveIntensity = on ? 1.4 : 0; }
    function setProjecteurArriere(on) { M.led.emissiveIntensity = on ? 3.2 : (records.mat.amount > 0.97 ? 3.2 : 0); }
    function update(dt, state) {
      dt = Math.max(0, Math.min(0.1, Number(dt) || 0)); state = state || {};
      var f = 1 - Math.exp(-7 * dt), k, r;
      for (k in records) { r = records[k]; if (r.amount !== r.target) { r.amount += (r.target - r.amount) * f; if (Math.abs(r.target - r.amount) < 0.002) r.amount = r.target; poser(r); } }
      if (typeof state.wheelSpin === 'number') etat.spin = state.wheelSpin; else if (state.speed) etat.spin -= state.speed * dt / RW;
      var st = state.steerAngle || 0;
      for (var i = 0; i < wheels.length; i++) { var w = wheels[i]; w.steer.rotation.y = w.front ? st : 0; w.roll.rotation.z = etat.spin; }
      parts.volant.rotation.x = -st * 9;
      if (poste) poste.update(dt, state);
      etat.t += dt;
      if (etat.gyro) { var ph = (etat.t * 2.1) % 1, a = (ph < 0.07 || (ph > 0.14 && ph < 0.21)) ? 5 : 0.15, b = (ph > 0.5 && ph < 0.57 || (ph > 0.64 && ph < 0.71)) ? 5 : 0.15; M.bleuG.emissiveIntensity = a; M.bleuD.emissiveIntensity = b; M.bleuAR.emissiveIntensity = b; }
      if (typeof state.clignotant === 'number') M.clignotant.emissiveIntensity = state.clignotant ? ((etat.t * 1.5) % 1 < 0.5 ? 2 : 0) : 0;
    }
    function dispose() { if (poste) poste.dispose(); racine.traverse(function (o) { if (o.geometry) o.geometry.dispose(); }); for (var k in M) { if (M[k].map) M[k].map.dispose(); M[k].dispose(); } }

    racine.userData.rlhCcrmV942 = true; racine.userData.dims = DIMS; racine.userData.fiche = FICHE;
    var sortie = {
      version: VERSION, poste: poste, root: racine, caisse: caisse, cabine: cab, cellule: cel, parts: parts, records: records, wheels: wheels,
      materials: M, dims: DIMS, fiche: FICHE, hydraulique: hydraulique, update: update, toggle: toggle, setOpen: setOpen, setAmount: setAmount,
      setPortes: function (on) { setGroupe('porte', on); }, setCoffres: function (on) { setGroupe('coffre', on); }, setDevidoirs: function (on) { setGroupe('devidoir', on); },
      setProjecteurArriere: setProjecteurArriere,
      setGyrophares: setGyrophares, setFeux: setFeux, dispose: dispose,
      get gyrophares() { return etat.gyro; }, get feux() { return etat.feux; }
    };
    hote.ccrm = sortie; if (poste) poste.rafraichir(true);
    return sortie;
  }

  var api = { version: VERSION, dims: DIMS, fiche: FICHE, create: create };
  return api;
})();
export const createCCRM = CCRM.create;
export const CCRM_DIMENSIONS = CCRM.dims;
