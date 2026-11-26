/* Taille de chemise : tour de cou -> col, lettre, pouces. Rien n'est écrit dans l'adresse. */
(function () {
  'use strict';
  var CQ = window.CQ, TL = window.TL;
  function recalcul() {
    var v = CQ.nombre('cou', 0, 200), r = isFinite(v) ? TL.chemiseDepuisCou(v) : null;
    if (!r) {
      ['rCm', 'rLet', 'rPo'].forEach(function (id) { CQ.texte(id, '–'); });
      CQ.texte('phrase', isFinite(v) ? 'Tour de cou hors de la plage prévue (30 à 52 cm).' : '');
      CQ.surligner('tabC', function () { return false; });
      return;
    }
    // si le cou dépasse une taille, on conseille la taille du dessus (une chemise boutonnée serre)
    var suivant = TL.D.chemise.filter(function (x) { return x.cm >= v - 0.001; })[0] || r;
    CQ.texte('rCm', String(suivant.cm));
    CQ.texte('rLet', suivant.lettre);
    CQ.texte('rPo', suivant.pouces + ' in');
    CQ.texte('phrase', 'Tour de cou de ' + CQ.souple(v, 1) + ' cm : col ' + suivant.cm + ' (arrondi au-dessus), soit ' + suivant.lettre + ' ou ' + suivant.pouces + ' pouces.');
    CQ.surligner('tabC', function (tr) { return Number(tr.getAttribute('data-c')) === suivant.cm; });
  }
  CQ.surChangement(['cou'], recalcul);
  recalcul();
}());
