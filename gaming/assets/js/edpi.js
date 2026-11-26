/* Calcul de l'eDPI (DPI × sensibilité), avec le cm/360 du jeu choisi. */
(function () {
  'use strict';
  var CQ = window.CQ, GL = window.GL;
  var DPI = [400, 800, 1200, 1600, 3200];
  function recalcul() {
    var id = CQ.valeur('jeu'), j = GL.jeu(id);
    var dpi = CQ.nombre('dpi', 1, 100000), sens = CQ.nombre('sens', 0.0001, 100000);
    var e = GL.edpi(dpi, sens);
    if (!isFinite(e) || !j) {
      ['rEdpi', 'rCm', 'rPouces', 'rDeg'].forEach(function (x) { CQ.texte(x, '–'); });
      CQ.texte('phrase', 'Tapez le DPI de la souris et la sensibilité du jeu.');
      CQ.lignes('autresDpi', []);
      return;
    }
    CQ.texte('rEdpi', CQ.souple(e, 1));
    CQ.texte('rCm', CQ.decimal(GL.cm360(id, sens, dpi), 1) + ' cm');
    CQ.texte('rPouces', CQ.decimal(GL.pouces360(id, sens, dpi), 2) + ' po');
    CQ.texte('rDeg', CQ.souple(GL.degres(id, sens), 5) + '°');
    CQ.texte('phrase', 'eDPI = ' + CQ.souple(dpi, 0) + ' DPI × ' + CQ.souple(sens, 4) + ' = ' + CQ.souple(e, 1) +
      '. Ce chiffre ne se compare qu\'entre joueurs du même jeu ; d\'un jeu à l\'autre, comparez les cm/360.');
    CQ.lignes('autresDpi', DPI.map(function (d) {
      var s = GL.changerDpi(sens, dpi, d);
      return { cellules: [CQ.souple(d, 0) + ' DPI', j.entier ? String(GL.arrondi(id, s)) : CQ.souple(s, 3), CQ.souple(e, 1)],
        nombres: [1, 2], classe: d === dpi ? 'ligne-forte' : '' };
    }));
  }
  CQ.surChangement(['jeu', 'dpi', 'sens'], recalcul);
  CQ.initPartage(recalcul);
}());
