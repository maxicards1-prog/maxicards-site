/* Règle de trois (produit en croix), proportionnelle ou inverse. */
(function () {
  'use strict';
  var CQ = window.CQ;
  function recalcul() {
    var a = CQ.nombre('a'), b = CQ.nombre('b'), c = CQ.nombre('c');
    var inverse = CQ.valeur('type') === 'inverse';
    if (!isFinite(a) || !isFinite(b) || !isFinite(c)) { CQ.texte('rX', '–'); CQ.texte('phrase', ''); return; }
    if (inverse ? b === 0 && c === 0 : a === 0) { CQ.texte('rX', '–'); CQ.texte('phrase', 'Division par zéro : changez les valeurs.'); return; }
    var x, op;
    if (inverse) {
      if (c === 0) { CQ.texte('rX', '–'); CQ.texte('phrase', 'Division par zéro : changez les valeurs.'); return; }
      x = a * b / c;
      op = 'x = ' + CQ.souple(a) + ' × ' + CQ.souple(b) + ' ÷ ' + CQ.souple(c) + ' = ' + CQ.souple(x, 6);
    } else {
      x = b * c / a;
      op = 'x = ' + CQ.souple(b) + ' × ' + CQ.souple(c) + ' ÷ ' + CQ.souple(a) + ' = ' + CQ.souple(x, 6);
    }
    CQ.texte('rX', CQ.souple(x, 6));
    CQ.texte('phrase', op + (inverse ? ' (proportionnalité inverse : quand l\'un double, l\'autre est divisé par deux).' : ' (produit en croix).'));
  }
  CQ.surChangement(['a', 'b', 'c', 'type'], recalcul);
  CQ.initPartage(recalcul);
}());
