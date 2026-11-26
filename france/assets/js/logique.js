/* Départements de France : fonctions pures des outils (testées sous Node : tests\test_logique.js).
   Aucune donnée n'est envoyée : tout se calcule dans le navigateur. Exposé dans window.FR (navigateur) ou module.exports (Node). */
(function (racine) {
  'use strict';
  var NBSP = ' ';

  // Codes INSEE qui ne sont pas des départements (COG 2026, fichier des collectivités d'outre-mer) + l'ancien 20
  var SPECIAUX = {
    '20': "Le 20 était le numéro de la Corse jusqu'en 1976. Elle compte aujourd'hui deux départements : 2A (Corse-du-Sud) et 2B (Haute-Corse). Les codes postaux corses commencent toujours par 20.",
    '975': "975 : Saint-Pierre-et-Miquelon, collectivité d'outre-mer. Ce fut un département de 1976 à 1985, ce n'en est plus un.",
    '977': "977 : Saint-Barthélemy, collectivité d'outre-mer depuis 2007 (auparavant rattachée à la Guadeloupe). Ce n'est pas un département.",
    '978': "978 : Saint-Martin, collectivité d'outre-mer depuis 2007 (auparavant rattachée à la Guadeloupe). Ce n'est pas un département.",
    '984': "984 : Terres australes et antarctiques françaises. Ce code INSEE n'est pas celui d'un département.",
    '986': "986 : Wallis-et-Futuna. Ce code INSEE n'est pas celui d'un département.",
    '987': "987 : Polynésie française. Ce code INSEE n'est pas celui d'un département.",
    '988': "988 : Nouvelle-Calédonie. Ce code INSEE n'est pas celui d'un département.",
    '989': "989 : La Passion-Clipperton. Ce code INSEE n'est pas celui d'un département."
  };

  function normaliser(s) {
    s = String(s === undefined || s === null ? '' : s).slice(0, 80).toLowerCase();
    if (s.normalize) { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
    return s.replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/[\u2019'`\u00b4\-_.,;:()]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Lit un numéro tapé : renvoie {code:'01'} pour un département, {special:'20', message} pour un code connu qui n'en est
  // pas un, {erreur:message} sinon, ou null si la saisie est vide.
  function lireNumero(saisie) {
    var s = String(saisie === undefined || saisie === null ? '' : saisie).slice(0, 10).replace(/\s+/g, '').toUpperCase();
    if (!s) { return null; }
    var m = /^0?2([AB])$/.exec(s);
    if (m) { return { code: '2' + m[1] }; }
    if (!/^\d{1,3}$/.test(s)) { return { erreur: 'Tapez un numéro : 1 à 95, 2A, 2B, ou 971 à 976.' }; }
    var n = parseInt(s, 10);
    if (s.length === 3 && n >= 900) {
      if (n >= 971 && n <= 976 && n !== 975) { return { code: String(n) }; }
      if (SPECIAUX[String(n)]) { return { special: String(n), message: SPECIAUX[String(n)] }; }
      return { erreur: "Aucun département ne porte ce numéro. Outre-mer, les numéros vont de 971 à 976 (sans 975)." };
    }
    if (n === 20) { return { special: '20', message: SPECIAUX['20'] }; }
    if (n >= 1 && n <= 95) { return { code: (n < 10 ? '0' : '') + n }; }
    if (n === 97) { return { erreur: 'Outre-mer, le numéro a trois chiffres : 971 Guadeloupe, 972 Martinique, 973 Guyane, 974 La Réunion, 976 Mayotte.' }; }
    return { erreur: 'Aucun département ne porte ce numéro : en métropole, ils vont de 01 à 95 (2A et 2B pour la Corse).' };
  }

  // Ordre officiel : 01 … 19, 2A, 2B, 21 … 95, 971 … 976
  function ordreCode(c) {
    c = String(c);
    if (c === '2A') { return 20.1; }
    if (c === '2B') { return 20.2; }
    var n = parseInt(c, 10);
    return isNaN(n) ? 9999 : n;
  }

  // Recherche par nom de département ou de préfecture (au plus `max` résultats, 101 lignes parcourues au plus)
  function chercher(liste, saisie, max) {
    var q = normaliser(saisie);
    max = Math.max(1, Math.min(20, max || 8));
    if (q.length < 2) { return []; }
    var res = [];
    var n = Math.min(liste.length, 200);
    for (var i = 0; i < n; i++) {
      var d = liste[i];
      var nom = normaliser(d.n), pref = normaliser(d.p);
      var score = -1, par = 'nom';
      if (nom === q) { score = 0; }
      else if (nom.indexOf(q) === 0) { score = 1; }
      else if ((' ' + nom).indexOf(' ' + q) >= 0) { score = 2; }
      else if (nom.indexOf(q) >= 0) { score = 3; }
      else if (pref === q) { score = 4; par = 'prefecture'; }
      else if (pref.indexOf(q) === 0) { score = 5; par = 'prefecture'; }
      else if (pref.indexOf(q) >= 0) { score = 6; par = 'prefecture'; }
      if (score >= 0) { res.push({ d: d, par: par, score: score }); }
    }
    res.sort(function (a, b) { return a.score - b.score || ordreCode(a.d.c) - ordreCode(b.d.c); });
    return res.slice(0, max);
  }

  // Filtre de la liste : numéro exact, nom, préfecture ou région
  function filtrer(liste, saisie) {
    var q = normaliser(saisie);
    if (!q) { return liste.slice(); }
    var num = lireNumero(q);
    return liste.filter(function (d) {
      if (num && num.code && num.code === d.c) { return true; }
      return normaliser(d.n).indexOf(q) >= 0 || normaliser(d.p).indexOf(q) >= 0 || normaliser(d.r).indexOf(q) >= 0;
    });
  }

  var CLES = { code: 1, nom: 1, prefecture: 1, region: 1, pop: 1, sup: 1, dens: 1, com: 1 };
  function valeur(d, cle) {
    switch (cle) {
      case 'code': return ordreCode(d.c);
      case 'nom': return normaliser(d.n);
      case 'prefecture': return normaliser(d.p);
      case 'region': return normaliser(d.r);
      case 'pop': return d.pop;
      case 'sup': return d.s;
      case 'dens': return d.pop / d.s;
      case 'com': return d.com;
    }
    return 0;
  }
  function trier(liste, cle, sens) {
    if (!CLES[cle]) { cle = 'code'; }
    var k = sens === 'desc' ? -1 : 1;
    return liste.slice().sort(function (a, b) {
      var x = valeur(a, cle), y = valeur(b, cle);
      if (x < y) { return -k; }
      if (x > y) { return k; }
      return ordreCode(a.c) - ordreCode(b.c);
    });
  }
  function cleValide(cle) { return CLES[cle] ? cle : null; }

  // Seuils de classes (quantiles) pour colorer la carte : n classes, n-1 seuils croissants
  function seuils(valeurs, n) {
    var v = valeurs.filter(function (x) { return typeof x === 'number' && isFinite(x); }).sort(function (a, b) { return a - b; });
    n = Math.max(2, Math.min(9, n || 5));
    var s = [];
    if (!v.length) { return s; }
    for (var i = 1; i < n; i++) { s.push(v[Math.min(v.length - 1, Math.floor(v.length * i / n))]); }
    return s;
  }
  function classe(x, s) {
    var i = 0;
    while (i < s.length && x >= s[i]) { i++; }
    return i;
  }

  // Hasard reproductible (tests) : mulberry32
  function hasard(graine) {
    var a = (graine >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function melanger(t, rnd) {
    var a = t.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var x = a[i]; a[i] = a[j]; a[j] = x;
    }
    return a;
  }

  var MODES = { numero: 1, nom: 1, prefecture: 1, carte: 1 };
  function modeValide(m) { return MODES[m] ? m : null; }

  // Série de questions : n départements différents ; 4 choix (dont la réponse) sauf en mode carte.
  function serie(liste, mode, n, rnd) {
    if (!MODES[mode]) { mode = 'numero'; }
    n = Math.max(1, Math.min(liste.length, n || 10, 101));
    var cibles = melanger(liste, rnd).slice(0, n);
    return cibles.map(function (d) {
      var q = { mode: mode, cible: d.c, choix: [] };
      if (mode !== 'carte') {
        var autres = melanger(liste.filter(function (x) {
          return x.c !== d.c && (mode !== 'prefecture' || x.p !== d.p);
        }), rnd).slice(0, 3);
        q.choix = melanger([d].concat(autres), rnd).map(function (x) { return x.c; });
      }
      return q;
    });
  }
  function verifier(q, reponse) { return !!q && String(reponse) === q.cible; }
  function libelleChoix(d, mode) {
    if (mode === 'numero') { return d.n; }
    if (mode === 'nom') { return d.c; }
    if (mode === 'prefecture') { return d.p; }
    return d.n;
  }
  function enonce(d, mode) {
    if (mode === 'numero') { return 'Quel département porte le numéro ' + d.c + ' ?'; }
    if (mode === 'nom') { return 'Quel est le numéro ' + d.de + ' ?'; }
    if (mode === 'prefecture') { return 'Quelle est la préfecture ' + d.de + ' ?'; }
    return 'Trouvez ' + d.le + ' sur la carte.';
  }
  function meilleur(ancien, score, total) {
    var a = parseInt(ancien, 10);
    if (isNaN(a) || a < 0 || a > total) { a = 0; }
    return Math.max(a, score);
  }

  function fr(n, dec) {
    var d = dec || 0;
    var s = Number(n).toFixed(d).split('.');
    var ent = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
    var r = s.length > 1 ? ent + ',' + s[1].replace(/0+$/, '') : ent;
    return r.replace(/,$/, '');
  }

  var FR = { SPECIAUX: SPECIAUX, normaliser: normaliser, lireNumero: lireNumero, ordreCode: ordreCode, chercher: chercher,
    filtrer: filtrer, trier: trier, cleValide: cleValide, seuils: seuils, classe: classe, hasard: hasard, melanger: melanger,
    serie: serie, verifier: verifier, libelleChoix: libelleChoix, enonce: enonce, meilleur: meilleur, modeValide: modeValide, fr: fr };
  if (typeof module !== 'undefined' && module.exports) { module.exports = FR; } else { racine.FR = FR; }
})(this);
