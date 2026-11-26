/* Minecraft : objets en piles (stacks), coffres et shulkers, ou total d'objets. */
(function () {
  'use strict';
  var CQ = window.CQ, GL = window.GL;
  function recalcul() {
    var mode = CQ.valeur('mode'), pile = Number(CQ.valeur('pile'));
    document.getElementById('blocDecomp').hidden = mode !== 'decomp';
    document.getElementById('blocTotal').hidden = mode !== 'total';
    document.getElementById('resDecomp').hidden = mode !== 'decomp';
    document.getElementById('resTotal').hidden = mode !== 'total';
    if (mode === 'total') {
      var sh = CQ.nombre('shulkers', 0, 1000000), pi = CQ.nombre('piles', 0, 1000000), ob = CQ.nombre('objets', 0, 1000000);
      var t = GL.total(sh, pi, ob, pile);
      if (!isFinite(t) || (!isFinite(sh) && !isFinite(pi) && !isFinite(ob))) {
        CQ.texte('rTotal', '–'); CQ.texte('rTotPiles', '–'); CQ.texte('phrase', 'Tapez au moins un nombre.'); return;
      }
      var d = GL.stacks(t, pile);
      CQ.texte('rTotal', CQ.entier(t));
      CQ.texte('rTotPiles', CQ.entier(d.piles) + (d.reste ? ' + ' + CQ.entier(d.reste) : ''));
      CQ.texte('phrase', 'Total = shulkers × 27 × ' + pile + ' + piles × ' + pile + ' + objets = ' + CQ.entier(t) + '.');
      return;
    }
    var r = GL.stacks(CQ.nombre('n', 0, 1000000000), pile);
    if (!r) {
      ['rPiles', 'rCases', 'rShulkers', 'rDoubles'].forEach(function (k) { CQ.texte(k, '–'); });
      CQ.texte('phrase', 'Tapez un nombre d\'objets.');
      return;
    }
    CQ.texte('rPiles', CQ.entier(r.piles) + (r.reste ? ' + ' + CQ.entier(r.reste) : ''));
    CQ.texte('rCases', CQ.entier(r.cases));
    CQ.texte('rShulkers', CQ.entier(r.shulkers));
    CQ.texte('rDoubles', CQ.entier(r.doubles));
    CQ.texte('phrase', CQ.entier(r.objets) + ' ÷ ' + pile + ' = ' + CQ.entier(r.piles) + ' pile(s) pleine(s)' +
      (r.reste ? ' et ' + CQ.entier(r.reste) + ' objet(s) en plus' : '') + ', soit ' + CQ.entier(r.cases) +
      ' case(s). Une shulker pleine contient ' + CQ.entier(r.parShulker) + ' objets, un grand coffre ' + CQ.entier(r.parDouble) + '.');
  }
  CQ.surChangement(['mode', 'pile', 'n', 'shulkers', 'piles', 'objets'], recalcul);
  CQ.initPartage(recalcul);
}());
