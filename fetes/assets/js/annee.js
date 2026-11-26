/* Pages « Jours fériés <année> » : dessine le calendrier de l'année (jours fériés de métropole en couleur). Les
   grilles de chiffres ne sont pas écrites dans le HTML : elles sont dessinées ici, avec le même logique.js. */
(function () {
  'use strict';
  var FE = window.FE, FX = window.FX, c = document.getElementById('cal');
  if (!c) { return; }
  var a = FE.lireAnnee(c.getAttribute('data-annee'), FE.FERIES_MIN, FE.FERIES_MAX), marques = {};
  if (!isFinite(a)) { return; }
  FE.feries(a, 'fr').forEach(function (x) { marques[x.n] = { classe: 'ferie', titre: marques[x.n] ? marques[x.n].titre + ' et ' + x.nom : x.nom }; });
  FX.calendrier('cal', a, 1, 12, marques);
}());
