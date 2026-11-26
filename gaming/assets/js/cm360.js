/* Calcul du cm/360 : distance de souris pour un tour complet, ou sensibilité pour une distance voulue. */
(function () {
  'use strict';
  var CQ = window.CQ, GL = window.GL;
  function vide(msg) {
    ['rRes', 'rPouces', 'rDemi', 'rEdpi'].forEach(function (id) { CQ.texte(id, '–'); });
    CQ.texte('phrase', msg);
  }
  function recalcul() {
    var mode = CQ.valeur('mode'), id = CQ.valeur('jeu'), j = GL.jeu(id);
    var dpi = CQ.nombre('dpi', 1, 100000);
    document.getElementById('blocSens').hidden = mode !== 'sens';
    document.getElementById('blocCm').hidden = mode !== 'cm';
    if (!j || !isFinite(dpi)) { vide('Tapez le DPI de votre souris (souvent 400, 800 ou 1600).'); return; }
    var sens, cm;
    if (mode === 'cm') {
      cm = CQ.nombre('cm', 0.1, 100000);
      if (CQ.valeur('unite') === 'po') { cm = cm * 2.54; }
      sens = GL.sensPourCm(id, cm, dpi);
      if (!isFinite(sens)) { vide('Tapez la distance voulue pour un tour complet.'); return; }
      var arr = GL.arrondi(id, sens);
      CQ.texte('lRes', 'sensibilité à régler dans ' + j.court);
      CQ.texte('rRes', j.entier ? String(arr) : CQ.souple(sens, 3) + (j.unite || ''));
      CQ.texte('phrase', 'Sensibilité = 360 × 2,54 ÷ (' + CQ.souple(cm, 2) + ' cm × ' + CQ.souple(dpi, 0) + ' DPI × ' +
        CQ.souple(j.yaw, 8) + ') = ' + CQ.souple(sens, 4) + (j.entier ? ' ; ' + j.court + ' n\'accepte que des entiers : ' + arr + '.' : '.'));
    } else {
      sens = CQ.nombre('sens', 0.0001, 100000);
      cm = GL.cm360(id, sens, dpi);
      if (!isFinite(cm)) { vide('Tapez votre sensibilité dans le jeu.'); return; }
      CQ.texte('lRes', 'cm pour un tour complet (360°)');
      CQ.texte('rRes', CQ.decimal(cm, 1) + ' cm');
      CQ.texte('phrase', 'cm/360 = 360 ÷ (' + CQ.souple(dpi, 0) + ' DPI × ' + CQ.souple(sens, 4) + ' × ' + CQ.souple(j.yaw, 8) +
        ') × 2,54 = ' + CQ.decimal(cm, 2) + ' cm.');
    }
    CQ.texte('rPouces', CQ.decimal(cm / 2.54, 2) + ' po');
    CQ.texte('rDemi', CQ.decimal(cm / 2, 1) + ' cm');
    CQ.texte('rEdpi', CQ.souple(GL.edpi(dpi, sens), 1));
  }
  CQ.surChangement(['mode', 'jeu', 'dpi', 'sens', 'cm', 'unite'], recalcul);
  CQ.initPartage(recalcul);
}());
