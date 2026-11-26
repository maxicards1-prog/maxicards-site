/* Convertisseur de sensibilité entre jeux : même rotation pour le même geste de la souris. */
(function () {
  'use strict';
  var CQ = window.CQ, GL = window.GL;
  function txtSens(id, v) {
    var j = GL.jeu(id);
    return CQ.souple(v, 3) + (j && j.unite ? j.unite : '');
  }
  function recalcul() {
    var de = CQ.valeur('de'), vers = CQ.valeur('vers');
    var sens = CQ.nombre('sens', 0.0001, 100000), dpi = CQ.nombre('dpi', 1, 100000);
    var res = GL.convertir(de, vers, sens);
    var jd = GL.jeu(de), jv = GL.jeu(vers);
    if (!isFinite(res) || !jd || !jv) {
      ['rSens', 'rCm', 'rPouces', 'rEdpiDe', 'rEdpiVers', 'rRapport'].forEach(function (id) { CQ.texte(id, '–'); });
      CQ.texte('phrase', 'Tapez une sensibilité supérieure à 0.');
      CQ.lignes('tous', []);
      return;
    }
    var arr = GL.arrondi(vers, res);
    CQ.texte('rSens', jv.entier ? String(arr) : txtSens(vers, res));
    CQ.texte('rRapport', '× ' + CQ.souple(GL.rapport(de, vers), 4));
    CQ.texte('lSens', 'sensibilité à régler dans ' + jv.court);
    if (isFinite(dpi)) {
      CQ.texte('rCm', CQ.decimal(GL.cm360(de, sens, dpi), 1) + ' cm');
      CQ.texte('rPouces', CQ.decimal(GL.pouces360(de, sens, dpi), 2) + ' po');
      CQ.texte('rEdpiDe', CQ.souple(GL.edpi(dpi, sens), 1));
      CQ.texte('rEdpiVers', CQ.souple(GL.edpi(dpi, res), 1));
    } else {
      ['rCm', 'rPouces', 'rEdpiDe', 'rEdpiVers'].forEach(function (id) { CQ.texte(id, '–'); });
    }
    var phrase = txtSens(de, sens) + ' dans ' + jd.court + ' = ' + txtSens(vers, res) + ' dans ' + jv.court +
      ' (' + CQ.souple(sens, 4) + ' × ' + CQ.souple(jd.yaw, 8) + ' ÷ ' + CQ.souple(jv.yaw, 8) + ').';
    if (jv.entier && Math.abs(arr - res) > 1e-9) {
      phrase += ' ' + jv.court + ' n\'accepte que des nombres entiers : réglez ' + arr + ' (écart ' +
        CQ.decimal(Math.abs(GL.cm360(vers, arr, dpi) - GL.cm360(vers, res, dpi)), 1) + ' cm sur un tour).';
    }
    if (de === vers) { phrase = 'Même jeu au départ et à l\'arrivée : la sensibilité ne change pas.'; }
    CQ.texte('phrase', phrase);
    CQ.lignes('tous', GL.JEUX.map(function (j) {
      var s = GL.convertir(de, j.id, sens);
      return { cellules: [j.nom, j.entier ? String(GL.arrondi(j.id, s)) + ' (exact : ' + CQ.souple(s, 2) + ')' : txtSens(j.id, s)],
        nombres: [1], classe: j.id === vers ? 'ligne-forte' : '' };
    }));
  }
  var bouton = document.getElementById('inverser');
  if (bouton) {
    bouton.addEventListener('click', function () {
      var a = document.getElementById('de'), b = document.getElementById('vers'), s = document.getElementById('sens');
      var res = GL.convertir(a.value, b.value, CQ.nombre('sens', 0.0001, 100000));
      var t = a.value; a.value = b.value; b.value = t;
      if (isFinite(res)) { s.value = CQ.souple(res, 3).replace(/\s/g, ''); }
      s.dispatchEvent(new Event('input'));
      recalcul();
    });
  }
  CQ.surChangement(['de', 'vers', 'sens', 'dpi'], recalcul);
  CQ.initPartage(recalcul);
}());
