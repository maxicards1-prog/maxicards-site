/* Heures supplémentaires : majorations (25 % puis 50 % par défaut, Code du travail), montant brut et net estimé. */
(function () {
  'use strict';
  var CQ = window.CQ;
  // Sur les heures sup, la réduction de cotisations (jusqu'à 11,31 %) laisse surtout la CSG et la CRDS :
  // 9,7 % sur 98,25 % du montant (estimation, détail sur la page).
  var CSG_CRDS = 0.097 * 0.9825;
  function recalcul() {
    var taux = CQ.nombre('taux', 0, 10000);
    var heures = CQ.nombre('heures', 0, 100);
    var ref = CQ.nombre('reference', 1, 80);
    if (!isFinite(ref)) { ref = 35; }
    var seuil = CQ.nombre('seuil', 0, 40);
    if (!isFinite(seuil)) { seuil = 8; }
    var m1 = CQ.nombre('maj1', 0, 300), m2 = CQ.nombre('maj2', 0, 300);
    if (!isFinite(m1)) { m1 = 25; }
    if (!isFinite(m2)) { m2 = 50; }
    var semaines = CQ.nombre('semaines', 0, 60);
    if (!isFinite(semaines)) { semaines = 1; }
    if (!isFinite(heures)) {
      ['rHS', 'rH1', 'rH2', 'rBrut', 'rNet', 'rMois'].forEach(function (id) { CQ.texte(id, '–'); });
      CQ.texte('phrase', '');
      return;
    }
    var hs = Math.max(0, heures - ref);
    var h1 = Math.min(hs, seuil), h2 = Math.max(0, hs - seuil);
    CQ.texte('rHS', CQ.souple(hs, 2) + ' h');
    CQ.texte('rH1', CQ.souple(h1, 2) + ' h à +' + CQ.souple(m1, 2) + ' %');
    CQ.texte('rH2', CQ.souple(h2, 2) + ' h à +' + CQ.souple(m2, 2) + ' %');
    if (!isFinite(taux)) { ['rBrut', 'rNet', 'rMois'].forEach(function (id) { CQ.texte(id, '–'); }); CQ.texte('phrase', 'Indiquez votre taux horaire brut pour voir le montant.'); return; }
    var brut = h1 * taux * (1 + m1 / 100) + h2 * taux * (1 + m2 / 100);
    var net = brut * (1 - CSG_CRDS);
    CQ.texte('rBrut', CQ.euros(brut));
    CQ.texte('rNet', CQ.euros(net));
    CQ.texte('rMois', CQ.euros(brut * semaines));
    CQ.texte('phrase', CQ.souple(h1, 2) + ' h × ' + CQ.euros(taux) + ' × ' + CQ.souple(1 + m1 / 100, 4) +
      (h2 > 0 ? ' + ' + CQ.souple(h2, 2) + ' h × ' + CQ.euros(taux) + ' × ' + CQ.souple(1 + m2 / 100, 4) : '') + ' = ' + CQ.euros(brut) + ' brut pour la semaine.');
  }
  CQ.surChangement(['taux', 'heures', 'reference', 'seuil', 'maj1', 'maj2', 'semaines'], recalcul);
  CQ.initPartage(recalcul);
}());
