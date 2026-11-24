/* Electricity use and cost of an appliance: kWh = watts x hours / 1,000. No currency symbol: any currency works. */
(function () {
  'use strict';
  var CQ = window.CQ;
  function price(p) { return Math.round(p * 100) === p * 100 ? CQ.decimal(p, 2) : CQ.souple(p, 4); }
  var IDS = ['rKwhJour', 'rKwhAn', 'rCoutJour', 'rCoutMois', 'rCoutAn'];
  function recalcul() {
    var w = CQ.nombre('watts', 0, 1e6), h = CQ.nombre('heures', 0, 24), d = CQ.nombre('jours', 0, 366), p = CQ.nombre('prixKwh', 0, 1000);
    if (!isFinite(w) || !isFinite(h) || !isFinite(d)) {
      IDS.forEach(function (i) { CQ.texte(i, '–'); });
      CQ.texte('phrase', 'Enter the power in watts, the hours per day and the days per year.'); return;
    }
    var perDay = w * h / 1000, perYear = perDay * d;
    CQ.texte('rKwhJour', CQ.souple(perDay, 3) + ' kWh');
    CQ.texte('rKwhAn', CQ.souple(perYear, 1) + ' kWh');
    var ok = isFinite(p);
    CQ.texte('rCoutJour', ok ? CQ.decimal(perDay * p, 2) : '–');
    CQ.texte('rCoutMois', ok ? CQ.decimal(perYear * p / 12, 2) : '–');
    CQ.texte('rCoutAn', ok ? CQ.decimal(perYear * p, 2) : '–');
    CQ.texte('phrase', CQ.souple(w, 0) + ' W × ' + CQ.souple(h, 2) + ' h ÷ 1,000 = ' + CQ.souple(perDay, 3) + ' kWh per day' +
      (ok ? '; × ' + CQ.souple(d, 0) + ' days × ' + price(p) + ' per kWh = ' + CQ.decimal(perYear * p, 2) + ' per year.' : '. Add a price per kWh to see the cost.'));
  }
  CQ.surChangement(['watts', 'heures', 'jours', 'prixKwh'], recalcul);
  CQ.initPartage(recalcul);
}());
