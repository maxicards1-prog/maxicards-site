/* Thermostat, degrés Celsius et Fahrenheit, chaleur tournante. */
(function () {
  'use strict';
  var CQ = window.CQ, CU = window.CU;
  function recalcul() {
    var mode = CQ.valeur('mode'), v = CQ.nombre('v', -100, 1000), c;
    var ids = ['rC', 'rF', 'rTh', 'rTourn'];
    if (!isFinite(v)) { ids.forEach(function (i) { CQ.texte(i, '–'); }); CQ.texte('phrase', ''); return; }
    if (mode === 'th') { c = CU.thermostatVersC(v); } else if (mode === 'f') { c = CU.fVersC(v); } else { c = v; }
    var tournante = CU.tournante(c);
    CQ.texte('rC', CQ.souple(c, 0) + ' °C');
    CQ.texte('rF', CQ.souple(CU.cVersF(c), 0) + ' °F');
    CQ.texte('rTh', c >= 15 && c <= 315 ? 'th. ' + CQ.souple(CU.cVersThermostat(c), 1) : '–');
    CQ.texte('rTourn', CQ.souple(tournante, 0) + ' °C (th. ' + CQ.souple(CU.cVersThermostat(tournante), 1) + ')');
    CQ.texte('phrase', 'Four traditionnel : ' + CQ.souple(c, 0) + ' °C. Avec la chaleur tournante, beaucoup de cuisiniers baissent d\'environ 20 °C : ' + CQ.souple(tournante, 0) + ' °C. Surveillez le plat la première fois.');
  }
  CQ.surChangement(['mode', 'v'], recalcul);
  CQ.initPartage(recalcul);
}());
