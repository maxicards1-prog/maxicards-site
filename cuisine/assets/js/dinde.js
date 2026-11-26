/* Temps de cuisson de la dinde (tableau USDA/FSIS converti en kg), température à cœur, repos. */
(function () {
  'use strict';
  var CQ = window.CQ, CU = window.CU;
  function plage(a, b) { return b < 60 ? a + ' à ' + b + ' min' : CQ.hm(a) + ' à ' + CQ.hm(b); }
  function recalcul() {
    var kg = CQ.nombre('kg', 1, 15), farcie = CQ.coche('farcie'), service = CQ.minutes(CQ.valeur('service'));
    var ids = ['rTemps', 'rFour', 'rCoeur', 'rRepos', 'rEnfourner'];
    if (!isFinite(kg) || kg <= 0) { ids.forEach(function (i) { CQ.texte(i, '–'); }); CQ.texte('phrase', ''); return; }
    var r = CU.dinde(kg, farcie), d = CU.D.dinde;
    CQ.texte('rTemps', plage(r.lo, r.hi));
    CQ.texte('rFour', d.four_c + ' °C (th. 5,5)');
    CQ.texte('rCoeur', d.coeur_c + ' °C');
    CQ.texte('rRepos', d.repos[0] + ' à ' + d.repos[1] + ' min');
    if (isFinite(service)) {
      var debut = service - d.repos[0] - r.hi;
      CQ.texte('rEnfourner', CU.heure(debut));
    } else { CQ.texte('rEnfourner', 'Indiquez l\'heure du repas'); }
    var msg = 'Dinde de ' + CQ.souple(kg, 2) + ' kg' + (farcie ? ' farcie' : ' non farcie') + ', décongelée, au four à environ ' + d.four_c + ' °C : comptez ' + plage(r.lo, r.hi) + '. ';
    if (!r.dansTable) { msg += 'Ce poids sort du tableau officiel (3,6 à 10,9 kg) : le temps est une estimation, fiez-vous à la sonde. '; }
    msg += 'La vraie référence : au moins ' + d.coeur_c + ' °C à cœur, mesurés dans la partie la plus épaisse de la cuisse (sans toucher l\'os).';
    CQ.texte('phrase', msg);
  }
  CQ.surChangement(['kg', 'farcie', 'service'], recalcul);
  CQ.initPartage(recalcul);
}());
