/* Âge du chat en âge humain : 1 an = 15, 2 ans = 24, puis 4 par an ; étape de vie ; sens inverse. */
(function () {
  'use strict';
  var CQ = window.CQ, CU = window.CU, D = CU.D;
  function arr(v) { return isFinite(v) ? CQ.souple(Math.round(v), 0) : '–'; }
  function recalcul() {
    var ans = CQ.nombre('ans', 0, D.age_max), mois = CQ.nombre('mois', 0, 11);
    if (!isFinite(mois)) { mois = 0; }
    var total = isFinite(ans) ? Math.min(D.age_max, ans + mois / 12) : NaN;
    var h = CU.chatHumain(total);
    CQ.texte('rHumain', isFinite(h) ? 'environ ' + arr(h) + ' ans' : '–');
    CQ.texte('rEtape', isFinite(total) ? CU.chatEtape(Math.round(total * 12)) : '–');
    CQ.texte('phrase', isFinite(h) ? 'Un chat de ' + CQ.souple(total, 1) + ' an(s) correspond, selon le repère usuel, à environ ' + arr(h) + ' ans chez l\'humain.' : '');
    var lignes = [];
    for (var y = 1; y <= 25; y++) {
      lignes.push({ cellules: [String(y), arr(CU.chatHumain(y)) + ' ans'], nombres: [1],
        classe: isFinite(total) && Math.max(1, Math.min(25, Math.round(total))) === y ? 'meilleur' : '' });
    }
    CQ.lignes('tabAge', lignes);
    var inv = CU.chatDepuisHumain(CQ.nombre('humain', 0, 400));
    CQ.texte('rInverse', isFinite(inv) ? 'environ ' + CQ.souple(inv, 1) + ' an(s)' : '–');
  }
  CQ.surChangement(['ans', 'mois', 'humain'], recalcul);
  CQ.initPartage(recalcul);
}());
