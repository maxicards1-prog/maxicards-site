/* Unit price of two products. Weights in grams, volumes in mL (US fluid ounce, US gallon), counts as items. */
(function () {
  'use strict';
  var CQ = window.CQ;
  var U = {
    g: ['w', 1], kg: ['w', 1000], oz: ['w', 28.349523125], lb: ['w', 453.59237],
    ml: ['v', 1], l: ['v', 1000], floz: ['v', 29.5735295625], gal: ['v', 3785.411784], each: ['n', 1]
  };
  var T = {
    lb: ['w', 453.59237, 'lb'], oz: ['w', 28.349523125, 'oz'], '100g': ['w', 100, '100 g'], kg: ['w', 1000, 'kg'],
    floz: ['v', 29.5735295625, 'fl oz'], '100ml': ['v', 100, '100 mL'], l: ['v', 1000, 'liter'], each: ['n', 1, 'item']
  };
  var FAMILLE = { w: 'weight', v: 'volume', n: 'count' };
  function fmt(v) { return CQ.decimal(v, v < 1 ? 3 : 2); }
  function unite(i) { return U[CQ.valeur('unit' + i)] || U.oz; }
  function recalcul() {
    var cible = T[CQ.valeur('per')] || T.lb, res = [];
    for (var i = 1; i <= 2; i++) {
      var p = CQ.nombre('price' + i, 0, 1e9), q = CQ.nombre('qty' + i, 0, 1e9), n = CQ.nombre('packs' + i, 1, 1000);
      var u = unite(i);
      if (!isFinite(n)) { n = 1; }
      n = Math.floor(n);
      if (isFinite(p) && q > 0 && u[0] === cible[0]) {
        var pu = p / (q * n * u[1]) * cible[1];
        res.push({ i: i, pu: pu });
        CQ.texte('r' + i, fmt(pu) + ' per ' + cible[2]);
      } else { CQ.texte('r' + i, '–'); }
    }
    if (res.length < 2) {
      var msg = '';
      for (var j = 1; j <= 2; j++) {
        if (unite(j)[0] !== cible[0]) {
          msg = "Choose a \"price per\" unit that matches the products (weight, volume or items).";
        }
      }
      CQ.texte('phrase', msg); return;
    }
    res.sort(function (x, y) { return x.pu - y.pu; });
    var m = res[0], pire = res[1];
    CQ.texte('phrase', 'Product ' + m.i + ' is cheaper: ' + fmt(m.pu) + ' per ' + cible[2] +
      (pire.pu > m.pu ? ', which is ' + CQ.decimal((pire.pu - m.pu) / pire.pu * 100, 1) + '% less than product ' + pire.i + '.' : ' (same price).'));
  }
  var ids = ['per'];
  for (var i = 1; i <= 2; i++) { ids.push('price' + i, 'qty' + i, 'unit' + i, 'packs' + i); }
  CQ.surChangement(ids, recalcul);
  CQ.initPartage(recalcul);
}());
