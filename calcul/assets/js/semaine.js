/* Numéro de semaine ISO 8601 (lundi -> dimanche ; la semaine 1 contient le premier jeudi de l'année). */
(function () {
  'use strict';
  var CQ = window.CQ;
  function iso(n) {
    var lundi = n - ((CQ.jourSemaine(n) + 6) % 7), jeudi = lundi + 3;
    var a = CQ.annee(jeudi), j1 = CQ.jour(a + '-01-01');
    return { annee: a, semaine: Math.floor((jeudi - j1) / 7) + 1, lundi: lundi };
  }
  function lundiSemaine(a, s) {
    var j4 = CQ.jour(a + '-01-04');
    return j4 - ((CQ.jourSemaine(j4) + 6) % 7) + (s - 1) * 7;
  }
  function nbSemaines(a) { return iso(CQ.jour(a + '-12-28')).semaine; }
  function recalcul() {
    var n = CQ.jour(CQ.valeur('date'));
    if (isFinite(n)) {
      var r = iso(n);
      CQ.texte('rSemaine', 'S' + r.semaine);
      CQ.texte('rAnneeIso', String(r.annee));
      CQ.texte('rNb', String(nbSemaines(r.annee)));
      CQ.texte('rDu', 'Du ' + CQ.dateLongue(r.lundi) + ' au ' + CQ.dateLongue(r.lundi + 6) + '.');
    } else {
      ['rSemaine', 'rAnneeIso', 'rNb'].forEach(function (i) { CQ.texte(i, '–'); });
      CQ.texte('rDu', '');
    }
    var a = CQ.nombre('annee2', 1901, 2199), s = CQ.nombre('sem2', 1, 53);
    if (isFinite(a) && isFinite(s)) {
      a = Math.floor(a); s = Math.floor(s);
      var max = nbSemaines(a);
      if (s > max) { CQ.texte('rDates', 'L\'année ' + a + ' ne compte que ' + max + ' semaines.'); }
      else {
        var l = lundiSemaine(a, s);
        CQ.texte('rDates', 'Semaine ' + s + ' de ' + a + ' : du ' + CQ.dateLongue(l) + ' au ' + CQ.dateLongue(l + 6) + '.');
      }
    } else { CQ.texte('rDates', ''); }
  }
  if (!CQ.valeur('date')) { CQ.el('date').value = CQ.versTexteIso(CQ.aujourdhui()); }
  if (!CQ.valeur('annee2')) { CQ.el('annee2').value = String(CQ.annee(CQ.aujourdhui())); }
  CQ.surChangement(['date', 'annee2', 'sem2'], recalcul);
  CQ.initPartage(recalcul);
}());
