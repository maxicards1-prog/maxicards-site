/* Minecraft : coordonnées Overworld <-> Nether (X et Z ÷ 8 ou × 8, Y inchangé) et lien entre deux portails. */
(function () {
  'use strict';
  var CQ = window.CQ, GL = window.GL;
  var LIM = 30000000;
  function n(id) { return CQ.nombre(id, -LIM, LIM); }
  function e(v) { return CQ.souple(v, 0); }
  function recalcul() {
    var mode = CQ.valeur('mode');
    var lien = mode === 'lien';
    document.getElementById('blocXYZ').hidden = lien;
    document.getElementById('blocLien').hidden = !lien;
    document.getElementById('resConv').hidden = lien;
    document.getElementById('resLien').hidden = !lien;
    document.getElementById('blocEdition').hidden = !lien;
    if (!lien) {
      var x = n('x'), y = n('y'), z = n('z');
      var r = mode === 'no' ? GL.versOverworld(x, z) : GL.versNether(x, z);
      CQ.texte('lDim', mode === 'no' ? 'coordonnées dans l\'Overworld' : 'coordonnées dans le Nether');
      if (!r) {
        ['rX', 'rY', 'rZ'].forEach(function (k) { CQ.texte(k, '–'); });
        CQ.texte('phrase', 'Tapez X et Z (touche F3 sur Java, « Afficher les coordonnées » sur Bedrock).');
        return;
      }
      CQ.texte('rX', e(r.x));
      CQ.texte('rY', isFinite(y) ? e(y) : '–');
      CQ.texte('rZ', e(r.z));
      if (mode === 'no') {
        CQ.texte('phrase', 'X = ' + e(Math.floor(x)) + ' × 8 = ' + e(r.x) + ' et Z = ' + e(Math.floor(z)) + ' × 8 = ' + e(r.z) +
          '. Un bloc du Nether couvre 8 blocs de l\'Overworld : de ' + e(r.x) + ' à ' + e(r.xMax) + ' en X, de ' + e(r.z) + ' à ' + e(r.zMax) + ' en Z. Y ne change pas.');
      } else {
        CQ.texte('phrase', 'X = ' + CQ.souple(x, 2) + ' ÷ 8 = ' + CQ.souple(x / 8, 3) + ' → ' + e(r.x) + ' et Z = ' + CQ.souple(z, 2) + ' ÷ 8 = ' +
          CQ.souple(z / 8, 3) + ' → ' + e(r.z) + ' (arrondi vers le bas, donc vers −∞ pour les nombres négatifs). Y ne change pas.');
      }
      return;
    }
    var o = { x: n('oX'), y: n('oY'), z: n('oZ') }, p = { x: n('nX'), y: n('nY'), z: n('nZ') };
    var L = GL.lien(o, p, CQ.valeur('edition'));
    if (!L) {
      ['rAller', 'rRetour', 'rIdeal'].forEach(function (k) { CQ.texte(k, '–'); });
      CQ.texte('phrase', 'Tapez les coordonnées X, Y, Z des deux portails.');
      return;
    }
    CQ.texte('rAller', L.aller ? 'Oui' : 'Non');
    CQ.texte('rRetour', L.retour ? 'Oui' : 'Non');
    CQ.texte('rIdeal', e(L.cibleNether.x) + ' / ' + e(L.cibleNether.y) + ' / ' + e(L.cibleNether.z));
    var t = 'Aller : le jeu cherche un portail autour de X ' + CQ.souple(o.x / 8, 2) + ', Z ' + CQ.souple(o.z / 8, 2) +
      ' dans le Nether (±' + L.rayonNether + ' blocs) ; votre portail du Nether est à ' + CQ.souple(L.ecartAller, 1) + ' bloc(s) de ce point. ' +
      'Retour : il cherche autour de X ' + e(L.cibleOverworld.x) + ', Z ' + e(L.cibleOverworld.z) + ' dans l\'Overworld (±' + L.rayonOverworld +
      ' blocs) ; votre portail est à ' + CQ.souple(L.ecartRetour, 1) + ' bloc(s). ';
    t += L.aller && L.retour ? 'Les deux portails se trouvent, si aucun autre portail n\'est plus proche.'
      : 'Pour un lien sûr, construisez le portail du Nether en ' + e(L.cibleNether.x) + ' / ' + e(L.cibleNether.y) + ' / ' + e(L.cibleNether.z) + '.';
    CQ.texte('phrase', t);
  }
  CQ.surChangement(['mode', 'edition', 'x', 'y', 'z', 'oX', 'oY', 'oZ', 'nX', 'nY', 'nZ'], recalcul);
  CQ.initPartage(recalcul);
}());
