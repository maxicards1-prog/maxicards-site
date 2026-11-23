/* Prêt amortissable à mensualités constantes : M = C × t / (1 − (1 + t)^−n), t = taux annuel ÷ 12. */
(function () {
  'use strict';
  var CQ = window.CQ;
  function recalcul() {
    var C = CQ.nombre('capital', 0, 1e9), ta = CQ.nombre('taux', 0, 30), ans = CQ.nombre('duree', 0.5, 40);
    var ass = CQ.nombre('assurance', 0, 5);
    if (!isFinite(ass)) { ass = 0; }
    if (!isFinite(C) || !isFinite(ta) || !isFinite(ans) || C <= 0) {
      ['rMens', 'rMensAss', 'rInterets', 'rCout'].forEach(function (i) { CQ.texte(i, '–'); });
      CQ.lignes('tableau', []); CQ.texte('phrase', ''); return;
    }
    var n = Math.round(ans * 12), t = ta / 100 / 12;
    var M = t === 0 ? C / n : C * t / (1 - Math.pow(1 + t, -n));
    var mAss = C * ass / 100 / 12;
    var interets = M * n - C, coutAss = mAss * n;
    CQ.texte('rMens', CQ.euros(M));
    CQ.texte('rMensAss', CQ.euros(M + mAss));
    CQ.texte('rInterets', CQ.euros(interets));
    CQ.texte('rCout', CQ.euros(interets + coutAss));
    var lignes = [], reste = C, an = 0, iAn = 0, cAn = 0;
    for (var k = 1; k <= n; k++) {
      var i = reste * t, c = M - i;
      reste -= c; iAn += i; cAn += c;
      if (k % 12 === 0 || k === n) {
        an++;
        lignes.push({ cellules: [String(an), CQ.euros(iAn), CQ.euros(cAn), CQ.euros(Math.max(0, reste))], nombres: [1, 2, 3] });
        iAn = 0; cAn = 0;
      }
    }
    CQ.lignes('tableau', lignes);
    CQ.texte('phrase', 'Sur ' + n + ' mensualités, vous remboursez ' + CQ.euros(M * n) + ' : les ' + CQ.euros(C) +
      ' empruntés + ' + CQ.euros(interets) + ' d\'intérêts' + (coutAss > 0 ? ' + ' + CQ.euros(coutAss) + ' d\'assurance' : '') + '.');
  }
  CQ.surChangement(['capital', 'taux', 'duree', 'assurance'], recalcul);
  CQ.initPartage(recalcul);
}());
