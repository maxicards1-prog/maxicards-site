/* Cellule braille cliquable : on allume des points, la page dit ce que la cellule veut dire. */
(function () {
  'use strict';
  var CQ = window.CQ, $ = CQ.el, CO = window.CO;
  var boutons = Array.prototype.slice.call(document.querySelectorAll('.cellule button[data-point]'));
  var GENRES = { lettre: 'Lettre', chiffre: 'Chiffre (après le signe ⠠)', signe: 'Ponctuation', calcul: 'Signe de calcul (après le signe ⠠)', prefixe: 'Signe qui annonce' };
  function maj() {
    var p = boutons.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })
      .map(function (b) { return b.getAttribute('data-point'); }).sort().join('');
    $('ab-car').textContent = p ? CO.cel(p) : '⠀';
    $('ab-points').textContent = p ? 'Points ' + p.split('').join('-') : 'Aucun point : touchez les ronds pour les allumer.';
    var ul = $('ab-sens');
    CQ.vider(ul);
    var sens = CO.sensCellule(p);
    if (p && !sens.length) { ul.appendChild(CQ.cree('li', '', 'Pas de sens seul en braille intégral (signe de début de symbole ou de braille abrégé).')); }
    sens.forEach(function (s) { ul.appendChild(CQ.cree('li', '', GENRES[s[0]] + ' : ' + s[1])); });
  }
  boutons.forEach(function (b) {
    b.addEventListener('click', function () {
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      maj();
    });
  });
  $('ab-vider').addEventListener('click', function () { boutons.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); }); maj(); });
  maj();
}());
