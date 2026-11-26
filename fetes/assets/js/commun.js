/* Jours fériés et fêtes (copie des aides communes de Calculs du quotidien). Aucune donnée n'est envoyée : tout est calculé dans le navigateur. */
(function () {
  'use strict';
  var formats = {};
  // Pages anglaises (<html lang="en">) : nombres au format en-US (1,234.5) et messages en anglais.
  var EN = /^en/i.test(document.documentElement.lang || '');
  var LOC = EN ? 'en-US' : 'fr-FR';
  function nf(dec) {
    if (!formats[dec]) {
      formats[dec] = new Intl.NumberFormat(LOC, { minimumFractionDigits: dec, maximumFractionDigits: dec });
    }
    return formats[dec];
  }
  var JOUR_MS = 86400000;
  var NOMS_JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var NOMS_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre',
    'octobre', 'novembre', 'décembre'];

  var CQ = {
    el: function (id) { return document.getElementById(id); },
    // Lit un nombre ; NaN si vide ou invalide. Accepte la virgule et les espaces.
    nombre: function (id, min, max) {
      var el = document.getElementById(id);
      if (!el) { return NaN; }
      var brut = String(el.value).trim().replace(/[\s  ]/g, '');
      // Anglais : 1,200 = 1200 (virgule des milliers) ; sinon la virgule est une décimale.
      if (EN && /^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(brut)) { brut = brut.replace(/,/g, ''); }
      brut = brut.replace(',', '.');
      if (brut === '') { return NaN; }
      var v = Number(brut);
      if (!isFinite(v)) { return NaN; }
      if (typeof min === 'number' && v < min) { v = min; }
      if (typeof max === 'number' && v > max) { v = max; }
      return v;
    },
    valeur: function (id) { var el = document.getElementById(id); return el ? el.value : ''; },
    coche: function (id) { var el = document.getElementById(id); return !!(el && el.checked); },
    en: EN,
    euros: function (v) { return isFinite(v) ? nf(2).format(v) + ' €' : '–'; },
    pourcent: function (v, dec) { return isFinite(v) ? nf(typeof dec === 'number' ? dec : 2).format(v) + ' %' : '–'; },
    entier: function (v) { return isFinite(v) ? nf(0).format(v) : '–'; },
    decimal: function (v, dec) { return isFinite(v) ? nf(dec).format(v) : '–'; },
    // Nombre sans zéros inutiles (jusqu'à dec décimales).
    souple: function (v, dec) {
      if (!isFinite(v)) { return '–'; }
      return new Intl.NumberFormat(LOC, { maximumFractionDigits: typeof dec === 'number' ? dec : 4 }).format(v);
    },
    // Résultat : le chiffre « défile » (animation CSS) quand il change ; le texte final est posé tout de suite.
    texte: function (id, valeur) {
      var el = document.getElementById(id);
      if (!el) { return; }
      var avant = el.textContent;
      el.textContent = valeur;
      // Pas d'animation au premier remplissage (« – »), ni sans Web Animations, ni si l'utilisateur réduit les animations.
      if (avant !== String(valeur) && avant !== '–' && avant !== '' && valeur !== '–' && el.classList.contains('valeur') &&
          el.animate && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
        el.animate([{ opacity: 0.15, transform: 'translateY(55%)' }, { opacity: 1, transform: 'none' }],
          { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
    },
    // Jauge : position 0 à 1 (NaN = masquée).
    jauge: function (id, fraction) {
      var el = document.getElementById(id);
      if (!el) { return; }
      var ok = isFinite(fraction);
      el.parentNode.parentNode.classList.toggle('vide', !ok);
      el.style.setProperty('--pos', (ok ? Math.max(0, Math.min(1, fraction)) * 100 : 0) + '%');
    },
    surChangement: function (ids, fn) {
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) { el.addEventListener('input', fn); el.addEventListener('change', fn); }
      });
    },
    // Remplace le contenu d'un tbody par des lignes de texte (jamais de HTML).
    lignes: function (id, lignes) {
      var corps = document.getElementById(id);
      if (!corps) { return; }
      while (corps.firstChild) { corps.removeChild(corps.firstChild); }
      lignes.forEach(function (ligne) {
        var tr = document.createElement('tr');
        if (ligne.classe) { tr.className = ligne.classe; }
        ligne.cellules.forEach(function (c, i) {
          var td = document.createElement('td');
          td.textContent = c;
          if (ligne.nombres && ligne.nombres.indexOf(i) !== -1) { td.className = 'nombre'; }
          tr.appendChild(td);
        });
        corps.appendChild(tr);
      });
    },

    // ---------- dates (jours entiers en UTC : aucun piège d'heure d'été) ----------
    // "AAAA-MM-JJ" -> numéro de jour (jours depuis le 01/01/1970), ou NaN.
    jour: function (texte) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texte || ''));
      if (!m) { return NaN; }
      var a = +m[1], mo = +m[2], j = +m[3];
      var t = Date.UTC(a, mo - 1, j);
      var d = new Date(t);
      if (d.getUTCFullYear() !== a || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== j) { return NaN; }
      return t / JOUR_MS;
    },
    versDate: function (n) { return new Date(n * JOUR_MS); },
    versTexteIso: function (n) { return new Date(n * JOUR_MS).toISOString().slice(0, 10); },
    aujourdhui: function () {
      var d = new Date();
      return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / JOUR_MS;
    },
    jourSemaine: function (n) { return new Date(n * JOUR_MS).getUTCDay(); },
    dateLongue: function (n) {
      var d = new Date(n * JOUR_MS);
      return NOMS_JOURS[d.getUTCDay()] + ' ' + d.getUTCDate() + (d.getUTCDate() === 1 ? 'er' : '') + ' ' +
        NOMS_MOIS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
    },
    nomJour: function (n) { return NOMS_JOURS[new Date(n * JOUR_MS).getUTCDay()]; },
    annee: function (n) { return new Date(n * JOUR_MS).getUTCFullYear(); },

    // ---------- heures ----------
    // "HH:MM" -> minutes, ou NaN.
    minutes: function (texte) {
      var m = /^(\d{1,2}):(\d{2})$/.exec(String(texte || '').trim());
      if (!m || +m[2] > 59) { return NaN; }
      return +m[1] * 60 + +m[2];
    },
    // minutes -> "7 h 30" (arrondi à la minute)
    hm: function (min) {
      if (!isFinite(min)) { return '–'; }
      var signe = min < 0 ? '−' : '';
      var t = Math.round(Math.abs(min));
      var h = Math.floor(t / 60), m = t % 60;
      return signe + h + ' h ' + (m < 10 ? '0' : '') + m;
    },

    // ---------- partage : les champs [data-p] sont recopiés dans l'adresse ----------
    initPartage: function (recalcul) {
      var champs = Array.prototype.slice.call(document.querySelectorAll('[data-p]'));
      if (!champs.length) { return; }
      var params;
      try { params = new URLSearchParams(window.location.search); } catch (e) { params = null; }
      if (params) {
        champs.forEach(function (el) {
          var cle = el.getAttribute('data-p');
          if (!params.has(cle)) { return; }
          var v = String(params.get(cle)).slice(0, 200);
          if (el.type === 'checkbox') { el.checked = v === '1'; return; }
          if (el.tagName === 'SELECT') {
            var ok = Array.prototype.some.call(el.options, function (o) { return o.value === v; });
            if (ok) { el.value = v; }
            return;
          }
          el.value = v;
        });
      }
      var minuterie = null;
      var ecrire = function () {
        var q = new URLSearchParams();
        champs.forEach(function (el) {
          var cle = el.getAttribute('data-p');
          if (el.type === 'checkbox') { q.set(cle, el.checked ? '1' : '0'); return; }
          if (String(el.value) !== '') { q.set(cle, el.value); }
        });
        try { window.history.replaceState(null, '', window.location.pathname + '?' + q.toString()); } catch (e) { /* rien */ }
      };
      champs.forEach(function (el) {
        var f = function () { clearTimeout(minuterie); minuterie = setTimeout(ecrire, 400); };
        el.addEventListener('input', f);
        el.addEventListener('change', f);
      });
      var bouton = document.getElementById('copierLien');
      if (bouton) {
        bouton.addEventListener('click', function () {
          ecrire();
          var lien = window.location.href;
          var fini = function (msg) { CQ.texte('etatLien', msg); };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(lien).then(function () { fini(EN ? 'Link copied: it reopens this calculation as is.' : 'Lien copié : il rouvre ce calcul tel quel.'); },
              function () { fini(EN ? 'Copy the page address: it contains your calculation.' : 'Copiez l\'adresse de la page : elle contient votre calcul.'); });
          } else {
            fini(EN ? 'Copy the page address: it contains your calculation.' : 'Copiez l\'adresse de la page : elle contient votre calcul.');
          }
        });
      }
      if (typeof recalcul === 'function') { recalcul(); }
    }
  };
  window.CQ = CQ;
}());
