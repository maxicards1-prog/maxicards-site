/* Écriture stylée : le texte saisi s'affiche dans chaque style (textContent seulement) ; « Copier » copie la ligne. */
(function () {
  'use strict';
  var CQ = window.CQ, TX = window.TX;
  if (!CQ || !TX) { return; }
  var zone = CQ.el('es-texte'), liste = CQ.el('es-liste');
  if (!zone || !liste) { return; }
  var sorties = Array.prototype.slice.call(liste.querySelectorAll('.res-texte'));
  var MAX = 500, prevu = false;

  function texte() { return zone.value.slice(0, MAX); }
  function maj() {
    prevu = false;
    var t = texte();
    sorties.forEach(function (s) { s.textContent = TX.styliser(t, s.getAttribute('data-style')); });
  }
  zone.addEventListener('input', function () {
    if (!prevu) { prevu = true; window.requestAnimationFrame(maj); }
  });
  liste.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('button[data-copie]') : null;
    if (!b) { return; }
    CQ.copier(TX.styliser(texte(), b.getAttribute('data-copie')), 'Texte stylé copié');
  });
  maj();
}());
