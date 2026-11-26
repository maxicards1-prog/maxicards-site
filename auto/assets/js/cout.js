/* Coût d'une recharge : énergie payée (pertes comprises) x prix du kWh ; coût aux 100 km. */
(function () {
  'use strict';
  var CQ = window.CQ, AU = window.AU;
  var PRIX = [0.10, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50, 0.60];
  function recalcul() {
    var o = { capacite: CQ.nombre('capacite', 0, 10000), depart: CQ.nombre('depart', -1, 1000), arrivee: CQ.nombre('arrivee', -1, 1000),
      prix: CQ.nombre('prix', 0, 1000), pertes: CQ.nombre('pertes', 0, 100), conso: CQ.nombre('conso', 0, 1000) };
    var r = AU.coutRecharge(o);
    if (!r) {
      ['rCout', 'rRes', 'r100', 'rKm'].forEach(function (id) { CQ.texte(id, '–'); });
      CQ.texte('phrase', 'Vérifiez les valeurs : batterie de 1 à 300 kWh, niveau voulu plus haut que le départ, prix du kWh de 0 à 10 €.');
      CQ.lignes('tabP', []);
      return;
    }
    CQ.texte('rCout', CQ.euros(r.cout));
    CQ.texte('rRes', CQ.souple(r.reseau, 1) + ' kWh');
    CQ.texte('r100', isFinite(r.cout100) ? CQ.euros(r.cout100) : '–');
    CQ.texte('rKm', isFinite(r.km) ? '≈ ' + CQ.entier(r.km) + ' km' : '–');
    CQ.texte('phrase', CQ.souple(r.reseau, 1) + ' kWh payés à ' + CQ.souple(o.prix, 4) + ' € : ' + CQ.euros(r.cout) + ' pour cette recharge' +
      (isFinite(r.cout100) ? ', soit ' + CQ.euros(r.cout100) + ' aux 100 km.' : '.'));
    CQ.lignes('tabP', PRIX.map(function (p) {
      var x = AU.coutRecharge({ capacite: o.capacite, depart: o.depart, arrivee: o.arrivee, prix: p, pertes: o.pertes, conso: o.conso });
      return { cellules: [CQ.euros(p), x ? CQ.euros(x.cout) : '–', x && isFinite(x.cout100) ? CQ.euros(x.cout100) : '–'], nombres: [0, 1, 2],
        classe: Math.abs(p - o.prix) < 1e-9 ? 'meilleur' : '' };
    }));
  }
  CQ.initPartage(recalcul);
  CQ.surChangement(['capacite', 'depart', 'arrivee', 'prix', 'pertes', 'conso'], recalcul);
}());
