/* Pays du monde : logique pure (aucun accès à la page). Utilisée par les outils dans le navigateur, par precalcul.js
   (faits écrits dans les pages) et par les tests (Node). Rien n'est envoyé : tout se calcule ici. */
(function (racine) {
  'use strict';

  // ---------- texte
  function normaliser(s) {
    return String(s == null ? '' : s).slice(0, 200).toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss')
      .replace(/[’'`´\-‐–—_.,;:!?()\[\]"«»\/]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  // Mélange de Fisher-Yates ; « alea » renvoie un nombre dans [0, 1) (Math.random par défaut, fixe dans les tests).
  function melanger(t, alea) {
    var a = t.slice(), r = alea || Math.random;
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      var x = a[i]; a[i] = a[j]; a[j] = x;
    }
    return a;
  }

  function parContinent(liste, k) {
    return k ? liste.filter(function (p) { return p.k === k; }) : liste.slice();
  }

  // ---------- quiz : une bonne réponse et 3 leurres, de préférence du même continent
  // type 'drapeau' (on montre un drapeau, on choisit le pays) ou 'capitale' (on montre le pays, on choisit la capitale).
  function questionQuiz(liste, type, alea, dejaVus) {
    var r = alea || Math.random;
    if (!liste || liste.length < 4) { return null; }
    var vus = dejaVus || [];
    var libres = liste.filter(function (p) { return vus.indexOf(p.i) < 0; });
    if (!libres.length) { libres = liste.slice(); }
    var bonne = libres[Math.floor(r() * libres.length)];
    var cle = type === 'capitale' ? 'c' : 'n';
    var pris = {};
    pris[normaliser(bonne[cle])] = true;
    var leurres = [];
    function prendre(groupe) {
      var m = melanger(groupe, r);
      for (var i = 0; i < m.length && leurres.length < 3; i++) {
        var v = normaliser(m[i][cle]);
        if (m[i].i !== bonne.i && !pris[v]) { pris[v] = true; leurres.push(m[i]); }
      }
    }
    prendre(liste.filter(function (p) { return p.k === bonne.k; }));
    if (leurres.length < 3) { prendre(liste); }
    if (leurres.length < 3) { return null; }
    return { bonne: bonne.i, choix: melanger([bonne].concat(leurres), r).map(function (p) { return p.i; }) };
  }

  // ---------- indicatifs
  // « +44 20 7946 0958 », « 0044… », « 44 » -> « 442079460958 ». Le « 011 » nord-américain est aussi retiré.
  function chiffres(saisie) {
    var s = String(saisie == null ? '' : saisie).slice(0, 40).trim();
    var d = s.replace(/\D/g, '');
    if (/^\s*\+/.test(s)) { return d; }
    if (d.indexOf('00') === 0) { return d.slice(2); }
    if (d.indexOf('011') === 0 && d.length > 4) { return d.slice(3); }
    return d;
  }

  // Pays dont l'indicatif commence la saisie (le plus long qui convient), avec les cas partagés :
  // +1 (États-Unis, Canada et Caraïbes : 3 chiffres de zone), +7 (Russie, Kazakhstan : 6 ou 7 ensuite), +39 06 698 (Vatican).
  function chercherIndicatif(saisie, liste) {
    var d = chiffres(saisie);
    if (!d) { return { chiffres: '', pays: [], code: '' }; }
    var code = '';
    for (var n = Math.min(3, d.length); n >= 1; n--) {
      var pre = d.slice(0, n);
      if (liste.some(function (p) { return p.t === pre; })) { code = pre; break; }
    }
    if (!code) { return { chiffres: d, pays: [], code: '' }; }
    var tous = liste.filter(function (p) { return p.t === code; });
    var reste = d.slice(code.length);
    var pays = tous;
    if (code === '1' && reste.length >= 3) {
      var zone = reste.slice(0, 3);
      var parZone = tous.filter(function (p) { return (p.r || []).indexOf(zone) >= 0; });
      pays = parZone.length ? parZone : tous.filter(function (p) { return !(p.r || []).length; });
    } else if (code === '7' && reste.length >= 1) {
      pays = tous.filter(function (p) { return (/[67]/.test(reste[0])) === (p.i === 'KZ'); });
    } else if (code === '39' && reste.length >= 5) {
      pays = tous.filter(function (p) { return (reste.indexOf('06698') === 0) === (p.i === 'VA'); });
    }
    return { chiffres: d, pays: pays.map(function (p) { return p.i; }), code: code };
  }

  // Recherche par nom (français, anglais, nom local, ancien nom de capitale…) : début de mot d'abord.
  function chercherNom(saisie, liste, max) {
    var q = normaliser(saisie);
    if (q.length < 2) { return []; }
    var res = [];
    liste.forEach(function (p) {
      var noms = [p.n].concat(p.a || []).map(normaliser);
      var rang = 9;
      noms.forEach(function (x, k) {
        if (x === q) { rang = Math.min(rang, k ? 1 : 0); } else if (x.indexOf(q) === 0) { rang = Math.min(rang, k ? 3 : 2); } else if ((' ' + x).indexOf(' ' + q) >= 0) { rang = Math.min(rang, 4); }
      });
      if (rang < 9) { res.push([rang, p]); }
    });
    res.sort(function (a, b) { return a[0] - b[0] || a[1].n.localeCompare(b[1].n, 'fr'); });
    return res.slice(0, max || 12).map(function (x) { return x[1].i; });
  }

  // ---------- drapeaux
  function filtrerDrapeaux(liste, couleurs, motifs, exact) {
    var c = couleurs || [], m = motifs || [];
    return liste.filter(function (p) {
      var okc = c.every(function (x) { return p.co.indexOf(x) >= 0; });
      if (okc && exact && c.length) { okc = p.co.length === c.length; }
      return okc && m.every(function (x) { return p.mo.indexOf(x) >= 0; });
    }).map(function (p) { return p.i; });
  }

  function jaccard(a, b) {
    var u = {}, inter = 0;
    a.forEach(function (x) { u[x] = 1; });
    b.forEach(function (x) { if (u[x] === 1) { inter++; } u[x] = 2; });
    var n = Object.keys(u).length;
    return n ? inter / n : 0;
  }

  // Drapeaux qui ressemblent à celui d'un pays : paires connues (confusions) d'abord, puis mêmes couleurs et motifs proches.
  function drapeauxProches(iso, liste, confusions, max) {
    var p = liste.filter(function (x) { return x.i === iso; })[0];
    if (!p) { return []; }
    var res = [];
    (confusions || []).forEach(function (c) {
      var autre = c[0] === iso ? c[1] : (c[1] === iso ? c[0] : null);
      if (autre && res.indexOf(autre) < 0 && liste.some(function (x) { return x.i === autre; })) { res.push(autre); }
    });
    // Sinon : exactement les mêmes couleurs et au moins la moitié des motifs en commun.
    var scores = liste.filter(function (x) { return x.i !== iso && res.indexOf(x.i) < 0 && jaccard(p.co, x.co) === 1; }).map(function (x) {
      return [jaccard(p.mo, x.mo), x];
    }).filter(function (s) { return s[0] >= 0.5; });
    scores.sort(function (a, b) { return b[0] - a[0] || a[1].n.localeCompare(b[1].n, 'fr'); });
    scores.forEach(function (s) { if (res.length < (max || 4)) { res.push(s[1].i); } });
    return res.slice(0, max || 4);
  }

  // ---------- tri de la liste des pays
  function comparer(a, b, numerique) {
    if (numerique) {
      var x = parseFloat(a), y = parseFloat(b);
      if (isNaN(x) && isNaN(y)) { return 0; }
      if (isNaN(x)) { return 1; }
      if (isNaN(y)) { return -1; }
      return x - y;
    }
    return normaliser(a).localeCompare(normaliser(b), 'fr');
  }

  function trier(lignes, cle, sens, numerique) {
    var s = sens === 'desc' ? -1 : 1;
    return lignes.map(function (l, k) { return [l, k]; }).sort(function (u, v) {
      if (numerique) { // valeur absente : toujours en fin de liste, quel que soit le sens
        var x = isNaN(parseFloat(u[0][cle])), y = isNaN(parseFloat(v[0][cle]));
        if (x !== y) { return x ? 1 : -1; }
      }
      return s * comparer(u[0][cle], v[0][cle], numerique) || u[1] - v[1];
    }).map(function (u) { return u[0]; });
  }

  // ---------- prises et adaptateur
  // Fiches qu'accepte chaque type de prise murale (IEC « World Plugs ») : « EF » = fiche ronde avec terre des appareils
  // français (CEE 7/7), qui entre dans les prises E et F.
  var ACCEPTE = { A: ['A'], B: ['A', 'B'], C: ['C'], D: ['D'], E: ['C', 'EF'], F: ['C', 'EF'], G: ['G'], H: ['C', 'H'],
    I: ['I'], J: ['C', 'J'], K: ['C', 'K'], L: ['C', 'L'], M: ['M'], N: ['C', 'N'] };
  var ORIGINES = {
    FR: { nom: 'France', de: 'de France', fiches: ['C', 'EF'], prises: ['C', 'E'], v: [230], hz: [50] },
    BE: { nom: 'Belgique', de: 'de Belgique', fiches: ['C', 'EF'], prises: ['C', 'E'], v: [230], hz: [50] },
    LU: { nom: 'Luxembourg', de: 'du Luxembourg', fiches: ['C', 'EF'], prises: ['C', 'F'], v: [230], hz: [50] },
    CH: { nom: 'Suisse', de: 'de Suisse', fiches: ['C', 'J'], prises: ['C', 'J'], v: [230], hz: [50] },
    CA: { nom: 'Canada', de: 'du Canada', fiches: ['A', 'B'], prises: ['A', 'B'], v: [120], hz: [60] }
  };
  var NOM_FICHE = { C: 'fiches plates sans terre (C)', EF: 'fiches rondes avec terre (E/F)', J: 'fiches suisses à 3 broches (J)',
    A: 'fiches à 2 broches plates (A)', B: 'fiches à 3 broches (B)' };

  function adaptateur(origine, prisesDest, tensionsDest, hzDest) {
    var o = ORIGINES[origine];
    if (!o || !prisesDest || !prisesDest.length) { return null; }
    // « C » désigne surtout une fiche (europlug) : quand le pays a d'autres prises, on juge sur celles-ci.
    var murales = prisesDest.length > 1 ? prisesDest.filter(function (p) { return p !== 'C'; }) : prisesDest.slice();
    function prend(p, f) { return (ACCEPTE[p] || []).indexOf(f) >= 0; }
    var entrent = o.fiches.filter(function (f) { return murales.some(function (p) { return prend(p, f); }); });
    // Prises du pays qui ne prennent pas toutes vos fiches
    var refusent = murales.filter(function (p) { return o.fiches.some(function (f) { return !prend(p, f); }); });
    var niveau;
    if (entrent.length === o.fiches.length) {
      niveau = refusent.length ? 'mixte' : 'non';
    } else if (entrent.length) {
      niveau = 'plat';
    } else {
      niveau = 'oui';
    }
    var basse = (tensionsDest || []).filter(function (v) { return v < 200; });
    var tension = !basse.length ? 'meme' : (basse.length === (tensionsDest || []).length ? 'basse' : 'mixte');
    if (o.v[0] < 200) { tension = basse.length === (tensionsDest || []).length ? 'meme' : 'haute'; }
    var hz = (hzDest || []).some(function (h) { return o.hz.indexOf(h) < 0; });
    return { niveau: niveau, entrent: entrent, refusent: refusent, murales: murales, tension: tension, frequence: hz };
  }

  function phraseAdaptateur(res, origine, nomDest, dansDest, prisesDest, tensionsDest) {
    if (!res) { return ''; }
    var o = ORIGINES[origine];
    var types = prisesDest.join(', ');
    var t;
    if (res.niveau === 'non') {
      t = 'Non : vos appareils ' + o.de + ' se branchent directement ' + dansDest + ' (prises ' + types + ').';
    } else if (res.niveau === 'mixte') {
      t = 'Pas toujours : vos fiches entrent dans certaines prises ' + dansDest + ', mais pas dans les prises ' +
        res.refusent.join(', ') + ', aussi répandues. Prenez un adaptateur par précaution.';
    } else if (res.niveau === 'plat') {
      t = 'Seulement pour les ' + res.entrent.map(function (f) { return NOM_FICHE[f]; }).join(' et ') +
        ' : pour les autres fiches, il faut un adaptateur ' + dansDest + ' (prises ' + types + ').';
    } else {
      t = 'Oui : les fiches de vos appareils ' + o.de + ' n\'entrent pas dans les prises ' + dansDest + ' (types ' + res.murales.join(', ') + ') ; il faut un adaptateur.';
    }
    var v = (tensionsDest || []).map(function (x) { return x + ' V'; }).join(' ou ');
    if (res.tension === 'basse') {
      t += ' Le courant y est en ' + v + ' : un chargeur marqué « 100-240 V » fonctionne, un appareil prévu pour ' + o.v[0] + ' V seulement (sèche-cheveux, fer à lisser) a besoin d\'un transformateur.';
    } else if (res.tension === 'mixte') {
      t += ' La tension varie selon les endroits (' + v + ') : vérifiez que vos appareils acceptent « 100-240 V ».';
    } else if (res.tension === 'haute') {
      t += ' Le courant y est en ' + v + ' : un appareil prévu pour ' + o.v[0] + ' V seulement a besoin d\'un transformateur ; un chargeur « 100-240 V » fonctionne.';
    } else {
      t += ' Même tension qu\'' + (origine === 'CA' ? 'au Canada' : 'en Europe') + ' (' + v + ') : pas de transformateur.';
    }
    return t;
  }

  // ---------- accords (mêmes règles que helpers.py) : f la France · fv l'Algérie · m le Maroc · mv l'Iran ·
  // p les Pays-Bas · a Cuba · e Israël · A la Barbade
  function dans(p) {
    return ({ f: 'en ', fv: 'en ', mv: 'en ', e: 'en ', m: 'au ', p: 'aux ', a: 'à ', A: 'à la ' }[p.g] || '') + p.n;
  }
  function de(p) {
    if (p.g === 'a') { return (/^[AEIOUYÉÈÊÎÔÂH]/i.test(p.n) ? 'd\'' : 'de ') + p.n; }
    return ({ f: 'de la ', m: 'du ', fv: 'de l\'', mv: 'de l\'', p: 'des ', e: 'd\'', A: 'de la ' }[p.g] || 'de ') + p.n;
  }

  var LP = {
    dans: dans, de: de,
    normaliser: normaliser, melanger: melanger, parContinent: parContinent, questionQuiz: questionQuiz,
    chiffres: chiffres, chercherIndicatif: chercherIndicatif, chercherNom: chercherNom,
    filtrerDrapeaux: filtrerDrapeaux, drapeauxProches: drapeauxProches, comparer: comparer, trier: trier,
    ACCEPTE: ACCEPTE, ORIGINES: ORIGINES, adaptateur: adaptateur, phraseAdaptateur: phraseAdaptateur
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = LP; } else { racine.LP = LP; }
}(this));
