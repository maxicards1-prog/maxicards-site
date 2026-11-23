/* Générateur d'équipe Pokémon aléatoire. Données : pokedex.js et types.js. Tout reste dans le navigateur. */
(function () {
  'use strict';
  if (!window.POKEDEX || !window.TYPES_POKE || !document.getElementById('genererEquipe')) { return; }
  var P = window.POKEDEX, T = window.TYPES_POKE;
  var equipe = [];          // entrées de POKEDEX
  var verrous = [];         // booléens par emplacement

  function hasard(n) {
    if (window.crypto && window.crypto.getRandomValues) {
      var a = new Uint32Array(1);
      var limite = Math.floor(4294967296 / n) * n;
      do { window.crypto.getRandomValues(a); } while (a[0] >= limite);
      return a[0] % n;
    }
    return Math.floor(Math.random() * n);
  }

  function coche(id) { var el = document.getElementById(id); return !!(el && el.checked); }

  function filtres() {
    var gens = [];
    for (var g = 1; g <= 9; g++) { if (coche('gen' + g)) { gens.push(g); } }
    return {
      gens: gens,
      type: Number(document.getElementById('typeEquipe').value),
      legendaires: coche('avecLegendaires'),
      finaux: coche('seulementFinaux'),
      bebes: coche('avecBebes'),
      typesUniques: coche('typesUniques')
    };
  }

  function admis(p, f) {
    if (f.gens.indexOf(p[2]) < 0) { return false; }
    if (f.type >= 0 && p[3] !== f.type && p[4] !== f.type) { return false; }
    if (!f.legendaires && (p[5] & 3)) { return false; }
    if (f.finaux && !(p[5] & 4)) { return false; }
    if (!f.bebes && (p[5] & 8)) { return false; }
    return true;
  }

  function puce(t) {
    var s = document.createElement('span');
    s.className = 'type-puce';
    s.style.background = T[t].c;
    s.textContent = T[t].n;
    return s;
  }

  function afficher() {
    var zone = document.getElementById('equipe');
    while (zone.firstChild) { zone.removeChild(zone.firstChild); }
    equipe.forEach(function (p, i) {
      var li = document.createElement('li');
      li.className = 'poke apparait';
      var nom = document.createElement('strong');
      nom.textContent = p[1];
      var num = document.createElement('span');
      num.className = 'num';
      num.textContent = 'n° ' + p[0] + ' · ' + p[2] + (p[2] === 1 ? 're' : 'e') + ' génération';
      var types = document.createElement('div');
      types.className = 'types';
      types.appendChild(puce(p[3]));
      if (p[4] >= 0) { types.appendChild(puce(p[4])); }
      var lab = document.createElement('label');
      lab.className = 'verrou';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!verrous[i];
      cb.addEventListener('change', function () { verrous[i] = cb.checked; });
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(' Garder'));
      li.appendChild(nom); li.appendChild(num); li.appendChild(types); li.appendChild(lab);
      zone.appendChild(li);
    });
  }

  function generer() {
    var f = filtres();
    var n = Math.max(1, Math.min(6, Number(document.getElementById('tailleEquipe').value) || 6));
    var msg = '';
    if (f.gens.length === 0) {
      document.getElementById('messageEquipe').textContent = 'Cochez au moins une génération.';
      return;
    }
    var gardes = [];
    for (var i = 0; i < n; i++) { if (verrous[i] && equipe[i]) { gardes.push(equipe[i]); } }
    var nouvelle = [], nouveauxVerrous = [];
    gardes.forEach(function (p) { nouvelle.push(p); nouveauxVerrous.push(true); });
    var pris = {};
    var typesPris = {};
    nouvelle.forEach(function (p) { pris[p[0]] = true; typesPris[p[3]] = true; if (p[4] >= 0) { typesPris[p[4]] = true; } });
    var reserve = P.filter(function (p) { return admis(p, f) && !pris[p[0]]; });
    while (nouvelle.length < n && reserve.length) {
      var choix = reserve.splice(hasard(reserve.length), 1)[0];
      if (f.typesUniques && (typesPris[choix[3]] || (choix[4] >= 0 && typesPris[choix[4]]))) { continue; }
      nouvelle.push(choix); nouveauxVerrous.push(false);
      typesPris[choix[3]] = true; if (choix[4] >= 0) { typesPris[choix[4]] = true; }
    }
    if (nouvelle.length < n) {
      msg = 'Seulement ' + nouvelle.length + ' Pokémon correspondent à vos filtres : élargissez-les (générations, type, légendaires).';
    } else {
      var nb = P.filter(function (p) { return admis(p, f); }).length;
      msg = 'Tiré au hasard parmi ' + nb + ' Pokémon qui correspondent à vos filtres.';
    }
    equipe = nouvelle; verrous = nouveauxVerrous;
    afficher();
    document.getElementById('messageEquipe').textContent = msg;
    document.getElementById('copierEquipe').hidden = equipe.length === 0;
  }

  function copier() {
    var texte = equipe.map(function (p) {
      return p[1] + ' (' + T[p[3]].n + (p[4] >= 0 ? '/' + T[p[4]].n : '') + ')';
    }).join(', ');
    var fini = function () { document.getElementById('messageEquipe').textContent = 'Équipe copiée : ' + texte; };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texte).then(fini, fini);
    } else { fini(); }
  }

  // liste des types dans le menu
  var sel = document.getElementById('typeEquipe');
  T.forEach(function (t, i) {
    var o = document.createElement('option');
    o.value = String(i); o.textContent = t.n;
    sel.appendChild(o);
  });
  document.getElementById('genererEquipe').addEventListener('click', generer);
  document.getElementById('copierEquipe').addEventListener('click', copier);
  generer();
})();
