/* Consommation et coût électrique d'un appareil : kWh = W × heures ÷ 1000. */
(function () {
  'use strict';
  var CQ = window.CQ;
  function recalcul() {
    var w = CQ.nombre('watts', 0, 1e6), h = CQ.nombre('heures', 0, 24), j = CQ.nombre('jours', 0, 366), p = CQ.nombre('prixKwh', 0, 10);
    if (!isFinite(w) || !isFinite(h) || !isFinite(j)) {
      ['rKwhJour', 'rKwhAn', 'rCoutJour', 'rCoutMois', 'rCoutAn'].forEach(function (i) { CQ.texte(i, '–'); }); CQ.texte('phrase', ''); return;
    }
    var kj = w * h / 1000, ka = kj * j;
    CQ.texte('rKwhJour', CQ.souple(kj, 3) + ' kWh');
    CQ.texte('rKwhAn', CQ.souple(ka, 1) + ' kWh');
    var ok = isFinite(p);
    CQ.texte('rCoutJour', ok ? CQ.euros(kj * p) : '–');
    CQ.texte('rCoutMois', ok ? CQ.euros(ka * p / 12) : '–');
    CQ.texte('rCoutAn', ok ? CQ.euros(ka * p) : '–');
    CQ.texte('phrase', CQ.souple(w, 0) + ' W × ' + CQ.souple(h, 2) + ' h ÷ 1 000 = ' + CQ.souple(kj, 3) + ' kWh par jour' +
      (ok ? ' ; × ' + CQ.souple(j, 0) + ' jours × ' + CQ.souple(p, 4) + ' € = ' + CQ.euros(ka * p) + ' par an.' : '.'));
  }
  CQ.surChangement(['watts', 'heures', 'jours', 'prixKwh'], recalcul);
  CQ.initPartage(recalcul);
}());
