/* Marge commerciale : taux de marge (sur le coût d'achat HT), taux de marque (sur le prix de vente HT), coefficient. */
(function () {
  'use strict';
  var CQ = window.CQ;
  var LIBELLES = { prix: 'Prix de vente HT (€)', marque: 'Taux de marque voulu (%)', marge: 'Taux de marge voulu (%)', coef: 'Coefficient multiplicateur' };
  function recalcul() {
    var mode = CQ.valeur('mode'), achat = CQ.nombre('achat', 0, 1e9), x = CQ.nombre('valeur'), tva = CQ.nombre('tva', 0, 100);
    var lab = document.querySelector('label[for="valeur"]');
    if (lab) { lab.textContent = LIBELLES[mode] || LIBELLES.prix; }
    var vente = NaN;
    if (isFinite(achat) && isFinite(x)) {
      if (mode === 'marque') { vente = x < 100 ? achat / (1 - x / 100) : NaN; }
      else if (mode === 'marge') { vente = achat * (1 + x / 100); }
      else if (mode === 'coef') { vente = achat * x; }
      else { vente = x; }
    }
    if (!isFinite(vente) || !(achat > 0) || !(vente > 0)) {
      ['rVente', 'rMarge', 'rTauxMarge', 'rTauxMarque', 'rCoef', 'rTTC'].forEach(function (i) { CQ.texte(i, '–'); });
      CQ.texte('phrase', mode === 'marque' && x >= 100 ? 'Un taux de marque est toujours inférieur à 100 %.' : ''); return;
    }
    var marge = vente - achat;
    CQ.texte('rVente', CQ.euros(vente));
    CQ.texte('rMarge', CQ.euros(marge));
    CQ.texte('rTauxMarge', CQ.pourcent(marge / achat * 100));
    CQ.texte('rTauxMarque', CQ.pourcent(marge / vente * 100));
    CQ.texte('rCoef', CQ.souple(vente / achat, 4));
    CQ.texte('rTTC', isFinite(tva) ? CQ.euros(vente * (1 + tva / 100)) : '–');
    CQ.texte('phrase', 'Marge = ' + CQ.euros(vente) + ' − ' + CQ.euros(achat) + ' = ' + CQ.euros(marge) + ' ; taux de marge = marge ÷ achat ; taux de marque = marge ÷ vente.');
  }
  CQ.surChangement(['mode', 'achat', 'valeur', 'tva'], recalcul);
  CQ.initPartage(recalcul);
}());
