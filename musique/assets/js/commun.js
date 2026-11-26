/* Outils du musicien : aides communes (DOM). Rien n'est envoyé : tout reste dans le navigateur.
   Jamais de innerHTML : textContent et createElement seulement. */
(function () {
  'use strict';
  var MU = window.MU;
  MU.$ = function (id) { return document.getElementById(id); };
  MU.creer = function (tag, classe, texte) {
    var e = document.createElement(tag);
    if (classe) { e.className = classe; }
    if (texte !== undefined && texte !== null) { e.textContent = texte; }
    return e;
  };
  MU.vider = function (e) { while (e && e.firstChild) { e.removeChild(e.firstChild); } };
  var nfs = {};
  // Nombres à la française (« 82,41 »).
  MU.nf = function (v, dec) {
    if (!isFinite(v)) { return '–'; }
    dec = dec || 0;
    if (!nfs[dec]) { nfs[dec] = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
    return nfs[dec].format(v);
  };
  // « +3 cents » / « −12 cents » (vrai signe moins).
  MU.texteCents = function (c) {
    if (!isFinite(c)) { return '–'; }
    var r = Math.round(c);
    return (r > 0 ? '+' : r < 0 ? '−' : '') + MU.nf(Math.abs(r), 0) + ' cent' + (Math.abs(r) > 1 ? 's' : '');
  };
  // Adresse interne préfixée par la base de la rubrique (<html data-base="/musique">).
  MU.lien = function (chemin) {
    return (chemin.charAt(0) === '/' ? (document.documentElement.getAttribute('data-base') || '') : '') + chemin;
  };
  // Le focus est-il dans un champ de saisie (pour ne pas voler la barre d'espace) ?
  MU.dansUnChamp = function (el) {
    if (!el || el === document.body) { return false; }
    var tag = (el.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'select' || tag === 'textarea' || tag === 'button' || tag === 'summary' || tag === 'a' || el.isContentEditable;
  };
  MU.mouvementReduit = function () {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };
  var ICONES = { ok: '✓', ko: '✕', attente: '…', info: 'i' };
  // Zone de résultat. etat : 'ok' | 'ko' | 'attente' | 'info' ; lien : adresse d'une page d'aide (facultatif).
  MU.verdict = function (zone, etat, titre, texte, etapes, lien, lienTexte) {
    if (!zone) { return; }
    MU.vider(zone);
    zone.className = 'verdict v-' + etat;
    zone.appendChild(MU.creer('span', 'v-icone', ICONES[etat] || ''));
    var c = MU.creer('div', 'v-corps');
    c.appendChild(MU.creer('strong', 'v-titre', titre));
    if (texte) { c.appendChild(MU.creer('p', 'v-texte', texte)); }
    if (etapes && etapes.length) {
      var ol = MU.creer('ol', 'v-etapes');
      etapes.forEach(function (x) { ol.appendChild(MU.creer('li', '', x)); });
      c.appendChild(ol);
    }
    if (lien) {
      var p = MU.creer('p', 'v-lien');
      var a = MU.creer('a', '', lienTexte || 'Voir l’aide détaillée');
      a.href = MU.lien(lien);
      p.appendChild(a);
      c.appendChild(p);
    }
    zone.appendChild(c);
  };
  // Bouton « Copier le lien »
  function copier() {
    var b = MU.$('copierLien'), s = MU.$('etatLien');
    if (!b) { return; }
    b.addEventListener('click', function () {
      // Adresse de la page seule (aucun paramètre d'arrivée recopié) ; sur le métronome, le tempo réglé, borné.
      var url = location.origin + location.pathname, champ = MU.$('metBpm');
      if (champ) { url += '?bpm=' + MU.bornerBpm(parseFloat(champ.value)); }
      var fin = function (ok) { if (s) { s.textContent = ok ? 'Lien copié.' : 'Copie impossible : copiez l’adresse du navigateur.'; } };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { fin(true); }, function () { fin(false); });
      } else { fin(false); }
    });
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', copier); } else { copier(); }
}());
