/* Test pixel mort : couleurs unies, plein écran, navigation au clavier. Aucun clignotement. */
(function () {
  'use strict';
  var TP = window.TP, $ = TP.$, T = TP.t;
  var COULEURS = [
    { nom: T('Noir'), hex: '#000000', cherche: T('des points lumineux (pixels allumés en permanence)') },
    { nom: T('Blanc'), hex: '#ffffff', cherche: T('des points sombres (pixels morts)') },
    { nom: T('Rouge'), hex: '#ff0000', cherche: T('des points d’une autre couleur ou noirs') },
    { nom: T('Vert'), hex: '#00ff00', cherche: T('des points d’une autre couleur ou noirs') },
    { nom: T('Bleu'), hex: '#0000ff', cherche: T('des points d’une autre couleur ou noirs') },
    { nom: T('Jaune'), hex: '#ffff00', cherche: T('des points d’une autre couleur') },
    { nom: T('Cyan'), hex: '#00ffff', cherche: T('des points d’une autre couleur') },
    { nom: T('Magenta'), hex: '#ff00ff', cherche: T('des points d’une autre couleur') },
    { nom: T('Gris moyen'), hex: '#808080', cherche: T('des taches, des bandes ou des points différents') }
  ];
  var liste = $('pmCouleurs');
  COULEURS.forEach(function (c, i) {
    var b = TP.creer('button', 'pastille'); b.type = 'button';
    b.setAttribute('aria-label', T('{couleur} en plein écran', { couleur: c.nom }));
    var s = TP.creer('span', 'pastille-c'); s.style.backgroundColor = c.hex;
    b.appendChild(s); b.appendChild(TP.creer('span', '', c.nom));
    b.addEventListener('click', function () { TP.plein(COULEURS, i); });
    liste.appendChild(b);
  });
  $('pmLancer').addEventListener('click', function () { TP.plein(COULEURS, 0); });
}());
