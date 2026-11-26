/* Taille de bague : tour de doigt, diamètre, taille française, US, UK. Rien n'est écrit dans l'adresse. */
(function () {
  'use strict';
  var CQ = window.CQ, TL = window.TL;
  function recalcul() {
    var v = CQ.nombre('val', 0, 100), b = isFinite(v) ? TL.bagueDepuis(CQ.valeur('de'), v) : null;
    if (!b) {
      ['rFR', 'rCirc', 'rDiam', 'rUS', 'rUK'].forEach(function (id) { CQ.texte(id, '–'); });
      CQ.texte('phrase', isFinite(v) ? 'Valeur hors de la plage prévue (tour de doigt de 40 à 76 mm).' : '');
      CQ.surligner('tabB', function () { return false; });
      return;
    }
    CQ.texte('rFR', String(b.fr));
    CQ.texte('rCirc', CQ.souple(b.circ, 1) + ' mm');
    CQ.texte('rDiam', CQ.souple(b.diam, 1) + ' mm');
    CQ.texte('rUS', CQ.souple(b.us, 1));
    CQ.texte('rUK', b.uk || '–');
    CQ.texte('phrase', 'Un tour de doigt de ' + CQ.souple(b.circ, 1) + ' mm correspond à la taille ' + b.fr + ' en France. Entre deux tailles, prenez la plus grande.');
    CQ.surligner('tabB', function (tr) { return Number(tr.getAttribute('data-c')) === b.fr; });
  }
  CQ.surChangement(['de', 'val'], recalcul);
  recalcul();
}());
