/* Pâtes, riz, semoule, quinoa : quantité par personne, eau, temps. */
(function () {
  'use strict';
  var CQ = window.CQ, CU = window.CU;
  function recalcul() {
    var n = CQ.nombre('n', 1, 200), id = CQ.valeur('type'), role = CQ.valeur('role');
    var ids = ['rG', 'rEau', 'rTemps', 'rSel'];
    if (!isFinite(n) || n <= 0) { ids.forEach(function (i) { CQ.texte(i, '–'); }); CQ.texte('phrase', ''); return; }
    var r = CU.feculent(id, n, role), f = r.f;
    CQ.texte('rG', CQ.souple(r.g, 0) + ' g');
    if (f.mode === 'eau') {
      CQ.texte('rEau', CQ.souple(r.eauL, 1) + ' L (grande casserole)');
      CQ.texte('rSel', 'environ ' + CQ.souple(r.selG, 0) + ' g de gros sel');
    } else {
      CQ.texte('rEau', CQ.souple(Math.round(r.eauMl / 10) * 10, 0) + ' ml');
      CQ.texte('rSel', 'une pincée');
    }
    CQ.texte('rTemps', f.temps[0] === f.temps[1] ? f.temps[0] + ' min' : f.temps[0] + ' à ' + f.temps[1] + ' min');
    var msg = f.nom + ' : ' + f.pers[0] + ' g crus par personne en plat principal, ' + f.pers[1] + ' g en accompagnement.';
    msg += f.mode === 'eau' ? ' Eau bouillante salée, puis égouttez dès que les pâtes sont al dente.'
      : ' Cuisson à couvert : l\'eau est absorbée (' + CQ.souple(f.vol, 1) + ' volume d\'eau pour 1 volume de grains). Suivez aussi l\'emballage.';
    CQ.texte('phrase', msg);
  }
  CQ.surChangement(['n', 'type', 'role'], recalcul);
  CQ.initPartage(recalcul);
}());
