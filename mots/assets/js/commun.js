/* Jeux de lettres : aides communes. Rien n'est envoyé : la recherche se fait dans le navigateur. */
(function () {
  'use strict';
  var MC = {
    el: function (id) { return document.getElementById(id); },
    vider: function (el) { while (el && el.firstChild) { el.removeChild(el.firstChild); } },
    // Crée un élément avec du texte (jamais de HTML).
    cree: function (balise, classe, texte) {
      var e = document.createElement(balise);
      if (classe) { e.className = classe; }
      if (texte != null) { e.textContent = String(texte); }
      return e;
    },
    texte: function (id, valeur) {
      var el = document.getElementById(id);
      if (el) { el.textContent = String(valeur); }
    },
    nombre: function (n) { return new Intl.NumberFormat('fr-FR').format(n); },
    surChangement: function (ids, fn) {
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) { el.addEventListener('input', fn); el.addEventListener('change', fn); }
      });
    },
    // Un lien partagé (?l=...) remplit les champs [data-p], puis l'adresse est remise à nu : la recherche ne reste
    // jamais dans l'adresse de la page (lue par la publicité). Le lien n'est fabriqué qu'au clic sur « Copier le lien ».
    lireAdresse: function () {
      var params;
      try { params = new URLSearchParams(window.location.search); } catch (e) { return; }
      var lu = false;
      Array.prototype.forEach.call(document.querySelectorAll('[data-p]'), function (el) {
        var cle = el.getAttribute('data-p');
        if (!params.has(cle)) { return; }
        lu = true;
        var v = String(params.get(cle)).slice(0, 120);
        if (el.type === 'checkbox') { el.checked = v === '1'; return; }
        if (el.tagName === 'SELECT') {
          if (Array.prototype.some.call(el.options, function (o) { return o.value === v; })) { el.value = v; }
          return;
        }
        el.value = v;
      });
      if (lu || window.location.search) {
        try { window.history.replaceState(null, '', window.location.pathname); } catch (e) { /* rien */ }
      }
    },
    lienRecherche: function () {
      var q = new URLSearchParams();
      Array.prototype.forEach.call(document.querySelectorAll('[data-p]'), function (el) {
        var cle = el.getAttribute('data-p');
        if (el.type === 'checkbox') { q.set(cle, el.checked ? '1' : '0'); return; }
        if (String(el.value) !== '') { q.set(cle, String(el.value).slice(0, 120)); }
      });
      return window.location.origin + window.location.pathname + '?' + q.toString();
    },
    initLien: function () {
      var bouton = document.getElementById('copierLien');
      if (!bouton) { return; }
      bouton.addEventListener('click', function () {
        var lien = MC.lienRecherche();
        var fini = function (msg) { MC.texte('etatLien', msg); };
        var aLaMain = function () { fini('Copiez ce lien à la main : ' + lien); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(lien).then(function () { fini('Lien copié : il rouvre cette recherche telle quelle.'); }, aLaMain);
        } else {
          aLaMain();
        }
      });
    }
  };
  window.MC = MC;
}());
