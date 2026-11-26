/* Pointure bébé et enfant : par âge (repères) et par longueur du pied. Seul l'âge peut se retrouver dans l'adresse. */
(function () {
  'use strict';
  var CQ = window.CQ, TL = window.TL, D = window.TL_DATA;
  function recalcul() {
    var i = Number(CQ.valeur('age')), x = D.enfant_pointure[i];
    if (x) {
      var pmin = TL.piedDepuisEU(x.min), pmax = TL.piedDepuisEU(x.max);
      CQ.texte('rPt', x.min === x.max ? String(x.min) : x.min + ' à ' + x.max);
      CQ.texte('rPiedAge', x.min === x.max ? CQ.souple(pmin, 1) + ' cm' : CQ.souple(pmin, 1) + ' à ' + CQ.souple(pmax, 1) + ' cm');
      CQ.texte('phrase', x.age + ' : pointure ' + (x.min === x.max ? x.min : x.min + ' à ' + x.max) + ', en repère. Un enfant a le pied de son rythme : mesurez-le.');
    }
    var pied = CQ.nombre('pied', 0, 100), p = isFinite(pied) ? TL.pointureEnfantDepuisPied(pied) : null;
    if (p) {
      CQ.texte('rPt2', CQ.souple(p.proche, 1));
      CQ.texte('rUKE', CQ.souple(p.ukE, 1));
      CQ.texte('rUSE', CQ.souple(p.usE, 1));
    } else { ['rPt2', 'rUKE', 'rUSE'].forEach(function (id) { CQ.texte(id, '–'); }); }
  }
  // seul « age » est partagé : le champ du pied n'a pas data-p
  CQ.initPartage(recalcul);
  CQ.surChangement(['age', 'pied'], recalcul);
}());
