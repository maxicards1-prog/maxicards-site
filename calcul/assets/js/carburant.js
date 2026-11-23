/* Consommation (L/100 km) au plein et coût d'un trajet. */
(function () {
  'use strict';
  var CQ = window.CQ;
  function recalcul() {
    var l = CQ.nombre('litres', 0, 1e5), km = CQ.nombre('kmPlein', 0, 1e6);
    var conso = isFinite(l) && km > 0 ? l / km * 100 : NaN;
    CQ.texte('rConso', isFinite(conso) ? CQ.souple(conso, 2) + ' L/100 km' : '–');
    CQ.texte('rKmParL', isFinite(conso) && l > 0 ? CQ.souple(km / l, 2) + ' km' : '–');
    var d = CQ.nombre('distance', 0, 1e6), c = CQ.nombre('conso', 0, 100), p = CQ.nombre('prixL', 0, 100), pers = CQ.nombre('personnes', 1, 9);
    if (!isFinite(pers)) { pers = 1; }
    pers = Math.floor(pers);
    var ar = CQ.coche('allerRetour') ? 2 : 1;
    if (isFinite(d) && isFinite(c) && isFinite(p)) {
      var litres = d * ar * c / 100, cout = litres * p;
      CQ.texte('rLitres', CQ.souple(litres, 2) + ' L');
      CQ.texte('rCout', CQ.euros(cout));
      CQ.texte('rParPers', CQ.euros(cout / pers));
      CQ.texte('rParKm', d > 0 ? CQ.euros(cout / (d * ar)) : '–');
      CQ.texte('phrase', CQ.souple(d * ar, 1) + ' km × ' + CQ.souple(c, 2) + ' L ÷ 100 = ' + CQ.souple(litres, 2) + ' L ; × ' + CQ.euros(p) + ' = ' + CQ.euros(cout) + '.');
    } else {
      ['rLitres', 'rCout', 'rParPers', 'rParKm'].forEach(function (i) { CQ.texte(i, '–'); });
      CQ.texte('phrase', '');
    }
  }
  CQ.surChangement(['litres', 'kmPlein', 'distance', 'conso', 'prixL', 'personnes', 'allerRetour'], recalcul);
  CQ.initPartage(recalcul);
}());
