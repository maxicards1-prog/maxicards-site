/* Départements de France : aides communes aux outils (données, adresse, « Copier le lien »).
   Rien n'est envoyé : la liste des départements est un fichier public du site, lu par le navigateur.
   Jamais de HTML construit avec une donnée ou une saisie : textContent et createElement seulement. */
(function () {
  'use strict';
  var PARAMS = { n: 4, tri: 10, sens: 4, couleur: 10, mode: 10 };   // seuls réglages lus ou écrits dans l'adresse
  var promesse = null;

  function base() {
    var b = document.documentElement.getAttribute('data-base') || '';
    return /^\/[a-z0-9\-]*$/.test(b) ? b : '';
  }
  function el(id) { return document.getElementById(id); }
  function vider(n) { while (n && n.firstChild) { n.removeChild(n.firstChild); } }
  function creer(tag, classe, texte) {
    var n = document.createElement(tag);
    if (classe) { n.className = classe; }
    if (texte !== undefined && texte !== null) { n.textContent = texte; }
    return n;
  }
  function lien(d, texte) {
    var a = creer('a', null, texte);
    if (/^\/departement\/[a-z0-9\-]+\/$/.test(d.u)) { a.href = base() + d.u; }
    return a;
  }
  function valide(d) {
    return d && typeof d.c === 'string' && /^(\d{2,3}|2[AB])$/.test(d.c) && typeof d.n === 'string' &&
      typeof d.p === 'string' && typeof d.pop === 'number' && typeof d.s === 'number' && d.s > 0;
  }
  // Liste des 101 départements (chargée une fois)
  function donnees() {
    if (!promesse) {
      promesse = fetch(base() + '/assets/data/departements.json', { credentials: 'same-origin' })
        .then(function (r) { if (!r.ok) { throw new Error('HTTP ' + r.status); } return r.json(); })
        .then(function (t) {
          if (!Array.isArray(t)) { throw new Error('format'); }
          var l = t.slice(0, 200).filter(valide);
          if (l.length < 100) { throw new Error('incomplet'); }
          return l;
        });
    }
    return promesse;
  }
  function parCode(liste) {
    var m = {};
    liste.forEach(function (d) { m[d.c] = d; });
    return m;
  }
  function param(k) {
    if (!PARAMS[k]) { return null; }
    try {
      var v = new URLSearchParams(window.location.search).get(k);
      return v === null ? null : String(v).slice(0, PARAMS[k]);
    } catch (e) { return null; }
  }
  // Écrit dans l'adresse les seuls réglages permis (valeurs déjà validées par l'outil)
  function ecrire(reglages) {
    try {
      var q = new URLSearchParams();
      Object.keys(reglages).forEach(function (k) {
        var v = reglages[k];
        if (PARAMS[k] && v !== null && v !== undefined && v !== '') { q.set(k, String(v).slice(0, PARAMS[k])); }
      });
      var s = q.toString();
      window.history.replaceState(null, '', window.location.pathname + (s ? '?' + s : ''));
    } catch (e) { /* rien */ }
  }
  function partage() {
    var b = el('copierLien');
    if (!b) { return; }
    b.addEventListener('click', function () {
      var lienPage = window.location.href.split('#')[0];
      var fini = function (m) { var e = el('etatLien'); if (e) { e.textContent = m; } };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(lienPage).then(function () { fini('Lien copié : il rouvre la page avec ce réglage.'); },
          function () { fini("Copiez l'adresse de la page : elle contient le réglage."); });
      } else { fini("Copiez l'adresse de la page : elle contient le réglage."); }
    });
  }
  function erreur(id, message) {
    var e = el(id);
    if (e) { e.textContent = message; e.hidden = false; }
  }
  window.FRU = { base: base, el: el, vider: vider, creer: creer, lien: lien, donnees: donnees, parCode: parCode,
    param: param, ecrire: ecrire, partage: partage, erreur: erreur };
})();
