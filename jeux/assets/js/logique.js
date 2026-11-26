/* Jeux de société : toute la logique de calcul des scores (sans interface), testée par tests/test_logique.js (Node).
   Règles et sources : sources_2026-11-26.md. Rien n'est envoyé : tout se calcule dans le navigateur. */
(function (racine) {
  'use strict';
  var JL = {};

  // ------------------------------------------------------------------ hasard (crypto.getRandomValues, sans biais)
  JL.hasard = function (n) {
    if (!(n >= 1)) { return 0; }
    var c = (racine.crypto || (typeof globalThis !== 'undefined' ? globalThis.crypto : null));
    var max = Math.floor(4294967296 / n) * n, t = new Uint32Array(1);
    do { c.getRandomValues(t); } while (t[0] >= max);
    return t[0] % n;
  };
  JL.melanger = function (liste) {
    var a = liste.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = JL.hasard(i + 1), x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  };
  JL.lancerDes = function (nombre, faces) {
    var v = [];
    for (var i = 0; i < nombre; i++) { v.push(JL.hasard(faces) + 1); }
    return { valeurs: v, total: v.reduce(function (s, x) { return s + x; }, 0) };
  };

  // ------------------------------------------------------------------ classement (le plus haut ou le plus bas gagne)
  JL.classement = function (totaux, plusBasGagne) {
    return totaux.map(function (t) {
      return 1 + totaux.filter(function (u) { return plusBasGagne ? u < t : u > t; }).length;
    });
  };
  JL.somme = function (l) { return l.reduce(function (s, x) { return s + (Number(x) || 0); }, 0); };
  JL.totaux = function (nbJoueurs, manches) {
    var t = [];
    for (var i = 0; i < nbJoueurs; i++) { t.push(JL.somme(manches.map(function (m) { return m[i]; }))); }
    return t;
  };

  // ------------------------------------------------------------------ TAROT (règlement FFT)
  JL.TAROT_SEUILS = [56, 51, 41, 36];
  JL.TAROT_COEF = { prise: 1, garde: 2, garde_sans: 4, garde_contre: 6 };
  JL.TAROT_POIGNEES = { 3: [13, 15, 18], 4: [10, 13, 15], 5: [8, 10, 13] };
  JL.TAROT_PRIME_POIGNEE = [0, 20, 30, 40];
  /* d = { joueurs: 3|4|5, preneur: i, appele: i (5 joueurs ; = preneur ou -1 si seul), contrat, bouts: 0-3,
           points: 0-91 (au demi-point), petit: 'aucun'|'attaque'|'defense', poigneeAttaque: 0-3, poigneeDefense: 0-3,
           chelem: 'aucun'|'annonce_reussi'|'non_annonce'|'annonce_chute'|'defense' } */
  JL.tarot = function (d) {
    var seuil = JL.TAROT_SEUILS[d.bouts], coef = JL.TAROT_COEF[d.contrat];
    var gagne = d.points >= seuil;
    // ½ point : il va toujours au camp gagnant (FFT : 40,5 avec 2 bouts = 40, chute de 1 ; 41,5 = 42, gagné de 1)
    var pts = gagne ? Math.ceil(d.points) : Math.floor(d.points);
    var ecart = Math.abs(pts - seuil), signe = gagne ? 1 : -1;
    var contrat = (25 + ecart) * coef;
    var petit = d.petit === 'attaque' ? 10 * coef : d.petit === 'defense' ? -10 * coef : 0;
    var poignees = JL.TAROT_PRIME_POIGNEE[d.poigneeAttaque || 0] + JL.TAROT_PRIME_POIGNEE[d.poigneeDefense || 0];
    var chelem = { aucun: 0, annonce_reussi: 400, non_annonce: 200, annonce_chute: -200, defense: -200 }[d.chelem || 'aucun'];
    var v = signe * contrat + petit + signe * poignees + chelem;
    var n = d.joueurs, scores = [];
    for (var i = 0; i < n; i++) { scores.push(-v); }
    if (n === 4) { scores[d.preneur] = 3 * v; }
    else if (n === 3) { scores[d.preneur] = 2 * v; }
    else if (d.appele >= 0 && d.appele !== d.preneur) { scores[d.preneur] = 2 * v; scores[d.appele] = v; }
    else { scores[d.preneur] = 4 * v; }
    return { gagne: gagne, seuil: seuil, pointsComptes: pts, ecart: ecart, contrat: contrat, petit: petit,
             poignees: signe * poignees, chelem: chelem, valeur: v, scores: scores };
  };

  // ------------------------------------------------------------------ BELOTE (162 points par donne, dix de der compris)
  /* d = { preneur: 0|1 (équipe), points: points de cartes du preneur (0-162, dix de der compris),
           belote: -1|0|1 (équipe qui a belote-rebelote), capot: -1|0|1 (équipe qui a fait tous les plis),
           annonces: [a0, a1], litige: points en litige reportés de la donne précédente } */
  JL.belote = function (d) {
    var p = d.preneur, q = 1 - p, a = d.annonces || [0, 0], s = [0, 0], statut, litige = 0;
    var bel = [d.belote === 0 ? 20 : 0, d.belote === 1 ? 20 : 0];
    var gagnant;
    if (d.capot === 0 || d.capot === 1) {
      var c = d.capot;
      s[c] = 252 + a[c] + bel[c];
      s[1 - c] = bel[1 - c];
      statut = 'capot'; gagnant = c;
    } else {
      var tp = d.points + a[p] + bel[p], td = (162 - d.points) + a[q] + bel[q];
      if (tp > td) { s[p] = tp; s[q] = td; statut = 'fait'; gagnant = p; }
      else if (tp < td) { s[p] = bel[p]; s[q] = 162 + a[q] + a[p] + bel[q]; statut = 'dedans'; gagnant = q; }
      else { s[q] = td; s[p] = bel[p]; litige = d.points + a[p]; statut = 'litige'; gagnant = -1; }
    }
    if (d.litige && gagnant >= 0) { s[gagnant] += d.litige; }
    else if (d.litige) { litige += d.litige; }
    return { scores: s, statut: statut, litige: litige };
  };

  // ------------------------------------------------------------------ COINCHE / BELOTE CONTRÉE
  JL.arrondiDizaine = function (x) { return Math.floor((x + 5) / 10) * 10; };
  /* d = { preneur: 0|1, contrat: 80-160 | 'capot' | 'generale', multiplicateur: 1|2|4, points: cartes du preneur (0-162),
           tousLesPlis: bool (capot réalisé par le preneur), belote: -1|0|1,
           mode: 'faits' (points faits + contrat) | 'annonces' (contrat seulement),
           arrondi: bool, valeurCapot: 250, valeurGenerale: 500 } */
  JL.coinche = function (d) {
    var p = d.preneur, q = 1 - p, m = d.multiplicateur || 1, s = [0, 0];
    var vc = d.valeurCapot || 250, vg = d.valeurGenerale || 500;
    var bel = [d.belote === 0 ? 20 : 0, d.belote === 1 ? 20 : 0];
    var special = d.contrat === 'capot' || d.contrat === 'generale';
    var valeurContrat = d.contrat === 'capot' ? vc : d.contrat === 'generale' ? vg : d.contrat;
    var reussi = special ? !!d.tousLesPlis : (d.points + bel[p]) >= d.contrat;
    var r = d.arrondi === false ? function (x) { return x; } : JL.arrondiDizaine;
    var cartesP = d.tousLesPlis ? vc : r(d.points), cartesQ = d.tousLesPlis ? 0 : r(162 - d.points);
    if (d.mode === 'annonces') {
      if (reussi) { s[p] = valeurContrat * m; } else { s[q] = valeurContrat * m; }
    } else if (reussi) {
      s[p] = (cartesP + valeurContrat) * m + bel[p];
      s[q] = (m > 1 ? 0 : cartesQ) + bel[q];
    } else {
      s[q] = (160 + valeurContrat) * m + bel[q];
      s[p] = bel[p];
    }
    return { reussi: reussi, scores: s, valeurContrat: valeurContrat };
  };

  // ------------------------------------------------------------------ YAM'S (barème Yahtzee de Hasbro par défaut, modifiable)
  JL.YAMS_CASES = ['as', 'deux', 'trois', 'quatre', 'cinq', 'six', 'brelan', 'carre', 'full', 'petite', 'grande', 'yams', 'chance'];
  JL.YAMS_REGLES = { full: 25, petite: 30, grande: 40, yams: 50, seuil: 63, bonus: 35, primeYams: 100 };
  JL.yamsValeur = function (cas, des, regles) {
    var R = regles || JL.YAMS_REGLES, c = [0, 0, 0, 0, 0, 0, 0], tot = 0, i;
    for (i = 0; i < des.length; i++) { c[des[i]]++; tot += des[i]; }
    var haut = JL.YAMS_CASES.indexOf(cas);
    if (haut >= 0 && haut < 6) { return c[haut + 1] * (haut + 1); }
    var max = Math.max.apply(null, c), paire = c.indexOf(2) > 0, brelan = c.indexOf(3) > 0;
    function suite(lg) {
      for (var a = 1; a + lg - 1 <= 6; a++) {
        var ok = true;
        for (var b = a; b < a + lg; b++) { if (!c[b]) { ok = false; } }
        if (ok) { return true; }
      }
      return false;
    }
    switch (cas) {
      case 'brelan': return max >= 3 ? tot : 0;
      case 'carre': return max >= 4 ? tot : 0;
      case 'full': return (brelan && paire) ? R.full : 0;
      case 'petite': return suite(4) ? R.petite : 0;
      case 'grande': return suite(5) ? R.grande : 0;
      case 'yams': return max === 5 ? R.yams : 0;
      case 'chance': return tot;
    }
    return 0;
  };
  /* feuille = { as: 3, ..., primes: nombre de yam's supplémentaires } ; une case vide = undefined ou null */
  JL.yamsTotaux = function (feuille, regles) {
    var R = regles || JL.YAMS_REGLES, haut = 0, bas = 0, i;
    for (i = 0; i < 6; i++) { haut += Number(feuille[JL.YAMS_CASES[i]]) || 0; }
    for (i = 6; i < 13; i++) { bas += Number(feuille[JL.YAMS_CASES[i]]) || 0; }
    var bonus = haut >= R.seuil ? R.bonus : 0, primes = (Number(feuille.primes) || 0) * R.primeYams;
    return { haut: haut, bonus: bonus, manque: Math.max(0, R.seuil - haut), bas: bas, primes: primes, total: haut + bonus + bas + primes };
  };

  // ------------------------------------------------------------------ MÖLKKY (50 exacts, au-delà retour à 25, 3 ratés = éliminé)
  /* etat joueur = { score, rates, elimine } ; quilles = numéros des quilles tombées (lancer valide) */
  JL.molkky = function (etat, quilles) {
    var e = { score: etat.score, rates: etat.rates, elimine: etat.elimine, gagne: false, retour25: false, points: 0 };
    if (e.elimine) { return e; }
    if (!quilles.length) {
      e.rates += 1;
      if (e.rates >= 3) { e.elimine = true; }
      return e;
    }
    e.rates = 0;
    e.points = quilles.length === 1 ? quilles[0] : quilles.length;
    e.score += e.points;
    if (e.score > 50) { e.score = 25; e.retour25 = true; }
    if (e.score === 50) { e.gagne = true; }
    return e;
  };

  // ------------------------------------------------------------------ SKYJO (règle Magilano : doublé si pas strictement le plus petit, points positifs seulement)
  JL.skyjoManche = function (scores, finisseur) {
    var r = scores.slice(), f = scores[finisseur];
    if (finisseur >= 0 && finisseur < scores.length && f > 0) {
      var strict = scores.every(function (s, i) { return i === finisseur || f < s; });
      if (!strict) { r[finisseur] = 2 * f; }
    }
    return r;
  };
  JL.skyjoFin = function (totaux, limite) {
    var lim = limite || 100, fini = totaux.some(function (t) { return t >= lim; });
    if (!fini) { return { fini: false, gagnants: [] }; }
    var min = Math.min.apply(null, totaux);
    return { fini: true, gagnants: totaux.map(function (t, i) { return t === min ? i : -1; }).filter(function (i) { return i >= 0; }) };
  };

  // ------------------------------------------------------------------ UNO (fiche Mattel : chiffres = valeur, +2 / inversion / passe = 20, joker et +4 = 50)
  JL.unoMain = function (m) {
    return (Number(m.chiffres) || 0) + 20 * ((Number(m.plus2) || 0) + (Number(m.inversion) || 0) + (Number(m.passe) || 0)) +
      50 * ((Number(m.joker) || 0) + (Number(m.plus4) || 0));
  };
  /* mode 'gagnant' : le gagnant de la manche marque la somme des mains des autres ; mode 'mains' : chacun marque sa main */
  JL.unoManche = function (mains, gagnant, mode) {
    var v = mains.map(function (x) { return typeof x === 'number' ? x : JL.unoMain(x); });
    if (mode === 'mains') { return v.map(function (x, i) { return i === gagnant ? 0 : x; }); }
    var tot = JL.somme(v.filter(function (x, i) { return i !== gagnant; }));
    return v.map(function (x, i) { return i === gagnant ? tot : 0; });
  };

  // ------------------------------------------------------------------ FLÉCHETTES (301 / 501, sortie double au choix)
  JL.flechette = function (v, m) { return v * m; };
  /* volée : liste de { v: 1-20 ou 25, m: 1|2|3 } (m = 0 pour une fléchette ratée) */
  JL.volee = function (reste, flechettes, doubleSortie) {
    var r = reste, compte = 0;
    for (var i = 0; i < flechettes.length; i++) {
      var f = flechettes[i], pts = f.v * f.m;
      r -= pts; compte += pts;
      if (r === 0) {
        if (doubleSortie && f.m !== 2) { return { reste: reste, bust: true, fini: false, points: 0 }; }
        return { reste: 0, bust: false, fini: true, points: compte, flechettes: i + 1 };
      }
      if (r < 0 || (doubleSortie && r === 1)) { return { reste: reste, bust: true, fini: false, points: 0 }; }
    }
    return { reste: r, bust: false, fini: false, points: compte };
  };
  var CIBLES = (function () {
    var l = [], v;
    for (v = 20; v >= 1; v--) { l.push({ v: v, m: 3, n: 'T' + v }); }
    for (v = 20; v >= 1; v--) { l.push({ v: v, m: 1, n: String(v) }); }
    l.push({ v: 25, m: 1, n: '25' });
    for (v = 20; v >= 1; v--) { l.push({ v: v, m: 2, n: 'D' + v }); }
    l.push({ v: 25, m: 2, n: 'Bull' });
    return l;
  }());
  var PREF_DOUBLE = { 20: 0, 16: 1, 18: 2, 12: 3, 10: 4, 8: 5, 25: 6, 14: 7, 6: 8, 4: 9, 2: 10 };
  function coutDouble(c) { return c.v in PREF_DOUBLE ? PREF_DOUBLE[c.v] : 12 + (20 - c.v) / 100; }
  function coutLancer(c) { return c.m === 3 ? (c.v >= 19 ? 0 : c.v >= 15 ? 1 : 3) : c.m === 1 ? (c.v === 25 ? 2.5 : 1.5) : 4; }
  /* propositions de finition (3 fléchettes au plus), les plus simples d'abord */
  JL.finitions = function (reste, doubleSortie, nbFlechettes, combien) {
    var n = nbFlechettes || 3, res = [], i, j, k;
    var fins = CIBLES.filter(function (c) { return !doubleSortie || c.m === 2; });
    function ajoute(liste, cout) { res.push({ lancers: liste.map(function (c) { return c.n; }), cout: cout + liste.length * 10 }); }
    for (k = 0; k < fins.length; k++) {
      var f = fins[k], fv = f.v * f.m;
      if (fv === reste) { ajoute([f], coutDouble(f)); }
      if (n >= 2) {
        for (i = 0; i < CIBLES.length; i++) {
          var a = CIBLES[i];
          if (a.v * a.m + fv === reste) { ajoute([a, f], coutDouble(f) + coutLancer(a)); }
          if (n >= 3) {
            for (j = i; j < CIBLES.length; j++) {
              var b = CIBLES[j];
              if (a.v * a.m + b.v * b.m + fv === reste) { ajoute([a, b, f], coutDouble(f) + coutLancer(a) + coutLancer(b)); }
            }
          }
        }
      }
    }
    res.sort(function (x, y) { return x.cout - y.cout; });
    var vus = {}, out = [];
    for (i = 0; i < res.length && out.length < (combien || 3); i++) {
      var cle = res[i].lancers.join(' ');
      if (!vus[cle]) { vus[cle] = 1; out.push(res[i].lancers); }
    }
    return out;
  };

  // ------------------------------------------------------------------ CRICKET (15 à 20 et le centre, 3 marques pour fermer)
  JL.CRICKET = [20, 19, 18, 17, 16, 15, 25];
  JL.cricketNouveau = function (n) {
    var j = [];
    for (var i = 0; i < n; i++) { j.push({ marques: { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, 25: 0 }, points: 0 }); }
    return j;
  };
  JL.cricketTouche = function (joueurs, qui, cible, mult) {
    var js = JSON.parse(JSON.stringify(joueurs)), moi = js[qui];
    if (JL.CRICKET.indexOf(cible) < 0 || (cible === 25 && mult === 3)) { return js; }
    var avant = moi.marques[cible], total = avant + mult;
    moi.marques[cible] = Math.min(3, total);
    var surplus = total - Math.max(3, avant);
    if (surplus > 0) {
      var ouvert = js.some(function (o, i) { return i !== qui && o.marques[cible] < 3; });
      if (ouvert) { moi.points += surplus * cible; }
    }
    return js;
  };
  JL.cricketGagnant = function (joueurs) {
    for (var i = 0; i < joueurs.length; i++) {
      var j = joueurs[i];
      var ferme = JL.CRICKET.every(function (c) { return j.marques[c] >= 3; });
      if (ferme && joueurs.every(function (o) { return o.points <= j.points; })) { return i; }
    }
    return -1;
  };

  // ------------------------------------------------------------------ SECRET SANTA (tirage valide garanti ou impossibilité détectée)
  /* noms : liste ; exclusions : liste de paires [i, j] (interdit dans les deux sens). Renvoie { ok, donneA: [i -> j] } */
  JL.santaPossibles = function (n, exclusions) {
    var interdit = [];
    for (var i = 0; i < n; i++) { interdit.push({}); interdit[i][i] = true; }
    (exclusions || []).forEach(function (p) {
      if (p[0] >= 0 && p[1] >= 0 && p[0] < n && p[1] < n) { interdit[p[0]][p[1]] = true; interdit[p[1]][p[0]] = true; }
    });
    return interdit;
  };
  JL.santaTirage = function (n, exclusions, essais) {
    if (n < 2) { return { ok: false, raison: 'Il faut au moins 2 participants.' }; }
    var interdit = JL.santaPossibles(n, exclusions), i;
    // 1) permutations au hasard (chaque tirage valide a la même chance) ...
    var base = [];
    for (i = 0; i < n; i++) { base.push(i); }
    for (var t = 0; t < (essais || 3000); t++) {
      var p = JL.melanger(base), bon = true;
      for (i = 0; i < n && bon; i++) { if (interdit[i][p[i]]) { bon = false; } }
      if (bon) { return { ok: true, donneA: p }; }
    }
    // 2) ... sinon couplage (chemins augmentants, ordre au hasard) : trouve une solution s'il en existe une
    var recoit = [], donneA = [];
    for (i = 0; i < n; i++) { recoit.push(-1); donneA.push(-1); }
    function essayer(u, vu) {
      var ordre = JL.melanger(base);
      for (var k = 0; k < n; k++) {
        var v = ordre[k];
        if (interdit[u][v] || vu[v]) { continue; }
        vu[v] = true;
        if (recoit[v] < 0 || essayer(recoit[v], vu)) { recoit[v] = u; donneA[u] = v; return true; }
      }
      return false;
    }
    var ordreU = JL.melanger(base);
    for (i = 0; i < n; i++) {
      if (!essayer(ordreU[i], {})) {
        return { ok: false, raison: 'Tirage impossible avec ces exclusions : retirez-en une ou ajoutez un participant.' };
      }
    }
    return { ok: true, donneA: donneA };
  };
  /* Brouillage du lien personnel : le nom n'est pas lisible d'un coup d'œil, mais n'importe qui peut le décoder. */
  var CLE = [77, 97, 120, 105, 67, 97, 114, 100, 115, 74, 101, 117, 120];
  JL.santaEncoder = function (objet) {
    var octets = new TextEncoder().encode(JSON.stringify(objet)), sel = JL.hasard(256), s = String.fromCharCode(sel);
    for (var i = 0; i < octets.length; i++) { s += String.fromCharCode(octets[i] ^ CLE[i % CLE.length] ^ sel); }
    var b = typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64');
    return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  JL.santaDecoder = function (texte) {
    try {
      if (!/^[A-Za-z0-9_-]{4,2000}$/.test(texte)) { return null; }
      var b = texte.replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) { b += '='; }
      var s = typeof atob === 'function' ? atob(b) : Buffer.from(b, 'base64').toString('binary');
      var sel = s.charCodeAt(0), o = new Uint8Array(s.length - 1);
      for (var i = 1; i < s.length; i++) { o[i - 1] = s.charCodeAt(i) ^ CLE[(i - 1) % CLE.length] ^ sel; }
      var x = JSON.parse(new TextDecoder().decode(o));
      if (!x || typeof x !== 'object' || typeof x.d !== 'string' || typeof x.r !== 'string') { return null; }
      return { d: x.d.slice(0, 40), r: x.r.slice(0, 40), b: typeof x.b === 'string' ? x.b.slice(0, 20) : '',
               j: typeof x.j === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.j) ? x.j : '' };
    } catch (e) { return null; }
  };

  // ------------------------------------------------------------------ TIRAGE AU SORT : équipes équilibrées
  /* niveaux (facultatif) : un nombre par personne ; répartition en serpent après tri par niveau (ex æquo mélangés) */
  JL.equipes = function (noms, nbEquipes, niveaux) {
    var k = Math.max(2, Math.min(nbEquipes, noms.length)), idx = JL.melanger(noms.map(function (_, i) { return i; }));
    if (niveaux) { idx.sort(function (a, b) { return (niveaux[b] || 0) - (niveaux[a] || 0); }); }
    var eq = [];
    for (var e = 0; e < k; e++) { eq.push([]); }
    idx.forEach(function (i, r) {
      var tour = Math.floor(r / k), pos = r % k, e2 = tour % 2 ? k - 1 - pos : pos;
      eq[e2].push(i);
    });
    return eq;
  };

  // ------------------------------------------------------------------ PENDULE (temps en millisecondes, incrément Fischer)
  JL.penduleCoup = function (restants, joueur, ecoule, increment) {
    var r = restants.slice();
    r[joueur] = Math.max(0, r[joueur] - ecoule);
    if (r[joueur] > 0) { r[joueur] += increment || 0; }
    return r;
  };
  JL.formatTemps = function (ms) {
    var s = Math.max(0, Math.ceil(ms / 1000));
    if (ms > 0 && ms < 10000) { return (Math.ceil(ms / 100) / 10).toFixed(1).replace('.', ','); }
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (x < 10 ? '0' : '') + x;
  };

  racine.JL = JL;
  if (typeof module !== 'undefined' && module.exports) { module.exports = JL; }
}(typeof window !== 'undefined' ? window : globalThis));
