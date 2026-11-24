/* Aides communes à tous les outils. Aucune donnée n'est envoyée : tout est calculé dans le navigateur. */
(function () {
  'use strict';
  // Langue de la page (<html lang="en"> = version anglaise : dollars, nombres 1,234.5) ; 24/11/2026
  var EN = document.documentElement.lang === 'en';
  var nf = function (dec) {
    return new Intl.NumberFormat(EN ? 'en-US' : 'fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  };
  var OCP = {
    en: EN,
    // Texte selon la langue de la page : O.t('français', 'English')
    t: function (fr, en) { return EN ? en : fr; },
    // Lit un nombre dans un champ ; renvoie NaN si vide ou invalide, borné entre min et max.
    nombre: function (id, min, max) {
      var el = document.getElementById(id);
      if (!el) { return NaN; }
      var brut = String(el.value).trim().replace(',', '.');
      if (brut === '') { return NaN; }
      var v = Number(brut);
      if (!isFinite(v)) { return NaN; }
      if (typeof min === 'number' && v < min) { v = min; }
      if (typeof max === 'number' && v > max) { v = max; }
      return v;
    },
    euros: function (v) {
      if (!isFinite(v)) { return '–'; }
      if (EN) { return (v < 0 ? '-$' : '$') + nf(2).format(Math.abs(v)); }
      return nf(2).format(v) + ' €';
    },
    pourcent: function (v, dec) {
      if (!isFinite(v)) { return '–'; }
      var d = typeof dec === 'number' ? dec : 1;
      return nf(d).format(v * 100) + (EN ? '%' : ' %');
    },
    entier: function (v) {
      if (!isFinite(v)) { return '–'; }
      return nf(0).format(v);
    },
    decimal: function (v, dec) {
      if (!isFinite(v)) { return '–'; }
      return nf(dec).format(v);
    },
    // Écrit du texte (jamais de HTML) dans un élément.
    texte: function (id, valeur) {
      var el = document.getElementById(id);
      if (el) { el.textContent = valeur; }
    },
    classe: function (id, nom, actif) {
      var el = document.getElementById(id);
      if (el) { el.classList.toggle(nom, !!actif); }
    },
    // Probabilité d'au moins un succès en n essais indépendants de probabilité p.
    auMoinsUn: function (p, n) {
      if (!(p > 0)) { return 0; }
      if (p >= 1) { return n > 0 ? 1 : 0; }
      return 1 - Math.exp(n * Math.log1p(-p));
    },
    // Nombre d'essais pour atteindre la probabilité cible q.
    essaisPour: function (p, q) {
      if (!(p > 0)) { return Infinity; }
      if (p >= 1) { return 1; }
      return Math.ceil(Math.log1p(-q) / Math.log1p(-p));
    },
    // Hasard de qualité : nombre dans [0, 1) tiré par le générateur cryptographique du navigateur.
    hasard: (function () {
      var tampon = new Uint32Array(256);
      var pos = tampon.length;
      return function () {
        if (pos >= tampon.length) { window.crypto.getRandomValues(tampon); pos = 0; }
        return tampon[pos++] / 4294967296;
      };
    }()),
    // Stockage local protégé (navigation privée, stockage bloqué...).
    lire: function (cle) {
      try { return window.localStorage.getItem(cle); } catch (e) { return null; }
    },
    ecrire: function (cle, valeur) {
      try { window.localStorage.setItem(cle, valeur); } catch (e) { /* stockage indisponible */ }
    },
    surChangement: function (ids, fn) {
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) { el.addEventListener('input', fn); el.addEventListener('change', fn); }
      });
    }
  };
  window.OCP = OCP;
}());
