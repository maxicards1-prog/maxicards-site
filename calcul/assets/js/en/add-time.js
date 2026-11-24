/* Add and subtract durations. Accepted: 7:30, 7h30, 7h 30m, 2 hours 15 minutes, 45min, 7.5 (decimal hours). */
(function () {
  'use strict';
  var CQ = window.CQ, N = 8;
  function hm(totalMinutes) {
    var neg = totalMinutes < 0, t = Math.round(Math.abs(totalMinutes)), h = Math.floor(t / 60), m = t % 60;
    return (neg ? '−' : '') + h + ' h ' + (m < 10 ? '0' : '') + m + ' min';
  }
  // Text -> minutes (NaN when not understood, 0 when empty).
  function duration(text) {
    var t = String(text || '').trim().toLowerCase().replace(/\s/g, '');
    if (t === '') { return 0; }
    var colon = /^(\d{1,4}):(\d{1,2})$/.exec(t);
    if (colon) { return +colon[2] < 60 ? +colon[1] * 60 + +colon[2] : NaN; }
    var dec = /^(\d{1,4})(?:\.(\d{1,4}))?$/.exec(t);
    if (dec) { return Number(dec[1] + '.' + (dec[2] || '0')) * 60; }
    // 7h30, 7h30m, 2hours15minutes, 7h
    var hmatch = /^(\d{1,4}(?:\.\d{1,4})?)(?:hours|hour|hrs|hr|h)(?:(\d{1,2})(?:minutes|minute|mins|min|m)?)?$/.exec(t);
    if (hmatch) { return Number(hmatch[1]) * 60 + (hmatch[2] !== undefined ? +hmatch[2] : 0); }
    // 45min, 45m
    var mmatch = /^(\d{1,5})(?:minutes|minute|mins|min|m)$/.exec(t);
    if (mmatch) { return +mmatch[1]; }
    return NaN;
  }
  function recalcul() {
    var total = 0, bad = false;
    for (var i = 1; i <= N; i++) {
      var v = duration(CQ.valeur('d' + i)), ok = isFinite(v);
      CQ.el('d' + i).setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!ok) { bad = true; continue; }
      total += (CQ.valeur('s' + i) === 'minus' ? -1 : 1) * v;
    }
    CQ.texte('rTotal', hm(total));
    CQ.texte('rDec', CQ.souple(total / 60, 2) + ' h');
    CQ.texte('rMin', CQ.souple(Math.round(total), 0) + ' min');
    var a = Math.abs(Math.round(total));
    CQ.texte('phrase', bad ? 'One entry was not understood. Try 7:30, 7h30, 45min or 7.5.' :
      (a >= 1440 ? 'That is ' + Math.floor(a / 1440) + ' day(s) of 24 hours plus ' + hm(a % 1440) + '.' : 'Total calculated to the minute.'));
  }
  var ids = [];
  for (var i = 1; i <= N; i++) { ids.push('d' + i, 's' + i); }
  CQ.surChangement(ids, recalcul);
  CQ.initPartage(recalcul);
}());
