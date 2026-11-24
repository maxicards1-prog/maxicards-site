/* Rule of three (cross-multiplication): direct proportion x = B × C ÷ A, inverse proportion x = A × B ÷ C. */
(function () {
  'use strict';
  var CQ = window.CQ;
  function recalcul() {
    var a = CQ.nombre('a'), b = CQ.nombre('b'), c = CQ.nombre('c');
    var inverse = CQ.valeur('type') === 'inverse';
    if (!isFinite(a) || !isFinite(b) || !isFinite(c)) { CQ.texte('rX', '–'); CQ.texte('phrase', ''); return; }
    if (inverse ? c === 0 : a === 0) {
      CQ.texte('rX', '–');
      CQ.texte('phrase', inverse ? 'C cannot be 0 in an inverse proportion.' : 'A cannot be 0 in a direct proportion.');
      return;
    }
    var x, op;
    if (inverse) {
      x = a * b / c;
      op = 'x = ' + CQ.souple(a, 6) + ' × ' + CQ.souple(b, 6) + ' ÷ ' + CQ.souple(c, 6) + ' = ' + CQ.souple(x, 6);
    } else {
      x = b * c / a;
      op = 'x = ' + CQ.souple(b, 6) + ' × ' + CQ.souple(c, 6) + ' ÷ ' + CQ.souple(a, 6) + ' = ' + CQ.souple(x, 6);
    }
    CQ.texte('rX', CQ.souple(x, 6));
    CQ.texte('phrase', op + (inverse ? ' (inverse proportion: when one doubles, the other is halved).' : ' (cross-multiplication).'));
  }
  CQ.surChangement(['a', 'b', 'c', 'type'], recalcul);
  CQ.initPartage(recalcul);
}());
