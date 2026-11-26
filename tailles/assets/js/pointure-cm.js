/* Pointure en cm : longueur du pied -> pointure, et l'inverse. Aucune valeur n'est écrite dans l'adresse. */
(function () {
  'use strict';
  var CQ = window.CQ, TL = window.TL;
  function recalcul() {
    var pied = CQ.nombre('pied', 0, 100), marge = Number(CQ.valeur('marge'));
    var p = isFinite(pied) ? TL.pointureDepuisPied(pied, marge) : null;
    if (p) {
      var c = TL.chaussure(p.proche);
      CQ.texte('rEU', CQ.souple(p.proche, 1));
      CQ.texte('rDessus', String(p.dessus));
      CQ.texte('rUK', CQ.souple(c.uk, 1));
      CQ.texte('rUS', CQ.souple(c.ush, 1) + ' / ' + CQ.souple(c.usf, 1));
      CQ.texte('phrase', 'Pied de ' + CQ.souple(pied, 1) + ' cm + ' + CQ.souple(marge, 1) + ' cm de marge = chaussure de ' + CQ.souple(pied + marge, 1) +
        ' cm, soit ' + CQ.souple(p.exact, 1) + ' en pointure. Entre deux pointures, prenez celle du dessus.');
    } else {
      ['rEU', 'rDessus', 'rUK', 'rUS'].forEach(function (id) { CQ.texte(id, '–'); });
      CQ.texte('phrase', isFinite(pied) ? 'Longueur hors de la plage prévue (8 à 35 cm).' : '');
    }
    var pt = CQ.nombre('pt', 0, 100);
    if (isFinite(pt) && pt >= 15 && pt <= 55) {
      CQ.texte('rPied', CQ.souple(TL.piedDepuisEU(pt, 1), 1) + ' cm');
      CQ.texte('rInt', CQ.souple(pt * 2 / 3, 1) + ' cm');
    } else { CQ.texte('rPied', '–'); CQ.texte('rInt', '–'); }
  }
  CQ.surChangement(['pied', 'marge', 'pt'], recalcul);
  recalcul();
}());
