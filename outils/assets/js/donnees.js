/* Taux utilisés par les outils (vérifiés le 23/11/2026, sources citées sur chaque page). */
(function () {
  'use strict';
  window.OCP_DONNEES = {
    // Cartes physiques, série Méga-Évolution (2025) : estimations sur plus de 5 000 boosters ouverts
    // (TCGplayer, relayé par Kotaku et Rubygator, octobre 2025). « 1 sur X » par booster, toutes cartes de la rareté.
    megaEvolution: [
      { id: 'dr', nom: 'Double Rare', en: 'Double Rare', unSur: 5, niveau: 2 },
      { id: 'ir', nom: 'Illustration Rare', en: 'Illustration Rare', unSur: 9, niveau: 3 },
      { id: 'ur', nom: 'Ultra Rare', en: 'Ultra Rare', unSur: 12, niveau: 3 },
      { id: 'sir', nom: 'Illustration Spéciale Rare', en: 'Special Illustration Rare', unSur: 101, niveau: 4 },
      { id: 'mhr', nom: 'Méga Hyper Rare', en: 'Mega Hyper Rare', unSur: 1260, niveau: 5 }
    ],
    // TCG Pocket, booster normal de Puissance Génétique : taux d'apparition affichés dans le jeu
    // (4e et 5e cartes ; les 3 premières sont toujours des cartes 1 losange). En %.
    pocket: [
      { id: 'l2', nom: '2 losanges', en: '2 diamonds', slot4: 90, slot5: 60, niveau: 1 },
      { id: 'l3', nom: '3 losanges', en: '3 diamonds', slot4: 5, slot5: 20, niveau: 2 },
      { id: 'l4', nom: '4 losanges (ex)', en: '4 diamonds (ex)', slot4: 1.666, slot5: 6.664, niveau: 3 },
      { id: 'e1', nom: '1 étoile', en: '1 star', slot4: 2.572, slot5: 10.288, niveau: 3 },
      { id: 'e2', nom: '2 étoiles', en: '2 stars', slot4: 0.5, slot5: 2, niveau: 4 },
      { id: 'e3', nom: '3 étoiles', en: '3 stars', slot4: 0.222, slot5: 0.888, niveau: 4 },
      { id: 'cr', nom: 'Couronne', en: 'Crown', slot4: 0.04, slot5: 0.16, niveau: 5 }
    ]
  };
  // Versions traduites : noms anglais officiels des raretés (en, 24/11/2026) ; es et pt (26/11/2026) gardent les
  // noms anglais des cartes, utilisés aussi en Espagne et au Brésil, et traduisent les symboles de TCG Pocket.
  var lang = String(document.documentElement.lang || 'fr').slice(0, 2);
  var POCKET = {
    es: { l2: '2 rombos', l3: '3 rombos', l4: '4 rombos (ex)', e1: '1 estrella', e2: '2 estrellas', e3: '3 estrellas', cr: 'Corona' },
    pt: { l2: '2 losangos', l3: '3 losangos', l4: '4 losangos (ex)', e1: '1 estrela', e2: '2 estrelas', e3: '3 estrelas', cr: 'Coroa' }
  };
  if (lang === 'en' || lang === 'es' || lang === 'pt') {
    [window.OCP_DONNEES.megaEvolution, window.OCP_DONNEES.pocket].forEach(function (l) {
      l.forEach(function (r) { r.nom = (POCKET[lang] && POCKET[lang][r.id]) || r.en; });
    });
  }
}());
