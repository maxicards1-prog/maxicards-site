/* Percentage calculator: 5 everyday calculations, each with its formula written out. */
(function () {
  'use strict';
  var CQ = window.CQ;
  var s = function (v) { return CQ.souple(v, 4); };
  function ecrire(id, valeur, detail) { CQ.texte(id, valeur); CQ.texte(id + 'd', detail); }
  function recalcul() {
    // 1. X% of Y
    var a = CQ.nombre('p1a'), b = CQ.nombre('p1b');
    if (isFinite(a) && isFinite(b)) { ecrire('r1', s(a * b / 100), s(b) + ' × ' + s(a) + ' ÷ 100 = ' + s(a * b / 100)); } else { ecrire('r1', '–', ''); }
    // 2. X is what percent of Y
    a = CQ.nombre('p2a'); b = CQ.nombre('p2b');
    if (isFinite(a) && isFinite(b) && b !== 0) { ecrire('r2', s(a / b * 100) + '%', s(a) + ' ÷ ' + s(b) + ' × 100 = ' + s(a / b * 100) + '%'); } else { ecrire('r2', '–', b === 0 ? 'Cannot divide by zero.' : ''); }
    // 3. change from A to B
    a = CQ.nombre('p3a'); b = CQ.nombre('p3b');
    if (isFinite(a) && isFinite(b) && a !== 0) {
      var ev = (b - a) / Math.abs(a) * 100;
      ecrire('r3', (ev > 0 ? '+' : '') + s(ev) + '%', '(' + s(b) + ' − ' + s(a) + ') ÷ ' + s(Math.abs(a)) + ' × 100 = ' + (ev > 0 ? '+' : '') + s(ev) + '%; multiplier: ' + s(b / a));
    } else { ecrire('r3', '–', a === 0 ? 'The starting value cannot be 0.' : ''); }
    // 4. apply an increase or a decrease
    a = CQ.nombre('p4a'); b = CQ.nombre('p4b');
    var sens4 = CQ.valeur('p4s') === 'baisse' ? -1 : 1;
    if (isFinite(a) && isFinite(b)) {
      var coef = 1 + sens4 * b / 100;
      ecrire('r4', s(a * coef), s(a) + ' × ' + s(coef) + ' = ' + s(a * coef) + ' (difference: ' + (sens4 > 0 ? '+' : '−') + s(Math.abs(a * b / 100)) + ')');
    } else { ecrire('r4', '–', ''); }
    // 5. find the original value
    a = CQ.nombre('p5a'); b = CQ.nombre('p5b');
    var sens5 = CQ.valeur('p5s') === 'baisse' ? -1 : 1;
    if (isFinite(a) && isFinite(b)) {
      var c5 = 1 + sens5 * b / 100;
      if (c5 === 0) { ecrire('r5', '–', 'A 100% decrease leaves nothing to go back from.'); } else {
        ecrire('r5', s(a / c5), s(a) + ' ÷ ' + s(c5) + ' = ' + s(a / c5) + ' (not ' + s(a * (1 - sens5 * b / 100)) + ': divide, do not just reverse the percentage)');
      }
    } else { ecrire('r5', '–', ''); }
  }
  CQ.surChangement(['p1a', 'p1b', 'p2a', 'p2b', 'p3a', 'p3b', 'p4a', 'p4b', 'p4s', 'p5a', 'p5b', 'p5s'], recalcul);
  CQ.initPartage(recalcul);
}());
