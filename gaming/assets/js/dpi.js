/* Changer de DPI sans changer de sensibilité réelle : nouvelle sensibilité = ancienne × ancien DPI ÷ nouveau DPI. */
(function () {
  'use strict';
  var CQ = window.CQ, GL = window.GL;
  var DPI = [400, 800, 1200, 1600, 3200];
  function recalcul() {
    var id = CQ.valeur('jeu'), j = GL.jeu(id);
    var ancien = CQ.nombre('ancien', 1, 100000), sens = CQ.nombre('sens', 0.0001, 100000), nouveau = CQ.nombre('nouveau', 1, 100000);
    var s = GL.changerDpi(sens, ancien, nouveau);
    if (!isFinite(s) || !j) {
      ['rSens', 'rArrondi', 'rEdpi', 'rEcart'].forEach(function (x) { CQ.texte(x, '–'); });
      CQ.texte('phrase', 'Tapez l\'ancien DPI, la sensibilité actuelle et le nouveau DPI.');
      CQ.lignes('tableDpi', []);
      return;
    }
    var arr = GL.arrondi(id, s);
    var ecart = Math.abs(GL.cm360(id, arr, nouveau) - GL.cm360(id, sens, ancien));
    CQ.texte('rSens', CQ.souple(s, 4) + (j.unite || ''));
    CQ.texte('rArrondi', String(j.entier ? arr : CQ.souple(arr, 3)) + (j.unite || ''));
    CQ.texte('rEdpi', CQ.souple(GL.edpi(ancien, sens), 1));
    CQ.texte('rEcart', CQ.decimal(ecart, 2) + ' cm');
    CQ.texte('phrase', CQ.souple(sens, 4) + ' × ' + CQ.souple(ancien, 0) + ' ÷ ' + CQ.souple(nouveau, 0) + ' = ' + CQ.souple(s, 4) +
      '. Le geste pour faire un tour reste de ' + CQ.decimal(GL.cm360(id, sens, ancien), 1) + ' cm dans ' + j.court + '.');
    CQ.lignes('tableDpi', DPI.map(function (d) {
      var x = GL.changerDpi(sens, ancien, d);
      return { cellules: [CQ.souple(d, 0) + ' DPI', j.entier ? String(GL.arrondi(id, x)) + ' (exact : ' + CQ.souple(x, 2) + ')' : CQ.souple(x, 3)],
        nombres: [1], classe: d === nouveau ? 'ligne-forte' : '' };
    }));
  }
  CQ.surChangement(['jeu', 'ancien', 'sens', 'nouveau'], recalcul);
  CQ.initPartage(recalcul);
}());
