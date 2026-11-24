/* Days between two dates, and a date plus or minus N days, weeks, months or years. */
(function () {
  'use strict';
  var CQ = window.CQ;
  function longDate(n) {
    return new Date(n * 86400000).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }
  // Gap in years, months and days, the way people say it out loud.
  function gap(d, f) {
    var a = CQ.versDate(d), b = CQ.versDate(f);
    var years = b.getUTCFullYear() - a.getUTCFullYear();
    var months = b.getUTCMonth() - a.getUTCMonth();
    var days = b.getUTCDate() - a.getUTCDate();
    if (days < 0) { months--; days += new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0)).getUTCDate(); }
    if (months < 0) { years--; months += 12; }
    var p = [];
    if (years) { p.push(plural(years, 'year')); }
    if (months) { p.push(plural(months, 'month')); }
    if (days || !p.length) { p.push(plural(days, 'day')); }
    return p.join(', ');
  }
  function between() {
    var d = CQ.jour(CQ.valeur('d1')), f = CQ.jour(CQ.valeur('d2'));
    if (!isFinite(d) || !isFinite(f)) {
      ['rJours', 'rSemaines', 'rAMJ', 'rHeures'].forEach(function (id) { CQ.texte(id, '–'); });
      CQ.texte('phrase1', 'Enter two valid dates.'); return;
    }
    var a = Math.min(d, f), b = Math.max(d, f);
    var n = b - a + (CQ.coche('inclureFin') ? 1 : 0);
    CQ.texte('rJours', CQ.entier(n));
    CQ.texte('rSemaines', plural(Math.floor(n / 7), 'week') + ', ' + plural(n % 7, 'day'));
    CQ.texte('rAMJ', gap(a, b));
    CQ.texte('rHeures', CQ.entier(n * 24));
    CQ.texte('phrase1', (f < d ? 'The second date is before the first. ' : '') + 'From ' + longDate(a) + ' to ' + longDate(b) +
      ' is ' + plural(n, 'day') + (CQ.coche('inclureFin') ? ' (counting both the first and last day)' : '') + '.');
  }
  function addTo() {
    var d = CQ.jour(CQ.valeur('d3'));
    var n = CQ.nombre('n3', 0, 100000);
    var unit = CQ.valeur('u3');
    var sign = CQ.valeur('s3') === 'minus' ? -1 : 1;
    if (!isFinite(d) || !isFinite(n)) { CQ.texte('rDate', '–'); CQ.texte('phrase2', 'Enter a valid date and a number.'); return; }
    n = Math.round(n) * sign;
    var res;
    if (unit === 'months' || unit === 'years') {
      var x = CQ.versDate(d);
      var m = x.getUTCMonth() + (unit === 'years' ? 12 * n : n);
      var y = x.getUTCFullYear() + Math.floor(m / 12);
      var mo = ((m % 12) + 12) % 12;
      var last = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
      // January 31 + 1 month lands on the last day of February (no overflow into March).
      res = Date.UTC(y, mo, Math.min(x.getUTCDate(), last)) / 86400000;
    } else {
      res = d + n * (unit === 'weeks' ? 7 : 1);
    }
    CQ.texte('rDate', longDate(res));
    CQ.texte('phrase2', longDate(d) + (sign > 0 ? ' + ' : ' − ') + Math.abs(n) + ' ' + (Math.abs(n) === 1 ? unit.slice(0, -1) : unit) + ' = ' + longDate(res) + '.');
  }
  CQ.surChangement(['d1', 'd2', 'inclureFin'], between);
  CQ.surChangement(['d3', 'n3', 'u3', 's3'], addTo);
  CQ.initPartage(function () { between(); addTo(); });
}());
