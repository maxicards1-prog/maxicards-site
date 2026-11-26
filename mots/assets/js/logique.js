/* Jeux de lettres : logique pure (navigateur, Web Worker et Node pour les tests). Rien n'est envoyé. */
(function (racine) {
  'use strict';
  var MAX_LETTRES = 15;
  var MAX_MOTIF = 25;
  var MAX_JOKERS = 2;
  var A = 65;
  var VALEURS = { A: 1, E: 1, I: 1, L: 1, N: 1, O: 1, R: 1, S: 1, T: 1, U: 1, D: 2, G: 2, M: 2, B: 3, C: 3, P: 3,
    F: 4, H: 4, V: 4, J: 8, Q: 8, K: 10, W: 10, X: 10, Y: 10, Z: 10 };

  // « Cœur » -> « COEUR » : majuscules sans accents (œ = OE, æ = AE), comme dans les grilles et au Scrabble.
  function normaliser(mot) {
    var s = String(mot == null ? '' : mot).toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae');
    if (s.normalize) { s = s.normalize('NFD'); }
    return s.replace(/[̀-ͯ]/g, '').toUpperCase();
  }

  // Lettres saisies -> A à Z, plus « ? » (joker) si permis ; tout le reste est ignoré ; longueur bornée.
  function lettres(saisie, avecJoker, max) {
    var s = normaliser(String(saisie || '').slice(0, 200)).replace(/[*._]/g, '?');
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if ((c >= 'A' && c <= 'Z') || (avecJoker && c === '?')) { out += c; }
    }
    return out.slice(0, max || MAX_LETTRES);
  }

  // Motif de grille : lettres connues et « ? » (ou . * _ espace) pour une case vide ; longueur bornée.
  function motif(saisie) {
    var s = normaliser(String(saisie || '').slice(0, 200)).replace(/[*._ \-]/g, '?');
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if ((c >= 'A' && c <= 'Z') || c === '?') { out += c; }
    }
    return out.slice(0, MAX_MOTIF);
  }

  function compte(cle) {
    var c = [];
    for (var i = 0; i < 26; i++) { c.push(0); }
    for (var j = 0; j < cle.length; j++) {
      var k = cle.charCodeAt(j) - A;
      if (k >= 0 && k < 26) { c[k]++; }
    }
    return c;
  }

  // Le mot (clé A-Z) s'écrit-il avec ces lettres (compte) et ces jokers ? Renvoie la liste des positions prises
  // par un joker ([] si aucune), ou null si impossible.
  function avecLettres(cle, comptes, jokers) {
    var reste = comptes.slice();
    var j = jokers;
    var pos = [];
    for (var i = 0; i < cle.length; i++) {
      var k = cle.charCodeAt(i) - A;
      if (k < 0 || k > 25) { return null; }
      if (reste[k] > 0) { reste[k]--; } else if (j > 0) { j--; pos.push(i); } else { return null; }
    }
    // Le joker remplace une lettre manquante : toutes ses occurrences valent pareil, le score n'en dépend pas.
    return pos;
  }

  function points(cle, joker) {
    var t = 0;
    for (var i = 0; i < cle.length; i++) {
      if (joker && joker.indexOf(i) !== -1) { continue; }
      t += VALEURS[cle.charAt(i)] || 0;
    }
    return t;
  }

  function correspondMotif(cle, m) {
    if (cle.length !== m.length) { return false; }
    for (var i = 0; i < m.length; i++) {
      var c = m.charAt(i);
      if (c !== '?' && c !== cle.charAt(i)) { return false; }
    }
    return true;
  }

  // Filtre « mots de N lettres » : o = {debut, fin, contient, sans} (lettres A-Z déjà nettoyées).
  function filtreLettres(cle, o) {
    if (o.debut && cle.slice(0, o.debut.length) !== o.debut) { return false; }
    if (o.fin && cle.slice(cle.length - o.fin.length) !== o.fin) { return false; }
    if (o.sans) {
      for (var i = 0; i < o.sans.length; i++) {
        if (cle.indexOf(o.sans.charAt(i)) !== -1) { return false; }
      }
    }
    if (o.contient) {
      var c = compte(cle);
      var besoin = compte(o.contient);
      for (var k = 0; k < 26; k++) { if (c[k] < besoin[k]) { return false; } }
    }
    return true;
  }

  // Aide Sutom / Wordle. o = {longueur, bien: [lettre|''], mal: [lettres par case], absentes: 'ABC'}.
  // Prépare les contraintes une fois (lettres minimum et maximum).
  function preparerSutom(o) {
    var n = o.longueur;
    var bien = [], mal = [];
    var mini = compte('');
    var dansMal = compte('');
    for (var i = 0; i < n; i++) {
      var b = lettres((o.bien || [])[i] || '', false, 1);
      bien.push(b);
      mal.push(lettres((o.mal || [])[i] || '', false, 26));
    }
    var bienCompte = compte(bien.join(''));
    for (var k = 0; k < 26; k++) { mini[k] = bienCompte[k]; }
    mal.forEach(function (s) {
      for (var j = 0; j < s.length; j++) { dansMal[s.charCodeAt(j) - A] = 1; }
    });
    for (var m = 0; m < 26; m++) { if (dansMal[m] && mini[m] < 1) { mini[m] = 1; } }
    var abs = lettres(o.absentes || '', false, 26);
    var maxi = [];
    for (var q = 0; q < 26; q++) { maxi.push(99); }
    for (var r = 0; r < abs.length; r++) {
      var x = abs.charCodeAt(r) - A;
      // Lettre grise déjà trouvée ailleurs (verte ou jaune) : pas d'autre exemplaire que ceux connus.
      maxi[x] = mini[x];
    }
    return { longueur: n, bien: bien, mal: mal, mini: mini, maxi: maxi };
  }

  function filtreSutom(cle, p) {
    if (cle.length !== p.longueur) { return false; }
    for (var i = 0; i < p.longueur; i++) {
      var c = cle.charAt(i);
      if (p.bien[i] && p.bien[i] !== c) { return false; }
      if (p.mal[i] && p.mal[i].indexOf(c) !== -1) { return false; }
    }
    var cpt = compte(cle);
    for (var k = 0; k < 26; k++) {
      if (cpt[k] < p.mini[k] || cpt[k] > p.maxi[k]) { return false; }
    }
    return true;
  }

  // Score d'un coup au Scrabble. cases = [{l: 'A', m: 1|2|3 (lettre compte double/triple), joker: bool}],
  // motDouble / motTriple = nombre de cases mot compte double / triple recouvertes (0 à 2 ; 3 cases triples
  // possibles sur une ligne de 15, bornées ici à 3), sept = les 7 lettres du chevalet posées (prime de 50).
  function scoreScrabble(cases, motDouble, motTriple, sept) {
    var base = 0;
    var detail = [];
    for (var i = 0; i < cases.length && i < MAX_LETTRES; i++) {
      var c = cases[i];
      var v = c.joker ? 0 : (VALEURS[c.l] || 0);
      var m = (c.m === 2 || c.m === 3) ? c.m : 1;
      base += v * m;
      detail.push(v * m);
    }
    var d = Math.max(0, Math.min(3, Math.floor(+motDouble || 0)));
    var t = Math.max(0, Math.min(3, Math.floor(+motTriple || 0)));
    var mult = Math.pow(2, d) * Math.pow(3, t);
    var prime = sept ? 50 : 0;
    return { lettres: base, multiplicateur: mult, mot: base * mult, prime: prime, total: base * mult + prime, detail: detail };
  }

  // Liste brute d'un fichier mNN.txt -> [{k: clé, f: [formes]}] dans l'ordre (fréquence), formes regroupées par clé.
  function lireListe(texte) {
    var lignes = String(texte).split('\n');
    var index = {};
    var out = [];
    for (var i = 0; i < lignes.length; i++) {
      var f = lignes[i].trim();
      if (!f || f.charAt(0) === '#') { continue; }
      var k = normaliser(f);
      if (!/^[A-Z]+$/.test(k)) { continue; }
      if (Object.prototype.hasOwnProperty.call(index, k)) {
        if (out[index[k]].f.length < 4) { out[index[k]].f.push(f); }
      } else {
        index[k] = out.length;
        out.push({ k: k, f: [f] });
      }
    }
    return out;
  }

  // Parcourt une liste et garde les entrées qui passent le test ; borne le nombre gardé (le total reste compté).
  function filtrer(liste, test, max) {
    var garde = [];
    var total = 0;
    for (var i = 0; i < liste.length; i++) {
      var r = test(liste[i]);
      if (r) {
        total++;
        if (garde.length < max) { garde.push(r === true ? { k: liste[i].k, f: liste[i].f } : r); }
      }
    }
    return { mots: garde, total: total };
  }

  // Tri d'affichage : 'freq' (ordre du fichier, du plus courant au plus rare), 'alpha', 'points'.
  function trier(mots, mode) {
    var copie = mots.slice();
    if (mode === 'alpha') {
      copie.sort(function (a, b) { return a.k < b.k ? -1 : a.k > b.k ? 1 : 0; });
    } else if (mode === 'points') {
      copie.sort(function (a, b) { return (b.p || 0) - (a.p || 0); });
    }
    return copie;
  }

  var ML = {
    MAX_LETTRES: MAX_LETTRES, MAX_MOTIF: MAX_MOTIF, MAX_JOKERS: MAX_JOKERS, VALEURS: VALEURS,
    normaliser: normaliser, lettres: lettres, motif: motif, compte: compte, avecLettres: avecLettres,
    points: points, correspondMotif: correspondMotif, filtreLettres: filtreLettres,
    preparerSutom: preparerSutom, filtreSutom: filtreSutom, scoreScrabble: scoreScrabble, lireListe: lireListe,
    filtrer: filtrer, trier: trier
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = ML; } else { racine.ML = ML; }
}(typeof self !== 'undefined' ? self : this));
