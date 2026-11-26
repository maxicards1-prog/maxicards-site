/* Convertisseur de pointure : FR/EU, UK, US, pied, Mondopoint, Japon. */
(function () {
  'use strict';
  var CQ = window.CQ, TL = window.TL;
  var PARTAGEABLES = ['eu', 'uk', 'ush', 'usf'];   // jamais une longueur de pied dans l'adresse
  function recalcul() {
    var de = CQ.valeur('de'), v = CQ.nombre('val', 0, 100);
    var eu = isFinite(v) ? TL.versEU(de, v) : NaN;
    if (!isFinite(eu)) {
      ['rEU', 'rUK', 'rUSH', 'rUSF', 'rPied', 'rMondo', 'rJP'].forEach(function (id) { CQ.texte(id, '–'); });
      CQ.texte('phrase', isFinite(v) ? 'Valeur hors de la plage prévue (pointures 33 à 52, adulte). Pour un enfant, voir la page pointure bébé et enfant.' : '');
      CQ.surligner('tab', function () { return false; });
      return;
    }
    var c = TL.chaussure(eu);
    CQ.texte('rEU', CQ.souple(TL.demi(eu), 1));
    CQ.texte('rUK', CQ.souple(c.uk, 1));
    CQ.texte('rUSH', CQ.souple(c.ush, 1));
    CQ.texte('rUSF', CQ.souple(c.usf, 1));
    CQ.texte('rPied', CQ.souple(c.pied, 1) + ' cm');
    CQ.texte('rMondo', CQ.souple(c.mondo, 1));
    CQ.texte('rJP', CQ.souple(c.jp, 1));
    CQ.texte('phrase', 'Pointure ' + CQ.souple(TL.demi(eu), 1) + ' en France : ' + CQ.souple(c.uk, 1) + ' au Royaume-Uni, ' + CQ.souple(c.ush, 1) +
      ' aux États-Unis (homme) et ' + CQ.souple(c.usf, 1) + ' (femme), pour un pied d’environ ' + CQ.souple(c.pied, 1) + ' cm. Repère : l’étiquette de la marque fait foi.');
    var proche = Math.round(eu);
    CQ.surligner('tab', function (tr) { return Number(tr.getAttribute('data-eu')) === proche; });
  }
  var p = CQ.params();
  if (p.has('de') && ['eu', 'uk', 'ush', 'usf', 'pied', 'mondo', 'jp'].indexOf(p.get('de')) !== -1) { document.getElementById('de').value = p.get('de'); }
  if (p.has('val') && PARTAGEABLES.indexOf(p.get('de')) !== -1) { document.getElementById('val').value = String(p.get('val')).slice(0, 8); }
  CQ.brancherLien(function () {
    var de = CQ.valeur('de');
    return PARTAGEABLES.indexOf(de) !== -1 ? { de: de, val: CQ.valeur('val') } : { de: de };
  });
  CQ.surChangement(['de', 'val'], function () { recalcul(); CQ.majLien(); });
  recalcul();
}());
