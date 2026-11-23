/* Taux utilisés par les outils (vérifiés le 23/11/2026, sources citées sur chaque page). */
(function () {
  'use strict';
  window.OCP_DONNEES = {
    // Cartes physiques, série Méga-Évolution (2025) : estimations sur plus de 5 000 boosters ouverts
    // (TCGplayer, relayé par Kotaku et Rubygator, octobre 2025). « 1 sur X » par booster, toutes cartes de la rareté.
    megaEvolution: [
      { id: 'dr', nom: 'Double Rare', unSur: 5, niveau: 2 },
      { id: 'ir', nom: 'Illustration Rare', unSur: 9, niveau: 3 },
      { id: 'ur', nom: 'Ultra Rare', unSur: 12, niveau: 3 },
      { id: 'sir', nom: 'Illustration Spéciale Rare', unSur: 101, niveau: 4 },
      { id: 'mhr', nom: 'Méga Hyper Rare', unSur: 1260, niveau: 5 }
    ],
    // TCG Pocket, booster normal de Puissance Génétique : taux d'apparition affichés dans le jeu
    // (4e et 5e cartes ; les 3 premières sont toujours des cartes 1 losange). En %.
    pocket: [
      { id: 'l2', nom: '2 losanges', slot4: 90, slot5: 60, niveau: 1 },
      { id: 'l3', nom: '3 losanges', slot4: 5, slot5: 20, niveau: 2 },
      { id: 'l4', nom: '4 losanges (ex)', slot4: 1.666, slot5: 6.664, niveau: 3 },
      { id: 'e1', nom: '1 étoile', slot4: 2.572, slot5: 10.288, niveau: 3 },
      { id: 'e2', nom: '2 étoiles', slot4: 0.5, slot5: 2, niveau: 4 },
      { id: 'e3', nom: '3 étoiles', slot4: 0.222, slot5: 0.888, niveau: 4 },
      { id: 'cr', nom: 'Couronne', slot4: 0.04, slot5: 0.16, niveau: 5 }
    ]
  };
}());
