/* Malus écologique 2026 : malus CO2 (barème au gramme) + malus au poids (tranches), plafond commun.
   Le nombre d'enfants et la case handicap ne sont jamais écrits dans l'adresse (pas de data-p). */
(function () {
  'use strict';
  var CQ = window.CQ, AU = window.AU, D = window.AU_DATA;
  function recalcul() {
    var energie = CQ.valeur('energie');
    CQ.montrer('avertPhev', energie === 'phev');
    CQ.montrer('avert2027', new Date().getFullYear() > D.annee_bareme);
    var enfants = CQ.nombre('enfants', 0, 30);
    var r = AU.malus({ co2: CQ.nombre('co2', 0, 5000), masse: CQ.nombre('masse', 0, 100000), energie: energie,
      enfants: isFinite(enfants) ? enfants : 0, exonere: CQ.coche('exonere') });
    if (!r) {
      ['rTotal', 'rCO2', 'rPoids', 'rG', 'rKg'].forEach(function (id) { CQ.texte(id, '–'); });
      CQ.texte('phrase', 'Tapez le CO2 en g/km et la masse en kg (entre 300 et 10 000 kg).');
      CQ.surligner('tabC', function () { return false; });
      return;
    }
    CQ.texte('rTotal', CQ.euros(r.total));
    CQ.texte('rCO2', CQ.euros(r.malusCO2));
    CQ.texte('rPoids', CQ.euros(r.malusPoids));
    CQ.texte('rG', r.exonere ? '–' : r.co2Retenu + ' g/km');
    CQ.texte('rKg', r.exonere ? '–' : CQ.entier(r.masseRetenue) + ' kg');
    var g = r.co2Retenu, debut = D.malus_co2.debut, fin = debut + D.malus_co2.valeurs.length - 1;
    var cible = r.exonere ? -1 : (g < debut ? 0 : (g > fin ? fin + 1 : g));
    CQ.surligner('tabC', function (tr) { return +tr.getAttribute('data-g') === cible; });
    var t;
    if (r.exonere) { t = 'Aucun malus : ' + (energie === 'elec' ? 'les voitures électriques et à hydrogène sont exonérées.' : 'exonération pour handicap.'); }
    else {
      t = 'Malus 2026 : ' + CQ.euros(r.malusCO2) + ' pour ' + g + ' g/km retenus et ' + CQ.euros(r.malusPoids) + ' pour ' + CQ.entier(r.masseRetenue) + ' kg retenus, soit ' + CQ.euros(r.total) + '.';
      if (r.malusCO2 + AU.malusPoids(r.masseRetenue) > D.malus_co2.maximum) { t += ' Le total est plafonné à ' + CQ.euros(D.malus_co2.maximum) + '.'; }
    }
    CQ.texte('phrase', t);
  }
  CQ.initPartage(recalcul);
  CQ.surChangement(['co2', 'masse', 'energie', 'enfants', 'exonere'], recalcul);
}());
