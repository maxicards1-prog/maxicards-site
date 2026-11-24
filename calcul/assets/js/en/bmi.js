/* Adult BMI = kg ÷ m² = 703 × lbs ÷ in². WHO categories. Metric or imperial units. */
(function () {
  'use strict';
  var CQ = window.CQ;
  function categorie(i) {
    if (i < 18.5) { return 'underweight'; }
    if (i < 25) { return 'healthy weight'; }
    if (i < 30) { return 'overweight'; }
    if (i < 35) { return 'obesity class I'; }
    if (i < 40) { return 'obesity class II'; }
    return 'obesity class III';
  }
  function unites() {
    var imp = CQ.valeur('unite') !== 'metric';
    Array.prototype.forEach.call(document.querySelectorAll('.imp'), function (el) { el.hidden = !imp; });
    Array.prototype.forEach.call(document.querySelectorAll('.met'), function (el) { el.hidden = imp; });
    return imp;
  }
  function vider() {
    ['rImc', 'rClasse', 'rPlage'].forEach(function (i) { CQ.texte(i, '–'); });
    CQ.jauge('jImc', NaN); CQ.texte('phrase', '');
  }
  function recalcul() {
    var imp = unites(), imc, m, detail, plage;
    if (imp) {
      var lb = CQ.nombre('lb', 1, 1100), ft = CQ.nombre('ft', 0, 9), inch = CQ.nombre('in', 0, 120);
      if (!isFinite(inch)) { inch = 0; }
      var tot = (isFinite(ft) ? ft : 0) * 12 + inch;
      if (!isFinite(lb) || tot < 20) { vider(); return; }
      imc = 703 * lb / (tot * tot);
      plage = CQ.souple(18.5 * tot * tot / 703, 0) + ' to ' + CQ.souple(24.9 * tot * tot / 703, 0) + ' lbs';
      detail = '703 × ' + CQ.souple(lb, 1) + ' lbs ÷ (' + CQ.souple(tot, 1) + ' in)² = ' + CQ.souple(imc, 2);
    } else {
      var kg = CQ.nombre('kg', 1, 500), cm = CQ.nombre('cm', 50, 260);
      if (!isFinite(kg) || !isFinite(cm)) { vider(); return; }
      m = cm / 100;
      imc = kg / (m * m);
      plage = CQ.souple(18.5 * m * m, 1) + ' to ' + CQ.souple(24.9 * m * m, 1) + ' kg';
      detail = CQ.souple(kg, 1) + ' kg ÷ (' + CQ.souple(m, 2) + ' m)² = ' + CQ.souple(imc, 2);
    }
    CQ.texte('rImc', CQ.souple(imc, 1));
    CQ.jauge('jImc', (imc - 15) / 25);
    CQ.texte('rClasse', categorie(imc));
    CQ.texte('rPlage', plage);
    CQ.texte('phrase', detail + '. For adults only; it does not replace medical advice.');
  }
  CQ.surChangement(['unite', 'lb', 'ft', 'in', 'kg', 'cm'], recalcul);
  CQ.initPartage(recalcul);
}());
