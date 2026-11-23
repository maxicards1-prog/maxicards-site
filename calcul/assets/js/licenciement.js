/* Indemnité légale de licenciement : 1/4 de mois par année jusqu'à 10 ans, 1/3 au-delà ;
   salaire de référence = le plus favorable entre la moyenne des 12 et des 3 derniers mois (service-public F987). */
(function () {
  'use strict';
  var CQ = window.CQ;
  function recalcul() {
    var s12 = CQ.nombre('s12', 0, 1e7), s3 = CQ.nombre('s3', 0, 1e7);
    var an = CQ.nombre('annees', 0, 60), mo = CQ.nombre('mois', 0, 11);
    if (!isFinite(an)) { an = 0; }
    if (!isFinite(mo)) { mo = 0; }
    an = Math.floor(an); mo = Math.floor(mo);
    var ref = Math.max(isFinite(s12) ? s12 : 0, isFinite(s3) ? s3 : 0);
    var anc = an + mo / 12;
    CQ.texte('rRef', ref > 0 ? CQ.euros(ref) : '–');
    CQ.texte('rAnc', an + ' an' + (an >= 2 ? 's' : '') + ' et ' + mo + ' mois');
    if (ref <= 0) { CQ.texte('rInd', '–'); CQ.texte('phrase', 'Indiquez le salaire brut moyen.'); return; }
    if (anc < 8 / 12) {
      CQ.texte('rInd', '0,00 €');
      CQ.texte('phrase', 'Moins de 8 mois d\'ancienneté ininterrompue : pas d\'indemnité légale (sauf règle plus favorable de la convention ou du contrat).');
      return;
    }
    var part1 = Math.min(anc, 10) / 4, part2 = Math.max(anc - 10, 0) / 3;
    var ind = ref * (part1 + part2);
    CQ.texte('rInd', CQ.euros(ind));
    CQ.texte('phrase', CQ.euros(ref) + ' × (' + CQ.souple(Math.min(anc, 10), 3) + ' ÷ 4' +
      (part2 > 0 ? ' + ' + CQ.souple(anc - 10, 3) + ' ÷ 3' : '') + ') = ' + CQ.euros(ind) +
      ' brut au minimum. Votre convention collective peut prévoir davantage.');
  }
  CQ.surChangement(['s12', 's3', 'annees', 'mois'], recalcul);
  CQ.initPartage(recalcul);
}());
