/* Age calculator: exact age in years, months and days, days lived, next birthday. */
(function () {
  'use strict';
  var CQ = window.CQ;
  function longDate(n) {
    return new Date(n * 86400000).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  }
  function weekday(n) { return new Date(n * 86400000).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }); }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }
  var IDS = ['rAge', 'rDetail', 'rJours', 'rSemaines', 'rProchain', 'rJourNaissance'];
  function recalcul() {
    var born = CQ.jour(CQ.valeur('birth'));
    var ref = CQ.jour(CQ.valeur('ref'));
    if (!isFinite(ref)) { ref = CQ.aujourdhui(); }
    if (!isFinite(born)) { IDS.forEach(function (id) { CQ.texte(id, '–'); }); CQ.texte('phrase', 'Enter a valid date of birth.'); return; }
    if (born > ref) { IDS.forEach(function (id) { CQ.texte(id, '–'); }); CQ.texte('phrase', 'The date of birth is after the calculation date.'); return; }
    var a = CQ.versDate(born), b = CQ.versDate(ref);
    var years = b.getUTCFullYear() - a.getUTCFullYear();
    var months = b.getUTCMonth() - a.getUTCMonth();
    var days = b.getUTCDate() - a.getUTCDate();
    if (days < 0) { months--; days += new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0)).getUTCDate(); }
    if (months < 0) { years--; months += 12; }
    // A February 29 birthday is counted on February 28 in non-leap years.
    var birthday = function (y) {
      var last = new Date(Date.UTC(y, a.getUTCMonth() + 1, 0)).getUTCDate();
      return Date.UTC(y, a.getUTCMonth(), Math.min(a.getUTCDate(), last)) / 86400000;
    };
    var next = birthday(b.getUTCFullYear());
    if (next === ref) { years = b.getUTCFullYear() - a.getUTCFullYear(); months = 0; days = 0; }
    if (next < ref) { next = birthday(b.getUTCFullYear() + 1); }
    var left = next - ref;
    CQ.texte('rAge', plural(years, 'year'));
    CQ.texte('rDetail', plural(years, 'year') + ', ' + plural(months, 'month') + ', ' + plural(days, 'day'));
    CQ.texte('rJours', CQ.entier(ref - born));
    CQ.texte('rSemaines', CQ.entier(Math.floor((ref - born) / 7)));
    CQ.texte('rProchain', left === 0 ? 'today!' : 'in ' + plural(left, 'day'));
    CQ.texte('rJourNaissance', weekday(born));
    CQ.texte('phrase', 'Born on ' + longDate(born) + ', you are ' + plural(years, 'year') + ' old on ' + longDate(ref) +
      '. Next birthday (turning ' + (years + (left === 0 ? 0 : 1)) + '): ' + longDate(next) + '. Your 10,000th day: ' + longDate(born + 10000) + '.');
  }
  CQ.surChangement(['birth', 'ref'], recalcul);
  CQ.initPartage(recalcul);
}());
