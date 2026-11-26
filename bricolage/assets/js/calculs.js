/* Calculs bricolage et travaux : fonctions pures (aucun accès à la page), testées sous Node (tests\test_calculs.js).
   Chaque fonction reçoit un objet v (nombres, NaN si vide ; chaînes pour les listes ; booléens pour les cases)
   et renvoie { ok, message?, t:{id:texte}, liste:[[article,quantité,détail]], ecrit:[texte], alertes:[texte], r:{nombres} }.
   Les dosages, rendements, densités et consommations sont des repères usuels : toujours « environ ». */
(function (racine) {
  'use strict';
  var NF = {};
  function nf(dec) {
    if (!NF[dec]) { NF[dec] = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
    return NF[dec];
  }
  var NS = {};
  function ns(max) {
    if (!NS[max]) { NS[max] = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: max }); }
    return NS[max];
  }
  // Texte français : f(v,2) = 2 décimales fixes ; s(v,2) = jusqu'à 2 décimales sans zéros inutiles.
  function f(v, dec) { return isFinite(v) ? nf(dec).format(v) : '–'; }
  function s(v, max) { return isFinite(v) ? ns(typeof max === 'number' ? max : 2).format(v) : '–'; }
  function plafond(x) { return Math.ceil(x - 1e-9); }
  function arrondi(x, d) { var m = Math.pow(10, d); return Math.round(x * m) / m; }
  function erreur(message) { return { ok: false, message: message, t: {}, liste: [], ecrit: [], alertes: [], r: {} }; }
  function manque(v, cles) {
    for (var i = 0; i < cles.length; i++) {
      if (typeof v[cles[i]] !== 'number' || !isFinite(v[cles[i]])) { return true; }
    }
    return false;
  }
  function pos(v, cles) {
    for (var i = 0; i < cles.length; i++) { if (!(v[cles[i]] > 0)) { return false; } }
    return true;
  }
  function pluriel(n, un, plusieurs) { return n + ' ' + (n > 1 ? plusieurs : un); }
  var MSG = 'Remplissez les cases avec des nombres plus grands que zéro.';

  // Matériaux : densités moyennes en kg/m³ (repères usuels, à remplacer par la fiche du fournisseur).
  var MATERIAUX = {
    eau: { nom: 'Eau', d: 1000 },
    sable: { nom: 'Sable sec', d: 1500 },
    gravier: { nom: 'Gravier, cailloux', d: 1600 },
    toutvenant: { nom: 'Tout-venant (graves)', d: 1800 },
    terre: { nom: 'Terre végétale', d: 1300 },
    deblais: { nom: 'Terre de déblais', d: 1600 },
    beton: { nom: 'Béton', d: 2400 }
  };
  function densite(v) {
    if (v.materiau === 'perso') { return v.densite; }
    return MATERIAUX[v.materiau] ? MATERIAUX[v.materiau].d : NaN;
  }
  function nomMateriau(v) {
    return v.materiau === 'perso' ? 'matériau à ' + s(v.densite, 0) + ' kg/m³' : (MATERIAUX[v.materiau] ? MATERIAUX[v.materiau].nom.toLowerCase() : 'matériau');
  }

  // Combinaison de pots : on vise le plus petit total au-dessus du besoin, mais on accepte jusqu'à 1 L de plus
  // pour acheter moins de pots (4 petits pots de 0,5 L coûtent plus cher qu'un pot de 2,5 L).
  function combiner(besoinTotal, tailles) {
    var n = tailles.length, tous = [], bornes = [], cpt = [];
    // 26/11/2026 (relecture sécurité) : au-delà de 3 grands pots, on les compte d'avance pour que la boucle reste
    // courte quel que soit le nombre saisi (une adresse piégée ne peut plus figer l'onglet).
    var avance = Math.max(0, Math.floor(besoinTotal / tailles[n - 1]) - 3);
    var besoin = besoinTotal - avance * tailles[n - 1];
    for (var i = 0; i < n; i++) {
      bornes.push(i === n - 1 ? plafond(besoin / tailles[i]) : Math.round(tailles[i + 1] / tailles[i]));
    }
    function rec(k) {
      if (k === n) {
        var tot = 0, nb = 0;
        for (var j = 0; j < n; j++) { tot += cpt[j] * tailles[j]; nb += cpt[j]; }
        if (tot + 1e-9 >= besoin) { tous.push({ tot: arrondi(tot, 6), nb: nb, cpt: cpt.slice() }); }
        return;
      }
      for (var c = 0; c <= bornes[k]; c++) { cpt[k] = c; rec(k + 1); }
    }
    rec(0);
    var mini = Math.min.apply(null, tous.map(function (x) { return x.tot; }));
    var meilleur = null;
    tous.forEach(function (x) {
      if (x.tot > mini + 1 + 1e-9) { return; }
      if (!meilleur || x.nb < meilleur.nb || (x.nb === meilleur.nb && x.tot < meilleur.tot - 1e-9)) { meilleur = x; }
    });
    meilleur.cpt[n - 1] += avance;
    meilleur.tot = arrondi(meilleur.tot + avance * tailles[n - 1], 6);
    var morceaux = [];
    for (var q = n - 1; q >= 0; q--) {
      if (meilleur.cpt[q] > 0) { morceaux.push(meilleur.cpt[q] + ' × ' + s(tailles[q], 1) + ' L'); }
    }
    return { total: meilleur.tot, texte: morceaux.join(' + '), cpt: meilleur.cpt };
  }

  var calc = {};

  // ---------------------------------------------------------------- 1. Peinture
  calc.peinture = function (v) {
    var aire, ecrit = [], alertes = [], plaf = 0;
    if (v.mode === 'surface') {
      if (!pos(v, ['surface'])) { return erreur(MSG); }
      aire = v.surface;
      ecrit.push('Surface à peindre : ' + s(aire, 2) + ' m² (saisie directe).');
    } else {
      if (!pos(v, ['longueur', 'largeur', 'hauteur']) || manque(v, ['portes', 'fenetres', 'sPorte', 'sFenetre'])) { return erreur(MSG); }
      var brut = 2 * (v.longueur + v.largeur) * v.hauteur;
      var ouv = v.portes * v.sPorte + v.fenetres * v.sFenetre;
      aire = brut - ouv;
      if (aire <= 0) { return erreur('Les portes et fenêtres dépassent la surface des murs : vérifiez les nombres.'); }
      ecrit.push('Murs : 2 × (' + s(v.longueur) + ' + ' + s(v.largeur) + ') × ' + s(v.hauteur) + ' = ' + f(brut, 2) + ' m².');
      ecrit.push('Ouvertures : ' + s(v.portes, 0) + ' × ' + s(v.sPorte) + ' + ' + s(v.fenetres, 0) + ' × ' + s(v.sFenetre) + ' = ' + f(ouv, 2) + ' m².');
      ecrit.push('Surface des murs à peindre : ' + f(brut, 2) + ' − ' + f(ouv, 2) + ' = ' + f(aire, 2) + ' m².');
      if (v.plafond) { plaf = v.longueur * v.largeur; ecrit.push('Plafond : ' + s(v.longueur) + ' × ' + s(v.largeur) + ' = ' + f(plaf, 2) + ' m².'); }
    }
    if (!pos(v, ['couches', 'rendement']) || manque(v, ['marge']) || v.marge < 0) { return erreur(MSG); }
    var coef = 1 + v.marge / 100;
    var lMurs = aire * v.couches / v.rendement * coef;
    var lPlaf = plaf * v.couches / v.rendement * coef;
    if (!(lMurs + lPlaf <= 100000)) { return erreur('Plus de 100 000 litres de peinture : vérifiez les nombres saisis.'); }
    ecrit.push('Litres pour les murs : ' + f(aire, 2) + ' m² × ' + s(v.couches, 0) + ' couche(s) ÷ ' + s(v.rendement) + ' m²/L × ' + s(coef, 3) + ' (marge ' + s(v.marge, 0) + ' %) = ' + f(lMurs, 2) + ' L.');
    var tailles = [0.5, 2.5, 5, 10];
    var cm = combiner(lMurs, tailles), liste = [];
    liste.push(['Peinture murs', cm.texte, f(cm.total, 1) + ' L achetés pour ' + f(lMurs, 2) + ' L nécessaires']);
    var achat = cm.total, besoin = lMurs, texte = cm.texte;
    if (plaf > 0) {
      var cp = combiner(lPlaf, tailles);
      ecrit.push('Litres pour le plafond : ' + f(plaf, 2) + ' m² × ' + s(v.couches, 0) + ' ÷ ' + s(v.rendement) + ' × ' + s(coef, 3) + ' = ' + f(lPlaf, 2) + ' L.');
      liste.push(['Peinture plafond', cp.texte, f(cp.total, 1) + ' L achetés pour ' + f(lPlaf, 2) + ' L nécessaires']);
      achat += cp.total; besoin += lPlaf; texte += ' (murs) ; ' + cp.texte + ' (plafond)';
    }
    liste.push(['Rouleaux, bâche, adhésif', 'selon le chantier', 'non calculés : comptez 1 rouleau et 1 pinceau à rechampir par pièce']);
    if (v.rendement > 14 || v.rendement < 6) { alertes.push('Le rendement habituel d\'une peinture murale tourne autour de 10 m² par litre ; lisez celui de la fiche du pot que vous choisissez.'); }
    return { ok: true, t: { rSurface: f(aire + plaf, 1) + ' m²', rLitres: f(besoin, 1) + ' L', rPots: texte, rAchat: f(achat, 1) + ' L' },
      liste: liste, ecrit: ecrit, alertes: alertes, r: { aire: aire, plafond: plaf, litres: besoin, achat: achat, murs: lMurs, litresPlafond: lPlaf } };
  };

  // ---------------------------------------------------------------- 2. Béton
  calc.beton = function (v) {
    var vol, ecrit = [], alertes = [];
    if (v.forme === 'semelle') {
      if (!pos(v, ['sLong', 'sLarg', 'sHaut'])) { return erreur(MSG); }
      vol = v.sLong * (v.sLarg / 100) * (v.sHaut / 100);
      ecrit.push('Semelle : ' + s(v.sLong) + ' m × ' + s(v.sLarg / 100, 3) + ' m × ' + s(v.sHaut / 100, 3) + ' m = ' + f(vol, 3) + ' m³.');
    } else if (v.forme === 'poteaux') {
      if (!pos(v, ['pNb', 'pDiam', 'pHaut'])) { return erreur(MSG); }
      var sect = v.profil === 'carre' ? Math.pow(v.pDiam / 100, 2) : Math.PI * Math.pow(v.pDiam / 200, 2);
      vol = v.pNb * sect * v.pHaut;
      ecrit.push('Un poteau ' + (v.profil === 'carre' ? 'carré' : 'rond') + ' : section ' + f(sect, 4) + ' m² × ' + s(v.pHaut) + ' m ; × ' + s(v.pNb, 0) + ' = ' + f(vol, 3) + ' m³.');
    } else {
      if (!pos(v, ['dLong', 'dLarg', 'dEp'])) { return erreur(MSG); }
      vol = v.dLong * v.dLarg * (v.dEp / 100);
      ecrit.push('Dalle : ' + s(v.dLong) + ' m × ' + s(v.dLarg) + ' m × ' + s(v.dEp / 100, 3) + ' m = ' + f(vol, 3) + ' m³.');
    }
    if (manque(v, ['marge']) || v.marge < 0) { return erreur(MSG); }
    var volM = vol * (1 + v.marge / 100);
    ecrit.push('Avec ' + s(v.marge, 0) + ' % de marge (pertes, sol irrégulier) : ' + f(volM, 3) + ' m³.');
    var liste = [], t = {}, r = { volume: vol, volumeMarge: volM };
    if (v.methode === 'pret') {
      var sac = Number(v.sacPret) === 35 ? 35 : 25;
      var rend = v.rendement > 0 ? v.rendement : sac / 2.1;
      var n = plafond(volM * 1000 / rend);
      ecrit.push('Un sac de ' + sac + ' kg donne environ ' + s(rend, 1) + ' L de béton (' + (v.rendement > 0 ? 'chiffre saisi' : 'repère : poids ÷ 2,1') + ').');
      ecrit.push('Nombre de sacs : ' + f(volM * 1000, 0) + ' L ÷ ' + s(rend, 1) + ' L = ' + n + ' sacs de ' + sac + ' kg.');
      liste.push(['Béton prêt à gâcher', pluriel(n, 'sac', 'sacs') + ' de ' + sac + ' kg', f(n * sac, 0) + ' kg au total (' + f(n * rend / 1000, 2) + ' m³ de béton)']);
      liste.push(['Eau', 'selon la notice', 'quelques litres par sac : lisez la dose sur le sac']);
      t = { rVolume: f(volM, 2) + ' m³', rCiment: '–', rSacs: pluriel(n, 'sac', 'sacs') + ' de ' + sac + ' kg', rSable: '–', rGravier: '–', rEau: '–' };
      r.sacs = n; r.sac = sac;
    } else {
      if (!pos(v, ['dosage'])) { return erreur(MSG); }
      var sacC = Number(v.sacCiment) === 35 ? 35 : 25;
      var kg = v.dosage * volM, nS = plafond(kg / sacC);
      var sable = 0.45 * volM, gravier = 0.8 * volM, eau = 0.5 * kg;
      ecrit.push('Ciment : ' + s(v.dosage, 0) + ' kg/m³ × ' + f(volM, 3) + ' m³ = ' + f(kg, 0) + ' kg, soit ' + f(kg, 0) + ' ÷ ' + sacC + ' = ' + nS + ' sacs de ' + sacC + ' kg (arrondi au sac entier).');
      ecrit.push('Sable : 0,45 m³ par m³ de béton → ' + f(sable, 2) + ' m³. Gravier : 0,8 m³ par m³ → ' + f(gravier, 2) + ' m³. Eau : 0,5 L par kg de ciment → ' + f(eau, 0) + ' L.');
      liste.push(['Ciment', pluriel(nS, 'sac', 'sacs') + ' de ' + sacC + ' kg', f(kg, 0) + ' kg nécessaires, ' + f(nS * sacC, 0) + ' kg achetés']);
      liste.push(['Sable 0/4', f(sable, 2) + ' m³', 'environ ' + f(sable * 1.5, 2) + ' t (sable sec ≈ 1,5 t/m³)']);
      liste.push(['Gravier 4/20', f(gravier, 2) + ' m³', 'environ ' + f(gravier * 1.6, 2) + ' t (gravier ≈ 1,6 t/m³)']);
      liste.push(['Eau', f(eau, 0) + ' L', 'environ, à ajuster : rapport eau/ciment de 0,5']);
      t = { rVolume: f(volM, 2) + ' m³', rCiment: f(kg, 0) + ' kg', rSacs: pluriel(nS, 'sac', 'sacs') + ' de ' + sacC + ' kg', rSable: f(sable, 2) + ' m³', rGravier: f(gravier, 2) + ' m³', rEau: f(eau, 0) + ' L' };
      r.ciment = kg; r.sacs = nS; r.sable = sable; r.gravier = gravier; r.eau = eau;
      if (v.dosage < 250 || v.dosage > 400) { alertes.push('Un dosage entre 300 et 350 kg de ciment par m³ est le plus courant pour une dalle ; vérifiez le dosage prévu pour votre ouvrage.'); }
    }
    if (v.forme !== 'dalle' || v.dEp > 20) { alertes.push('Un ouvrage porteur ou armé (semelle, poteau, dalle épaisse) se dimensionne avec les DTU ou un professionnel : ce calcul donne seulement des quantités.'); }
    return { ok: true, t: t, liste: liste, ecrit: ecrit, alertes: alertes, r: r };
  };

  // ---------------------------------------------------------------- 3. Volume (m³)
  calc.volume = function (v) {
    var vol, ecrit = [], u = v.unite === 'cm' ? 0.01 : 1, un = v.unite === 'cm' ? 'cm' : 'm';
    if (v.forme === 'cube') {
      if (!pos(v, ['cCote'])) { return erreur(MSG); }
      var c = v.cCote * u; vol = c * c * c;
      ecrit.push('Cube : côté³ = ' + s(v.cCote, 3) + ' ' + un + ' → ' + f(vol, 4) + ' m³.');
    } else if (v.forme === 'cylindre') {
      if (!pos(v, ['yDiam', 'yHaut'])) { return erreur(MSG); }
      var rr = v.yDiam * u / 2; vol = Math.PI * rr * rr * v.yHaut * u;
      ecrit.push('Cylindre : π × rayon² × hauteur = π × ' + s(rr, 4) + '² × ' + s(v.yHaut * u, 4) + ' = ' + f(vol, 4) + ' m³ (dimensions en m).');
    } else if (v.forme === 'tranchee') {
      if (!pos(v, ['tLong', 'tFond', 'tProf'])) { return erreur(MSG); }
      var haut = v.tHaut > 0 ? v.tHaut : v.tFond;
      vol = v.tLong * u * ((v.tFond + haut) / 2) * u * v.tProf * u;
      ecrit.push('Tranchée : longueur × largeur moyenne × profondeur = ' + s(v.tLong * u, 3) + ' × ' + s(((v.tFond + haut) / 2) * u, 3) + ' × ' + s(v.tProf * u, 3) + ' = ' + f(vol, 4) + ' m³ (dimensions en m).');
    } else {
      if (!pos(v, ['pLong', 'pLarg', 'pHaut'])) { return erreur(MSG); }
      vol = v.pLong * u * v.pLarg * u * v.pHaut * u;
      ecrit.push('Pavé (dalle, bac, local) : longueur × largeur × hauteur = ' + s(v.pLong * u, 3) + ' × ' + s(v.pLarg * u, 3) + ' × ' + s(v.pHaut * u, 3) + ' = ' + f(vol, 4) + ' m³.');
    }
    var d = densite(v), alertes = [], t = { rVolume: s(vol, 4) + ' m³', rLitres: s(vol * 1000, 1) + ' L' }, liste = [];
    if (d > 0) {
      var kg = vol * d;
      t.rTonnes = s(kg / 1000, 3) + ' t'; t.rKg = s(kg, 0) + ' kg';
      ecrit.push('Masse : ' + f(vol, 4) + ' m³ × ' + s(d, 0) + ' kg/m³ = ' + s(kg, 0) + ' kg, soit ' + s(kg / 1000, 3) + ' t (' + nomMateriau(v) + ').');
      liste.push(['Volume', s(vol, 4) + ' m³', s(vol * 1000, 1) + ' litres']);
      liste.push(['Masse (' + nomMateriau(v) + ')', s(kg / 1000, 3) + ' t', s(kg, 0) + ' kg']);
    } else { t.rTonnes = '–'; t.rKg = '–'; alertes.push('Indiquez une densité pour passer du volume à la masse.'); }
    ecrit.push('1 m³ = 1 000 litres.');
    return { ok: true, t: t, liste: liste, ecrit: ecrit, alertes: alertes, r: { volume: vol, kg: d > 0 ? vol * d : NaN } };
  };

  // ---------------------------------------------------------------- 4. Escalier (formule de Blondel)
  function pasEscalier(H, n, gManuel) {
    var h = H / n, g = gManuel > 0 ? gManuel : 63 - 2 * h;
    return { n: n, h: h, g: g, blondel: 2 * h + g, recul: (n - 1) * g, angle: Math.atan(h / g) * 180 / Math.PI };
  }
  calc.escalier = function (v) {
    if (!pos(v, ['hauteur', 'cible'])) { return erreur(MSG); }
    var H = v.hauteur, n = Math.max(2, Math.round(H / v.cible)), p = pasEscalier(H, n, v.giron);
    var ecrit = [], alertes = [];
    ecrit.push('Nombre de marches : ' + s(H, 1) + ' cm ÷ ' + s(v.cible, 1) + ' cm = ' + s(H / v.cible, 2) + ', arrondi à ' + n + ' marches (' + n + ' contremarches).');
    ecrit.push('Hauteur de marche : ' + s(H, 1) + ' ÷ ' + n + ' = ' + f(p.h, 2) + ' cm.');
    ecrit.push(v.giron > 0 ? 'Giron choisi : ' + s(v.giron, 1) + ' cm.' : 'Giron par Blondel (2h + g = 63 cm) : 63 − 2 × ' + f(p.h, 2) + ' = ' + f(p.g, 2) + ' cm.');
    ecrit.push('Contrôle : 2 × ' + f(p.h, 2) + ' + ' + f(p.g, 2) + ' = ' + f(p.blondel, 1) + ' cm.');
    ecrit.push('Reculement : ' + (n - 1) + ' girons × ' + f(p.g, 2) + ' cm = ' + f(p.recul, 1) + ' cm.');
    ecrit.push('Angle : arctan(' + f(p.h, 2) + ' ÷ ' + f(p.g, 2) + ') = ' + f(p.angle, 1) + ' °.');
    if (p.blondel < 60 || p.blondel > 64) { alertes.push('2h + g vaut ' + f(p.blondel, 1) + ' cm : c\'est hors de la plage de confort de 60 à 64 cm. La marche sera ' + (p.blondel < 60 ? 'trop courte (escalier raide)' : 'trop longue (pas fatigant)') + '.'); }
    if (p.h > 20) { alertes.push('Marche de plus de 20 cm : escalier très raide, plutôt une échelle de meunier.'); }
    if (p.g < 22) { alertes.push('Giron de moins de 22 cm : le pied ne tient pas bien sur la marche.'); }
    if (v.tremie > 0) {
      if (p.recul > v.tremie) { alertes.push('Il manque ' + f(p.recul - v.tremie, 1) + ' cm de trémie : essayez plus de marches (marche plus basse) ou un escalier tournant.'); }
      else { ecrit.push('Votre trémie de ' + s(v.tremie, 0) + ' cm suffit : reste ' + f(v.tremie - p.recul, 1) + ' cm.'); }
    }
    var liste = [];
    [n - 1, n, n + 1].forEach(function (k) {
      if (k < 2) { return; }
      var q = pasEscalier(H, k, v.giron);
      liste.push([(k === n ? '→ ' : '') + k + ' marches', f(q.h, 1) + ' cm', f(q.g, 1) + ' cm', f(q.blondel, 1) + ' cm', f(q.recul, 0) + ' cm']);
    });
    return { ok: true, t: { rMarches: n + ' marches', rHauteur: f(p.h, 1) + ' cm', rGiron: f(p.g, 1) + ' cm', rBlondel: f(p.blondel, 1) + ' cm', rRecul: f(p.recul, 0) + ' cm', rAngle: f(p.angle, 1) + ' °' },
      liste: liste, ecrit: ecrit, alertes: alertes, r: { n: n, h: p.h, g: p.g, blondel: p.blondel, recul: p.recul, angle: p.angle } };
  };

  // ---------------------------------------------------------------- 5. Carrelage et faïence
  function aireDe(v, ecrit) {
    if (v.mode === 'surface') {
      if (!pos(v, ['surface'])) { return NaN; }
      ecrit.push('Surface : ' + s(v.surface) + ' m² (saisie directe).');
      return v.surface;
    }
    if (!pos(v, ['longueur', 'largeur'])) { return NaN; }
    var a = v.longueur * v.largeur;
    ecrit.push('Surface : ' + s(v.longueur) + ' × ' + s(v.largeur) + ' = ' + f(a, 2) + ' m².');
    return a;
  }
  calc.carrelage = function (v) {
    var ecrit = [], alertes = [], a = aireDe(v, ecrit);
    if (!(a > 0) || !pos(v, ['carL', 'carl', 'boite', 'joint', 'epaisseur']) || manque(v, ['colle', 'chute'])) { return erreur(MSG); }
    var chute = v.chute / 100, aChute = a * (1 + chute);
    var m2carreau = (v.carL / 100) * (v.carl / 100);
    var nCarreaux = plafond(aChute / m2carreau), nBoites = plafond(aChute / v.boite);
    ecrit.push('Avec ' + s(v.chute, 0) + ' % de chute : ' + f(a, 2) + ' × ' + s(1 + chute, 2) + ' = ' + f(aChute, 2) + ' m².');
    ecrit.push('Boîtes : ' + f(aChute, 2) + ' ÷ ' + s(v.boite, 2) + ' m² par boîte = ' + f(aChute / v.boite, 2) + ', arrondi à ' + nBoites + ' boîtes (' + f(nBoites * v.boite, 2) + ' m² achetés).');
    var colleKg = a * v.colle, nColle = plafond(colleKg / 25);
    var jointKg = a * ((v.carL * 10 + v.carl * 10) / (v.carL * 10 * v.carl * 10)) * v.joint * v.epaisseur * 1.6, nJoint = plafond(jointKg / 5);
    ecrit.push('Colle : ' + f(a, 2) + ' m² × ' + s(v.colle) + ' kg/m² = ' + f(colleKg, 1) + ' kg (' + nColle + ' sac(s) de 25 kg).');
    ecrit.push('Joint : ((L + l) ÷ (L × l)) × largeur du joint × épaisseur × 1,6 = environ ' + f(jointKg / a, 2) + ' kg/m², soit ' + f(jointKg, 1) + ' kg (' + nJoint + ' sac(s) de 5 kg).');
    if (v.chute < 5) { alertes.push('Moins de 5 % de chute est risqué : prévoyez de quoi remplacer un carreau cassé.'); }
    if (v.joint > 8) { alertes.push('Un joint de plus de 8 mm est inhabituel : vérifiez la valeur saisie.'); }
    return { ok: true, t: { rSurface: f(a, 2) + ' m²', rChute: f(aChute, 2) + ' m²', rBoites: pluriel(nBoites, 'boîte', 'boîtes'), rCarreaux: '≈ ' + nCarreaux + ' carreaux' },
      liste: [['Carrelage', pluriel(nBoites, 'boîte', 'boîtes'), f(nBoites * v.boite, 2) + ' m² achetés, ≈ ' + nCarreaux + ' carreaux nécessaires'],
        ['Colle', f(colleKg, 1) + ' kg', nColle + ' sac(s) de 25 kg (' + s(v.colle) + ' kg/m²)'],
        ['Joint', f(jointKg, 1) + ' kg', nJoint + ' sac(s) de 5 kg (≈ ' + f(jointKg / a, 2) + ' kg/m²)'],
        ['Croisillons, profilés', 'selon le chantier', 'non calculés']],
      ecrit: ecrit, alertes: alertes, r: { aire: a, aireChute: aChute, boites: nBoites, carreaux: nCarreaux, colle: colleKg, joint: jointKg } };
  };

  // ---------------------------------------------------------------- 6. Parquet, stratifié
  calc.parquet = function (v) {
    if (!pos(v, ['longueur', 'largeur', 'paquet', 'rouleau', 'barre']) || manque(v, ['portes', 'chute'])) { return erreur(MSG); }
    var a = v.longueur * v.largeur, aC = a * (1 + v.chute / 100), ecrit = [], alertes = [];
    var np = plafond(aC / v.paquet), nr = plafond(a / v.rouleau);
    var per = 2 * (v.longueur + v.largeur), ml = Math.max(0, per - v.portes * 0.9), nb = plafond(ml * 1.1 / v.barre);
    ecrit.push('Surface : ' + s(v.longueur) + ' × ' + s(v.largeur) + ' = ' + f(a, 2) + ' m².');
    ecrit.push('Avec ' + s(v.chute, 0) + ' % de chute : ' + f(aC, 2) + ' m² → ' + f(aC, 2) + ' ÷ ' + s(v.paquet) + ' m² par paquet = ' + f(aC / v.paquet, 2) + ', arrondi à ' + np + ' paquets.');
    ecrit.push('Sous-couche : ' + f(a, 2) + ' ÷ ' + s(v.rouleau) + ' m² par rouleau = ' + nr + ' rouleau(x).');
    ecrit.push('Plinthes : périmètre ' + f(per, 2) + ' m − ' + s(v.portes, 0) + ' porte(s) × 0,9 m = ' + f(ml, 2) + ' m, + 10 % de coupes = ' + f(ml * 1.1, 2) + ' m → ' + nb + ' barre(s) de ' + s(v.barre) + ' m.');
    if (v.chute < 5) { alertes.push('Prévoyez au moins 5 % de chute : les coupes de bout de rangée ne se réutilisent pas toujours.'); }
    return { ok: true, t: { rSurface: f(a, 2) + ' m²', rPaquets: pluriel(np, 'paquet', 'paquets'), rSousCouche: pluriel(nr, 'rouleau', 'rouleaux'), rPlinthes: pluriel(nb, 'barre', 'barres') },
      liste: [['Lames ou dalles', pluriel(np, 'paquet', 'paquets'), f(np * v.paquet, 2) + ' m² achetés pour ' + f(aC, 2) + ' m² nécessaires'],
        ['Sous-couche', pluriel(nr, 'rouleau', 'rouleaux'), f(nr * v.rouleau, 1) + ' m² pour ' + f(a, 2) + ' m²'],
        ['Plinthes', pluriel(nb, 'barre', 'barres') + ' de ' + s(v.barre) + ' m', f(ml, 2) + ' m de mur + 10 % de coupes'],
        ['Cales, profilés de seuil', 'selon le chantier', 'non calculés']],
      ecrit: ecrit, alertes: alertes, r: { aire: a, paquets: np, rouleaux: nr, barres: nb, perimetre: per } };
  };

  // ---------------------------------------------------------------- 7. Papier peint
  calc.papierPeint = function (v) {
    if (!pos(v, ['longueur', 'largeur', 'hauteur', 'rLarg', 'rLong']) || manque(v, ['deduit', 'raccord']) || v.raccord < 0 || v.deduit < 0) { return erreur(MSG); }
    var per = 2 * (v.longueur + v.largeur), utile = per - v.deduit;
    if (utile <= 0) { return erreur('La largeur à déduire dépasse le périmètre : vérifiez les nombres.'); }
    var les = plafond(utile / v.rLarg), hLe = v.hauteur + 0.10 + v.raccord / 100, parRouleau = Math.floor((v.rLong + 1e-9) / hLe);
    if (parRouleau < 1) { return erreur('Le rouleau est trop court pour une seule hauteur de lé : vérifiez la longueur du rouleau.'); }
    var nR = plafond(les / parRouleau), ecrit = [], alertes = [];
    ecrit.push('Périmètre : 2 × (' + s(v.longueur) + ' + ' + s(v.largeur) + ') = ' + f(per, 2) + ' m ; à tapisser : ' + f(per, 2) + ' − ' + f(v.deduit, 2) + ' = ' + f(utile, 2) + ' m.');
    ecrit.push('Nombre de lés : ' + f(utile, 2) + ' ÷ ' + s(v.rLarg, 2) + ' m = ' + f(utile / v.rLarg, 2) + ', arrondi à ' + les + ' lés.');
    ecrit.push('Hauteur d\'un lé : ' + s(v.hauteur, 2) + ' + 0,10 m de marge de coupe' + (v.raccord > 0 ? ' + ' + s(v.raccord, 0) + ' cm de raccord' : '') + ' = ' + f(hLe, 2) + ' m.');
    ecrit.push('Lés par rouleau : ' + s(v.rLong, 2) + ' ÷ ' + f(hLe, 2) + ' = ' + parRouleau + ' (on garde la partie entière).');
    ecrit.push('Rouleaux : ' + les + ' ÷ ' + parRouleau + ' = ' + f(les / parRouleau, 2) + ', arrondi à ' + nR + ' rouleaux.');
    if (v.raccord > 0) { alertes.push('Avec un raccord, prenez un rouleau de plus si le motif est très marqué ou si vous craignez de rater une coupe.'); }
    return { ok: true, t: { rPerimetre: f(per, 2) + ' m', rLes: pluriel(les, 'lé', 'lés'), rParRouleau: parRouleau + ' lés par rouleau', rRouleaux: pluriel(nR, 'rouleau', 'rouleaux') },
      liste: [['Papier peint', pluriel(nR, 'rouleau', 'rouleaux'), les + ' lés de ' + f(hLe, 2) + ' m, ' + parRouleau + ' lé(s) par rouleau'],
        ['Colle', 'selon le papier', 'non calculée : lisez le nombre de rouleaux couverts sur le paquet'],
        ['Sous-couche ou impression', 'selon le mur', 'non calculées']],
      ecrit: ecrit, alertes: alertes, r: { perimetre: per, les: les, parRouleau: parRouleau, rouleaux: nR, hLe: hLe } };
  };

  // ---------------------------------------------------------------- 8. Pente
  calc.pente = function (v) {
    var pct, ecrit = [];
    if (v.entree === 'hl') {
      if (!pos(v, ['dh', 'dl'])) { return erreur(MSG); }
      pct = (v.dh / 100) / v.dl * 100;
      ecrit.push('Pente = dénivelé ÷ longueur = ' + s(v.dh, 1) + ' cm ÷ ' + s(v.dl * 100, 1) + ' cm = ' + f(pct, 2) + ' %.');
    } else if (v.entree === 'deg') {
      if (!(v.valeur >= 0) || v.valeur >= 90) { return erreur('Indiquez un angle entre 0 et 90 degrés.'); }
      pct = Math.tan(v.valeur * Math.PI / 180) * 100;
      ecrit.push('Pente en % = tan(' + s(v.valeur, 2) + ' °) × 100 = ' + f(pct, 2) + ' %.');
    } else if (v.entree === 'cmm') {
      if (!(v.valeur >= 0)) { return erreur(MSG); }
      pct = v.valeur;
      ecrit.push('Pente en % = cm par mètre = ' + f(pct, 2) + ' % (1 m = 100 cm).');
    } else {
      if (!(v.valeur >= 0)) { return erreur(MSG); }
      pct = v.valeur;
      ecrit.push('Pente saisie : ' + f(pct, 2) + ' %.');
    }
    var deg = Math.atan(pct / 100) * 180 / Math.PI, alertes = [], liste = [];
    ecrit.push('Angle = arctan(' + f(pct / 100, 4) + ') = ' + f(deg, 2) + ' °.');
    var t = { rPct: f(pct, 2) + ' %', rDeg: f(deg, 2) + ' °', rCmm: f(pct, 2) + ' cm/m', rRatio: pct > 0 ? '1 pour ' + s(100 / pct, 1) : '–' };
    if (v.sur > 0) {
      var d = pct * v.sur;
      t.rSur = f(d, 1) + ' cm';
      ecrit.push('Sur ' + s(v.sur, 2) + ' m de long : ' + f(pct, 2) + ' cm/m × ' + s(v.sur, 2) + ' m = ' + f(d, 1) + ' cm de dénivelé.');
      liste.push(['Dénivelé sur ' + s(v.sur, 2) + ' m', f(d, 1) + ' cm', 'soit ' + f(d / 100, 3) + ' m']);
    } else { t.rSur = '–'; }
    liste.push(['Pente 1 %', '1 cm par mètre', '≈ 0,57 °']);
    liste.push(['Pente 2 %', '2 cm par mètre', '≈ 1,15 °']);
    liste.push(['Pente 5 %', '5 cm par mètre', '≈ 2,86 °']);
    liste.push(['Pente 10 %', '10 cm par mètre', '≈ 5,71 °']);
    liste.push(['Pente 100 %', '1 m par mètre', '45 °']);
    if (pct > 100) { alertes.push('Au-delà de 100 % la pente dépasse 45 °.'); }
    return { ok: true, t: t, liste: liste, ecrit: ecrit, alertes: alertes, r: { pct: pct, deg: deg } };
  };

  // ---------------------------------------------------------------- 9. Chape, ragréage
  calc.chape = function (v) {
    var ecrit = [], alertes = [], a = aireDe(v, ecrit);
    if (!(a > 0) || manque(v, ['marge']) || v.marge < 0) { return erreur(MSG); }
    var coef = 1 + v.marge / 100, liste = [], t = {}, r = { aire: a };
    if (v.type === 'ragreage') {
      if (!pos(v, ['ragEp', 'ragConso'])) { return erreur(MSG); }
      var kg = a * v.ragEp * v.ragConso * coef, n = plafond(kg / 25);
      ecrit.push('Ragréage : ' + f(a, 2) + ' m² × ' + s(v.ragEp) + ' mm × ' + s(v.ragConso) + ' kg/m²/mm × ' + s(coef, 2) + ' = ' + f(kg, 0) + ' kg, soit ' + n + ' sacs de 25 kg.');
      liste.push(['Ragréage autolissant', pluriel(n, 'sac', 'sacs') + ' de 25 kg', f(kg, 0) + ' kg nécessaires']);
      liste.push(['Primaire d\'accrochage', 'selon le support', 'à prévoir : suivez la fiche du ragréage']);
      t = { rVolume: f(a * v.ragEp / 1000 * coef, 3) + ' m³', rMasse: f(kg, 0) + ' kg', rSacs: pluriel(n, 'sac', 'sacs') + ' de 25 kg', rSable: '–', rCiment: '–' };
      if (v.ragEp > 10) { alertes.push('Un ragréage se pose en couche fine (quelques millimètres) : au-delà, demandez conseil à un professionnel ou choisissez une chape.'); }
      r.kg = kg; r.sacs = n;
    } else {
      if (!pos(v, ['ep'])) { return erreur(MSG); }
      var vol = a * v.ep / 100, volM = vol * coef;
      ecrit.push('Volume : ' + f(a, 2) + ' m² × ' + s(v.ep / 100, 3) + ' m = ' + f(vol, 3) + ' m³ ; avec ' + s(v.marge, 0) + ' % de marge : ' + f(volM, 3) + ' m³.');
      if (v.type === 'pret') {
        if (!pos(v, ['densitePret'])) { return erreur(MSG); }
        var kgP = volM * v.densitePret, nP = plafond(kgP / 25);
        ecrit.push('Chape prête à gâcher : ' + f(volM, 3) + ' m³ × ' + s(v.densitePret, 0) + ' kg/m³ = ' + f(kgP, 0) + ' kg, soit ' + nP + ' sacs de 25 kg.');
        liste.push(['Chape prête à gâcher', pluriel(nP, 'sac', 'sacs') + ' de 25 kg', f(kgP, 0) + ' kg (≈ ' + f(kgP / (a * v.ep), 1) + ' kg par m² et par cm)']);
        t = { rVolume: f(volM, 2) + ' m³', rMasse: f(kgP, 0) + ' kg', rSacs: pluriel(nP, 'sac', 'sacs') + ' de 25 kg', rSable: '–', rCiment: '–' };
        r.kg = kgP; r.sacs = nP;
      } else {
        if (!pos(v, ['dosage'])) { return erreur(MSG); }
        var cim = v.dosage * volM, nC = plafond(cim / 25), sab = volM;
        ecrit.push('Ciment : ' + s(v.dosage, 0) + ' kg par m³ de chape × ' + f(volM, 3) + ' m³ = ' + f(cim, 0) + ' kg, soit ' + nC + ' sacs de 25 kg.');
        ecrit.push('Sable : environ 1 m³ par m³ de chape → ' + f(sab, 2) + ' m³ (≈ ' + f(sab * 1.5, 2) + ' t).');
        liste.push(['Ciment', pluriel(nC, 'sac', 'sacs') + ' de 25 kg', f(cim, 0) + ' kg nécessaires']);
        liste.push(['Sable 0/4', f(sab, 2) + ' m³', 'environ ' + f(sab * 1.5, 2) + ' t']);
        liste.push(['Eau', 'peu', 'on cherche une consistance de terre humide : ajoutez-la petit à petit']);
        t = { rVolume: f(volM, 2) + ' m³', rMasse: f(cim + sab * 1500, 0) + ' kg', rSacs: pluriel(nC, 'sac', 'sacs') + ' de 25 kg', rSable: f(sab, 2) + ' m³', rCiment: f(cim, 0) + ' kg' };
        r.ciment = cim; r.sacs = nC; r.sable = sab;
      }
      if (v.ep < 3 || v.ep > 10) { alertes.push('L\'épaisseur d\'une chape dépend de son type (adhérente, désolidarisée, flottante) : suivez le DTU 26.2 ou demandez à un professionnel.'); }
    }
    r.volume = t.rVolume;
    return { ok: true, t: t, liste: liste, ecrit: ecrit, alertes: alertes, r: r };
  };

  // ---------------------------------------------------------------- 10. Gravier, sable, terre
  calc.gravier = function (v) {
    var ecrit = [], alertes = [], a = aireDe(v, ecrit);
    var d = densite(v);
    if (!(a > 0) || !pos(v, ['ep']) || !(d > 0) || manque(v, ['marge']) || v.marge < 0) { return erreur(MSG); }
    var vol = a * v.ep / 100, volM = vol * (1 + v.marge / 100), t = volM * d / 1000, bb = parseFloat(v.bigbag) > 0 ? parseFloat(v.bigbag) : 1;
    var nbb = plafond(t / bb);
    ecrit.push('Volume : ' + f(a, 2) + ' m² × ' + s(v.ep / 100, 3) + ' m = ' + f(vol, 3) + ' m³ ; avec ' + s(v.marge, 0) + ' % de marge (tassement) : ' + f(volM, 3) + ' m³.');
    ecrit.push('Masse : ' + f(volM, 3) + ' m³ × ' + s(d, 0) + ' kg/m³ = ' + f(t, 2) + ' t (' + nomMateriau(v) + ').');
    ecrit.push('Big bags : ' + f(t, 2) + ' t ÷ ' + s(bb) + ' t = ' + f(t / bb, 2) + ', arrondi à ' + nbb + '.');
    if (v.ep > 30) { alertes.push('Une couche de plus de 30 cm se met en plusieurs passes, compactées une à une.'); }
    return { ok: true, t: { rSurface: f(a, 2) + ' m²', rVolume: f(volM, 2) + ' m³', rTonnes: f(t, 2) + ' t', rBigbags: pluriel(nbb, 'big bag', 'big bags') + ' de ' + s(bb) + ' t' },
      liste: [['Matériau (' + nomMateriau(v) + ')', f(volM, 2) + ' m³', f(t, 2) + ' tonnes'], ['Big bags de ' + s(bb) + ' t', pluriel(nbb, 'big bag', 'big bags'), f(nbb * bb, 1) + ' t livrées']],
      ecrit: ecrit, alertes: alertes, r: { aire: a, volume: volM, tonnes: t, bigbags: nbb } };
  };

  // ---------------------------------------------------------------- 11. Placo (cloison)
  calc.placo = function (v) {
    if (!pos(v, ['longueur', 'hauteur', 'plL', 'plH', 'entraxe']) || manque(v, ['ouverture', 'chute', 'faces']) || v.ouverture < 0 || v.chute < 0) { return erreur(MSG); }
    var faces = v.faces === 1 ? 1 : 2, ecrit = [], alertes = [];
    var mur = v.longueur * v.hauteur, surf = (mur - v.ouverture) * faces;
    if (surf <= 0) { return erreur('Les ouvertures dépassent la surface du mur.'); }
    var sp = v.plL * v.plH, nP = plafond(surf * (1 + v.chute / 100) / sp);
    var nM = plafond(v.longueur / v.entraxe) + 1, rails = 2 * v.longueur, nRails = plafond(rails / 3);
    var vis = plafond(faces * nM * (plafond(v.hauteur / 0.30) + 1) * 1.1), bande = faces * ((mur - v.ouverture) / sp) * (v.plL + v.plH), enduit = surf * 0.5;
    ecrit.push('Surface de plaques : (' + f(v.longueur, 2) + ' × ' + f(v.hauteur, 2) + ' − ' + f(v.ouverture, 2) + ') × ' + faces + ' face(s) = ' + f(surf, 2) + ' m².');
    ecrit.push('Plaques : ' + f(surf, 2) + ' m² × ' + s(1 + v.chute / 100, 2) + ' ÷ ' + f(sp, 2) + ' m² par plaque = ' + f(surf * (1 + v.chute / 100) / sp, 2) + ', arrondi à ' + nP + ' plaques.');
    ecrit.push('Montants : ' + f(v.longueur, 2) + ' ÷ ' + s(v.entraxe, 2) + ' m d\'entraxe = ' + f(v.longueur / v.entraxe, 2) + ' → ' + plafond(v.longueur / v.entraxe) + ' + 1 = ' + nM + ' montants.');
    ecrit.push('Rails : 2 × ' + f(v.longueur, 2) + ' m (haut et bas) = ' + f(rails, 2) + ' m → ' + nRails + ' barre(s) de 3 m.');
    ecrit.push('Vis : ' + faces + ' face(s) × ' + nM + ' montants × (1 vis tous les 30 cm = ' + (plafond(v.hauteur / 0.30) + 1) + ' vis par montant) + 10 % = ' + vis + ' vis.');
    ecrit.push('Bande à joint : ' + f(bande, 1) + ' m ; enduit : ' + f(surf, 1) + ' m² × 0,5 kg/m² = ' + f(enduit, 1) + ' kg (repère).');
    if (v.hauteur > 3) { alertes.push('Au-delà de 3 m de hauteur, les montants se choisissent avec le fabricant du système.'); }
    return { ok: true, t: { rSurface: f(surf, 1) + ' m²', rPlaques: pluriel(nP, 'plaque', 'plaques'), rMontants: pluriel(nM, 'montant', 'montants') + ' + ' + pluriel(nRails, 'rail de 3 m', 'rails de 3 m'), rVis: vis + ' vis' },
      liste: [['Plaques ' + s(v.plL) + ' × ' + s(v.plH) + ' m', pluriel(nP, 'plaque', 'plaques'), f(nP * sp, 1) + ' m² achetés pour ' + f(surf, 1) + ' m² posés'],
        ['Montants (entraxe ' + s(v.entraxe * 100, 0) + ' cm)', pluriel(nM, 'montant', 'montants'), 'longueur au moins égale à la hauteur ' + f(v.hauteur, 2) + ' m'],
        ['Rails (haut et bas)', f(rails, 1) + ' m', pluriel(nRails, 'barre', 'barres') + ' de 3 m'],
        ['Vis pour plaques', vis + ' vis', 'une tous les 30 cm environ, + 10 %'],
        ['Bande à joint', f(bande, 0) + ' m', 'repère : bords des plaques'],
        ['Enduit à joint', f(enduit, 1) + ' kg', 'ordre de grandeur : lisez la fiche du produit']],
      ecrit: ecrit, alertes: alertes, r: { surface: surf, plaques: nP, montants: nM, rails: nRails, vis: vis, bande: bande, enduit: enduit } };
  };

  // ---------------------------------------------------------------- 12. Terrasse bois
  calc.terrasse = function (v) {
    if (!pos(v, ['longueur', 'largeur', 'lame', 'lameLong', 'entraxe', 'plots', 'lambLong']) || manque(v, ['ecart', 'chute']) || v.ecart < 0 || v.chute < 0) { return erreur(MSG); }
    var a = v.longueur * v.largeur, rangs = plafond(v.largeur * 100 / (v.lame + v.ecart / 10));
    var ml = rangs * v.longueur * (1 + v.chute / 100), nLames = plafond(ml / v.lameLong);
    var nLamb = Math.floor(v.longueur * 100 / v.entraxe + 1e-9) + 1, mlLamb = nLamb * v.largeur * 1.1, nBarres = plafond(mlLamb / v.lambLong);
    var plotsParLamb = plafond(v.largeur * 100 / v.plots) + 1, nPlots = nLamb * plotsParLamb;
    var vis = plafond(rangs * nLamb * 2 * 1.05), ecrit = [], alertes = [];
    ecrit.push('Surface : ' + s(v.longueur) + ' × ' + s(v.largeur) + ' = ' + f(a, 2) + ' m².');
    ecrit.push('Rangées de lames : ' + f(v.largeur * 100, 0) + ' cm ÷ (' + s(v.lame) + ' cm + ' + s(v.ecart / 10, 2) + ' cm d\'écart) = ' + f(v.largeur * 100 / (v.lame + v.ecart / 10), 2) + ', arrondi à ' + rangs + ' rangées.');
    ecrit.push('Lames : ' + rangs + ' × ' + s(v.longueur) + ' m + ' + s(v.chute, 0) + ' % de chute = ' + f(ml, 1) + ' m → ' + nLames + ' lames de ' + s(v.lameLong) + ' m.');
    ecrit.push('Lambourdes (perpendiculaires aux lames) : ' + f(v.longueur * 100, 0) + ' cm ÷ ' + s(v.entraxe, 0) + ' cm d\'entraxe → ' + nLamb + ' lambourdes de ' + s(v.largeur) + ' m, soit ' + f(nLamb * v.largeur, 1) + ' m (+ 10 % de coupes) → ' + nBarres + ' barre(s) de ' + s(v.lambLong) + ' m.');
    ecrit.push('Plots : ' + plotsParLamb + ' par lambourde (un tous les ' + s(v.plots, 0) + ' cm) × ' + nLamb + ' = ' + nPlots + ' plots.');
    ecrit.push('Vis : ' + rangs + ' rangées × ' + nLamb + ' lambourdes × 2 vis par croisement + 5 % = ' + vis + ' vis.');
    if (v.entraxe > 50) { alertes.push('Un entraxe de lambourdes de plus de 50 cm est rarement admis : voir le DTU 51.4 et la fiche du fabricant des lames.'); }
    return { ok: true, t: { rSurface: f(a, 2) + ' m²', rLames: pluriel(nLames, 'lame', 'lames') + ' de ' + s(v.lameLong) + ' m', rLambourdes: pluriel(nBarres, 'barre', 'barres') + ' de ' + s(v.lambLong) + ' m', rPlots: pluriel(nPlots, 'plot', 'plots'), rVis: vis + ' vis' },
      liste: [['Lames de terrasse', pluriel(nLames, 'lame', 'lames') + ' de ' + s(v.lameLong) + ' m', rangs + ' rangées, ' + f(nLames * v.lameLong, 1) + ' m achetés'],
        ['Lambourdes', pluriel(nBarres, 'barre', 'barres') + ' de ' + s(v.lambLong) + ' m', nLamb + ' lambourdes de ' + s(v.largeur) + ' m'],
        ['Plots réglables', pluriel(nPlots, 'plot', 'plots'), 'un tous les ' + s(v.plots, 0) + ' cm sur chaque lambourde'],
        ['Vis inox ou clips', vis + ' vis', '2 par croisement lame / lambourde, + 5 %'],
        ['Bandes bitumeuses, géotextile', 'selon le sol', 'non calculés']],
      ecrit: ecrit, alertes: alertes, r: { aire: a, rangs: rangs, lames: nLames, lamb: nLamb, barres: nBarres, plots: nPlots, vis: vis } };
  };

  // ---------------------------------------------------------------- 13. Isolation (R = e / λ)
  calc.isolation = function (v) {
    var ecrit = [], alertes = [], liste = [], t = {}, r = {};
    if (!pos(v, ['lambda'])) { return erreur(MSG); }
    if (v.lambda < 0.015 || v.lambda > 0.2) { alertes.push('Un lambda d\'isolant se situe en général entre 0,02 et 0,06 W/m·K : relisez la valeur de l\'étiquette.'); }
    var e, R;
    if (v.sens === 'epaisseur') {
      if (!pos(v, ['rVise'])) { return erreur(MSG); }
      R = v.rVise; e = R * v.lambda * 1000;
      var ec = Math.ceil(e / 10 - 1e-9) * 10;
      ecrit.push('Épaisseur = R × λ = ' + s(R, 2) + ' × ' + s(v.lambda, 3) + ' = ' + f(e / 1000, 3) + ' m = ' + f(e, 0) + ' mm.');
      ecrit.push('Épaisseur à acheter : ' + f(e, 0) + ' mm arrondis au centimètre supérieur = ' + ec + ' mm (' + f(ec / 1000 / v.lambda, 2) + ' m².K/W).');
      t = { rR: s(R, 2) + ' m².K/W', rEpaisseur: f(e, 0) + ' mm' };
      liste.push(['Épaisseur nécessaire', f(e, 0) + ' mm', 'à arrondir à ' + ec + ' mm (épaisseurs du commerce à vérifier)']);
      r.e = e; r.achat = ec; e = ec;
    } else {
      if (!pos(v, ['epaisseur'])) { return erreur(MSG); }
      e = v.epaisseur; R = e / 1000 / v.lambda;
      ecrit.push('R = e ÷ λ = ' + f(e / 1000, 3) + ' m ÷ ' + s(v.lambda, 3) + ' W/m·K = ' + f(R, 2) + ' m².K/W.');
      t = { rR: f(R, 2) + ' m².K/W', rEpaisseur: f(e, 0) + ' mm' };
      liste.push(['Résistance thermique R', f(R, 2) + ' m².K/W', 'pour ' + f(e, 0) + ' mm à λ = ' + s(v.lambda, 3)]);
      r.R = R;
    }
    if (v.surface > 0) {
      var vol = v.surface * e / 1000;
      t.rVolume = f(v.surface, 1) + ' m² · ' + f(vol, 2) + ' m³';
      liste.push(['Isolant à acheter', f(v.surface, 1) + ' m²', f(vol, 2) + ' m³ à l\'épaisseur de ' + f(e, 0) + ' mm (' + 'ajoutez la chute et vérifiez le nombre de m² par paquet)']);
      ecrit.push('Surface isolée : ' + f(v.surface, 1) + ' m² × ' + f(e / 1000, 3) + ' m = ' + f(vol, 2) + ' m³.');
    } else { t.rVolume = '–'; }
    return { ok: true, t: t, liste: liste, ecrit: ecrit, alertes: alertes, r: r };
  };

  // ---------------------------------------------------------------- 14. Clôture
  calc.cloture = function (v) {
    if (!pos(v, ['longueur', 'lPanneau', 'rouleau', 'trou', 'prof']) || manque(v, ['portail']) || v.portail < 0) { return erreur(MSG); }
    var net = v.longueur - v.portail;
    if (net <= 0) { return erreur('Le portail est plus large que la clôture : vérifiez les longueurs.'); }
    var ecrit = [], alertes = [], liste = [], t, r = {};
    var pas = v.type === 'grillage' ? v.entraxe : v.lPanneau;
    if (!(pas > 0)) { return erreur(MSG); }
    var sections = plafond(net / pas), poteaux = sections + 1 + (v.portail > 0 ? 1 : 0);
    var beton = poteaux * Math.pow(v.trou / 100, 2) * (v.prof / 100);
    ecrit.push('Longueur à clore : ' + f(v.longueur, 2) + ' m − portail ' + f(v.portail, 2) + ' m = ' + f(net, 2) + ' m.');
    ecrit.push((v.type === 'grillage' ? 'Poteaux : un tous les ' : 'Panneaux : ' + f(net, 2) + ' ÷ ') + s(pas, 2) + ' m' + (v.type === 'grillage' ? '' : ' = ' + f(net / pas, 2)) + ' → ' + sections + ' sections.');
    ecrit.push('Poteaux : ' + sections + ' + 1 pour fermer la ligne' + (v.portail > 0 ? ' + 1 pour le portail (le portail coupe la ligne en deux)' : '') + ' = ' + poteaux + '.');
    ecrit.push('Béton de scellement : ' + poteaux + ' trous de ' + s(v.trou, 0) + ' × ' + s(v.trou, 0) + ' cm sur ' + s(v.prof, 0) + ' cm = ' + f(beton, 3) + ' m³ (sans compter le volume du poteau).');
    liste.push(['Poteaux', pluriel(poteaux, 'poteau', 'poteaux'), 'dont ' + (v.portail > 0 ? 'les poteaux de portail à renforcer' : 'deux poteaux d\'extrémité à renforcer')]);
    if (v.type === 'grillage') {
      var nR = plafond(net / v.rouleau);
      ecrit.push('Grillage : ' + f(net, 2) + ' ÷ ' + s(v.rouleau) + ' m par rouleau = ' + nR + ' rouleau(x).');
      liste.push(['Grillage', pluriel(nR, 'rouleau', 'rouleaux') + ' de ' + s(v.rouleau) + ' m', f(nR * v.rouleau, 0) + ' m achetés pour ' + f(net, 1) + ' m']);
      liste.push(['Fil de tension, tendeurs, attaches', 'selon la hauteur', 'non calculés : suivez la notice du grillage']);
      t = { rLongueur: f(net, 1) + ' m', rPoteaux: pluriel(poteaux, 'poteau', 'poteaux'), rElements: pluriel(nR, 'rouleau', 'rouleaux') + ' de ' + s(v.rouleau) + ' m', rBeton: f(beton, 2) + ' m³' };
      r.rouleaux = nR;
    } else {
      liste.push(['Panneaux de ' + s(v.lPanneau, 2) + ' m', pluriel(sections, 'panneau', 'panneaux'), f(sections * v.lPanneau, 1) + ' m achetés pour ' + f(net, 1) + ' m']);
      liste.push(['Fixations (clips, vis)', 'selon le modèle', 'non calculées']);
      t = { rLongueur: f(net, 1) + ' m', rPoteaux: pluriel(poteaux, 'poteau', 'poteaux'), rElements: pluriel(sections, 'panneau', 'panneaux'), rBeton: f(beton, 2) + ' m³' };
      r.panneaux = sections;
    }
    liste.push(['Béton de scellement', f(beton, 3) + ' m³', 'à calculer avec l\'outil béton pour connaître les sacs']);
    if (v.portail > 0) { alertes.push('Un portail lourd demande des poteaux et des fondations calculés pour lui : suivez la notice du fabricant.'); }
    r.poteaux = poteaux; r.beton = beton; r.sections = sections;
    return { ok: true, t: t, liste: liste, ecrit: ecrit, alertes: alertes, r: r };
  };

  // ---------------------------------------------------------------- 15. Surface d'une pièce
  calc.piece = function (v) {
    var aire, per, ecrit = [], alertes = [];
    if (v.forme === 'L') {
      if (!pos(v, ['lA', 'lB', 'la', 'lb'])) { return erreur(MSG); }
      if (v.la >= v.lA || v.lb >= v.lB) { return erreur('La partie enlevée doit être plus petite que le grand rectangle.'); }
      aire = v.lA * v.lB - v.la * v.lb; per = 2 * (v.lA + v.lB);
      ecrit.push('Pièce en L = grand rectangle − angle manquant : ' + s(v.lA) + ' × ' + s(v.lB) + ' − ' + s(v.la) + ' × ' + s(v.lb) + ' = ' + f(aire, 2) + ' m².');
      ecrit.push('Périmètre : le même que celui du grand rectangle, 2 × (' + s(v.lA) + ' + ' + s(v.lB) + ') = ' + f(per, 2) + ' m.');
    } else if (v.forme === 'triangle') {
      if (!pos(v, ['tB', 'tH', 'tC', 'tD'])) { return erreur(MSG); }
      aire = v.tB * v.tH / 2; per = v.tB + v.tC + v.tD;
      ecrit.push('Triangle : base × hauteur ÷ 2 = ' + s(v.tB) + ' × ' + s(v.tH) + ' ÷ 2 = ' + f(aire, 2) + ' m².');
      ecrit.push('Périmètre : somme des trois côtés = ' + f(per, 2) + ' m.');
    } else if (v.forme === 'cercle') {
      if (!pos(v, ['cD'])) { return erreur(MSG); }
      aire = Math.PI * Math.pow(v.cD / 2, 2); per = Math.PI * v.cD;
      ecrit.push('Disque : π × rayon² = π × ' + s(v.cD / 2, 3) + '² = ' + f(aire, 2) + ' m² ; périmètre π × diamètre = ' + f(per, 2) + ' m.');
    } else {
      if (!pos(v, ['rL', 'rl'])) { return erreur(MSG); }
      aire = v.rL * v.rl; per = 2 * (v.rL + v.rl);
      ecrit.push('Rectangle : ' + s(v.rL) + ' × ' + s(v.rl) + ' = ' + f(aire, 2) + ' m² ; périmètre 2 × (' + s(v.rL) + ' + ' + s(v.rl) + ') = ' + f(per, 2) + ' m.');
    }
    var t = { rAire: f(aire, 2) + ' m²', rPerimetre: f(per, 2) + ' m' }, liste = [];
    if (v.hauteur > 0) {
      var murs = per * v.hauteur;
      t.rMurs = f(murs, 2) + ' m²';
      ecrit.push('Murs (sans retirer portes ni fenêtres) : ' + f(per, 2) + ' × ' + s(v.hauteur) + ' = ' + f(murs, 2) + ' m².');
      liste.push(['Surface au sol', f(aire, 2) + ' m²', 'carrelage, parquet, chape, ragréage']);
      liste.push(['Surface des murs', f(murs, 2) + ' m²', 'peinture, papier peint (moins les ouvertures)']);
      liste.push(['Plafond', f(aire, 2) + ' m²', 'peinture, dalles']);
    } else { t.rMurs = '–'; liste.push(['Surface au sol', f(aire, 2) + ' m²', 'carrelage, parquet, chape, ragréage']); }
    return { ok: true, t: t, liste: liste, ecrit: ecrit, alertes: alertes, r: { aire: aire, perimetre: per } };
  };

  var API = { calc: calc, MATERIAUX: MATERIAUX, combiner: combiner, fmt: f };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
  racine.BRI = API;
}(typeof window !== 'undefined' ? window : globalThis));
