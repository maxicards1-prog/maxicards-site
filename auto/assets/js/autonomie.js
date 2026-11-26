/* Autonomie : énergie utilisable (charge - réserve) / consommation x 100. */
(function () {
  'use strict';
  var CQ = window.CQ, AU = window.AU;
  function recalcul() {
    var o = { capacite: CQ.nombre('capacite', 0, 10000), charge: CQ.nombre('charge', -1, 1000), reserve: CQ.nombre('reserve', -1, 1000),
      conso: CQ.nombre('conso', 0, 1000) };
    var km = AU.autonomie(o);
    if (!isFinite(km)) {
      ['rKm', 'rE', 'r10'].forEach(function (id) { CQ.texte(id, '–'); });
      CQ.texte('phrase', 'Vérifiez les valeurs : batterie de 1 à 300 kWh, pourcentages de 0 à 100, consommation de 3 à 100 kWh/100 km.');
      CQ.lignes('tabA', []);
      return;
    }
    var e = o.capacite * Math.max(0, o.charge - o.reserve) / 100;
    CQ.texte('rKm', '≈ ' + CQ.entier(km) + ' km');
    CQ.texte('rE', CQ.souple(e, 1) + ' kWh');
    CQ.texte('r10', '≈ ' + CQ.entier(o.capacite * 10 / o.conso) + ' km');
    CQ.texte('phrase', o.charge <= o.reserve ? 'Le niveau de départ est sous la réserve choisie : aucun kilomètre avant de recharger.' :
      CQ.souple(e, 1) + ' kWh utilisables à ' + CQ.souple(o.conso, 1) + ' kWh/100 km : environ ' + CQ.entier(km) + ' km avant d’atteindre ' + CQ.souple(o.reserve, 0) + ' %.');
    var lignes = [];
    for (var c = 12; c <= 30; c += 2) {
      var k = AU.autonomie({ capacite: o.capacite, charge: o.charge, reserve: o.reserve, conso: c });
      lignes.push({ cellules: [c + ' kWh/100 km', isFinite(k) ? CQ.entier(k) + ' km' : '–'], nombres: [0, 1], classe: Math.abs(c - o.conso) < 1 ? 'meilleur' : '' });
    }
    CQ.lignes('tabA', lignes);
  }
  CQ.initPartage(recalcul);
  CQ.surChangement(['capacite', 'charge', 'reserve', 'conso'], recalcul);
}());
