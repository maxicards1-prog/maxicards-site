/* Taille de jean : W/L -> taille française. Le tour de taille n'est ni gardé ni écrit dans l'adresse. */
(function () {
  'use strict';
  var CQ = window.CQ, TL = window.TL, D = window.TL_DATA;
  function liste(homme) { return homme ? D.jean_homme : D.jean_femme; }
  function recalcul() {
    var homme = CQ.valeur('pour') === 'h';
    CQ.options('w', liste(homme).map(function (x) { return [String(x.w), 'W' + x.w]; }));
    CQ.montrer('blocF', !homme); CQ.montrer('blocH', homme); CQ.montrer('chL', homme);
    var w = Number(CQ.valeur('w')), l = Number(CQ.valeur('l'));
    var x = liste(homme).filter(function (y) { return y.w === w; })[0] || liste(homme)[0];
    if (homme) {
      var cm = TL.cmDepuisPouces(x.w), lcm = TL.cmDepuisPouces(l);
      CQ.texte('rFRh', String(x.fr)); CQ.texte('rCm', Math.round(cm) + ' cm'); CQ.texte('rLcm', Math.round(lcm) + ' cm');
      CQ.texte('phrase', 'Jean W' + x.w + ' L' + l + ' : tour de taille d’environ ' + Math.round(cm) + ' cm, entrejambe d’environ ' + Math.round(lcm) + ' cm, taille française ' + x.fr + ' (repère).');
    } else {
      CQ.texte('rFR', String(x.fr)); CQ.texte('rEU', String(x.de)); CQ.texte('rIT', String(x.it));
      CQ.texte('phrase', 'Jean W' + x.w + ' pour femme : ' + x.fr + ' en France, ' + x.de + ' en Allemagne, ' + x.it + ' en Italie.');
    }
    CQ.surligner('tabJF', function (tr) { return !homme && Number(tr.getAttribute('data-w')) === x.w; });
    CQ.surligner('tabJH', function (tr) { return homme && Number(tr.getAttribute('data-w')) === x.w; });
    var t = CQ.nombre('taille', 0, 400), ww = isFinite(t) ? TL.wDepuisTaille(t) : NaN;
    CQ.texte('rW', isFinite(ww) ? 'W' + ww : '–');
  }
  var p = CQ.params();
  if (p.get('pour') === 'h') { document.getElementById('pour').value = 'h'; CQ.options('w', liste(true).map(function (x) { return [String(x.w), 'W' + x.w]; })); }
  CQ.initPartage(recalcul);
  CQ.surChangement(['pour', 'w', 'l', 'taille'], recalcul);
}());
