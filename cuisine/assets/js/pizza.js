/* Pâte à pizza : farine, eau, sel, levure selon le nombre de pâtons. */
(function () {
  'use strict';
  var CQ = window.CQ, CU = window.CU;
  function recalcul() {
    var n = CQ.nombre('n', 1, 100), p = CQ.nombre('poids', 50, 800), h = CQ.nombre('hydr', 40, 90), s = CQ.nombre('sel', 0, 6), l = CQ.nombre('lev', 0, 5);
    var ids = ['rFarine', 'rEau', 'rSel', 'rLev', 'rSeche', 'rTotal'];
    if (![n, p, h, s, l].every(isFinite)) { ids.forEach(function (i) { CQ.texte(i, '–'); }); CQ.texte('phrase', ''); return; }
    var r = CU.pizza(n, p, h / 100, s / 100, l / 100);
    CQ.texte('rFarine', CQ.souple(r.farine, 0) + ' g');
    CQ.texte('rEau', CQ.souple(r.eau, 0) + ' g');
    CQ.texte('rSel', CQ.souple(r.sel, 1) + ' g');
    CQ.texte('rLev', CQ.souple(r.levure, 1) + ' g');
    CQ.texte('rSeche', CQ.souple(r.levure / CU.D.levure.fraiche_sur_seche, 1) + ' g');
    CQ.texte('rTotal', CQ.souple(r.total, 0) + ' g');
    CQ.texte('phrase', n + ' pâton' + (n > 1 ? 's' : '') + ' de ' + p + ' g : pétrissez, laissez lever, puis divisez en pâtons. Peu de levure + longue pause au frais (8 à 24 h) = pâte plus digeste et plus parfumée.');
  }
  CQ.surChangement(['n', 'poids', 'hydr', 'sel', 'lev'], recalcul);
  CQ.initPartage(recalcul);
}());
