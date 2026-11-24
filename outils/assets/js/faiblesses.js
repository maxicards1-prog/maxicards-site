/* Calculateur de faiblesses et résistances Pokémon (table des types, 6e génération et après). */
(function () {
  'use strict';
  if (!window.TYPES_POKE || !window.TABLE_TYPES || !document.getElementById('type1')) { return; }
  var T = window.TYPES_POKE, M = window.TABLE_TYPES, P = window.POKEDEX || [];
  var EN = document.documentElement.lang === 'en';   // version anglaise (24/11/2026)
  function t(fr, en) { return EN ? en : fr; }
  var s1 = document.getElementById('type1'), s2 = document.getElementById('type2');
  var champNom = document.getElementById('nomPokemon');

  T.forEach(function (t, i) {
    [s1, s2].forEach(function (s) {
      var o = document.createElement('option');
      o.value = String(i); o.textContent = t.n;
      s.appendChild(o);
    });
  });
  // liste de suggestions des noms
  var dl = document.getElementById('listePokemon');
  if (dl && P.length) {
    P.forEach(function (p) { var o = document.createElement('option'); o.value = p[1]; dl.appendChild(o); });
  }

  function normaliser(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  }
  var index = {};
  P.forEach(function (p) { index[normaliser(p[1])] = p; });

  function puce(i, mult) {
    var s = document.createElement('span');
    s.className = 'type-puce';
    s.style.background = T[i].c;
    s.textContent = T[i].n + (mult ? ' ' + mult : '');
    return s;
  }

  function remplir(id, liste) {
    var zone = document.getElementById(id);
    while (zone.firstChild) { zone.removeChild(zone.firstChild); }
    if (!liste.length) {
      var v = document.createElement('span'); v.className = 'aide'; v.textContent = t('aucun', 'none');
      zone.appendChild(v); return;
    }
    liste.forEach(function (i) { zone.appendChild(puce(i)); });
  }

  function calculer() {
    var a = Number(s1.value), b = Number(s2.value);
    if (b === a) { b = -1; }
    var groupes = { 4: [], 2: [], 1: [], 0.5: [], 0.25: [], 0: [] };
    for (var att = 0; att < T.length; att++) {
      var m = M[att][a] * (b >= 0 ? M[att][b] : 1);
      groupes[m].push(att);
    }
    remplir('x4', groupes[4]); remplir('x2', groupes[2]); remplir('x1', groupes[1]);
    remplir('x05', groupes[0.5]); remplir('x025', groupes[0.25]); remplir('x0', groupes[0]);
    // en attaque : types touchés en super efficace par les attaques de ses types
    var off = [];
    [a, b].forEach(function (t) {
      if (t < 0) { return; }
      for (var d = 0; d < T.length; d++) { if (M[t][d] === 2 && off.indexOf(d) < 0) { off.push(d); } }
    });
    remplir('offensif', off.sort(function (x, y) { return x - y; }));
    var nomTypes = T[a].n + (b >= 0 ? ' / ' + T[b].n : '');
    var nbFaibles = groupes[4].length + groupes[2].length;
    var res = groupes[0.5].length + groupes[0.25].length + groupes[0].length;
    document.getElementById('resumeTypes').textContent = EN
      ? nomTypes + ' type: ' + nbFaibles + (nbFaibles === 1 ? ' weakness, ' : ' weaknesses, ') + res +
        (res === 1 ? ' resistance or immunity.' : ' resistances or immunities.')
      : 'Type ' + nomTypes + ' : ' + nbFaibles +
      ' faiblesse' + (nbFaibles > 1 ? 's' : '') + ', ' + res + ' résistance' + (res > 1 ? 's' : '') +
      ' ou immunité' + (res > 1 ? 's' : '') + '.';
  }

  function depuisNom() {
    var p = index[normaliser(champNom.value)];
    var info = document.getElementById('infoNom');
    if (!champNom.value.trim()) { info.textContent = ''; return; }
    if (!p) { info.textContent = t('Nom inconnu : choisissez dans la liste ou réglez les types à la main.', 'Unknown name: pick one from the list or set the types by hand.'); return; }
    s1.value = String(p[3]); s2.value = String(p[4]);
    info.textContent = EN ? p[1] + ' (#' + p[0] + '): types loaded.' : p[1] + ' (n° ' + p[0] + ') : types chargés.';
    calculer();
  }

  s1.addEventListener('change', calculer);
  s2.addEventListener('change', calculer);
  if (champNom) { champNom.addEventListener('change', depuisNom); champNom.addEventListener('input', function () {
    if (index[normaliser(champNom.value)]) { depuisNom(); }
  }); }
  calculer();
})();
