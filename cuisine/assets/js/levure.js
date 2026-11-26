/* Levure fraîche, sèche, instantanée ; levure chimique. */
(function () {
  'use strict';
  var CQ = window.CQ, CU = window.CU;
  function recalcul() {
    var g = CQ.nombre('g', 0, 100000), u = CQ.valeur('unite'), f = CQ.nombre('farine', 0, 100000);
    if (isFinite(g)) {
      var r = CU.levure(g, u);
      CQ.texte('rFraiche', CQ.souple(r.fraiche, 1) + ' g');
      CQ.texte('rSeche', CQ.souple(r.seche, 1) + ' g');
      CQ.texte('rInst', CQ.souple(r.instantanee, 1) + ' g');
      CQ.texte('rSachets', CQ.souple(r.seche / CU.D.levure.sachet_boulangere_g, 2));
    } else { ['rFraiche', 'rSeche', 'rInst', 'rSachets'].forEach(function (i) { CQ.texte(i, '–'); }); }
    if (isFinite(f)) {
      var c = CU.levureChimique(f);
      CQ.texte('rChim', CQ.souple(c, 1) + ' g');
      CQ.texte('rSachetsChim', CQ.souple(c / CU.D.levure.sachet_chimique_g, 2));
    } else { CQ.texte('rChim', '–'); CQ.texte('rSachetsChim', '–'); }
  }
  CQ.surChangement(['g', 'unite', 'farine'], recalcul);
  CQ.initPartage(recalcul);
}());
