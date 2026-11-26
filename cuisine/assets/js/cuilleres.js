/* Cuillères en grammes (et l'inverse), par ingrédient. */
(function () {
  'use strict';
  var CQ = window.CQ, CU = window.CU;
  function recalcul() {
    var id = CQ.valeur('ing'), n = CQ.nombre('n', 0, 10000), m = CQ.valeur('mesure'), rase = CQ.valeur('rase') !== 'bombee';
    var g = CQ.nombre('g', 0, 100000), a = CU.ing(id);
    var unite = m === 'cs' ? 'cuillère à soupe' : 'cuillère à café';
    if (isFinite(n)) {
      CQ.texte('rG', CQ.souple(CU.cuilleresVersG(id, n, m, rase), 1) + ' g');
      var un = CU.gramParCuillere(id, m, rase);
      CQ.texte('phrase', '1 ' + unite + (a.solide ? (rase ? ' rase' : ' bombée') : '') + ' de ' + a.court + ' ≈ ' + CQ.souple(un, 1) + ' g, donc ' + CQ.souple(n) + ' × ' + CQ.souple(un, 1) + ' g.');
    } else { CQ.texte('rG', '–'); CQ.texte('phrase', ''); }
    if (isFinite(g)) {
      CQ.texte('rCs', CQ.souple(CU.gVersCuilleres(id, g, 'cs', rase), 1));
      CQ.texte('rCc', CQ.souple(CU.gVersCuilleres(id, g, 'cc', rase), 1));
    } else { CQ.texte('rCs', '–'); CQ.texte('rCc', '–'); }
  }
  CQ.surChangement(['ing', 'n', 'mesure', 'rase', 'g'], recalcul);
  CQ.initPartage(recalcul);
}());
