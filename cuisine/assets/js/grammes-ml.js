/* Grammes <-> millilitres par ingrédient (densités moyennes). */
(function () {
  'use strict';
  var CQ = window.CQ, CU = window.CU;
  function recalcul() {
    var id = CQ.valeur('ing'), q = CQ.nombre('q', 0, 1000000), u = CQ.valeur('unite'), a = CU.ing(id);
    if (!isFinite(q)) { ['rG', 'rMl', 'rCl'].forEach(function (i) { CQ.texte(i, '–'); }); CQ.texte('phrase', ''); return; }
    var g, ml;
    if (u === 'g') { g = q; ml = CU.gVersMl(id, q); } else { ml = u === 'cl' ? q * 10 : q; g = CU.mlVersG(id, ml); }
    CQ.texte('rG', CQ.souple(g, 1) + ' g');
    CQ.texte('rMl', CQ.souple(ml, 1) + ' ml');
    CQ.texte('rCl', CQ.souple(ml / 10, 2) + ' cl');
    CQ.texte('phrase', '100 ml de ' + a.court + ' pèsent environ ' + CQ.souple(a.d * 100, 0) + ' g (densité moyenne ' + CQ.souple(a.d, 2) + ' g/ml).');
  }
  CQ.surChangement(['ing', 'q', 'unite'], recalcul);
  CQ.initPartage(recalcul);
}());
