/* Simple and weighted average: Σ(value × weight) ÷ Σ(weight). Rows with an empty value are ignored. */
(function () {
  'use strict';
  var CQ = window.CQ, N = 10;
  function recalcul() {
    var sVW = 0, sW = 0, sV = 0, nb = 0, detail = [];
    for (var i = 1; i <= N; i++) {
      var v = CQ.nombre('v' + i), w = CQ.nombre('w' + i, 0, 1e9);
      if (!isFinite(v)) { continue; }
      if (!isFinite(w)) { w = 1; }
      sVW += v * w; sW += w; sV += v; nb++;
      detail.push(CQ.souple(v, 2) + (w !== 1 ? ' × ' + CQ.souple(w, 2) : ''));
    }
    if (!nb) { ['rWavg', 'rAvg', 'rW'].forEach(function (id) { CQ.texte(id, '–'); }); CQ.texte('rN', '0'); CQ.texte('phrase', ''); return; }
    CQ.texte('rN', String(nb));
    CQ.texte('rAvg', CQ.souple(sV / nb, 4));
    CQ.texte('rW', CQ.souple(sW, 2));
    if (sW === 0) { CQ.texte('rWavg', '–'); CQ.texte('phrase', 'The weights add up to 0: enter at least one weight above 0.'); return; }
    CQ.texte('rWavg', CQ.souple(sVW / sW, 4));
    CQ.texte('phrase', '(' + detail.join(' + ') + ') ÷ ' + CQ.souple(sW, 2) + ' = ' + CQ.souple(sVW / sW, 4));
  }
  var ids = [];
  for (var i = 1; i <= N; i++) { ids.push('v' + i, 'w' + i); }
  CQ.surChangement(ids, recalcul);
  CQ.initPartage(recalcul);
}());
