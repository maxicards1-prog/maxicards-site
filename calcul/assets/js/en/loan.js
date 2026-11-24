/* Fixed-rate loan: M = P × r ÷ (1 − (1 + r)^−n), r = annual rate ÷ 12. Yearly amortization table. */
(function () {
  'use strict';
  var CQ = window.CQ;
  function vider() {
    ['rPay', 'rInt', 'rTot', 'rN'].forEach(function (i) { CQ.texte(i, '–'); });
    CQ.lignes('tableau', []); CQ.texte('phrase', '');
  }
  function recalcul() {
    var P = CQ.nombre('amount', 0, 1e10), ta = CQ.nombre('rate', 0, 100), ans = CQ.nombre('years', 0.1, 100);
    if (!isFinite(P) || !isFinite(ta) || !isFinite(ans) || P <= 0) { vider(); return; }
    var n = Math.max(1, Math.round(ans * 12)), r = ta / 100 / 12;
    var M = r === 0 ? P / n : P * r / (1 - Math.pow(1 + r, -n));
    var interets = M * n - P;
    CQ.texte('rPay', CQ.decimal(M, 2));
    CQ.texte('rInt', CQ.decimal(interets, 2));
    CQ.texte('rTot', CQ.decimal(M * n, 2));
    CQ.texte('rN', CQ.entier(n));
    var lignes = [], reste = P, an = 0, iAn = 0, cAn = 0;
    for (var k = 1; k <= n; k++) {
      var i = reste * r, c = M - i;
      reste -= c; iAn += i; cAn += c;
      if (k % 12 === 0 || k === n) {
        an++;
        lignes.push({ cellules: [String(an), CQ.decimal(iAn, 2), CQ.decimal(cAn, 2), CQ.decimal(Math.max(0, reste), 2)], nombres: [1, 2, 3] });
        iAn = 0; cAn = 0;
      }
    }
    CQ.lignes('tableau', lignes);
    CQ.texte('phrase', 'Over ' + CQ.entier(n) + ' payments you repay ' + CQ.decimal(M * n, 2) + ': the ' + CQ.decimal(P, 2) +
      ' borrowed plus ' + CQ.decimal(interets, 2) + ' in interest.');
  }
  CQ.surChangement(['amount', 'rate', 'years'], recalcul);
  CQ.initPartage(recalcul);
}());
