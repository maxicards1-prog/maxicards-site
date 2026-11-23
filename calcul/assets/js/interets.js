/* Épargne : capital de départ + versements en fin de mois, intérêts capitalisés chaque mois ou chaque année.
   Mode annuel : intérêts simples pendant l'année (au prorata des mois), ajoutés au capital au 31 décembre. */
(function () {
  'use strict';
  var CQ = window.CQ;
  function recalcul() {
    var c0 = CQ.nombre('depart', 0, 1e9), v = CQ.nombre('versement', 0, 1e7), ta = CQ.nombre('taux', -10, 50);
    var ans = CQ.nombre('duree', 1, 60), mode = CQ.valeur('capitalisation');
    if (!isFinite(c0)) { c0 = 0; }
    if (!isFinite(v)) { v = 0; }
    if (!isFinite(ta) || !isFinite(ans)) {
      ['rFinal', 'rVerse', 'rGain'].forEach(function (i) { CQ.texte(i, '–'); }); CQ.lignes('tableau', []); return;
    }
    ans = Math.floor(ans);
    var t = ta / 100, solde = c0, verse = c0, lignes = [];
    for (var a = 1; a <= ans; a++) {
      var debut = solde, interetsAn = 0;
      if (mode === 'mensuelle') {
        for (var m = 1; m <= 12; m++) { var i = solde * t / 12; solde += i + v; interetsAn += i; }
      } else {
        interetsAn = solde * t;
        for (var k = 1; k <= 12; k++) { interetsAn += v * t * (12 - k) / 12; }
        solde += 12 * v + interetsAn;
      }
      verse += 12 * v;
      lignes.push({ cellules: [String(a), CQ.euros(debut), CQ.euros(interetsAn), CQ.euros(solde)], nombres: [1, 2, 3] });
    }
    CQ.texte('rFinal', CQ.euros(solde));
    CQ.texte('rVerse', CQ.euros(verse));
    CQ.texte('rGain', CQ.euros(solde - verse));
    CQ.lignes('tableau', lignes);
    CQ.texte('phrase', 'Au bout de ' + ans + ' an' + (ans > 1 ? 's' : '') + ', vous avez versé ' + CQ.euros(verse) +
      ' et les intérêts en ont rapporté ' + CQ.euros(solde - verse) + ' (avant impôts et prélèvements sociaux éventuels).');
  }
  CQ.surChangement(['depart', 'versement', 'taux', 'duree', 'capitalisation'], recalcul);
  CQ.initPartage(recalcul);
}());
