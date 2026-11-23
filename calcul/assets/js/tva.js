/* Calcul de TVA : HT -> TTC, TTC -> HT, montant de TVA -> HT et TTC. */
(function () {
  'use strict';
  var CQ = window.CQ;
  function recalcul() {
    var m = CQ.nombre('montant', 0, 1e12);
    var sens = CQ.valeur('sens');
    var tauxChoix = CQ.valeur('taux');
    var taux = tauxChoix === 'autre' ? CQ.nombre('tauxAutre', 0, 100) : Number(tauxChoix);
    CQ.el('blocAutre').hidden = tauxChoix !== 'autre';
    if (!isFinite(m) || !isFinite(taux)) {
      ['rHT', 'rTVA', 'rTTC'].forEach(function (id) { CQ.texte(id, '–'); });
      CQ.texte('phrase', '');
      return;
    }
    var t = taux / 100, ht, tva, ttc, operation;
    if (sens === 'ttc') {
      ttc = m; ht = m / (1 + t); tva = ttc - ht;
      operation = CQ.euros(ttc) + ' ÷ ' + CQ.souple(1 + t, 4) + ' = ' + CQ.euros(ht) + ' HT';
    } else if (sens === 'tva') {
      tva = m;
      if (t === 0) { ['rHT', 'rTVA', 'rTTC'].forEach(function (id) { CQ.texte(id, '–'); }); CQ.texte('phrase', 'Avec un taux de 0 %, le montant de TVA est toujours 0.'); return; }
      ht = m / t; ttc = ht + tva;
      operation = CQ.euros(tva) + ' ÷ ' + CQ.souple(t, 4) + ' = ' + CQ.euros(ht) + ' HT';
    } else {
      ht = m; tva = m * t; ttc = ht + tva;
      operation = CQ.euros(ht) + ' × ' + CQ.souple(1 + t, 4) + ' = ' + CQ.euros(ttc) + ' TTC';
    }
    CQ.texte('rHT', CQ.euros(ht));
    CQ.texte('rTVA', CQ.euros(tva));
    CQ.texte('rTTC', CQ.euros(ttc));
    CQ.texte('phrase', 'Calcul : ' + operation + '. TVA à ' + CQ.souple(taux, 3) + ' % = ' + CQ.euros(tva) + '.');
  }
  CQ.surChangement(['montant', 'sens', 'taux', 'tauxAutre'], recalcul);
  CQ.initPartage(recalcul);
}());
