/* Addition et soustraction de durées. Formats acceptés : 7:30, 7h30, 7h, 45min, 7,5 (heures décimales). */
(function () {
  'use strict';
  var CQ = window.CQ, N = 8;
  function duree(t) {
    t = String(t || '').trim().toLowerCase().replace(/\s/g, '');
    if (t === '') { return 0; }
    var m = /^(\d{1,4})(?:[:h](\d{1,2})?(?:min|m)?)?$/.exec(t);
    if (m && (m[2] === undefined || +m[2] < 60)) { return +m[1] * 60 + (m[2] ? +m[2] : 0); }
    var d = /^(\d{1,4})[,.](\d{1,4})h?$/.exec(t);
    if (d) { return Number(d[1] + '.' + d[2]) * 60; }
    var mn = /^(\d{1,5})(?:min|mn|m)$/.exec(t);
    if (mn) { return +mn[1]; }
    return NaN;
  }
  function recalcul() {
    var total = 0, erreur = false;
    for (var i = 1; i <= N; i++) {
      var v = duree(CQ.valeur('d' + i)), ok = isFinite(v);
      CQ.el('d' + i).setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!ok) { erreur = true; continue; }
      total += (CQ.valeur('s' + i) === 'moins' ? -1 : 1) * v;
    }
    CQ.texte('rTotal', CQ.hm(total));
    CQ.texte('rDec', CQ.souple(total / 60, 2) + ' h');
    CQ.texte('rMin', CQ.souple(Math.round(total), 0) + ' min');
    var a = Math.abs(Math.round(total));
    CQ.texte('phrase', erreur ? 'Une durée n\'est pas comprise : écrivez par exemple 7:30, 7h30, 45min ou 7,5.' :
      (a >= 1440 ? 'Soit ' + Math.floor(a / 1440) + ' jour(s) de 24 h et ' + CQ.hm(a % 1440) + '.' : 'Total calculé à la minute près.'));
  }
  var ids = [];
  for (var i = 1; i <= N; i++) { ids.push('d' + i, 's' + i); }
  CQ.surChangement(ids, recalcul);
  CQ.initPartage(recalcul);
}());
