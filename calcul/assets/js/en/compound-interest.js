/* Savings: starting balance + deposits at the end of each month.
   Monthly mode: interest added every month. Annual mode: simple interest during the year on the deposits made so far,
   added to the balance at the end of the year. */
(function () {
  'use strict';
  var CQ = window.CQ;
  function vider() {
    ['rFinal', 'rPaid', 'rGain'].forEach(function (i) { CQ.texte(i, '–'); });
    CQ.lignes('tableau', []); CQ.texte('phrase', '');
  }
  function recalcul() {
    var c0 = CQ.nombre('start', 0, 1e10), d = CQ.nombre('deposit', 0, 1e8), ta = CQ.nombre('rate', -10, 100);
    var ans = CQ.nombre('years', 1, 80), mode = CQ.valeur('comp');
    if (!isFinite(c0)) { c0 = 0; }
    if (!isFinite(d)) { d = 0; }
    if (!isFinite(ta) || !isFinite(ans)) { vider(); return; }
    ans = Math.floor(ans);
    var t = ta / 100, solde = c0, verse = c0, lignes = [];
    for (var a = 1; a <= ans; a++) {
      var debut = solde, gain = 0, m, k;
      if (mode === 'monthly') {
        for (m = 1; m <= 12; m++) { var i = solde * t / 12; solde += i + d; gain += i; }
      } else {
        gain = solde * t;
        for (k = 1; k <= 12; k++) { gain += d * t * (12 - k) / 12; }
        solde += 12 * d + gain;
      }
      verse += 12 * d;
      lignes.push({ cellules: [String(a), CQ.decimal(debut, 2), CQ.decimal(gain, 2), CQ.decimal(solde, 2)], nombres: [1, 2, 3] });
    }
    CQ.texte('rFinal', CQ.decimal(solde, 2));
    CQ.texte('rPaid', CQ.decimal(verse, 2));
    CQ.texte('rGain', CQ.decimal(solde - verse, 2));
    CQ.lignes('tableau', lignes);
    CQ.texte('phrase', 'After ' + ans + (ans > 1 ? ' years' : ' year') + ', you put in ' + CQ.decimal(verse, 2) +
      ' and earned ' + CQ.decimal(solde - verse, 2) + ' in interest (before any taxes or fees).');
  }
  CQ.surChangement(['start', 'deposit', 'rate', 'years', 'comp'], recalcul);
  CQ.initPartage(recalcul);
}());
