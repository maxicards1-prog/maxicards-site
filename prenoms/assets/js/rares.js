/* Prénoms rares : les prénoms présents dans le fichier la dernière année avec un effectif inférieur ou égal à un seuil. */
(function () {
  'use strict';
  var PR = window.PR, CP = window.CP;
  var pages = {};
  var sequence = 0;
  CP.chargerPages().then(function (p) { pages = p; if (CP.el('liste').firstChild) { lancer(); } });

  function lireSeuil() { return PR.borne(CP.el('max').value, 5, 500, 20); }

  function lancer() {
    var mon = ++sequence;
    var l = CP.el('l').value;
    if (!/^[a-z]$/.test(l)) { l = 'a'; }
    var s = CP.el('s').value;
    if (['tous', 'fille', 'garcon'].indexOf(s) < 0) { s = 'tous'; }
    var seuil = lireSeuil();
    CP.texte('seuilTexte', String(seuil));
    CP.el('maxCurseur').value = String(seuil);
    CP.etat('Chargement…', false);
    CP.chargerLettre(l).then(function (data) {
      if (mon !== sequence) { return; }
      var a1 = data.a1;
      CP.texte('explSeuil', 'Seuil : un prénom est listé s\'il a été donné au plus ' + PR.format(seuil) + ' fois en ' + a1 +
        ' (effectifs arrondis à 5). Le plus petit effectif que l\'Insee publie est 5. Un prénom absent de la liste n\'a pas forcément été donné zéro fois : ' +
        'l\'Insee ne diffuse pas les prénoms trop rares, car ils pourraient identifier des personnes.');
      var liste = PR.rares(data, { sexe: s, seuilMax: seuil, a1: a1 });
      CP.etat('', false);
      CP.montrer('resultat', true);
      var qui = s === 'fille' ? 'filles' : s === 'garcon' ? 'garçons' : 'filles et garçons';
      CP.texte('titre', liste.length ? PR.format(liste.length) + ' prénom' + (liste.length > 1 ? 's' : '') + ' en ' + l.toUpperCase() + ' (' + qui + '), au plus ' + PR.format(seuil) + ' fois en ' + a1
        : 'Aucun prénom en ' + l.toUpperCase() + ' (' + qui + ') donné au plus ' + PR.format(seuil) + ' fois en ' + a1);
      CP.listeBornee(CP.el('liste'), CP.el('plus'), liste, function (x) {
        var li = CP.creer('li', 'ligne-prenom');
        li.appendChild(CP.nomLien(x.nom, pages));
        li.appendChild(CP.creer('span', 'detail', (x.sexe === 'fille' ? 'fille' : 'garçon') + ' · ' + PR.format(x.effectif) + ' en ' + a1 +
          ' · rang n° ' + PR.format(x.rang) + ' · ' + PR.format(x.total) + ' depuis ' + data.a0));
        return li;
      });
    }).catch(function () {
      if (mon !== sequence) { return; }
      CP.montrer('resultat', false);
      CP.etat(CP.MSG_ERREUR, true);
    });
  }

  var recalcul = CP.attente(lancer, 250);
  CP.el('maxCurseur').addEventListener('input', function () {
    CP.el('max').value = String(PR.borne(CP.el('maxCurseur').value, 5, 500, 20));
    CP.el('max').dispatchEvent(new Event('change'));
    CP.texte('seuilTexte', CP.el('max').value);
    recalcul();
  });
  ['l', 's', 'max'].forEach(function (id) {
    CP.el(id).addEventListener('change', recalcul);
  });
  CP.el('max').addEventListener('input', recalcul);
  CP.initPartage(function () { lancer(); });
}());
