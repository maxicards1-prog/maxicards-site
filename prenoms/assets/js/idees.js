/* Idées de prénoms : filtres sur les prénoms donnés au moins 50 fois de 2016 à 2025 (Insee, effectifs arrondis à 5). */
(function () {
  'use strict';
  var PR = window.PR, CP = window.CP;
  var pages = {};
  var idees = null;
  var LIBELLE = { fille: 'fille', garcon: 'garçon', mixte: 'mixte' };

  function criteres() {
    var s = CP.el('s').value, tri = CP.el('tri').value;
    return {
      sexe: ['tous', 'fille', 'garcon', 'mixte'].indexOf(s) >= 0 ? s : 'tous',
      initiale: CP.el('i').value,
      min: CP.el('min').value.replace(/[^0-9]/g, '').slice(0, 3),
      max: CP.el('max').value.replace(/[^0-9]/g, '').slice(0, 3),
      fin: CP.el('fin').value.slice(0, 40),
      hausse: CP.el('hausse').checked,
      tri: tri === 'hausse' ? 'hausse' : 'popularite'
    };
  }

  function afficher() {
    if (!idees) { return; }
    var c = criteres();
    var liste = PR.filtrerIdees(idees, c);
    var d = idees.mi, f = idees.a1;
    CP.texte('nb', liste.length ? PR.format(liste.length) + ' prénom' + (liste.length > 1 ? 's correspondent' : ' correspond') + ' (naissances comptées sur ' + d + '-' + f + ').'
      : 'Aucun prénom ne correspond : élargissez un filtre.');
    CP.listeBornee(CP.el('liste'), CP.el('plus'), liste, function (x) {
      var carte = CP.creer('div', 'carte-prenom');
      var tete = CP.creer('div', 'carte-tete');
      tete.appendChild(CP.nomLien(x.nom, pages));
      tete.appendChild(CP.creer('span', 'badge badge-' + x.categorie, LIBELLE[x.categorie] || ''));
      carte.appendChild(tete);
      carte.appendChild(CP.creer('p', 'carte-chiffre', PR.format(x.v2) + ' naissances en ' + d + '-' + f));
      if (x.enHausse) {
        var pc = x.v1 > 0 ? '+' + Math.round((x.v2 - x.v1) / x.v1 * 100) + ' % par rapport à ' + idees.a0 + '-' + (d - 1) : 'nouveau depuis ' + d;
        carte.appendChild(CP.creer('p', 'carte-hausse', 'En hausse : ' + pc));
      }
      return carte;
    });
  }

  var recalcul = CP.attente(afficher, 200);
  ['s', 'i', 'min', 'max', 'fin', 'hausse', 'tri'].forEach(function (id) {
    var e = CP.el(id);
    e.addEventListener('input', recalcul);
    e.addEventListener('change', recalcul);
  });
  CP.chargerPages().then(function (p) { pages = p; if (idees) { afficher(); } });
  CP.initPartage(null);
  CP.chargerIdees().then(function (d) {
    idees = d;
    CP.etat('', false);
    afficher();
  }).catch(function () { CP.etat(CP.MSG_ERREUR, true); });
}());
