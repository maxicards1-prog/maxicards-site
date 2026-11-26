/* Volailles de fête : temps par kilo, température à cœur, repos. */
(function () {
  'use strict';
  var CQ = window.CQ, CU = window.CU;
  function plage(a, b) { return b < 60 ? a + ' à ' + b + ' min' : CQ.hm(a) + ' à ' + CQ.hm(b); }
  function recalcul() {
    var id = CQ.valeur('vol'), kg = CQ.nombre('kg', 0.3, 15), farcie = CQ.coche('farcie');
    var ids = ['rTemps', 'rFour', 'rCoeur', 'rRepos'];
    if (!isFinite(kg) || kg <= 0) { ids.forEach(function (i) { CQ.texte(i, '–'); }); CQ.texte('phrase', ''); return; }
    var r = CU.volaille(id, kg, farcie), v = r.v;
    CQ.texte('rTemps', plage(r.lo, r.hi));
    CQ.texte('rFour', v.four + ' °C (th. ' + CQ.souple(v.four / 30, 1) + ')');
    CQ.texte('rCoeur', v.coeur + ' °C');
    CQ.texte('rRepos', v.repos[0] + ' à ' + v.repos[1] + ' min');
    var msg = v.nom + ' de ' + CQ.souple(kg, 2) + ' kg' + (farcie ? ' farci' : '') + ' : ' + v.mkg[0] + ' à ' + v.mkg[1] + ' min par kilo' + (farcie ? ', plus ' + v.farci_plus + ' min pour la farce' : '') + '.';
    if (r.horsPlage) { msg += ' Ce poids est inhabituel pour cette volaille : le temps est une estimation.'; }
    msg += ' Piquez la peau du canard et de l\'oie pour laisser fondre la graisse. La cuisson est atteinte quand la cuisse affiche au moins ' + v.coeur + ' °C à cœur.';
    CQ.texte('phrase', msg);
  }
  CQ.surChangement(['vol', 'kg', 'farcie'], recalcul);
  CQ.initPartage(recalcul);
}());
