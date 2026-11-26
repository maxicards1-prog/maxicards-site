/* Calendrier des fêtes d'une année : jours fériés, fêtes religieuses à date calculée, fêtes de famille, traditions
   et usages commerciaux. Aucune fête fixée par l'observation de la lune (Ramadan, Aïd) : leur date dépend d'une annonce. */
(function () {
  'use strict';
  var FE = window.FE, CQ = window.CQ, FX = window.FX;
  var TYPES = { ferie: 'Jour férié', religieuse: 'Fête religieuse', famille: 'Fête de famille', populaire: 'Tradition', commerciale: 'Usage commercial' };

  function recalcul() {
    var a = FX.annee('a', FE.FERIES_MIN, FE.FERIES_MAX, FX.anneeCourante()), t = CQ.valeur('t'), auj = FX.aujourdhui();
    if (t !== 'toutes' && !Object.prototype.hasOwnProperty.call(TYPES, t)) { t = 'toutes'; }
    var liste = FE.fetes(a).filter(function (x) { return t === 'toutes' || x.type === t; });
    var toutes = FE.fetes(FE.date(auj).a).concat(FE.fetes(FE.date(auj).a + 1)), p = null, i;
    for (i = 0; i < toutes.length; i++) { if (toutes[i].n >= auj) { p = toutes[i]; break; } }
    CQ.texte('rProchaine', p ? p.nom : '–');
    FX.ecrire('lProchaine', p ? FX.majuscule(FE.texteDate(p.n)) + ', ' + FX.dans(p.n, auj) : 'prochaine fête');
    CQ.texte('rNombre', String(liste.length));
    FX.ecrire('titreTableau', 'Les fêtes de ' + a + (t === 'toutes' ? '' : ' : ' + TYPES[t].toLowerCase()));
    var suivant = NaN;
    for (i = 0; i < liste.length; i++) { if (liste[i].n >= auj) { suivant = liste[i].n; break; } }
    CQ.lignes('corps', liste.map(function (x) {
      return { cellules: [x.nom, FX.majuscule(FE.texteDate(x.n, false)), TYPES[x.type]], classe: x.n < auj ? 'passe' : x.n === suivant ? 'prochain' : '' };
    }));
    var marques = {};
    FE.fetes(a).forEach(function (x) {
      var titre = marques[x.n] ? marques[x.n].titre + ' et ' + x.nom : x.nom;
      marques[x.n] = { classe: x.type === 'ferie' || (marques[x.n] && marques[x.n].classe === 'ferie') ? 'ferie' : 'fete', titre: titre };
    });
    FX.calendrier('cal', a, 1, 12, marques);
    FX.ecrire('titreCal', 'Le calendrier ' + a);
  }

  FX.defaut('a', FX.anneeCourante());
  CQ.surChangement(['a', 't'], recalcul);
  CQ.initPartage(recalcul);
}());
