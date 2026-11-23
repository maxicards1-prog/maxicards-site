/* Conversion de note : note ÷ barème × nouveau barème. */
(function () {
  'use strict';
  var CQ = window.CQ;
  function recalcul() {
    var n = CQ.nombre('note', 0, 1e6), b = CQ.nombre('bareme', 0, 1e6), v = CQ.nombre('vers', 1, 1e6);
    if (!isFinite(v)) { v = 20; }
    if (!isFinite(n) || !(b > 0)) { ['rNote', 'rPct', 'r10', 'r100'].forEach(function (i) { CQ.texte(i, '–'); }); CQ.texte('phrase', ''); return; }
    var r = n / b;
    CQ.texte('rNote', CQ.souple(r * v, 2) + ' / ' + CQ.souple(v, 2));
    CQ.texte('rPct', CQ.pourcent(r * 100, 1));
    CQ.texte('r10', CQ.souple(r * 10, 2) + ' / 10');
    CQ.texte('r100', CQ.souple(r * 100, 1) + ' / 100');
    CQ.texte('phrase', CQ.souple(n, 2) + ' ÷ ' + CQ.souple(b, 2) + ' × ' + CQ.souple(v, 2) + ' = ' + CQ.souple(r * v, 4) +
      (n > b ? ' (attention : la note dépasse le barème).' : '.'));
  }
  CQ.surChangement(['note', 'bareme', 'vers'], recalcul);
  CQ.initPartage(recalcul);
}());
