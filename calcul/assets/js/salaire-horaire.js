/* Salaire horaire <-> mensuel <-> annuel selon la durée hebdomadaire (mensualisation : h × 52 ÷ 12). */
(function () {
  'use strict';
  var CQ = window.CQ;
  function recalcul() {
    var m = CQ.nombre('montant', 0, 1e8), hs = CQ.nombre('heuresSemaine', 0.5, 80), per = CQ.valeur('periode');
    if (!isFinite(m) || !isFinite(hs)) {
      ['rHeure', 'rSemaine', 'rMois', 'rAn'].forEach(function (i) { CQ.texte(i, '–'); });
      CQ.texte('phrase', '');
      return;
    }
    var hMois = hs * 52 / 12, h;
    if (per === 'heure') { h = m; } else if (per === 'mois') { h = m / hMois; } else if (per === 'semaine') { h = m / hs; } else { h = m / 12 / hMois; }
    CQ.texte('rHeure', CQ.euros(h));
    CQ.texte('rSemaine', CQ.euros(h * hs));
    CQ.texte('rMois', CQ.euros(h * hMois));
    CQ.texte('rAn', CQ.euros(h * hMois * 12));
    CQ.texte('phrase', CQ.souple(hs, 2) + ' h par semaine × 52 semaines ÷ 12 mois = ' + CQ.souple(hMois, 2) +
      ' heures payées par mois ; ' + CQ.euros(h) + ' × ' + CQ.souple(hMois, 2) + ' h = ' + CQ.euros(h * hMois) + ' par mois.');
  }
  CQ.surChangement(['montant', 'heuresSemaine', 'periode'], recalcul);
  CQ.initPartage(recalcul);
}());
