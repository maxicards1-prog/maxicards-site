/* Statistiques d'une série : moyenne, médiane, quartiles (convention du lycée en France :
   Q1 = plus petite valeur telle qu'au moins 25 % des données lui soient inférieures ou égales ; idem 75 % pour Q3). */
(function () {
  'use strict';
  var CQ = window.CQ;
  function lire(t) {
    return String(t || '').split(/[\s;]+/).filter(function (x) { return x !== ''; })
      .slice(0, 5000).map(function (x) { return Number(x.replace(',', '.')); });
  }
  function recalcul() {
    var brut = lire(CQ.valeur('serie')), v = brut.filter(isFinite).sort(function (a, b) { return a - b; });
    var ignores = brut.length - v.length, n = v.length;
    if (!n) { ['rN', 'rMoy', 'rMed', 'rQ1', 'rQ3', 'rMin', 'rMax', 'rEtendue', 'rEcart'].forEach(function (i) { CQ.texte(i, '–'); }); CQ.texte('phrase', ''); return; }
    var s = v.reduce(function (a, b) { return a + b; }, 0), m = s / n;
    var med = n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
    var q1 = v[Math.ceil(n / 4) - 1], q3 = v[Math.ceil(3 * n / 4) - 1];
    var ec = Math.sqrt(v.reduce(function (a, x) { return a + (x - m) * (x - m); }, 0) / n);
    CQ.texte('rN', String(n));
    CQ.texte('rMoy', CQ.souple(m, 4));
    CQ.texte('rMed', CQ.souple(med, 4));
    CQ.texte('rQ1', CQ.souple(q1, 4));
    CQ.texte('rQ3', CQ.souple(q3, 4));
    CQ.texte('rMin', CQ.souple(v[0], 4));
    CQ.texte('rMax', CQ.souple(v[n - 1], 4));
    CQ.texte('rEtendue', CQ.souple(v[n - 1] - v[0], 4));
    CQ.texte('rEcart', CQ.souple(ec, 4));
    CQ.texte('phrase', 'Série rangée : ' + v.slice(0, 40).map(function (x) { return CQ.souple(x, 4); }).join(' ; ') + (n > 40 ? ' …' : '') +
      (ignores ? ' (' + ignores + ' valeur(s) illisible(s) ignorée(s))' : ''));
  }
  CQ.surChangement(['serie'], recalcul);
  CQ.initPartage(recalcul);
}());
