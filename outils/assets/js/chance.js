/* Calculateur de chance de booster */
(function () {
  'use strict';
  var O = window.OCP, D = window.OCP_DONNEES;
  var select = document.getElementById('source');
  if (!O || !D || !select) { return; }

  function groupe(libelle, liste, prefixe) {
    var g = document.createElement('optgroup');
    g.label = libelle;
    liste.forEach(function (r) {
      var o = document.createElement('option');
      o.value = prefixe + ':' + r.id;
      o.textContent = r.nom + (r.unSur ? ' (1 sur ' + O.entier(r.unSur) + ')' : '');
      g.appendChild(o);
    });
    select.appendChild(g);
  }
  groupe('Cartes physiques : Méga-Évolution', D.megaEvolution, 'mega');
  groupe('TCG Pocket : Puissance Génétique', D.pocket, 'pocket');
  var perso = document.createElement('option');
  perso.value = 'perso';
  perso.textContent = 'Autre : je saisis la chance moi-même';
  select.appendChild(perso);
  select.value = 'mega:sir';

  function trouver(liste, id) {
    for (var i = 0; i < liste.length; i++) { if (liste[i].id === id) { return liste[i]; } }
    return null;
  }

  function probaParBooster() {
    var k = O.nombre('nbCartes', 1, 1000);
    if (!(k >= 1)) { k = 1; }
    k = Math.floor(k);
    var v = select.value.split(':');
    if (v[0] === 'mega') {
      var r = trouver(D.megaEvolution, v[1]);
      return r ? (1 / r.unSur) / k : NaN;
    }
    if (v[0] === 'pocket') {
      var p = trouver(D.pocket, v[1]);
      if (!p) { return NaN; }
      return 1 - (1 - p.slot4 / 100 / k) * (1 - p.slot5 / 100 / k);
    }
    var x = O.nombre('unSur', 1, 1e9);
    return x >= 1 ? (1 / x) / k : NaN;
  }

  function calculer() {
    var estPerso = select.value === 'perso';
    document.getElementById('blocUnSur').hidden = !estPerso;
    var p = probaParBooster();
    var n = O.nombre('nbBoosters', 1, 1e6);
    if (!(n >= 1)) { n = 1; }
    n = Math.floor(n);
    if (!(p > 0)) {
      ['rProba', 'rEsperance', 'r50', 'r90', 'r99', 'rParBooster'].forEach(function (id) { O.texte(id, '–'); });
      O.texte('rChanceux', '');
      return;
    }
    O.texte('rParBooster', O.pourcent(p, 3) + ' (1 sur ' + O.decimal(1 / p, 1) + ')');
    O.texte('rProba', O.pourcent(O.auMoinsUn(p, n), 1));
    O.texte('rEsperance', O.decimal(n * p, 2));
    O.texte('r50', O.entier(O.essaisPour(p, 0.5)));
    O.texte('r90', O.entier(O.essaisPour(p, 0.9)));
    O.texte('r99', O.entier(O.essaisPour(p, 0.99)));

    var obtenu = O.nombre('obtenu', 1, 1e6);
    if (obtenu >= 1) {
      obtenu = Math.floor(obtenu);
      // Part des joueurs qui auraient attendu plus longtemps que vous.
      var plusLongs = 1 - O.auMoinsUn(p, obtenu);
      var msg = 'Obtenue au booster n° ' + O.entier(obtenu) + ' : ';
      if (plusLongs >= 0.5) {
        msg += 'chanceux ! Environ ' + O.pourcent(plusLongs, 0) + ' des joueurs auraient dû ouvrir plus de boosters que vous.';
      } else {
        msg += 'un peu de malchance : environ ' + O.pourcent(1 - plusLongs, 0) + ' des joueurs l’auraient eue plus tôt ou au même booster.';
      }
      O.texte('rChanceux', msg);
    } else {
      O.texte('rChanceux', '');
    }
  }

  O.surChangement(['source', 'unSur', 'nbCartes', 'nbBoosters', 'obtenu'], calculer);
  calculer();
}());
