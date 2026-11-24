/* Profit margin = profit ÷ price; markup = profit ÷ cost. */
(function () {
  'use strict';
  var CQ = window.CQ;
  var LABELS = { price: 'Selling price', margin: 'Profit margin you want (%)', markup: 'Markup you want (%)' };
  var IDS = ['rPrice', 'rProfit', 'rMargin', 'rMarkup', 'rMult'];
  function pct(v) { return CQ.decimal(v, 2) + '%'; }
  function recalcul() {
    var mode = CQ.valeur('mode'), cost = CQ.nombre('cost', 0, 1e10), x = CQ.nombre('value');
    var lab = document.querySelector('label[for="value"]');
    if (lab) { lab.textContent = LABELS[mode] || LABELS.price; }
    var vente = NaN;
    if (isFinite(cost) && isFinite(x)) {
      if (mode === 'margin') { vente = x < 100 ? cost / (1 - x / 100) : NaN; }
      else if (mode === 'markup') { vente = cost * (1 + x / 100); }
      else { vente = x; }
    }
    if (!isFinite(vente) || !(cost > 0) || !(vente > 0)) {
      IDS.forEach(function (i) { CQ.texte(i, '–'); });
      CQ.texte('phrase', mode === 'margin' && x >= 100 ? 'A profit margin must be below 100%.' : '');
      return;
    }
    var profit = vente - cost;
    CQ.texte('rPrice', CQ.decimal(vente, 2));
    CQ.texte('rProfit', CQ.decimal(profit, 2));
    CQ.texte('rMargin', pct(profit / vente * 100));
    CQ.texte('rMarkup', pct(profit / cost * 100));
    CQ.texte('rMult', CQ.souple(vente / cost, 4));
    CQ.texte('phrase', 'Profit = ' + CQ.decimal(vente, 2) + ' − ' + CQ.decimal(cost, 2) + ' = ' + CQ.decimal(profit, 2) +
      '. Margin = profit ÷ price; markup = profit ÷ cost.');
  }
  CQ.surChangement(['mode', 'cost', 'value'], recalcul);
  CQ.initPartage(recalcul);
}());
