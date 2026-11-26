/* Fêtes de famille : fête des mères (règle légale, reportée en juin si elle tombe le jour de la Pentecôte), fête des
   pères (3e dimanche de juin, usage), fêtes des grands-mères et des grands-pères (usage commercial). */
(function () {
  'use strict';
  var FE = window.FE, CQ = window.CQ, FX = window.FX;
  var outil = document.querySelector('[data-fete]');
  var fete = outil ? outil.getAttribute('data-fete') : 'meres';
  var BORNES = { meres: [1950, 2200], peres: [1950, 2200], gp: [2000, 2200] };
  var b = BORNES[fete] || BORNES.meres;

  function date(a) {
    if (fete === 'peres') { return { n: FE.feteDesPeres(a) }; }
    if (fete === 'gp') { return { n: FE.grandsMeres(a), n2: FE.grandsPeres(a) }; }
    return FE.feteDesMeres(a);
  }
  // Année de la prochaine fête : celle de cette année si elle n'est pas passée, sinon l'an prochain.
  function anneeProchaine() {
    var auj = FX.aujourdhui(), a = FE.date(auj).a, d = date(a);
    return Math.max(d.n, d.n2 || d.n) < auj ? a + 1 : a;
  }

  function recalcul() {
    var a = FX.annee('a', b[0], b[1], anneeProchaine()), d = date(a), auj = FX.aujourdhui(), k, lignes = [], x;
    CQ.texte('rDate', FX.majuscule(FE.texteDate(d.n)));
    FX.ecrire('lDate', (fete === 'gp' ? 'fête des grands-mères, ' : '') + FX.dans(d.n, auj));
    if (fete === 'gp') {
      CQ.texte('rDate2', FX.majuscule(FE.texteDate(d.n2)));
      FX.ecrire('lDate2', 'fête des grands-pères, ' + FX.dans(d.n2, auj));
      FX.ecrire('phrase', 'En ' + a + ', la fête des grands-mères tombe le ' + FE.texteDate(d.n, false) + ' (premier dimanche de mars) et la fête des grands-pères le ' +
        FE.texteDate(d.n2, false) + ' (premier dimanche d\'octobre). Ces deux dates suivent un usage commercial, pas une loi.');
    } else if (fete === 'peres') {
      FX.ecrire('phrase', 'En ' + a + ', la fête des pères tombe le ' + FE.texteDate(d.n, false) + ', troisième dimanche de juin.');
    } else {
      FX.ecrire('phrase', d.decalee ?
        'En ' + a + ', le dernier dimanche de mai est le dimanche de la Pentecôte : la fête des mères est donc reportée au premier dimanche de juin, le ' + FE.texteDate(d.n, false) + '.' :
        'En ' + a + ', la fête des mères tombe le dernier dimanche de mai, le ' + FE.texteDate(d.n, false) + '. La Pentecôte est le ' + FE.texteDate(d.pentecote, false) + '.');
    }
    for (k = a; k < a + 12 && k <= b[1]; k++) {
      x = date(k);
      lignes.push({ cellules: fete === 'gp' ? [String(k), FX.majuscule(FE.texteDate(x.n, false)), FX.majuscule(FE.texteDate(x.n2, false))] :
        [String(k), FX.majuscule(FE.texteDate(x.n, false)), fete === 'meres' ? (x.decalee ? 'Reportée en juin (Pentecôte le dernier dimanche de mai)' : 'Dernier dimanche de mai') : 'Troisième dimanche de juin'],
        classe: k === a ? 'ligne-active' : '' });
    }
    CQ.lignes('suivantes', lignes);
    FX.ecrire('titreSuivantes', 'Les dates de ' + a + ' à ' + (k - 1));
  }

  FX.defaut('a', anneeProchaine());
  CQ.surChangement(['a'], recalcul);
  CQ.initPartage(recalcul);
}());
