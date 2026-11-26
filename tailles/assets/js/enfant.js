/* Taille de vêtement enfant : âge ou stature -> taille (cm). Seul l'âge peut se retrouver dans l'adresse. */
(function () {
  'use strict';
  var CQ = window.CQ, TL = window.TL;
  function recalcul() {
    var mois = Number(CQ.valeur('age')), r = TL.vetementEnfantDepuisAge(mois);
    if (r) {
      CQ.texte('rTaille', String(r.taille));
      CQ.texte('rPlage', r.plage + ' cm');
      CQ.texte('phrase', r.age + ' : taille ' + r.taille + ' en repère (stature de ' + r.plage + ' cm). La hauteur de l’enfant décide, pas l’âge.');
      CQ.surligner('tabE', function (tr) { return Number(tr.getAttribute('data-t')) === r.taille; });
    }
    var s = CQ.nombre('stature', 0, 300), t = isFinite(s) ? TL.vetementEnfantDepuisStature(s) : null;
    if (t) {
      var L = TL.D.enfant_vetement, i = L.indexOf(t), suite = L[i + 1];
      CQ.texte('rTaille2', String(t.taille));
      CQ.texte('rSuite', suite ? String(suite.taille) : '–');
      CQ.surligner('tabE', function (tr) { return Number(tr.getAttribute('data-t')) === t.taille; });
    } else { CQ.texte('rTaille2', '–'); CQ.texte('rSuite', '–'); }
  }
  CQ.initPartage(recalcul);
  CQ.surChangement(['age', 'stature'], recalcul);
}());
