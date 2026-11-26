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
      o.textContent = r.nom + (r.unSur ? O.t(' (1 sur ', ' (1 in ', ' (1 de ', ' (1 em ') + O.entier(r.unSur) + ')' : '');
      g.appendChild(o);
    });
    select.appendChild(g);
  }
  groupe(O.t('Cartes physiques : Méga-Évolution', 'Physical cards: Mega Evolution', 'Cartas físicas: Mega Evolution', 'Cartas físicas: Mega Evolution'), D.megaEvolution, 'mega');
  groupe(O.t('TCG Pocket : Puissance Génétique', 'TCG Pocket: Genetic Apex', 'TCG Pocket: Genetic Apex', 'TCG Pocket: Genetic Apex'), D.pocket, 'pocket');
  var perso = document.createElement('option');
  perso.value = 'perso';
  perso.textContent = O.t('Autre : je saisis la chance moi-même', 'Other: I enter the odds myself', 'Otra: escribo yo la probabilidad', 'Outra: eu digito a chance');
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
    O.texte('rParBooster', O.pourcent(p, 3) + O.t(' (1 sur ', ' (1 in ', ' (1 de ', ' (1 em ') + O.decimal(1 / p, 1) + ')');
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
      var msg = O.t('Obtenue au booster n° ', 'Pulled in pack #', 'Conseguida en el sobre n.º ', 'Tirada no booster nº ') + O.entier(obtenu) + O.t(' : ', ': ', ': ', ': ');
      if (plusLongs >= 0.5) {
        msg += O.t('chanceux ! Environ ', 'lucky! About ', '¡con suerte! Alrededor del ', 'sortudo! Cerca de ') + O.pourcent(plusLongs, 0) +
          O.t(' des joueurs auraient dû ouvrir plus de boosters que vous.', ' of players would have had to open more packs than you.', ' de los jugadores habrían tenido que abrir más sobres que tú.', ' dos jogadores teriam que abrir mais boosters que você.');
      } else {
        msg += O.t('un peu de malchance : environ ', 'a bit unlucky: about ', 'algo de mala suerte: alrededor del ', 'um pouco de azar: cerca de ') + O.pourcent(1 - plusLongs, 0) +
          O.t(' des joueurs l’auraient eue plus tôt ou au même booster.', ' of players would have pulled it earlier or in the same pack.', ' de los jugadores la habrían conseguido antes o en el mismo sobre.', ' dos jogadores a teriam tirado antes ou no mesmo booster.');
      }
      O.texte('rChanceux', msg);
    } else {
      O.texte('rChanceux', '');
    }
  }

  O.surChangement(['source', 'unSur', 'nbCartes', 'nbBoosters', 'obtenu'], calculer);
  calculer();
}());
