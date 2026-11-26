/* Changer la taille du moule : coefficient de surface et temps de cuisson indicatif. */
(function () {
  'use strict';
  var CQ = window.CQ, CU = window.CU;
  function dims(p) {
    var f = CQ.valeur('forme' + p), a = CQ.nombre('a' + p, 1, 200), b = CQ.nombre('b' + p, 1, 200);
    document.getElementById('bloc-b' + p).hidden = f !== 'rect';
    document.getElementById('lab-a' + p).textContent = f === 'rond' ? 'Diamètre (cm)' : (f === 'carre' ? 'Côté (cm)' : 'Largeur (cm)');
    if (f !== 'rect') { b = 1; }
    return { f: f, a: a, b: b, s: isFinite(a) && isFinite(b) ? CU.surface(f, a, b) : NaN };
  }
  function recalcul() {
    var m1 = dims(1), m2 = dims(2), t = CQ.nombre('t', 1, 600);
    if (!isFinite(m1.s) || !isFinite(m2.s)) { ['rCoef', 'rTemps', 'rS1', 'rS2'].forEach(function (i) { CQ.texte(i, '–'); }); CQ.texte('phrase', ''); return; }
    var r = CU.moule(m1.s, m2.s, isFinite(t) ? t : 0);
    CQ.texte('rCoef', '× ' + CQ.souple(r.ratio, 2));
    CQ.texte('rS1', CQ.souple(m1.s, 0) + ' cm²');
    CQ.texte('rS2', CQ.souple(m2.s, 0) + ' cm²');
    CQ.texte('rTemps', isFinite(t) ? '≈ ' + CQ.souple(r.temps, 0) + ' min' : '–');
    var conseil;
    if (Math.abs(r.ratio - 1) < 0.08) { conseil = 'Les deux moules ont presque la même surface : gardez la même recette et le même temps.'; }
    else if (r.ratio > 1) { conseil = 'Le moule est plus grand : multipliez les quantités par ' + CQ.souple(r.ratio, 2) + ' pour garder la même épaisseur. Sans changer les quantités, la pâte sera plus fine : elle cuit plus vite, surveillez dès les trois quarts du temps.'; }
    else { conseil = 'Le moule est plus petit : multipliez les quantités par ' + CQ.souple(r.ratio, 2) + ' pour garder la même épaisseur. Sans changer les quantités, la pâte sera plus épaisse : elle cuit plus longtemps et peut brunir avant d\'être cuite au centre (baissez le four de 10 à 20 °C).'; }
    CQ.texte('phrase', conseil + ' Vérifiez avec la pointe d\'un couteau.');
  }
  CQ.surChangement(['forme1', 'a1', 'b1', 'forme2', 'a2', 'b2', 't'], recalcul);
  CQ.initPartage(recalcul);
}());
