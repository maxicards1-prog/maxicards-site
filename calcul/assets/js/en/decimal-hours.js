/* Decimal hours <-> hours and minutes. */
(function () {
  'use strict';
  var CQ = window.CQ;
  function hm(totalMinutes) {
    var t = Math.round(totalMinutes), h = Math.floor(t / 60), m = t % 60;
    return h + ' h ' + (m < 10 ? '0' : '') + m + ' min';
  }
  function toDecimal() {
    var h = CQ.nombre('h', 0, 100000), m = CQ.nombre('m', 0, 100000);
    if (!isFinite(h)) { h = 0; }
    if (!isFinite(m)) { m = 0; }
    if (!CQ.valeur('h') && !CQ.valeur('m')) { CQ.texte('rDec', '–'); CQ.texte('rDecd', 'Enter hours, minutes or both.'); return; }
    var dec = h + m / 60;
    CQ.texte('rDec', CQ.souple(dec, 2) + ' h');
    CQ.texte('rDecd', CQ.souple(h, 0) + ' + ' + CQ.souple(m, 2) + ' ÷ 60 = ' + CQ.souple(dec, 4) + ' (rounded to hundredths: ' + CQ.decimal(dec, 2) + ')');
  }
  function toHM() {
    var d = CQ.nombre('dec', 0, 100000);
    if (!isFinite(d)) { CQ.texte('rHM', '–'); CQ.texte('rHMd', 'Enter a number of hours, such as 7.8.'); return; }
    var whole = Math.floor(d);
    CQ.texte('rHM', hm(d * 60));
    CQ.texte('rHMd', 'Whole hours: ' + whole + '. Fraction: ' + CQ.souple(d - whole, 4) + ' × 60 = ' + CQ.souple((d - whole) * 60, 2) + ' min.');
  }
  CQ.surChangement(['h', 'm'], toDecimal);
  CQ.surChangement(['dec'], toHM);
  CQ.initPartage(function () { toDecimal(); toHM(); });
}());
