/* Tests du PC : aides communes (DOM). Rien n'est envoyé : tout reste dans le navigateur. Jamais de innerHTML avec du texte variable. */
(function () {
  'use strict';
  var TP = window.TP;
  TP.$ = function (id) { return document.getElementById(id); };
  TP.creer = function (tag, classe, texte) {
    var e = document.createElement(tag);
    if (classe) { e.className = classe; }
    if (texte !== undefined && texte !== null) { e.textContent = texte; }
    return e;
  };
  TP.vider = function (e) { while (e && e.firstChild) { e.removeChild(e.firstChild); } };
  var nfs = {};
  TP.nf = function (v, dec) {
    if (!isFinite(v)) { return '–'; }
    dec = dec || 0;
    if (!nfs[dec]) { nfs[dec] = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
    return nfs[dec].format(v);
  };
  var ICONES = { ok: '✓', ko: '✕', attente: '…', info: 'i' };
  // Zone de résultat : « ça marche » / « ça ne marche pas » en grand, puis la solution pas à pas.
  // etat : 'ok' | 'ko' | 'attente' | 'info' ; etapes : liste de phrases (facultatif) ; lien : adresse d'une page d'aide (facultatif).
  TP.verdict = function (zone, etat, titre, texte, etapes, lien, lienTexte) {
    if (!zone) { return; }
    TP.vider(zone);
    zone.className = 'verdict v-' + etat;
    zone.appendChild(TP.creer('span', 'v-icone', ICONES[etat] || ''));
    var c = TP.creer('div', 'v-corps');
    c.appendChild(TP.creer('strong', 'v-titre', titre));
    if (texte) { c.appendChild(TP.creer('p', 'v-texte', texte)); }
    if (etapes && etapes.length) {
      var ol = TP.creer('ol', 'v-etapes');
      etapes.forEach(function (x) { ol.appendChild(TP.creer('li', '', x)); });
      c.appendChild(ol);
    }
    if (lien) {
      var p = TP.creer('p', 'v-lien');
      var a = TP.creer('a', '', lienTexte || 'Voir l’aide détaillée');
      a.href = (lien.charAt(0) === '/' ? (document.documentElement.getAttribute('data-base') || '') : '') + lien;
      p.appendChild(a);
      c.appendChild(p);
    }
    zone.appendChild(c);
  };
  // Bouton « Copier le lien de ce test »
  document.addEventListener('DOMContentLoaded', function () {
    var b = TP.$('copierLien'), s = TP.$('etatLien');
    if (!b) { return; }
    b.addEventListener('click', function () {
      var url = location.href.split('#')[0];
      var fin = function (ok) { if (s) { s.textContent = ok ? 'Lien copié.' : 'Copie impossible : copiez l’adresse du navigateur.'; } };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { fin(true); }, function () { fin(false); });
      } else { fin(false); }
    });
  });
  // Mobile et tablette : le tactile ne sait pas faire certains tests
  TP.tactile = function () { return (navigator.maxTouchPoints || 0) > 0; };
}());
