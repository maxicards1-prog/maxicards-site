/* Calculs bricolage et travaux : aides communes. Aucune donnée n'est envoyée : tout est calculé dans le navigateur. */
(function () {
  'use strict';
  var formats = {};
  function nf(dec) {
    if (!formats[dec]) {
      formats[dec] = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    }
    return formats[dec];
  }
  var CQ = {
    el: function (id) { return document.getElementById(id); },
    // Lit un nombre ; NaN si vide ou invalide. Accepte la virgule et les espaces.
    nombre: function (id) {
      var el = document.getElementById(id);
      if (!el) { return NaN; }
      var brut = String(el.value).trim().replace(/[\s  ]/g, '').replace(',', '.');
      if (brut === '') { return NaN; }
      var v = Number(brut);
      return isFinite(v) ? v : NaN;
    },
    // Résultat : le chiffre « défile » (animation CSS) quand il change ; le texte final est posé tout de suite.
    texte: function (id, valeur) {
      var el = document.getElementById(id);
      if (!el) { return; }
      var avant = el.textContent;
      el.textContent = valeur;
      if (avant !== String(valeur) && avant !== '–' && avant !== '' && valeur !== '–' && el.classList.contains('valeur') &&
          el.animate && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
        el.animate([{ opacity: 0.15, transform: 'translateY(55%)' }, { opacity: 1, transform: 'none' }],
          { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
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
      lignes.forEach(function (cellules) {
        var tr = document.createElement('tr');
        cellules.forEach(function (c, i) {
          var td = document.createElement(i === 0 ? 'th' : 'td');
          if (i === 0) { td.setAttribute('scope', 'row'); }
          td.textContent = c;
          tr.appendChild(td);
        });
        corps.appendChild(tr);
      });
    },
    // Remplace le contenu d'une liste (ul/ol/div) par des éléments de texte.
    paragraphes: function (id, textes, balise) {
      var cible = document.getElementById(id);
      if (!cible) { return; }
      while (cible.firstChild) { cible.removeChild(cible.firstChild); }
      textes.forEach(function (t) {
        var e = document.createElement(balise || 'li');
        e.textContent = t;
        cible.appendChild(e);
      });
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
            navigator.clipboard.writeText(lien).then(function () { fini('Lien copié : il rouvre ce calcul tel quel.'); },
              function () { fini('Copiez l\'adresse de la page : elle contient votre calcul.'); });
          } else {
            fini('Copiez l\'adresse de la page : elle contient votre calcul.');
          }
        });
      }
      if (typeof recalcul === 'function') { recalcul(); }
    }
  };
  window.CQ = CQ;
}());
