/* Rubrique « Jours fériés et fêtes » : tous les calculs de dates (jours fériés, Pâques, fêtes, ponts, noces).
   Un seul code pour les outils (navigateur : window.FE) et pour les textes des pages (Node : precalcul.js) ;
   testé par tests\test_logique.py. Aucune donnée n'est envoyée. Les dates sont des « numéros de jour »
   (jours entiers depuis le 1er janvier 1970, en UTC) : aucun piège d'heure d'été. */
(function (racine) {
  'use strict';
  var JOUR_MS = 86400000;
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre',
    'novembre', 'décembre'];
  // Bornes : calendrier grégorien (adopté en France en décembre 1582) ; jours fériés selon la loi actuelle.
  var AN_MIN = 1583, AN_MAX = 9999, FERIES_MIN = 2000, FERIES_MAX = 2100;

  function entier(v) { return typeof v === 'number' && isFinite(v) && Math.floor(v) === v; }
  function bissextile(a) { return (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0; }
  function joursDansMois(a, mo) { return [31, bissextile(a) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1]; }
  // Date réelle du calendrier grégorien, année bornée.
  function valide(a, mo, j) {
    return entier(a) && entier(mo) && entier(j) && a >= AN_MIN && a <= AN_MAX && mo >= 1 && mo <= 12 && j >= 1 &&
      j <= joursDansMois(a, mo);
  }
  function num(a, mo, j) { return Math.round(Date.UTC(a, mo - 1, j) / JOUR_MS); }
  function jourSemaine(n) { return (((n + 4) % 7) + 7) % 7; } // 0 = dimanche (le 1er janvier 1970 était un jeudi)
  function date(n) {
    var d = new Date(n * JOUR_MS);
    return { a: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, j: d.getUTCDate(), js: d.getUTCDay() };
  }
  function iso(n) { var d = date(n); return d.a + '-' + (d.mo < 10 ? '0' : '') + d.mo + '-' + (d.j < 10 ? '0' : '') + d.j; }
  // "AAAA-MM-JJ" -> numéro de jour, ou NaN (texte lu au plus sur 12 caractères, année 1583-9999).
  function lireIso(texte) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texte || '').slice(0, 12));
    if (!m || !valide(+m[1], +m[2], +m[3])) { return NaN; }
    return num(+m[1], +m[2], +m[3]);
  }
  // Année lue dans un texte : entier entre min et max, sinon NaN (jamais de boucle sur une valeur non bornée).
  function lireAnnee(texte, min, max) {
    var s = String(texte === undefined || texte === null ? '' : texte).trim().slice(0, 6);
    if (!/^\d{1,4}$/.test(s)) { return NaN; }
    var a = +s;
    return a >= min && a <= max ? a : NaN;
  }

  // Dimanche de Pâques : algorithme de Meeus / Jones / Butcher (calendrier grégorien, toute année depuis 1583).
  function paques(a) {
    var b = a % 19, c = Math.floor(a / 100), d = a % 100, e = Math.floor(c / 4), f = c % 4,
      g = Math.floor((c + 8) / 25), h = Math.floor((c - g + 1) / 3), i = (19 * b + c - e - h + 15) % 30,
      k = Math.floor(d / 4), l = d % 4, m = (32 + 2 * f + 2 * k - i - l) % 7,
      n = Math.floor((b + 11 * i + 22 * m) / 451), mois = Math.floor((i + m - 7 * n + 114) / 31),
      jour = ((i + m - 7 * n + 114) % 31) + 1;
    return num(a, mois, jour);
  }
  // Fêtes liées à Pâques : écart en jours avec le dimanche de Pâques.
  var MOBILES = [
    ['mardi-gras', 'Mardi gras', -47], ['cendres', 'Mercredi des Cendres', -46], ['rameaux', 'Dimanche des Rameaux', -7],
    ['vendredi-saint', 'Vendredi saint', -2], ['paques', 'Pâques', 0], ['lundi-paques', 'Lundi de Pâques', 1],
    ['ascension', 'Ascension', 39], ['pentecote', 'Pentecôte', 49], ['lundi-pentecote', 'Lundi de Pentecôte', 50]
  ];
  function mobiles(a) {
    var p = paques(a);
    return MOBILES.map(function (x) { return { id: x[0], nom: x[1], ecart: x[2], n: p + x[2] }; });
  }

  // rang-ième jour js (0 = dimanche) d'un mois ; rang -1 = le dernier du mois.
  function nieme(a, mo, js, rang) {
    if (rang > 0) {
      var p = num(a, mo, 1);
      return p + ((js - jourSemaine(p) + 7) % 7) + 7 * (rang - 1);
    }
    var u = num(a, mo, joursDansMois(a, mo));
    return u - ((jourSemaine(u) - js + 7) % 7);
  }
  // Fête des mères (Code de l'action sociale et des familles, art. D215-2) : dernier dimanche de mai ;
  // si ce dimanche est celui de la Pentecôte, premier dimanche de juin.
  function feteDesMeres(a) {
    var d = nieme(a, 5, 0, -1), pentecote = paques(a) + 49;
    return d === pentecote ? { n: nieme(a, 6, 0, 1), decalee: true, pentecote: pentecote } : { n: d, decalee: false, pentecote: pentecote };
  }
  function feteDesPeres(a) { return nieme(a, 6, 0, 3); } // usage : 3e dimanche de juin
  function grandsMeres(a) { return nieme(a, 3, 0, 1); } // usage commercial : 1er dimanche de mars
  function grandsPeres(a) { return nieme(a, 10, 0, 1); } // usage commercial : 1er dimanche d'octobre

  // Lieux : métropole, Alsace-Moselle (2 jours en plus), départements et régions d'outre-mer (abolition de l'esclavage).
  var LIEUX = {
    fr: { nom: 'France métropolitaine' },
    am: { nom: 'Alsace-Moselle' },
    gp: { nom: 'Guadeloupe', mo: 5, j: 27 },
    mq: { nom: 'Martinique', mo: 5, j: 22 },
    gf: { nom: 'Guyane', mo: 6, j: 10 },
    re: { nom: 'La Réunion', mo: 12, j: 20 },
    yt: { nom: 'Mayotte', mo: 4, j: 27 }
  };
  function lieuValide(l) { return typeof l === 'string' && Object.prototype.hasOwnProperty.call(LIEUX, l); }

  // Jours fériés d'une année (Code du travail, art. L3133-1 ; L3134-13 en Alsace-Moselle ; abolition outre-mer).
  function feries(a, lieu) {
    var p = paques(a), f = function (mo, j) { return num(a, mo, j); };
    var l = [
      { id: 'an', nom: "Jour de l'An", n: f(1, 1) },
      { id: 'lundi-paques', nom: 'Lundi de Pâques', n: p + 1 },
      { id: 'travail', nom: 'Fête du Travail', n: f(5, 1) },
      { id: 'victoire', nom: 'Victoire 1945', n: f(5, 8) },
      { id: 'ascension', nom: 'Ascension', n: p + 39 },
      { id: 'lundi-pentecote', nom: 'Lundi de Pentecôte', n: p + 50 },
      { id: 'nationale', nom: 'Fête nationale', n: f(7, 14) },
      { id: 'assomption', nom: 'Assomption', n: f(8, 15) },
      { id: 'toussaint', nom: 'Toussaint', n: f(11, 1) },
      { id: 'armistice', nom: 'Armistice 1918', n: f(11, 11) },
      { id: 'noel', nom: 'Noël', n: f(12, 25) }
    ];
    if (lieu === 'am') {
      l.push({ id: 'vendredi-saint', nom: 'Vendredi saint', n: p - 2, local: true });
      l.push({ id: 'noel2', nom: 'Lendemain de Noël (26 décembre)', n: f(12, 26), local: true });
    } else if (lieuValide(lieu) && LIEUX[lieu].mo) {
      l.push({ id: 'abolition', nom: "Abolition de l'esclavage", n: f(LIEUX[lieu].mo, LIEUX[lieu].j), local: true });
    }
    l.sort(function (x, y) { return x.n - y.n; });
    l.forEach(function (x) { x.js = jourSemaine(x.n); x.effet = effet(x.js); });
    return l;
  }
  // Effet d'un jour férié selon le jour de la semaine.
  function effet(js) {
    return ['weekend', 'lundi', 'pont-lundi', 'mercredi', 'pont-vendredi', 'vendredi', 'weekend'][js];
  }

  // Jours de repos (samedi, dimanche, jours fériés) entre deux numéros de jour, années voisines comprises.
  function repos(debut, fin, lieu) {
    var off = {}, a;
    for (a = date(debut).a; a <= date(fin).a; a++) {
      if (a < AN_MIN || a > AN_MAX) { continue; }
      feries(a, lieu).forEach(function (x) { off[x.n] = x; });
    }
    return off;
  }
  function estTravaille(n, off) { var js = jourSemaine(n); return js !== 0 && js !== 6 && !off[n]; }

  // Jours ouvrés (du lundi au vendredi, jours fériés retirés) par mois d'une année.
  function ouvres(a, lieu) {
    var off = repos(num(a, 1, 1), num(a, 12, 31), lieu), mois = [], total = 0, mo, n, c;
    for (mo = 1; mo <= 12; mo++) {
      c = 0;
      for (n = num(a, mo, 1); n <= num(a, mo, joursDansMois(a, mo)); n++) { if (estTravaille(n, off)) { c++; } }
      mois.push(c);
      total += c;
    }
    return { mois: mois, total: total };
  }

  // Ponts et congés : pour chaque jour férié tombant en semaine, les meilleures façons de poser de 1 à max jours
  // de congé autour (seulement celles qui font gagner au moins un week-end ou un jour férié de plus).
  // Calcul direct sur la liste des jours travaillés de l'année (max borné à 10) : aucune boucle non bornée.
  function occasions(a, lieu, max) {
    max = Math.max(1, Math.min(10, entier(max) ? max : 5));
    var debut = num(a, 1, 1) - 20, fin = num(a, 12, 31) + 20, off = repos(debut, fin, lieu), W = [], n, res = [], vus = {};
    for (n = debut; n <= fin; n++) { if (estTravaille(n, off)) { W.push(n); } }
    feries(a, lieu).forEach(function (h) {
      if (h.js === 0 || h.js === 6) { return; }
      if (vus[h.n]) { return; } // deux fêtes le même jour : une seule occasion
      vus[h.n] = true;
      // position du jour férié dans la liste des jours travaillés : W[i - 1] < h.n < W[i]
      var i = 0;
      while (i < W.length && W[i] < h.n) { i++; }
      var base = { k: 0, debut: W[i - 1] + 1, fin: W[i] - 1 };
      base.longueur = base.fin - base.debut + 1;
      var options = [], prec = base, k, s, meilleur, d, f;
      for (k = 1; k <= max; k++) {
        meilleur = null;
        // fenêtre de k jours posés W[s] .. W[s + k - 1] qui contient le jour férié : s de i - k à i
        for (s = i - k; s <= i; s++) {
          if (s < 1 || s + k >= W.length) { continue; }
          d = W[s - 1] + 1; f = W[s + k] - 1;
          if (d > h.n || f < h.n) { continue; }
          if (!meilleur || f - d + 1 > meilleur.longueur) { meilleur = { k: k, debut: d, fin: f, longueur: f - d + 1, poses: W.slice(s, s + k) }; }
        }
        if (meilleur && meilleur.longueur - prec.longueur >= (k - prec.k) + 2) { options.push(meilleur); prec = meilleur; }
      }
      res.push({ ferie: h, base: base, options: options });
    });
    return res;
  }
  // Les mêmes occasions, sans doublon : une période par fenêtre (du premier au dernier jour de repos), avec les jours
  // fériés qu'elle contient. k = 0 : week-end prolongé sans poser de congé (jour férié un lundi ou un vendredi).
  function periodes(a, lieu, max) {
    var occ = occasions(a, lieu, max), vues = {}, res = [], noms = {};
    feries(a - 1, lieu).concat(feries(a, lieu), feries(a + 1, lieu)).forEach(function (x) {
      noms[x.n] = noms[x.n] ? noms[x.n] + ' et ' + x.nom : x.nom;
    });
    occ.forEach(function (o) {
      (o.base.longueur >= 3 ? [o.base] : []).concat(o.options).forEach(function (p) {
        var cle = p.debut + ':' + p.fin, n, dans = [];
        if (vues[cle]) { return; }
        vues[cle] = true;
        for (n = p.debut; n <= p.fin; n++) { if (noms[n]) { dans.push({ n: n, nom: noms[n] }); } }
        res.push({ k: p.k, debut: p.debut, fin: p.fin, longueur: p.longueur, poses: p.poses || [], feries: dans });
      });
    });
    res.sort(function (x, y) { return x.debut - y.debut || x.k - y.k; });
    return res;
  }

  // Noces : liste traditionnelle la plus répandue en France (les noms varient selon les listes).
  var NOCES = {
    1: 'coton', 2: 'cuir', 3: 'froment', 4: 'cire', 5: 'bois', 6: 'chypre', 7: 'laine', 8: 'coquelicot', 9: 'faïence',
    10: 'étain', 11: 'corail', 12: 'soie', 13: 'muguet', 14: 'plomb', 15: 'cristal', 16: 'saphir', 17: 'rose',
    18: 'turquoise', 19: 'cretonne', 20: 'porcelaine', 21: 'opale', 22: 'bronze', 23: 'béryl', 24: 'satin', 25: 'argent',
    26: 'jade', 27: 'acajou', 28: 'nickel', 29: 'velours', 30: 'perle', 31: 'basane', 32: 'cuivre', 33: 'porphyre',
    34: 'ambre', 35: 'rubis', 36: 'mousseline', 37: 'papier', 38: 'mercure', 39: 'crêpe', 40: 'émeraude', 41: 'fer',
    42: 'nacre', 43: 'flanelle', 44: 'topaze', 45: 'vermeil', 46: 'lavande', 47: 'cachemire', 48: 'améthyste',
    49: 'cèdre', 50: 'or', 51: 'camélia', 52: 'tourmaline', 53: 'merisier', 54: 'zibeline', 55: 'orchidée',
    56: 'buis ou lapis-lazuli', 57: 'azalée', 58: 'érable', 59: 'olivier ou vison', 60: 'diamant', 65: 'palissandre',
    70: 'platine', 75: 'albâtre', 80: 'chêne'
  };
  function noces(n) { return entier(n) && Object.prototype.hasOwnProperty.call(NOCES, n) ? NOCES[n] : null; }
  // « de coton », « d'or », « d'étain » : élision devant une voyelle ou un h muet.
  function deNoces(nom) { return (/^[aeiouyéèêâîôûœh]/i.test(nom) ? "d'" : 'de ') + nom; }

  // Calendrier des fêtes de l'année (fêtes civiles, religieuses à date calculée, familiales, populaires, commerciales).
  function fetes(a) {
    var p = paques(a), f = function (mo, j) { return num(a, mo, j); }, m = feteDesMeres(a);
    var l = [
      { id: 'an', nom: "Jour de l'An", n: f(1, 1), type: 'ferie' },
      { id: 'epiphanie', nom: 'Épiphanie (galette des rois)', n: nieme(a, 1, 0, 1) === f(1, 1) ? f(1, 8) : nieme(a, 1, 0, 1), type: 'religieuse' },
      { id: 'chandeleur', nom: 'Chandeleur', n: f(2, 2), type: 'populaire' },
      { id: 'saint-valentin', nom: 'Saint-Valentin', n: f(2, 14), type: 'populaire' },
      { id: 'mardi-gras', nom: 'Mardi gras', n: p - 47, type: 'religieuse' },
      { id: 'cendres', nom: 'Mercredi des Cendres', n: p - 46, type: 'religieuse' },
      { id: 'grands-meres', nom: 'Fête des grands-mères', n: grandsMeres(a), type: 'commerciale' },
      { id: 'poisson', nom: "Poisson d'avril", n: f(4, 1), type: 'populaire' },
      { id: 'rameaux', nom: 'Dimanche des Rameaux', n: p - 7, type: 'religieuse' },
      { id: 'vendredi-saint', nom: 'Vendredi saint', n: p - 2, type: 'religieuse' },
      { id: 'paques', nom: 'Pâques', n: p, type: 'religieuse' },
      { id: 'lundi-paques', nom: 'Lundi de Pâques', n: p + 1, type: 'ferie' },
      { id: 'travail', nom: 'Fête du Travail', n: f(5, 1), type: 'ferie' },
      { id: 'victoire', nom: 'Victoire 1945', n: f(5, 8), type: 'ferie' },
      { id: 'ascension', nom: 'Ascension', n: p + 39, type: 'ferie' },
      { id: 'pentecote', nom: 'Pentecôte', n: p + 49, type: 'religieuse' },
      { id: 'lundi-pentecote', nom: 'Lundi de Pentecôte', n: p + 50, type: 'ferie' },
      { id: 'meres', nom: 'Fête des mères', n: m.n, type: 'famille' },
      { id: 'peres', nom: 'Fête des pères', n: feteDesPeres(a), type: 'famille' },
      { id: 'musique', nom: 'Fête de la musique', n: f(6, 21), type: 'populaire' },
      { id: 'nationale', nom: 'Fête nationale', n: f(7, 14), type: 'ferie' },
      { id: 'assomption', nom: 'Assomption', n: f(8, 15), type: 'ferie' },
      { id: 'grands-peres', nom: 'Fête des grands-pères', n: grandsPeres(a), type: 'commerciale' },
      { id: 'halloween', nom: 'Halloween', n: f(10, 31), type: 'populaire' },
      { id: 'toussaint', nom: 'Toussaint', n: f(11, 1), type: 'ferie' },
      { id: 'armistice', nom: 'Armistice 1918', n: f(11, 11), type: 'ferie' },
      { id: 'black-friday', nom: 'Black Friday', n: nieme(a, 11, 4, 4) + 1, type: 'commerciale' },
      { id: 'avent', nom: "Premier dimanche de l'Avent", n: f(12, 25) - ((jourSemaine(f(12, 25)) + 6) % 7 + 1) - 21, type: 'religieuse' },
      { id: 'noel', nom: 'Noël', n: f(12, 25), type: 'ferie' },
      { id: 'sylvestre', nom: 'Saint-Sylvestre', n: f(12, 31), type: 'populaire' }
    ];
    l.sort(function (x, y) { return x.n - y.n; });
    l.forEach(function (x) { x.js = jourSemaine(x.n); });
    return l;
  }

  // Semaine ISO 8601 (la semaine 1 contient le premier jeudi de l'année).
  function semaineIso(n) {
    var jeudi = n - ((jourSemaine(n) + 6) % 7) + 3, a = date(jeudi).a;
    return { semaine: Math.floor((jeudi - num(a, 1, 1)) / 7) + 1, annee: a };
  }
  function jourDeLAnnee(n) { var d = date(n); return n - num(d.a, 1, 1) + 1; }
  // Prochaines années (au plus nb, jusqu'à 9999) où le jour/mois donné tombe le jour js.
  function anneesOu(mo, j, js, depuis, nb) {
    var r = [], a;
    for (a = Math.max(AN_MIN, depuis); a <= AN_MAX && r.length < nb && a < depuis + 400; a++) {
      if (j <= joursDansMois(a, mo) && jourSemaine(num(a, mo, j)) === js) { r.push(a); }
    }
    return r;
  }

  // Textes français.
  function texteDate(n, avecAnnee) {
    var d = date(n);
    return JOURS[d.js] + ' ' + d.j + (d.j === 1 ? 'er' : '') + ' ' + MOIS[d.mo - 1] + (avecAnnee === false ? '' : ' ' + d.a);
  }
  function jourMois(n) { var d = date(n); return d.j + (d.j === 1 ? 'er' : '') + ' ' + MOIS[d.mo - 1]; }

  var FE = {
    JOURS: JOURS, MOIS: MOIS, AN_MIN: AN_MIN, AN_MAX: AN_MAX, FERIES_MIN: FERIES_MIN, FERIES_MAX: FERIES_MAX, LIEUX: LIEUX,
    NOCES: NOCES, MOBILES: MOBILES,
    bissextile: bissextile, joursDansMois: joursDansMois, valide: valide, num: num, date: date, iso: iso, lireIso: lireIso,
    lireAnnee: lireAnnee, jourSemaine: jourSemaine, paques: paques, mobiles: mobiles, nieme: nieme,
    feteDesMeres: feteDesMeres, feteDesPeres: feteDesPeres, grandsMeres: grandsMeres, grandsPeres: grandsPeres,
    lieuValide: lieuValide, feries: feries, effet: effet, ouvres: ouvres, occasions: occasions, periodes: periodes, noces: noces,
    deNoces: deNoces, fetes: fetes, semaineIso: semaineIso, jourDeLAnnee: jourDeLAnnee, anneesOu: anneesOu,
    texteDate: texteDate, jourMois: jourMois
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = FE; } else { racine.FE = FE; }
}(typeof window !== 'undefined' ? window : this));
