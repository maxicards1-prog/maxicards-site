/* IMC adulte = poids (kg) ÷ taille (m)². Classes : ameli.fr (23/01/2026) et OMS. */
(function () {
  'use strict';
  var CQ = window.CQ;
  function classe(i) {
    if (i < 18.5) { return 'en dessous de la corpulence normale (maigreur)'; }
    if (i < 25) { return 'corpulence normale'; }
    if (i < 30) { return 'surpoids'; }
    if (i < 35) { return 'obésité de classe I (modérée)'; }
    if (i < 40) { return 'obésité de classe II (sévère)'; }
    return 'obésité de classe III (morbide)';
  }
  function recalcul() {
    var p = CQ.nombre('poids', 1, 500), t = CQ.nombre('taille', 50, 260);
    if (!isFinite(p) || !isFinite(t)) { ['rImc', 'rClasse', 'rPlage'].forEach(function (i) { CQ.texte(i, '–'); }); CQ.texte('phrase', ''); return; }
    var m = t / 100, imc = p / (m * m);
    CQ.texte('rImc', CQ.souple(imc, 1));
    CQ.texte('rClasse', classe(imc));
    CQ.texte('rPlage', CQ.souple(18.5 * m * m, 1) + ' à moins de ' + CQ.souple(25 * m * m, 1) + ' kg');
    CQ.texte('phrase', CQ.souple(p, 1) + ' kg ÷ (' + CQ.souple(m, 2) + ' m × ' + CQ.souple(m, 2) + ' m) = ' + CQ.souple(imc, 2) +
      '. Indicateur pour les adultes seulement ; il ne remplace pas l\'avis d\'un médecin.');
  }
  CQ.surChangement(['poids', 'taille'], recalcul);
  CQ.initPartage(recalcul);
}());
