/* Cups, tbsp, tsp, oz, lb vers grammes et millilitres. */
(function () {
  'use strict';
  var CQ = window.CQ, CU = window.CU;
  function recalcul() {
    var id = CQ.valeur('ing'), q = CQ.nombre('q', 0, 1000000), u = CQ.valeur('unite');
    var ids = ['rG', 'rMl', 'rOz', 'rCup', 'rTbsp', 'rTsp'];
    if (!isFinite(q)) { ids.forEach(function (i) { CQ.texte(i, '–'); }); CQ.texte('phrase', ''); return; }
    var r = CU.convertirUS(id, q, u), a = CU.ing(id), o = CU.depuisG(r.g), v = CU.depuisMl(r.ml);
    CQ.texte('rG', CQ.souple(r.g, 0) + ' g');
    CQ.texte('rMl', CQ.souple(r.ml, 0) + ' ml');
    CQ.texte('rOz', CQ.souple(o.oz, 1) + ' oz · ' + CQ.souple(o.lb, 2) + ' lb');
    CQ.texte('rCup', CQ.souple(v.cup, 2));
    CQ.texte('rTbsp', CQ.souple(v.tbsp, 1));
    CQ.texte('rTsp', CQ.souple(v.tsp, 1));
    CQ.texte('phrase', 'Pour ' + a.court + ' : 1 cup ≈ ' + CQ.souple(CU.mlVersG(id, CU.D.mesures.cup_ml), 0) + ' g (cup de 240 ml).');
  }
  CQ.surChangement(['ing', 'q', 'unite'], recalcul);
  CQ.initPartage(recalcul);
}());
