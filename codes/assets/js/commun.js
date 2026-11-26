/* Morse, braille et codes secrets : aides communes des pages. Rien n'est envoyé, rien n'est gardé (ni adresse, ni localStorage). */
(function () {
  'use strict';
  var reduit = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nf = new Intl.NumberFormat('fr-FR');

  function copierSecours(texte) {
    var zone = document.createElement('textarea');
    zone.value = texte;
    zone.setAttribute('readonly', '');
    zone.style.position = 'fixed';
    zone.style.top = '-1000px';
    document.body.appendChild(zone);
    zone.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(zone);
    return ok;
  }

  var minuterie = null;
  var CQ = {
    el: function (id) { return document.getElementById(id); },
    entier: function (v) { return isFinite(v) ? nf.format(v) : '–'; },
    surChangement: function (ids, fn) {
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) { el.addEventListener('input', fn); el.addEventListener('change', fn); }
      });
    },
    // Pose un résultat ; petit mouvement du chiffre quand il change (sauf animations réduites).
    texte: function (id, valeur) {
      var el = typeof id === 'string' ? document.getElementById(id) : id;
      if (!el) { return; }
      var avant = el.textContent;
      el.textContent = valeur;
      if (!reduit && el.animate && el.classList.contains('valeur') && avant !== String(valeur) && avant !== '–' && avant !== '') {
        el.animate([{ opacity: 0.2, transform: 'translateY(40%)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
    },
    // Message bref en bas de l'écran (lu par les lecteurs d'écran).
    annonce: function (message) {
      var b = document.getElementById('bulle');
      if (!b) {
        b = document.createElement('div');
        b.id = 'bulle';
        b.className = 'bulle';
        b.setAttribute('role', 'status');
        b.setAttribute('aria-live', 'polite');
        document.body.appendChild(b);
      }
      b.textContent = message;
      b.classList.add('visible');
      clearTimeout(minuterie);
      minuterie = setTimeout(function () { b.classList.remove('visible'); }, 1600);
    },
    // Copie un texte dans le presse-papiers ; message de confirmation.
    copier: function (texte, message) {
      texte = String(texte == null ? '' : texte);
      if (!texte) { CQ.annonce('Rien à copier'); return; }
      var fini = function (ok) { CQ.annonce(ok ? (message || 'Copié') : 'Copie impossible : sélectionnez le texte et faites Ctrl + C'); };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(texte).then(function () { fini(true); }, function () { fini(copierSecours(texte)); });
      } else {
        fini(copierSecours(texte));
      }
    },
    vider: function (el) { while (el.firstChild) { el.removeChild(el.firstChild); } },
    // Crée un élément avec du texte (jamais de HTML).
    cree: function (balise, classe, texte) {
      var e = document.createElement(balise);
      if (classe) { e.className = classe; }
      if (texte != null) { e.textContent = texte; }
      return e;
    }
  };
  window.CQ = CQ;
}());
