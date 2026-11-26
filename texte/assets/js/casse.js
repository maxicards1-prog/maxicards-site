/* Majuscules et minuscules : transforme le texte du champ ; « Annuler » revient au texte d'avant (en mémoire seulement). */
(function () {
  'use strict';
  var CQ = window.CQ, TX = window.TX;
  if (!CQ || !TX) { return; }
  var zone = CQ.el('mm-texte'), modes = CQ.el('mm-modes'), annuler = CQ.el('mm-annuler');
  if (!zone || !modes || !annuler) { return; }
  var avant = null;

  modes.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('button[data-mode]') : null;
    if (!b) { return; }
    var t = zone.value;
    if (!t) { CQ.annonce('Tapez ou collez d\'abord un texte'); zone.focus(); return; }
    var r = TX.casse(t, b.getAttribute('data-mode'));
    if (r !== t) {
      avant = t;
      zone.value = r;
      annuler.disabled = false;
    }
    CQ.annonce('Fait : ' + b.textContent);
  });
  annuler.addEventListener('click', function () {
    if (avant === null) { return; }
    zone.value = avant;
    avant = null;
    annuler.disabled = true;
    CQ.annonce('Texte d\'avant remis');
  });
  zone.addEventListener('input', function () { avant = null; annuler.disabled = true; });
  CQ.el('mm-copier').addEventListener('click', function () { CQ.copier(zone.value, 'Texte copié'); });
  CQ.el('mm-effacer').addEventListener('click', function () {
    if (zone.value) { avant = zone.value; annuler.disabled = false; }
    zone.value = '';
    zone.focus();
  });
}());
