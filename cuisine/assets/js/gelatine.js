/* Gélatine : feuilles, poudre, agar-agar. */
(function () {
  'use strict';
  var CQ = window.CQ, CU = window.CU;
  function recalcul() {
    var v = CQ.nombre('v', 0, 100000), u = CQ.valeur('unite');
    if (!isFinite(v)) { ['rFeuilles', 'rPoudre', 'rAgar'].forEach(function (i) { CQ.texte(i, '–'); }); CQ.texte('phrase', ''); return; }
    var r = CU.gelatine(v, u);
    CQ.texte('rFeuilles', CQ.souple(r.feuilles, 1) + ' feuilles');
    CQ.texte('rPoudre', CQ.souple(r.poudre, 1) + ' g');
    CQ.texte('rAgar', CQ.souple(r.agar, 2) + ' g');
    CQ.texte('phrase', 'Repère : 1 feuille ≈ ' + CU.D.gelatine.feuille_g + ' g de poudre ; 1 g d\'agar-agar remplace environ ' + CU.D.gelatine.agar_pour_gelatine + ' g de gélatine. Vérifiez l\'emballage de votre marque.');
  }
  CQ.surChangement(['v', 'unite'], recalcul);
  CQ.initPartage(recalcul);
}());
