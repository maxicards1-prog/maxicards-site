/* Weekly time card: hours worked per day and in total, in hours-minutes and in decimal hours. */
(function () {
  'use strict';
  var CQ = window.CQ;
  function hm(totalMinutes) {
    var neg = totalMinutes < 0, t = Math.round(Math.abs(totalMinutes)), h = Math.floor(t / 60), m = t % 60;
    return (neg ? '−' : '') + h + ' h ' + (m < 10 ? '0' : '') + m + ' min';
  }
  function recalcul() {
    var total = 0, days = 0, overnight = false;
    for (var i = 1; i <= 7; i++) {
      var start = CQ.minutes(CQ.valeur('a' + i)), end = CQ.minutes(CQ.valeur('d' + i));
      var brk = CQ.nombre('p' + i, 0, 1440);
      if (!isFinite(brk)) { brk = 0; }
      var dur = NaN;
      if (isFinite(start) && isFinite(end)) {
        dur = end - start;
        if (dur < 0) { dur += 1440; overnight = true; } // shift ends after midnight
        dur = Math.max(0, dur - brk);
        total += dur;
        if (dur > 0) { days++; }
      }
      CQ.texte('t' + i, isFinite(dur) ? hm(dur) : '–');
    }
    var ref = CQ.nombre('reference', 1, 168);
    if (!isFinite(ref)) { ref = 40; }
    var diff = total - ref * 60;
    CQ.texte('rTotal', hm(total));
    CQ.texte('rDecimal', CQ.decimal(total / 60, 2) + ' h');
    CQ.texte('rEcart', (diff > 0 ? '+' : '') + hm(diff));
    CQ.texte('rMoyenne', days ? hm(total / days) : '–');
    var rate = CQ.nombre('taux', 0, 100000);
    if (!isFinite(rate)) { rate = 0; }
    CQ.texte('rPaie', CQ.decimal(total / 60 * rate, 2));
    CQ.texte('phrase', 'Week total: ' + hm(total) + ', or ' + CQ.decimal(total / 60, 2) + ' decimal hours' +
      (diff > 0 ? ', which is ' + hm(diff) + ' over ' + CQ.souple(ref, 2) + ' h' : '') + '.' +
      (overnight ? ' An end time earlier than the start time is counted as the next day (overnight shift).' : ''));
  }
  var ids = ['reference', 'taux'];
  for (var i = 1; i <= 7; i++) { ids.push('a' + i, 'd' + i, 'p' + i); }
  CQ.surChangement(ids, recalcul);
  var clear = CQ.el('vider');
  if (clear) {
    clear.addEventListener('click', function () {
      for (var j = 1; j <= 7; j++) { CQ.el('a' + j).value = ''; CQ.el('d' + j).value = ''; CQ.el('p' + j).value = ''; }
      recalcul();
      CQ.el('a1').dispatchEvent(new Event('change'));
    });
  }
  var copy = CQ.el('copierLundi');
  if (copy) {
    copy.addEventListener('click', function () {
      for (var j = 2; j <= 5; j++) {
        CQ.el('a' + j).value = CQ.el('a1').value; CQ.el('d' + j).value = CQ.el('d1').value; CQ.el('p' + j).value = CQ.el('p1').value;
      }
      recalcul();
      CQ.el('a1').dispatchEvent(new Event('change'));
    });
  }
  CQ.initPartage(recalcul);
}());
