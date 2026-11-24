/* ISO 8601 week number (Monday to Sunday; week 1 contains the first Thursday of the year), plus the US-style count. */
(function () {
  'use strict';
  var CQ = window.CQ;
  function longDate(n) {
    return new Date(n * 86400000).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  }
  function iso(n) {
    var monday = n - ((CQ.jourSemaine(n) + 6) % 7), thursday = monday + 3;
    var y = CQ.annee(thursday), jan1 = CQ.jour(y + '-01-01');
    return { year: y, week: Math.floor((thursday - jan1) / 7) + 1, monday: monday };
  }
  function mondayOf(y, w) {
    var jan4 = CQ.jour(y + '-01-04');
    return jan4 - ((CQ.jourSemaine(jan4) + 6) % 7) + (w - 1) * 7;
  }
  function weeksIn(y) { return iso(CQ.jour(y + '-12-28')).week; }
  // US-style: weeks start on Sunday and week 1 is the week that contains January 1.
  function usWeek(n) {
    var jan1 = CQ.jour(CQ.annee(n) + '-01-01');
    return Math.floor((n - jan1 + CQ.jourSemaine(jan1)) / 7) + 1;
  }
  function recalcul() {
    var n = CQ.jour(CQ.valeur('date'));
    if (isFinite(n)) {
      var r = iso(n);
      CQ.texte('rSemaine', 'Week ' + r.week);
      CQ.texte('rAnneeIso', String(r.year));
      CQ.texte('rNb', String(weeksIn(r.year)));
      CQ.texte('rUs', 'Week ' + usWeek(n));
      CQ.texte('rDu', longDate(n) + ' is in ISO week ' + r.week + ' of ' + r.year + ', which runs from ' + longDate(r.monday) + ' to ' + longDate(r.monday + 6) + '.');
    } else {
      ['rSemaine', 'rAnneeIso', 'rNb', 'rUs'].forEach(function (i) { CQ.texte(i, '–'); });
      CQ.texte('rDu', 'Enter a valid date.');
    }
    var y = CQ.nombre('annee2', 1901, 2199), w = CQ.nombre('sem2', 1, 53);
    if (isFinite(y) && isFinite(w)) {
      y = Math.floor(y); w = Math.floor(w);
      var max = weeksIn(y);
      if (w > max) { CQ.texte('rDates', y + ' has only ' + max + ' ISO weeks.'); }
      else {
        var m = mondayOf(y, w);
        CQ.texte('rDates', 'ISO week ' + w + ' of ' + y + ' runs from ' + longDate(m) + ' to ' + longDate(m + 6) + '.');
      }
    } else { CQ.texte('rDates', 'Enter a year and a week number.'); }
  }
  if (!CQ.valeur('date')) { CQ.el('date').value = CQ.versTexteIso(CQ.aujourdhui()); }
  if (!CQ.valeur('annee2')) { CQ.el('annee2').value = String(CQ.annee(CQ.aujourdhui())); }
  CQ.surChangement(['date', 'annee2', 'sem2'], recalcul);
  CQ.initPartage(recalcul);
}());
