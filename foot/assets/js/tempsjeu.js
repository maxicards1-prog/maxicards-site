/* Calculateur de temps de jeu équitable et plan de rotation des remplaçants. */
(function () {
  'use strict';
  var O = window.OCP;
  var tr = O.tr;

  function el(tag, texte) { var e = document.createElement(tag); if (texte) { e.textContent = texte; } return e; }

  function calculer() {
    var n = Math.round(O.nombre('nbJoueurs', 1, 40));
    var k = Math.round(O.nombre('surTerrain', 1, 11));
    var d = O.nombre('duree', 1, 200);
    var b = Math.round(O.nombre('blocs', 1, 20));
    var gardienFixe = document.getElementById('gardienFixe').checked;
    var sortie = document.getElementById('plan');
    sortie.textContent = '';
    if (!isFinite(n) || !isFinite(k) || !isFinite(d) || !isFinite(b)) { return; }
    if (n < k) { O.texte('message', tr('Il faut au moins autant de joueurs que de places sur le terrain.', 'You need at least as many players as places on the pitch.')); return; }
    O.texte('message', '');
    var places = gardienFixe ? k - 1 : k;
    var tournants = gardienFixe ? n - 1 : n;
    var minutes = tournants > 0 ? d * places / tournants : d;
    O.texte('rMinutes', O.decimal(minutes, 1) + ' min');
    O.texte('rPart', O.pourcent(minutes / d, 0));
    O.texte('rBanc', O.entier(n - k));
    O.texte('rBloc', O.decimal(d / b, 1) + ' min');
    // plan : à chaque bloc, on fait entrer ceux qui ont le moins joué (ordre tournant)
    var noms = [];
    for (var i = 1; i <= tournants; i++) { noms.push(tr('J', 'P') + (gardienFixe ? i + 1 : i)); }
    var joue = noms.map(function () { return 0; });
    var pos = 0;
    var ol = el('ol');
    for (var bl = 0; bl < b; bl++) {
      var titulaires = [];
      for (var p = 0; p < places; p++) { titulaires.push((pos + p) % tournants); }
      pos = (pos + places) % tournants;
      titulaires.forEach(function (t) { joue[t]++; });
      var li = el('li', tr('De ', 'From ') + O.decimal(bl * d / b, 0) + tr(' à ', ' to ') + O.decimal((bl + 1) * d / b, 0) + tr(' min : ', ' min: ') +
        (gardienFixe ? tr('J1 (gardien), ', 'P1 (goalkeeper), ') : '') + titulaires.sort(function (x, y) { return x - y; }).map(function (t) { return noms[t]; }).join(', '));
      ol.appendChild(li);
    }
    sortie.appendChild(ol);
    var min = Math.min.apply(null, joue), max = Math.max.apply(null, joue);
    var bilan = el('p', tr('Avec ' + b + ' blocs, chaque joueur de champ joue entre ' + O.decimal(min * d / b, 0) + ' et ' +
      O.decimal(max * d / b, 0) + ' minutes' + (min === max ? ' (égalité parfaite).' : '. Pour une égalité parfaite, choisissez un nombre de blocs multiple de ' +
      (tournants / pgcd(places, tournants)) + '.'),
      'With ' + b + ' periods, each outfield player plays between ' + O.decimal(min * d / b, 0) + ' and ' +
      O.decimal(max * d / b, 0) + ' minutes' + (min === max ? ' (perfectly equal).' : '. For perfectly equal time, choose a number of periods that is a multiple of ' +
      (tournants / pgcd(places, tournants)) + '.')));
    sortie.appendChild(bilan);
  }
  function pgcd(a, b) { return b ? pgcd(b, a % b) : a; }
  O.surChangement(['nbJoueurs', 'surTerrain', 'duree', 'blocs', 'gardienFixe'], calculer);
  calculer();
}());
