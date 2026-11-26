/* Gaming : calculs purs (sensibilité, cm/360, eDPI, DPI, Nether, stacks). Aucune donnée envoyée.
   Utilisé par les pages (window.GL) et par les tests Node (module.exports). Sources : sources_2026-11-26.md */
(function (racine) {
  'use strict';
  // Degrés de rotation par « count » de la souris à la sensibilité 1 (le « yaw »).
  // Règle du 26/11/2026 : un jeu n'entre ici que si au moins deux sources sérieuses donnent le même coefficient.
  var JEUX = [
    { id: 'cs2', nom: 'Counter-Strike 2 (et CS:GO)', court: 'CS2', yaw: 0.022 },
    { id: 'valorant', nom: 'Valorant', court: 'Valorant', yaw: 0.07 },
    { id: 'apex', nom: 'Apex Legends', court: 'Apex', yaw: 0.022 },
    { id: 'ow2', nom: 'Overwatch 2', court: 'Overwatch 2', yaw: 0.0066 },
    { id: 'cod', nom: 'Call of Duty (MW III, Warzone, Black Ops 6)', court: 'Call of Duty', yaw: 0.0066 },
    { id: 'fortnite', nom: 'Fortnite (sensibilité X en %)', court: 'Fortnite', yaw: 0.005555, unite: ' %' },
    { id: 'r6', nom: 'Rainbow Six Siege (multiplicateur par défaut)', court: 'Rainbow Six Siege', yaw: 0.00572957795, entier: true },
    { id: 'destiny2', nom: 'Destiny 2', court: 'Destiny 2', yaw: 0.0066 },
    { id: 'tf2', nom: 'Team Fortress 2', court: 'TF2', yaw: 0.022 },
    { id: 'quake', nom: 'Quake Champions', court: 'Quake Champions', yaw: 0.022 }
  ];
  var PAR_ID = {};
  JEUX.forEach(function (j) { PAR_ID[j.id] = j; });
  var CM_PAR_POUCE = 2.54;

  function ok(v) { return typeof v === 'number' && isFinite(v); }
  function positif(v) { return ok(v) && v > 0; }

  var GL = {
    JEUX: JEUX,
    jeu: function (id) { return PAR_ID[id] || null; },
    // Degrés par count pour une sensibilité donnée.
    degres: function (id, sens) {
      var j = PAR_ID[id];
      return j && positif(sens) ? sens * j.yaw : NaN;
    },
    // Pouces et centimètres pour faire un tour complet (360°).
    pouces360: function (id, sens, dpi) {
      var d = GL.degres(id, sens);
      return positif(d) && positif(dpi) ? 360 / (dpi * d) : NaN;
    },
    cm360: function (id, sens, dpi) {
      var p = GL.pouces360(id, sens, dpi);
      return ok(p) ? p * CM_PAR_POUCE : NaN;
    },
    // Même rotation pour le même geste : sensibilité dans le jeu d'arrivée (DPI éventuellement différent).
    convertir: function (de, vers, sens, dpiDe, dpiVers) {
      var a = PAR_ID[de], b = PAR_ID[vers];
      if (!a || !b || !positif(sens)) { return NaN; }
      var r = positif(dpiDe) && positif(dpiVers) ? dpiDe / dpiVers : 1;
      return sens * a.yaw / b.yaw * r;
    },
    // Rapport fixe entre deux jeux (multiplier la sensibilité du premier).
    rapport: function (de, vers) {
      var a = PAR_ID[de], b = PAR_ID[vers];
      return a && b ? a.yaw / b.yaw : NaN;
    },
    // Sensibilité qui donne une distance voulue (cm pour 360°).
    sensPourCm: function (id, cm, dpi) {
      var j = PAR_ID[id];
      return j && positif(cm) && positif(dpi) ? 360 * CM_PAR_POUCE / (cm * dpi * j.yaw) : NaN;
    },
    edpi: function (dpi, sens) {
      return positif(dpi) && positif(sens) ? dpi * sens : NaN;
    },
    changerDpi: function (sens, ancien, nouveau) {
      return positif(sens) && positif(ancien) && positif(nouveau) ? sens * ancien / nouveau : NaN;
    },
    // Arrondi accepté par le jeu (entier pour Rainbow Six Siege, 3 décimales sinon) et écart en cm/360 qu'il provoque.
    arrondi: function (id, sens) {
      var j = PAR_ID[id];
      if (!j || !positif(sens)) { return NaN; }
      if (j.entier) { return Math.max(1, Math.min(100, Math.round(sens))); }
      return Math.round(sens * 1000) / 1000;
    },

    // ---------- Minecraft : Overworld <-> Nether (Y inchangé) ----------
    versNether: function (x, z) {
      if (!ok(x) || !ok(z)) { return null; }
      return { x: Math.floor(x / 8), z: Math.floor(z / 8) };
    },
    versOverworld: function (x, z) {
      if (!ok(x) || !ok(z)) { return null; }
      var bx = Math.floor(x), bz = Math.floor(z);
      return { x: bx * 8, z: bz * 8, xMax: bx * 8 + 7, zMax: bz * 8 + 7 };
    },
    // Rayon de recherche d'un portail existant (moitié du côté du carré), d'après le Minecraft Wiki (26/11/2026).
    RAYONS: { java: { overworld: 128, nether: 16 }, bedrock: { overworld: 128, nether: 128 } },
    // Deux portails se relient-ils ? (portail de l'Overworld o, portail du Nether n, édition 'java' ou 'bedrock')
    lien: function (o, n, edition) {
      var r = GL.RAYONS[edition] || GL.RAYONS.java;
      var vals = [o.x, o.y, o.z, n.x, n.y, n.z];
      if (!vals.every(ok)) { return null; }
      var cnX = o.x / 8, cnZ = o.z / 8;          // point visé dans le Nether
      var coX = n.x * 8, coZ = n.z * 8;          // point visé dans l'Overworld
      var ecartAller = Math.max(Math.abs(n.x - cnX), Math.abs(n.z - cnZ));
      var ecartRetour = Math.max(Math.abs(o.x - coX), Math.abs(o.z - coZ));
      var dist = function (ax, ay, az, bx, by, bz) {
        return Math.sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by) + (az - bz) * (az - bz));
      };
      return {
        cibleNether: { x: Math.floor(cnX), y: o.y, z: Math.floor(cnZ) },
        cibleOverworld: { x: coX, y: n.y, z: coZ },
        ecartAller: ecartAller, ecartRetour: ecartRetour,
        distAller: dist(n.x, n.y, n.z, cnX, o.y, cnZ),
        distRetour: dist(o.x, o.y, o.z, coX, n.y, coZ),
        aller: ecartAller <= r.nether, retour: ecartRetour <= r.overworld,
        rayonNether: r.nether, rayonOverworld: r.overworld
      };
    },

    // ---------- Minecraft : piles (stacks), coffres et shulkers ----------
    CASES: { coffre: 27, double: 54, shulker: 27, inventaire: 36 },
    stacks: function (n, pile) {
      if (!ok(n) || n < 0 || [1, 16, 64].indexOf(pile) === -1) { return null; }
      n = Math.floor(n);
      var piles = Math.floor(n / pile), reste = n % pile, cases = Math.ceil(n / pile);
      return {
        objets: n, piles: piles, reste: reste, cases: cases,
        coffres: Math.ceil(cases / 27), doubles: Math.ceil(cases / 54), shulkers: Math.ceil(cases / 27),
        inventaires: Math.ceil(cases / 36),
        parShulker: 27 * pile, parDouble: 54 * pile, doubleDeShulkers: 54 * 27 * pile
      };
    },
    // Total d'objets : shulkers pleines + piles + objets seuls.
    total: function (shulkers, piles, objets, pile) {
      if ([1, 16, 64].indexOf(pile) === -1) { return NaN; }
      var v = [shulkers, piles, objets].map(function (x) { return ok(x) && x > 0 ? Math.floor(x) : 0; });
      return v[0] * 27 * pile + v[1] * pile + v[2];
    }
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = GL; } else { racine.GL = GL; }
}(typeof window !== 'undefined' ? window : this));
