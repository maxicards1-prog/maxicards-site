/* Prix au kilo / au litre / à la pièce de 3 produits, et le moins cher. */
(function () {
  'use strict';
  var CQ = window.CQ;
  var U = { g: [0.001, 'kg'], kg: [1, 'kg'], ml: [0.001, 'L'], cl: [0.01, 'L'], l: [1, 'L'], piece: [1, 'pièce'] };
  function recalcul() {
    var res = [];
    for (var i = 1; i <= 3; i++) {
      var p = CQ.nombre('prix' + i, 0, 1e7), q = CQ.nombre('qte' + i, 0, 1e7), n = CQ.nombre('nb' + i, 1, 1000), u = U[CQ.valeur('unite' + i)] || U.g;
      if (!isFinite(n)) { n = 1; }
      if (isFinite(p) && q > 0) {
        var pu = p / (q * u[0] * Math.floor(n));
        res.push({ i: i, pu: pu, u: u[1] });
        CQ.texte('r' + i, CQ.euros(pu) + ' / ' + u[1]);
      } else { CQ.texte('r' + i, '–'); }
    }
    var memes = res.length > 1 && res.every(function (r) { return r.u === res[0].u; });
    if (!memes) { CQ.texte('phrase', res.length > 1 ? 'Comparez des produits de même unité (kg avec kg, litre avec litre).' : ''); return; }
    res.sort(function (a, b) { return a.pu - b.pu; });
    var m = res[0], pire = res[res.length - 1];
    CQ.texte('phrase', 'Le produit ' + m.i + ' est le moins cher : ' + CQ.euros(m.pu) + ' / ' + m.u +
      (pire.pu > m.pu ? ', soit ' + CQ.pourcent((pire.pu - m.pu) / pire.pu * 100, 1) + ' de moins que le produit ' + pire.i + '.' : ' (même prix).'));
  }
  var ids = [];
  for (var i = 1; i <= 3; i++) { ids.push('prix' + i, 'qte' + i, 'unite' + i, 'nb' + i); }
  CQ.surChangement(ids, recalcul);
  CQ.initPartage(recalcul);
}());
