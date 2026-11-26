/* Prénoms : fonctions pures (aucun accès à la page). Utilisables dans le navigateur (window.PR) et dans Node (module.exports).
   Données : voir la docstring de agreger.py. Un prénom = [garçons, filles] ; chaque sexe vaut 0 ou
   [debut, "serie", meilleurRang, anneeMeilleurRang, rangDerniereAnnee]. Les effectifs sont arrondis à 5 par l'INSEE. */
(function (racine, fabrique) {
  'use strict';
  var PR = fabrique();
  if (typeof module === 'object' && module.exports) { module.exports = PR; }
  if (racine) { racine.PR = PR; }
}(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var MAX_JETONS = 400;       // une série codée ne dépasse jamais cette longueur (1900-2025 = 126 années)
  var MAX_ANNEES = 400;
  var MAX_SAISIE = 40;

  // ---------- noms : identiques aux fonctions Python d'agreger.py ----------
  function sansAccent(s) {
    return String(s).normalize('NFD').replace(/\p{Mn}/gu, '');
  }
  function joli(n) {
    var sortie = '', haut = true;
    var bas = String(n).toLowerCase();
    for (var c of bas) {            // parcourt par caractère (comme Python)
      sortie += haut ? c.toUpperCase() : c;
      haut = c === ' ' || c === '-' || c === "'";
    }
    return sortie;
  }
  function slug(n) {
    return sansAccent(n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function cleProche(n) {
    var s = slug(n).replace(/-/g, '');
    s = s.replace(/ph/g, 'f').replace(/h/g, '').replace(/y/g, 'i');
    return s.replace(/(.)\1+/g, '$1');
  }
  function lettre(n) {
    var c = sansAccent(n).slice(0, 1).toLowerCase();
    return (c >= 'a' && c <= 'z') ? c : '_';
  }

  // ---------- nombres ----------
  function borne(v, min, max, defaut) {
    var x = Math.round(Number(v));
    if (!isFinite(x)) { x = defaut; }
    return Math.max(min, Math.min(max, x));
  }
  function format(n) {   // 12345 -> « 12 345 » (espace fine insécable)
    if (!isFinite(n)) { return '–'; }
    var signe = n < 0 ? '−' : '';
    return signe + String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  // ---------- séries ----------
  // entree = 0 ou [debut, "serie", ...] -> {debut, valeurs[]} ; valeurs = effectifs (déjà multipliés par 5), un par année,
  // de `debut` jusqu'à a1 (compris). Entrée vide : {debut: a1 + 1, valeurs: []}.
  function decoderSerie(entree, a1) {
    var fin = isFinite(a1) ? a1 : 2100;
    if (!entree || typeof entree[1] !== 'string' || !isFinite(entree[0])) { return { debut: fin + 1, valeurs: [] }; }
    var debut = entree[0] | 0;
    var jetons = entree[1].split(',', MAX_JETONS);
    var valeurs = [];
    for (var i = 0; i < jetons.length && valeurs.length < MAX_ANNEES; i++) {
      var t = jetons[i];
      if (t === '') { valeurs.push(0); continue; }
      if (t.charAt(0) === '_') {
        var k = borne(t.slice(1), 0, MAX_ANNEES, 0);
        for (var j = 0; j < k && valeurs.length < MAX_ANNEES; j++) { valeurs.push(0); }
        continue;
      }
      var v = Number(t);
      valeurs.push(isFinite(v) && v >= 0 ? v * 5 : 0);
    }
    while (debut + valeurs.length <= fin && valeurs.length < MAX_ANNEES) { valeurs.push(0); }
    if (debut + valeurs.length - 1 > fin) { valeurs.length = Math.max(0, fin - debut + 1); }
    return { debut: debut, valeurs: valeurs };
  }
  function valeurAnnee(s, annee) {
    var i = annee - s.debut;
    return (i >= 0 && i < s.valeurs.length) ? s.valeurs[i] : 0;
  }
  function somme(s, de, a) {
    var t = 0;
    for (var y = Math.max(de, s.debut); y <= a && y - s.debut < s.valeurs.length; y++) { t += s.valeurs[y - s.debut]; }
    return t;
  }

  // ---------- statistiques d'un prénom ----------
  function stats(entreeG, entreeF, a0, a1) {
    var G = decoderSerie(entreeG, a1), F = decoderSerie(entreeF, a1);
    var r = { a0: a0, a1: a1, derniere: a1 };
    r.totalG = somme(G, a0, a1);
    r.totalF = somme(F, a0, a1);
    r.total = r.totalG + r.totalF;
    // pic : année où le prénom (les deux sexes ensemble) est le plus donné
    var pic = { annee: 0, effectif: 0, sexe: '' };
    var premiere = 0;
    for (var y = a0; y <= a1; y++) {
      var g = valeurAnnee(G, y), f = valeurAnnee(F, y), t = g + f;
      if (t > 0 && !premiere) { premiere = y; }
      if (t > pic.effectif) { pic = { annee: y, effectif: t, sexe: g >= f ? 'g' : 'f' }; }
    }
    r.pic = pic;
    r.premiere = premiere;
    r.effG = valeurAnnee(G, a1);
    r.effF = valeurAnnee(F, a1);
    r.effDerniere = r.effG + r.effF;
    r.rangG = entreeG ? (entreeG[4] | 0) : 0;
    r.rangF = entreeF ? (entreeF[4] | 0) : 0;
    // meilleur rang (le plus petit), avec son année et son sexe
    var m = { rang: 0, annee: 0, sexe: '' };
    [['g', entreeG], ['f', entreeF]].forEach(function (p) {
      var e = p[1];
      if (e && e[2] > 0 && (m.rang === 0 || e[2] < m.rang)) { m = { rang: e[2] | 0, annee: e[3] | 0, sexe: p[0] }; }
    });
    r.meilleurRang = m;
    r.partF = r.total ? r.totalF / r.total : 0;
    r.partG = r.total ? r.totalG / r.total : 0;
    // tendance : 5 dernières années contre les 5 d'avant
    var recent = somme(G, a1 - 4, a1) + somme(F, a1 - 4, a1);
    var avant = somme(G, a1 - 9, a1 - 5) + somme(F, a1 - 9, a1 - 5);
    r.recent = recent;
    r.avant = avant;
    r.tendance = avant > 0 ? (recent - avant) / avant : null;       // null : pas de base de comparaison
    r.nouveau = avant === 0 && recent > 0;
    r.serieG = G;
    r.serieF = F;
    return r;
  }

  // ---------- recherche ----------
  function nettoyer(saisie) {
    var s = String(saisie === undefined || saisie === null ? '' : saisie).slice(0, 400);
    s = s.replace(/[‘’ʼ`´]/g, "'");
    s = s.replace(/[^\p{L} '\-]/gu, '').replace(/\s+/g, ' ').trim();
    return s.slice(0, MAX_SAISIE).toUpperCase();
  }
  function motsDebut(nom) { return sansAccent(nom).split(/[ '\-]+/); }
  // -> {type: 'exact'|'variantes'|'suggestions'|'aucun', saisie, noms: [...]}
  function chercher(saisie, donneesLettre) {
    var s = nettoyer(saisie);
    var n = (donneesLettre && donneesLettre.n && typeof donneesLettre.n === 'object') ? donneesLettre.n : {};
    var sortie = { type: 'aucun', saisie: s, noms: [] };
    if (!s) { return sortie; }
    var a1 = donneesLettre && donneesLettre.a1 ? donneesLettre.a1 : 2025;
    function poids(k) {
      var e = n[k];
      return somme(decoderSerie(e[0], a1), 0, a1) + somme(decoderSerie(e[1], a1), 0, a1);
    }
    function parPoids(liste) {
      return liste.map(function (k) { return { k: k, p: poids(k) }; })
        .sort(function (x, y) { return (y.p - x.p) || (x.k < y.k ? -1 : x.k > y.k ? 1 : 0); })
        .map(function (x) { return x.k; });
    }
    if (Object.prototype.hasOwnProperty.call(n, s)) {
      sortie.type = 'exact';
      sortie.noms = [s];
      // les autres orthographes de même forme sans accent sont données à part
      var base0 = sansAccent(s);
      sortie.variantes = parPoids(Object.keys(n).filter(function (k) { return k !== s && sansAccent(k) === base0; }).slice(0, 50)).slice(0, 8);
      return sortie;
    }
    var base = sansAccent(s);
    var noms = Object.keys(n);
    var memes = noms.filter(function (k) { return sansAccent(k) === base; });
    if (memes.length) {
      sortie.type = 'variantes';
      sortie.noms = parPoids(memes.slice(0, 50)).slice(0, 8);
      return sortie;
    }
    if (base.length < 1) { return sortie; }
    var debuts = [], mots = [];
    for (var i = 0; i < noms.length; i++) {
      var k = noms[i], bk = sansAccent(k);
      if (bk.indexOf(base) === 0) { debuts.push(k); }
      else if (motsDebut(k).some(function (m) { return m.indexOf(base) === 0; })) { mots.push(k); }
    }
    var candidats = debuts.concat(mots).slice(0, 3000);
    var notes = candidats.map(function (k, idx) { return { k: k, p: poids(k), d: idx < debuts.length ? 0 : 1 }; });
    notes.sort(function (x, y) { return (x.d - y.d) || (y.p - x.p) || (x.k < y.k ? -1 : x.k > y.k ? 1 : 0); });
    sortie.noms = notes.slice(0, 8).map(function (x) { return x.k; });
    if (sortie.noms.length) { sortie.type = 'suggestions'; }
    return sortie;
  }

  // ---------- courbe ----------
  function pasRond(max, cibles) {
    var brut = Math.max(max, 1) / (cibles || 4);
    var mag = Math.pow(10, Math.floor(Math.log(brut) / Math.LN10));
    var choix = [1, 2, 5, 10];
    for (var i = 0; i < choix.length; i++) { if (choix[i] * mag >= brut) { return choix[i] * mag; } }
    return 10 * mag;
  }
  // series : [{debut, valeurs}] (valeurs indexées depuis `debut`). Renvoie des chemins SVG et les axes.
  function courbe(series, a0, a1, largeur, hauteur) {
    var L = borne(largeur, 120, 4000, 640), H = borne(hauteur, 80, 3000, 320);
    var m = { g: 54, d: 14, h: 12, b: 28 };
    var x0 = m.g, x1 = L - m.d, y0 = H - m.b, y1 = m.h;      // y0 = bas (valeur 0), y1 = haut
    var debA = borne(a0, 1000, 3000, 1900), finA = borne(a1, debA, 3000, debA + 1);
    var etendue = Math.max(1, finA - debA);
    var max = 0;
    (series || []).forEach(function (s) {
      for (var y = debA; y <= finA; y++) { var v = valeurAnnee(s, y); if (v > max) { max = v; } }
    });
    var pas = pasRond(max, 4);
    var haut = Math.max(pas, Math.ceil(max / pas) * pas);
    function xDe(an) { return x0 + (an - debA) / etendue * (x1 - x0); }
    function yDe(v) { return y0 - (v / haut) * (y0 - y1); }
    function arrondi(v) { return Math.round(v * 10) / 10; }
    var chemins = (series || []).map(function (s) {
      var d = '';
      for (var y = debA; y <= finA; y++) {
        d += (y === debA ? 'M' : 'L') + arrondi(xDe(y)) + ' ' + arrondi(yDe(valeurAnnee(s, y)));
      }
      return d;
    });
    var axeY = [];
    for (var v = 0; v <= haut + pas / 1000 && axeY.length < 12; v += pas) {
      axeY.push({ valeur: v, y: arrondi(yDe(v)), label: format(v) });
    }
    var pasX = etendue > 60 ? 25 : etendue > 30 ? 10 : etendue > 12 ? 5 : 1;
    var axeX = [];
    for (var an = Math.ceil(debA / pasX) * pasX; an <= finA && axeX.length < 60; an += pasX) {
      axeX.push({ annee: an, x: arrondi(xDe(an)), label: String(an) });
    }
    return {
      largeur: L, hauteur: H, zone: { x0: x0, x1: x1, y0: y0, y1: y1 }, max: max, haut: haut, pas: pas,
      chemins: chemins, axeX: axeX, axeY: axeY, a0: debA, a1: finA, xDe: xDe, yDe: yDe
    };
  }

  // ---------- mixte ----------
  // Prénom mixte : chaque sexe pèse au moins 20 % des naissances des 10 dernières années (2016-2025).
  function partsDix(entreeG, entreeF, a1) {
    var g = somme(decoderSerie(entreeG, a1), a1 - 9, a1), f = somme(decoderSerie(entreeF, a1), a1 - 9, a1);
    return { g: g, f: f };
  }
  function estMixte(entreeG, entreeF, a1) {
    var p = partsDix(entreeG, entreeF, a1), t = p.g + p.f;
    return t > 0 && p.g >= 0.2 * t && p.f >= 0.2 * t;
  }
  function mixteSommes(g, f) { var t = g + f; return t > 0 && g >= 0.2 * t && f >= 0.2 * t; }

  // ---------- idées ----------
  // idees = {a0, mi, a1, n: [[NOM, g1, g2, f1, f2], ...]} (effectifs / 5). Un prénom est « fille » (ou « garçon ») si ce
  // sexe représente plus de 80 % des naissances 2016-2025 ; « mixte » si chacun pèse au moins 20 % ; les trois groupes ne se recoupent pas.
  function categorie(l) {
    var g = l[1] + l[2], f = l[3] + l[4], t = g + f;
    if (t <= 0) { return 'aucun'; }
    if (mixteSommes(g, f)) { return 'mixte'; }
    return f > g ? 'fille' : 'garcon';
  }
  function filtrerIdees(idees, criteres) {
    var c = criteres || {};
    var lignes = (idees && Array.isArray(idees.n)) ? idees.n : [];
    var sexe = ['fille', 'garcon', 'mixte', 'tous'].indexOf(c.sexe) >= 0 ? c.sexe : 'tous';
    var ini = sansAccent(String(c.initiale || '')).slice(0, 1).toLowerCase();
    if (!(ini >= 'a' && ini <= 'z')) { ini = ''; }
    var min = borne(c.min === '' || c.min === undefined || c.min === null ? 1 : c.min, 1, 30, 1);
    var max = borne(c.max === '' || c.max === undefined || c.max === null ? 30 : c.max, 1, 30, 30);
    if (min > max) { var tmp = min; min = max; max = tmp; }
    var fin = sansAccent(String(c.fin || '').slice(0, 40)).toLowerCase().replace(/[^a-z]/g, '').slice(-6);
    var hausse = !!c.hausse;
    var tri = c.tri === 'hausse' ? 'hausse' : 'popularite';
    var sortie = [];
    for (var i = 0; i < lignes.length; i++) {
      var l = lignes[i];
      if (!Array.isArray(l) || typeof l[0] !== 'string' || !(l[1] >= 0 && l[2] >= 0 && l[3] >= 0 && l[4] >= 0)) { continue; }
      var cat = categorie(l);
      if (cat === 'aucun') { continue; }
      if (sexe !== 'tous' && cat !== sexe) { continue; }
      var nom = l[0], bas = sansAccent(nom).toLowerCase();
      if (ini && bas.charAt(0) !== ini) { continue; }
      var longueur = bas.replace(/[^a-z]/g, '').length;
      if (longueur < min || longueur > max) { continue; }
      if (fin && bas.slice(-fin.length) !== fin) { continue; }
      // effectifs réels (x5), seulement pour le sexe demandé
      var v1 = (sexe === 'fille' ? l[3] : sexe === 'garcon' ? l[1] : l[1] + l[3]) * 5;
      var v2 = (sexe === 'fille' ? l[4] : sexe === 'garcon' ? l[2] : l[2] + l[4]) * 5;
      var pct = (v2 - v1) / Math.max(v1, 20);
      var enHausse = v2 >= 50 && v2 > v1 * 1.2;
      if (hausse && !enHausse) { continue; }
      var tot = (l[1] + l[2] + l[3] + l[4]) * 5;
      sortie.push({ nom: nom, categorie: cat, v1: v1, v2: v2, hausse: pct, enHausse: enHausse, part: tot ? (l[3] + l[4]) * 5 / tot : 0 });
    }
    sortie.sort(function (x, y) {
      var d = tri === 'hausse' ? (y.hausse - x.hausse) : 0;
      return d || (y.v2 - x.v2) || (x.nom < y.nom ? -1 : x.nom > y.nom ? 1 : 0);
    });
    return sortie;
  }

  // ---------- prénoms rares ----------
  // Définition retenue : un prénom (pour un sexe) est « rare » s'il est donné la dernière année du fichier (a1) avec un effectif
  // inférieur ou égal au seuil (5 à 500). Le plus petit effectif publié par l'INSEE est 5. Un prénom absent du fichier n'est
  // pas listé : on ne peut pas savoir s'il a été donné 0, 1 ou 2 fois (secret statistique).
  function rares(donneesLettre, options) {
    var o = options || {};
    var sexe = o.sexe === 'fille' || o.sexe === 'garcon' ? o.sexe : 'tous';
    var seuil = borne(o.seuilMax, 5, 500, 20);
    var a1 = borne(o.a1 !== undefined ? o.a1 : (donneesLettre && donneesLettre.a1), 1900, 3000, 2025);
    var n = (donneesLettre && donneesLettre.n && typeof donneesLettre.n === 'object') ? donneesLettre.n : {};
    var sortie = [];
    Object.keys(n).forEach(function (nom) {
      var e = n[nom];
      if (!Array.isArray(e)) { return; }
      [['garcon', e[0]], ['fille', e[1]]].forEach(function (p) {
        var ent = p[1];
        if (!ent || (sexe !== 'tous' && sexe !== p[0])) { return; }
        if (!(ent[4] > 0)) { return; }                    // pas dans le fichier la dernière année
        var s = decoderSerie(ent, a1);
        var eff = valeurAnnee(s, a1);
        if (eff <= 0 || eff > seuil) { return; }
        sortie.push({ nom: nom, sexe: p[0], effectif: eff, rang: ent[4] | 0, total: somme(s, 0, a1) });
      });
    });
    sortie.sort(function (x, y) {
      return (x.effectif - y.effectif) || (y.total - x.total) || (x.nom < y.nom ? -1 : x.nom > y.nom ? 1 : 0) ||
        (x.sexe < y.sexe ? -1 : 1);
    });
    return sortie;
  }

  return {
    sansAccent: sansAccent, joli: joli, slug: slug, cleProche: cleProche, lettre: lettre,
    borne: borne, format: format, nettoyer: nettoyer,
    decoderSerie: decoderSerie, valeurAnnee: valeurAnnee, somme: somme,
    stats: stats, chercher: chercher, courbe: courbe, pasRond: pasRond,
    estMixte: estMixte, categorie: categorie, filtrerIdees: filtrerIdees, rares: rares
  };
}));
