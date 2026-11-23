/* Convertisseur heures décimales <-> heures et minutes. */
(function () {
  'use strict';
  var CQ = window.CQ;
  function versDecimal() {
    var h = CQ.nombre('h', 0, 100000), m = CQ.nombre('m', 0, 100000);
    if (!isFinite(h)) { h = 0; }
    if (!isFinite(m)) { m = 0; }
    if (!CQ.valeur('h') && !CQ.valeur('m')) { CQ.texte('rDec', '–'); CQ.texte('rDecd', ''); return; }
    var dec = h + m / 60;
    CQ.texte('rDec', CQ.souple(dec, 2) + ' h');
    CQ.texte('rDecd', CQ.souple(h, 0) + ' + ' + CQ.souple(m, 2) + ' ÷ 60 = ' + CQ.souple(dec, 4) + ' (arrondi au centième : ' + CQ.decimal(dec, 2) + ')');
  }
  function versHM() {
    var d = CQ.nombre('dec', 0, 100000);
    if (!isFinite(d)) { CQ.texte('rHM', '–'); CQ.texte('rHMd', ''); return; }
    var minutes = d * 60;
    CQ.texte('rHM', CQ.hm(minutes));
    var ent = Math.floor(d);
    CQ.texte('rHMd', 'Partie entière : ' + ent + ' h ; partie décimale ' + CQ.souple(d - ent, 4) + ' × 60 = ' + CQ.souple((d - ent) * 60, 2) + ' min');
  }
  CQ.surChangement(['h', 'm'], versDecimal);
  CQ.surChangement(['dec'], versHM);
  CQ.initPartage(function () { versDecimal(); versHM(); });
}());
