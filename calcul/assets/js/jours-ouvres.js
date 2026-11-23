/* Jours ouvrés et ouvrables entre deux dates, jours fériés français (et Alsace-Moselle) déduits. */
(function () {
  'use strict';
  var CQ = window.CQ;
  function recalcul() {
    var d = CQ.jour(CQ.valeur('debut')), f = CQ.jour(CQ.valeur('fin'));
    var inclure = CQ.coche('inclure'), alsace = CQ.coche('alsace');
    var ids = ['rOuvres', 'rOuvrables', 'rCalendaires', 'rWeekend', 'rFeries'];
    if (!isFinite(d) || !isFinite(f)) { ids.forEach(function (id) { CQ.texte(id, '–'); }); CQ.lignes('listeFeries', []); CQ.texte('phrase', ''); return; }
    var inverse = f < d;
    if (inverse) { var x = d; d = f; f = x; }
    var dernier = inclure ? f : f - 1;
    if (dernier - d > 366 * 50) { CQ.texte('phrase', 'Période limitée à 50 ans.'); return; }
    var feries = {};
    for (var a = CQ.annee(d); a <= CQ.annee(f); a++) {
      CQ.feries(a, alsace).forEach(function (j) { feries[j.jour] = j.nom; });
    }
    var cal = 0, ouvres = 0, ouvrables = 0, we = 0, liste = [], ferSemaine = 0;
    for (var j = d; j <= dernier; j++) {
      cal++;
      var js = CQ.jourSemaine(j);
      var estFerie = Object.prototype.hasOwnProperty.call(feries, j);
      if (estFerie) {
        liste.push({ cellules: [CQ.dateLongue(j), feries[j], js === 0 || js === 6 ? 'week-end (ne change rien aux jours ouvrés)' : 'en semaine : retiré'] });
        if (js !== 0) { ferSemaine++; }
      }
      if (js === 0 || js === 6) { we++; }
      if (estFerie) { continue; }
      if (js >= 1 && js <= 5) { ouvres++; }
      if (js >= 1 && js <= 6) { ouvrables++; }
    }
    CQ.texte('rOuvres', CQ.entier(ouvres));
    CQ.texte('rOuvrables', CQ.entier(ouvrables));
    CQ.texte('rCalendaires', CQ.entier(cal));
    CQ.texte('rWeekend', CQ.entier(we));
    CQ.texte('rFeries', CQ.entier(liste.length));
    CQ.lignes('listeFeries', liste.length ? liste : [{ cellules: ['Aucun jour férié sur la période', '', ''] }]);
    CQ.texte('phrase', (inverse ? 'Dates inversées : calcul fait dans l\'ordre chronologique. ' : '') +
      'Du ' + CQ.dateLongue(d) + ' au ' + CQ.dateLongue(dernier) + ' : ' + CQ.entier(ouvres) + ' jours ouvrés (lundi-vendredi) et ' +
      CQ.entier(ouvrables) + ' jours ouvrables (lundi-samedi), jours fériés déduits.');
  }
  function feriesAnnee() {
    var a = CQ.nombre('anneeFeries', 1900, 2200);
    if (!isFinite(a)) { CQ.lignes('tableFeries', []); return; }
    a = Math.round(a);
    CQ.lignes('tableFeries', CQ.feries(a, CQ.coche('alsace')).map(function (j) {
      return { cellules: [j.nom, CQ.dateLongue(j.jour)] };
    }));
  }
  var debut = CQ.el('debut'), fin = CQ.el('fin');
  if (debut && !debut.value) {
    var auj = CQ.aujourdhui();
    debut.value = CQ.versTexteIso(auj);
    fin.value = CQ.versTexteIso(auj + 30);
  }
  var an = CQ.el('anneeFeries');
  if (an && !an.value) { an.value = String(CQ.annee(CQ.aujourdhui())); }
  CQ.surChangement(['debut', 'fin', 'inclure', 'alsace'], function () { recalcul(); feriesAnnee(); });
  CQ.surChangement(['anneeFeries'], feriesAnnee);
  CQ.initPartage(function () { recalcul(); feriesAnnee(); });
}());
