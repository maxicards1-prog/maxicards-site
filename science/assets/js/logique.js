/* Tableau périodique et chimie : calculs purs (aucun accès à la page). Testés sous Node par tests\test_site.py.
   Données : donnees\elements.json (masses CIAAW abrégées 2024, constante d'Avogadro exacte, NIST CODATA 2022). */
(function (racine) {
  'use strict';

  function fabriquer(D) {
    var ELEMENTS = D.elements;
    var PAR_SYMBOLE = {};
    var PAR_Z = {};
    ELEMENTS.forEach(function (e) { PAR_SYMBOLE[e.symbole] = e; PAR_Z[e.z] = e; });

    // Constante d'Avogadro : valeur exacte depuis le 20 mai 2019 (Système international révisé).
    var AVOGADRO = 6.02214076e23;
    // Bornes : la formule est courte, l'imbrication limitée, chaque nombre plafonné.
    var LONGUEUR_MAX = 120;
    var PROFONDEUR_MAX = 6;
    var NOMBRE_MAX = 9999;
    var ATOMES_MAX = 1e9;
    var OUVRANTS = { '(': ')', '[': ']', '{': '}' };
    var FERMANTS = { ')': '(', ']': '[', '}': '{' };
    var INDICES = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };

    function normaliserTexte(s) {
      return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ').trim();
    }

    function masseNombre(e) { return parseFloat(e.masse); }

    function decimales(texte) {
      var i = String(texte).indexOf('.');
      return i < 0 ? 0 : String(texte).length - i - 1;
    }

    // ---------- lecture d'une formule chimique ----------
    function erreur(message) { return { ok: false, erreur: message }; }

    function preparer(texte) {
      var s = String(texte == null ? '' : texte);
      if (s.length > LONGUEUR_MAX) { return { erreur: 'Formule trop longue : ' + LONGUEUR_MAX + ' caractères au plus.' }; }
      s = s.replace(/[₀-₉]/g, function (c) { return INDICES[c]; });
      s = s.replace(/[\s  ]/g, '');
      // Séparateurs d'hydrate ou d'adduit : point médian, puce, astérisque, point.
      s = s.replace(/[·•∙⋅*.]/g, '·');
      return { texte: s };
    }

    function lireFormule(brut) {
      var p = preparer(brut);
      if (p.erreur) { return erreur(p.erreur); }
      var s = p.texte;
      if (s === '') { return erreur('Tapez une formule, par exemple H2O ou CuSO4·5H2O.'); }
      var parties = s.split('·');
      var total = {};
      var ordre = [];
      for (var k = 0; k < parties.length; k++) {
        var partie = parties[k];
        if (partie === '') { return erreur('Séparateur « · » en trop : il doit relier deux morceaux, comme dans CuSO4·5H2O.'); }
        var r = lirePartie(partie);
        if (!r.ok) { return r; }
        for (var j = 0; j < r.ordre.length; j++) {
          var sym = r.ordre[j];
          if (!(sym in total)) { total[sym] = 0; ordre.push(sym); }
          total[sym] += r.comptes[sym];
        }
      }
      var somme = 0;
      ordre.forEach(function (x) { somme += total[x]; });
      if (somme > ATOMES_MAX) { return erreur('Formule trop grande : plus d\'un milliard d\'atomes.'); }
      return { ok: true, comptes: total, ordre: ordre, atomes: somme };
    }

    function lirePartie(s) {
      var pos = 0;
      var coef = 1;
      var m = /^\d+/.exec(s);
      if (m) {
        if (m[0].length > 4 || +m[0] > NOMBRE_MAX) { return erreur('Coefficient trop grand : ' + NOMBRE_MAX + ' au plus.'); }
        coef = +m[0];
        if (coef === 0) { return erreur('Un coefficient vaut au moins 1.'); }
        pos = m[0].length;
        if (pos === s.length) { return erreur('Le nombre ' + m[0] + ' n\'est suivi d\'aucun élément.'); }
      }
      // Pile de groupes : chaque niveau garde ses comptes ; profondeur bornée.
      var pile = [{ comptes: {}, ordre: [], ouvrant: null, vide: true }];
      function ajouter(niveau, sym, n) {
        if (!(sym in niveau.comptes)) { niveau.comptes[sym] = 0; niveau.ordre.push(sym); }
        niveau.comptes[sym] += n;
        niveau.vide = false;
      }
      function lireNombre() {
        var m2 = /^\d+/.exec(s.slice(pos));
        if (!m2) { return { n: 1 }; }
        if (m2[0].length > 4 || +m2[0] > NOMBRE_MAX) { return { erreur: 'Nombre trop grand : ' + NOMBRE_MAX + ' au plus.' }; }
        if (+m2[0] === 0) { return { erreur: 'Un indice vaut au moins 1 (« 0 » trouvé).' }; }
        pos += m2[0].length;
        return { n: +m2[0] };
      }
      while (pos < s.length) {
        var c = s.charAt(pos);
        if (OUVRANTS[c]) {
          if (pile.length > PROFONDEUR_MAX) { return erreur('Trop de parenthèses imbriquées : ' + PROFONDEUR_MAX + ' niveaux au plus.'); }
          pile.push({ comptes: {}, ordre: [], ouvrant: c, vide: true });
          pos++;
        } else if (FERMANTS[c]) {
          var haut = pile[pile.length - 1];
          if (pile.length === 1) { return erreur('« ' + c + ' » ferme un groupe qui n\'a pas été ouvert.'); }
          if (haut.ouvrant !== FERMANTS[c]) { return erreur('« ' + c + ' » ne correspond pas à « ' + haut.ouvrant + ' » : fermez avec « ' + OUVRANTS[haut.ouvrant] + ' ».'); }
          if (haut.vide) { return erreur('Groupe vide « ' + haut.ouvrant + c + ' ».'); }
          pos++;
          var nb = lireNombre();
          if (nb.erreur) { return erreur(nb.erreur); }
          pile.pop();
          var dessous = pile[pile.length - 1];
          for (var i = 0; i < haut.ordre.length; i++) { ajouter(dessous, haut.ordre[i], haut.comptes[haut.ordre[i]] * nb.n); }
        } else if (c >= 'A' && c <= 'Z') {
          var sym = c;
          var suivant = s.charAt(pos + 1);
          if (suivant >= 'a' && suivant <= 'z') { sym += suivant; }
          if (!PAR_SYMBOLE[sym]) {
            if (sym.length === 2 && PAR_SYMBOLE[c] && PAR_SYMBOLE[suivant.toUpperCase()]) {
              return erreur('Symbole inconnu « ' + sym + ' ». Si vous pensiez à deux éléments, la 2e lettre doit être une majuscule (' + c + suivant.toUpperCase() + ').');
            }
            return erreur('Symbole inconnu « ' + sym + ' ».');
          }
          pos += sym.length;
          var nb2 = lireNombre();
          if (nb2.erreur) { return erreur(nb2.erreur); }
          ajouter(pile[pile.length - 1], sym, nb2.n);
        } else if (c >= 'a' && c <= 'z') {
          return erreur('Un symbole d\'élément commence par une majuscule : « ' + c + ' » ? (exemple : Co est le cobalt, CO le monoxyde de carbone).');
        } else if (c >= '0' && c <= '9') {
          return erreur('Le nombre en position ' + (pos + 1) + ' ne suit aucun élément ni aucun groupe.');
        } else if (c === '+' || c === '-' || c === '−' || c === '^') {
          return erreur('Les charges (+, −) ne comptent pas dans la masse molaire : retirez-les.');
        } else {
          return erreur('Caractère non reconnu « ' + c + ' ».');
        }
      }
      if (pile.length > 1) {
        return erreur('« ' + pile[pile.length - 1].ouvrant + ' » n\'est pas refermé.');
      }
      var base = pile[0];
      if (base.vide) { return erreur('Aucun élément dans la formule.'); }
      var comptes = {};
      base.ordre.forEach(function (x) { comptes[x] = base.comptes[x] * coef; });
      return { ok: true, comptes: comptes, ordre: base.ordre };
    }

    // ---------- masse molaire et composition ----------
    function masseMolaire(formule) {
      var r = lireFormule(formule);
      if (!r.ok) { return r; }
      var total = 0;
      var dec = 99;
      var isotopes = [];
      r.ordre.forEach(function (sym) {
        var e = PAR_SYMBOLE[sym];
        total += masseNombre(e) * r.comptes[sym];
        if (e.masse_type === 'isotope') { isotopes.push(sym); } else { dec = Math.min(dec, decimales(e.masse)); }
      });
      if (isotopes.length || dec === 99) { dec = 0; }
      var lignes = r.ordre.map(function (sym) {
        var e = PAR_SYMBOLE[sym];
        var m = masseNombre(e) * r.comptes[sym];
        return { symbole: sym, nom: e.nom, nombre: r.comptes[sym], masseAtome: masseNombre(e), masse: m, pourcent: total > 0 ? m / total * 100 : 0 };
      });
      return { ok: true, masse: total, arrondie: arrondir(total, dec), decimales: dec, lignes: lignes, isotopes: isotopes,
        comptes: r.comptes, ordre: r.ordre, atomes: r.atomes, hill: hill(r.comptes) };
    }

    function arrondir(v, dec) {
      var f = Math.pow(10, dec);
      return Math.round(v * f + (v >= 0 ? 1e-9 : -1e-9)) / f;
    }

    // Formule brute dans l'ordre de Hill : C, puis H, puis l'ordre alphabétique (tout alphabétique sans carbone).
    function hill(comptes) {
      var syms = Object.keys(comptes);
      var avecC = syms.indexOf('C') !== -1;
      syms.sort(function (a, b) {
        if (avecC) {
          var rang = function (x) { return x === 'C' ? 0 : x === 'H' ? 1 : 2; };
          if (rang(a) !== rang(b)) { return rang(a) - rang(b); }
        }
        return a < b ? -1 : a > b ? 1 : 0;
      });
      return syms.map(function (x) { return x + (comptes[x] === 1 ? '' : String(comptes[x])); }).join('');
    }

    // ---------- conversions grammes, moles, particules ----------
    // Lit un nombre : virgule ou point, espaces, notation 6,02e23 ou 6,02 × 10^23. NaN si invalide ou hors bornes.
    function lireNombre(texte, max) {
      var s = String(texte == null ? '' : texte);
      if (s.length > 40) { return NaN; }
      s = s.replace(/[\s  ]/g, '').replace(/,/g, '.');
      s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, function (c) { return '0123456789-'.charAt('⁰¹²³⁴⁵⁶⁷⁸⁹⁻'.indexOf(c)); });
      s = s.replace(/^(\d+(?:\.\d+)?)(?:[x×*·]10\^?)(-?\d+)$/i, '$1e$2');
      if (!/^\d+(\.\d+)?(e[+-]?\d{1,3})?$/i.test(s) && !/^\.\d+(e[+-]?\d{1,3})?$/i.test(s)) { return NaN; }
      var v = Number(s);
      if (!isFinite(v) || v < 0) { return NaN; }
      if (typeof max === 'number' && v > max) { return NaN; }
      return v;
    }

    // Masse molaire M (g/mol) depuis une formule ou un nombre tapé.
    function masseDepuisSaisie(texte) {
      var n = lireNombre(texte, 1e7);
      if (isFinite(n)) { return n > 0 ? { ok: true, masse: n, source: 'nombre' } : erreur('La masse molaire doit être plus grande que 0.'); }
      var r = masseMolaire(texte);
      if (!r.ok) { return r; }
      return { ok: true, masse: r.masse, arrondie: r.arrondie, decimales: r.decimales, source: 'formule', hill: r.hill, isotopes: r.isotopes };
    }

    // type : 'masse' (g), 'moles' (mol) ou 'particules'. Renvoie les trois grandeurs.
    function convertir(type, valeur, M) {
      if (!(M > 0) || !isFinite(valeur) || valeur < 0) { return null; }
      var n;
      if (type === 'masse') { n = valeur / M; } else if (type === 'moles') { n = valeur; } else if (type === 'particules') { n = valeur / AVOGADRO; } else { return null; }
      return { masse: n * M, moles: n, particules: n * AVOGADRO };
    }

    // Écriture scientifique française : { mantisse: '6,022', exposant: 23 } (exposant 0 si inutile).
    function scientifique(v, chiffres) {
      if (!isFinite(v)) { return null; }
      if (v === 0) { return { mantisse: '0', exposant: 0 }; }
      var c = chiffres || 4;
      var exp = Math.floor(Math.log10(Math.abs(v)));
      var man = v / Math.pow(10, exp);
      var t = man.toFixed(c - 1);
      if (Math.abs(parseFloat(t)) >= 10) { exp += 1; man = v / Math.pow(10, exp); t = man.toFixed(c - 1); }
      if (exp >= -3 && exp < 6) {
        var d = Math.max(0, c - 1 - exp);
        var u = (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
        return { mantisse: u.replace('.', ','), exposant: 0 };
      }
      return { mantisse: t.replace('.', ','), exposant: exp };
    }

    function exposantTexte(n) {
      return String(n).split('').map(function (c) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'.charAt('0123456789'.indexOf(c)) || (c === '-' ? '⁻' : c); }).join('');
    }

    function scientifiqueTexte(v, chiffres) {
      var s = scientifique(v, chiffres);
      if (!s) { return '–'; }
      var man = s.mantisse.indexOf(',') >= 0 ? s.mantisse.replace(/,?0+$/, '') : s.mantisse;
      // Séparateur des milliers pour les grands entiers (12 345).
      man = man.replace(/^(\d+)/, function (x) { return x.replace(/\B(?=(\d{3})+(?!\d))/g, ' '); });
      return s.exposant === 0 ? man : man + ' × 10' + exposantTexte(s.exposant);
    }

    // ---------- recherche dans le tableau ----------
    function rechercher(texte) {
      var q = normaliserTexte(String(texte == null ? '' : texte).slice(0, 40));
      if (q === '') { return []; }
      if (/^\d{1,3}$/.test(q)) { return PAR_Z[+q] ? [+q] : []; }
      var exact = [];
      var debut = [];
      var dedans = [];
      ELEMENTS.forEach(function (e) {
        var nom = normaliserTexte(e.nom);
        if (e.symbole.toLowerCase() === q || nom === q) { exact.push(e.z); } else if (nom.indexOf(q) === 0) { debut.push(e.z); } else if (q.length >= 3 && nom.indexOf(q) > 0) { dedans.push(e.z); }
      });
      return exact.concat(debut, dedans);
    }

    function configExposants(config) {
      return String(config || '').replace(/([spdf])(\d+)/g, function (x, l, n) { return l + exposantTexte(n); });
    }

    function electronsParCouche(configComplete) {
      var couches = [];
      String(configComplete || '').split(/\s+/).forEach(function (o) {
        var m = /^(\d)([spdf])(\d+)$/.exec(o);
        if (m) { var n = +m[1]; couches[n - 1] = (couches[n - 1] || 0) + (+m[3]); }
      });
      for (var i = 0; i < couches.length; i++) { couches[i] = couches[i] || 0; }
      return couches;
    }

    return {
      AVOGADRO: AVOGADRO, LONGUEUR_MAX: LONGUEUR_MAX, PROFONDEUR_MAX: PROFONDEUR_MAX, NOMBRE_MAX: NOMBRE_MAX,
      element: function (x) { return PAR_SYMBOLE[x] || PAR_Z[x] || null; },
      lireFormule: lireFormule, masseMolaire: masseMolaire, hill: hill, arrondir: arrondir,
      lireNombre: lireNombre, masseDepuisSaisie: masseDepuisSaisie, convertir: convertir,
      scientifique: scientifique, scientifiqueTexte: scientifiqueTexte, exposantTexte: exposantTexte,
      rechercher: rechercher, normaliserTexte: normaliserTexte, configExposants: configExposants,
      electronsParCouche: electronsParCouche
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = fabriquer;
  } else {
    racine.SC = fabriquer(racine.SC_DATA);
  }
}(typeof window !== 'undefined' ? window : this));
