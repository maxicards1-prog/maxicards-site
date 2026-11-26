/* Test pixel mort : couleurs unies, plein écran, navigation au clavier. Aucun clignotement. */
(function () {
  'use strict';
  var TP = window.TP, $ = TP.$;
  var COULEURS = [
    { nom: 'Noir', hex: '#000000', cherche: 'des points lumineux (pixels allumés en permanence)' },
    { nom: 'Blanc', hex: '#ffffff', cherche: 'des points sombres (pixels morts)' },
    { nom: 'Rouge', hex: '#ff0000', cherche: 'des points d’une autre couleur ou noirs' },
    { nom: 'Vert', hex: '#00ff00', cherche: 'des points d’une autre couleur ou noirs' },
    { nom: 'Bleu', hex: '#0000ff', cherche: 'des points d’une autre couleur ou noirs' },
    { nom: 'Jaune', hex: '#ffff00', cherche: 'des points d’une autre couleur' },
    { nom: 'Cyan', hex: '#00ffff', cherche: 'des points d’une autre couleur' },
    { nom: 'Magenta', hex: '#ff00ff', cherche: 'des points d’une autre couleur' },
    { nom: 'Gris moyen', hex: '#808080', cherche: 'des taches, des bandes ou des points différents' }
  ];
  var liste = $('pmCouleurs');
  COULEURS.forEach(function (c, i) {
    var b = TP.creer('button', 'pastille'); b.type = 'button';
    b.setAttribute('aria-label', c.nom + ' en plein écran');
    var s = TP.creer('span', 'pastille-c'); s.style.backgroundColor = c.hex;
    b.appendChild(s); b.appendChild(TP.creer('span', '', c.nom));
    b.addEventListener('click', function () { TP.plein(COULEURS, i); });
    liste.appendChild(b);
  });
  $('pmLancer').addEventListener('click', function () { TP.plein(COULEURS, 0); });
}());
