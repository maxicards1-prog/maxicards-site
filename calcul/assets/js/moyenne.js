/* Moyenne pondérée : somme(note × coef) ÷ somme(coef). Les lignes vides sont ignorées. */
(function () {
  'use strict';
  var CQ = window.CQ, N = 10;
  function recalcul() {
    var sNc = 0, sC = 0, nb = 0, detail = [];
    for (var i = 1; i <= N; i++) {
      var n = CQ.nombre('n' + i), c = CQ.nombre('c' + i, 0, 1000);
      if (!isFinite(n)) { continue; }
      if (!isFinite(c)) { c = 1; }
      sNc += n * c; sC += c; nb++;
      detail.push(CQ.souple(n, 2) + (c !== 1 ? ' × ' + CQ.souple(c, 2) : ''));
    }
    var sur = CQ.nombre('sur', 1, 1000);
    if (!isFinite(sur)) { sur = 20; }
    if (!nb || sC === 0) { CQ.texte('rMoy', '–'); CQ.texte('rNb', String(nb)); CQ.texte('rCoef', '–'); CQ.texte('phrase', ''); return; }
    var m = sNc / sC;
    CQ.texte('rMoy', CQ.souple(m, 2) + ' / ' + CQ.souple(sur, 2));
    CQ.texte('rNb', String(nb));
    CQ.texte('rCoef', CQ.souple(sC, 2));
    CQ.texte('rPct', CQ.pourcent(m / sur * 100, 1));
    CQ.texte('phrase', '(' + detail.join(' + ') + ') ÷ ' + CQ.souple(sC, 2) + ' = ' + CQ.souple(m, 4));
  }
  var ids = ['sur'];
  for (var i = 1; i <= N; i++) { ids.push('n' + i, 'c' + i); }
  CQ.surChangement(ids, recalcul);
  CQ.initPartage(recalcul);
}());
