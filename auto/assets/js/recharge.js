/* Temps de recharge : énergie à ajouter / (puissance retenue x (1 - pertes)). */
(function () {
  'use strict';
  var CQ = window.CQ, AU = window.AU, D = window.AU_DATA;
  var PRISES = D.recharge.prises;
  function prise(id) { return PRISES.filter(function (x) { return x.id === id; })[0] || PRISES[0]; }
  var dernierePrise = null;
  function lire(borne) {
    return { capacite: CQ.nombre('capacite', 0, 10000), depart: CQ.nombre('depart', -1, 1000), arrivee: CQ.nombre('arrivee', -1, 1000),
      borne: borne, voiture: CQ.nombre('voiture', 0, 100000), pertes: CQ.nombre('pertes', 0, 100) };
  }
  function recalcul() {
    var p = prise(CQ.valeur('prise'));
    var autre = p.id === 'autre';
    CQ.montrer('ch-borne', autre);
    if (!autre && dernierePrise !== p.id) { CQ.el('borne').value = CQ.souple(p.kw, 1); }
    dernierePrise = p.id;
    var o = lire(CQ.nombre('borne', 0, 100000));
    if (!isFinite(o.voiture)) { o.voiture = 0; }
    var r = AU.tempsRecharge(o);
    if (!r) {
      ['rDuree', 'rBat', 'rRes', 'rP'].forEach(function (id) { CQ.texte(id, '–'); });
      CQ.texte('phrase', 'Vérifiez les valeurs : batterie de 1 à 300 kWh, niveau voulu plus haut que le départ, pertes de 0 à 50 %.');
      CQ.lignes('tabT', []);
      return;
    }
    CQ.texte('rDuree', CQ.hm(r.heures * 60));
    CQ.texte('rBat', CQ.souple(r.batterie, 1) + ' kWh');
    CQ.texte('rRes', CQ.souple(r.reseau, 1) + ' kWh');
    CQ.texte('rP', CQ.souple(r.puissance, 1) + ' kW');
    CQ.texte('phrase', 'De ' + CQ.souple(o.depart, 0) + ' % à ' + CQ.souple(o.arrivee, 0) + ' % : ' + CQ.souple(r.batterie, 1) + ' kWh à ajouter à ' +
      CQ.souple(r.puissance, 1) + ' kW, soit environ ' + CQ.hm(r.heures * 60) + (r.puissance >= 50 ? '. Sur borne rapide, la fin de charge est souvent plus lente que ce calcul.' : '.'));
    var lignes = [];
    PRISES.forEach(function (x) {
      if (!x.kw) { return; }
      o.borne = x.kw;
      var t = AU.tempsRecharge(o);
      lignes.push({ cellules: [x.nom, CQ.souple(x.kw, 1) + ' kW', t ? CQ.hm(t.heures * 60) : '–'], nombres: [1, 2], classe: x.id === p.id ? 'meilleur' : '' });
    });
    CQ.lignes('tabT', lignes);
  }
  CQ.initPartage(recalcul);
  CQ.surChangement(['capacite', 'depart', 'arrivee', 'prise', 'borne', 'voiture', 'pertes'], recalcul);
}());
