/* Catégories d'âge du football (règle FFF : catégorie Uxx = âge atteint dans l'année où finit la saison). */
(function () {
  'use strict';
  var FOOT = {
    // saisonDebut : 2026 pour la saison 2026-2027.
    categorie: function (annee, saisonDebut) {
      var fin = saisonDebut + 1;
      var age = fin - annee;
      if (!isFinite(age)) { return null; }
      var r = { age: age, nom: '', pratique: '', ballon: '' };
      if (age < 5) {
        r.nom = 'Trop jeune pour une licence (avant U6)';
        r.pratique = 'Éveil, jeux de ballon : renseignez-vous auprès du club';
        r.ballon = '–';
      } else if (age <= 19) {
        r.nom = 'U' + age;
        if (age <= 9) {
          r.pratique = 'Football d\'animation à effectif réduit (à 5 en U8-U9, en plateaux)';
          r.ballon = age === 9 ? 'Taille 3 (taille 4 tolérée en U9)' : 'Taille 3';
        } else if (age <= 13) {
          r.pratique = 'Football à 8';
          r.ballon = 'Taille 4';
        } else {
          r.pratique = 'Football à 11';
          r.ballon = 'Taille 5';
        }
      } else if (age === 20) {
        r.nom = 'U20 (catégorie Senior)';
        r.pratique = 'Football à 11';
        r.ballon = 'Taille 5';
      } else if (age >= 36) {
        r.nom = 'Senior (peut jouer en Vétérans)';
        r.pratique = 'Football à 11, à 7 ou foot loisir selon le district';
        r.ballon = 'Taille 5';
      } else {
        r.nom = 'Senior';
        r.pratique = 'Football à 11';
        r.ballon = 'Taille 5';
      }
      return r;
    }
  };
  window.FOOT = FOOT;
}());
