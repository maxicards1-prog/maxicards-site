/* Prix de la carte grise : taxe régionale (tarif du cheval fiscal x CV), taxe fixe, acheminement, malus. Tout reste dans le navigateur. */
(function () {
  'use strict';
  var CQ = window.CQ, AU = window.AU, D = window.AU_DATA;
  function recalcul() {
    var neuf = CQ.coche('neuf'), elec = CQ.valeur('energie') === 'elec', genre = CQ.valeur('genre');
    CQ.montrer('blocMalus', neuf && !elec && genre === 'vp');
    CQ.montrer('avert2027', new Date().getFullYear() > D.annee_bareme);
    var malus = 0, txtMalus = '';
    if (neuf && genre === 'vp') {
      if (elec) { txtMalus = ' Pas de malus pour une voiture électrique ou à hydrogène.'; }
      else {
        var m = AU.malus({ co2: CQ.nombre('co2', 0, 2000), masse: CQ.nombre('masse', 0, 10000), energie: CQ.valeur('mot'), enfants: 0 });
        if (m) { malus = m.total; txtMalus = ' Malus : ' + CQ.euros(m.malusCO2) + ' pour le CO2 et ' + CQ.euros(m.malusPoids) + ' pour le poids.'; }
        else { txtMalus = ' Tapez le CO2 et la masse pour ajouter le malus.'; }
      }
    }
    var cv = CQ.nombre('cv', 0, 1000);
    var r = AU.carteGrise({ region: CQ.valeur('region'), cv: cv, genre: genre, energie: elec ? 'elec' : 'thermique', age10: CQ.coche('age10'), malus: malus });
    CQ.surligner('tabR', function (tr) { return tr.getAttribute('data-r') === CQ.valeur('region'); });
    if (!r) {
      ['rTotal', 'rRegion', 'rFixe', 'rAchem', 'rMalus'].forEach(function (id) { CQ.texte(id, '–'); });
      CQ.texte('phrase', 'Tapez un nombre entier de chevaux fiscaux, de 1 à 99 (case P.6 de la carte grise).');
      return;
    }
    CQ.texte('rTotal', CQ.euros(r.total));
    CQ.texte('rRegion', CQ.euros(r.regionale));
    CQ.texte('rFixe', CQ.euros(r.fixe));
    CQ.texte('rAchem', CQ.euros(r.redevance));
    CQ.texte('rMalus', CQ.euros(r.malus));
    var reg = AU.region(CQ.valeur('region'));
    var t = 'Taxe régionale : ' + CQ.souple(r.tarif, 2) + ' € × ' + cv + ' CV' +
      (r.facteur !== 1 ? ' × ' + CQ.souple(r.facteur, 2) + ' (' + r.motifs.join(' ; ') + ')' : '') + ' = ' + CQ.euros(r.regionale) + ' en ' + reg.nom + '.' + txtMalus;
    if (r.motifs.length > 1) { t += ' Les réductions ne se cumulent pas : la plus forte s’applique.'; }
    CQ.texte('phrase', t);
  }
  CQ.initPartage(recalcul);
  CQ.surChangement(['region', 'cv', 'genre', 'energie', 'age10', 'neuf', 'co2', 'masse', 'mot'], recalcul);
}());
