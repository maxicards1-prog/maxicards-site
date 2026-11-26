/* Aides communes à tous les outils. Aucune donnée n'est envoyée : tout est calculé dans le navigateur. */
(function () {
  'use strict';
  // Langue de la page d'après <html lang> (24/11/2026 : en ; 26/11/2026 : es = Espagne, pt-BR = Brésil)
  var LANG = String(document.documentElement.lang || 'fr').slice(0, 2).toLowerCase();
  if (['fr', 'en', 'es', 'pt'].indexOf(LANG) < 0) { LANG = 'fr'; }
  var EN = LANG === 'en';
  var LOCALE = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', pt: 'pt-BR' }[LANG];
  // Monnaie des montants : euro (fr, es), dollar (en), real (pt) ; un outil peut la changer (O.monnaie = 'EUR')
  var MONNAIE = { fr: 'EUR', en: 'USD', es: 'EUR', pt: 'BRL' }[LANG];
  var nf = function (dec) {
    return new Intl.NumberFormat(LOCALE, { minimumFractionDigits: dec, maximumFractionDigits: dec });
  };
  var OCP = {
    en: EN,
    lang: LANG,
    monnaie: MONNAIE,
    // Texte selon la langue de la page : O.t('français', 'English', 'español', 'português') ; sans es/pt : anglais
    t: function (fr, en, es, pt) {
      if (LANG === 'fr') { return fr; }
      if (LANG === 'es' && typeof es === 'string') { return es; }
      if (LANG === 'pt' && typeof pt === 'string') { return pt; }
      return en;
    },
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
      if (LANG === 'fr' && OCP.monnaie === 'EUR') { return nf(2).format(v) + ' €'; }
      if (EN && OCP.monnaie === 'USD') { return (v < 0 ? '-$' : '$') + nf(2).format(Math.abs(v)); }
      return new Intl.NumberFormat(LOCALE, { style: 'currency', currency: OCP.monnaie }).format(v);
    },
    pourcent: function (v, dec) {
      if (!isFinite(v)) { return '–'; }
      var d = typeof dec === 'number' ? dec : 1;
      return nf(d).format(v * 100) + (EN || LANG === 'pt' ? '%' : ' %');
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
