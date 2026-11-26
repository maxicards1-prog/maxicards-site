/* Outil « Carte des départements » : carte SVG cliquable (chaque département mène à sa page), colorée par région,
   par population ou par densité ; le survol ou le focus clavier affiche la fiche courte du département. */
(function () {
  'use strict';
  var FR = window.FR, U = window.FRU;
  if (!FR || !U) { return; }
  var svg = U.el('carteFrance'), choix = U.el('couleur'), info = U.el('infoDep'), legende = U.el('legendeCarte');
  if (!svg || !choix) { return; }
  var MODES = { region: 1, pop: 1, densite: 1 };
  var TEINTES = ['#e3ebfb', '#b9cdf3', '#86a9e6', '#4f7fd4', '#1f4fb8', '#132f73'];
  var liste = null, index = null;
  var formes = svg.querySelectorAll('.dep');

  function valeur(d, mode) { return mode === 'pop' ? d.pop : d.pop / d.s; }
  function colorer(mode) {
    if (!MODES[mode]) { mode = 'region'; }
    U.vider(legende);
    if (mode === 'region' || !liste) {
      svg.classList.add('colo-reg');
      Array.prototype.forEach.call(formes, function (f) { var p = f.querySelector('path'); if (p) { p.style.fill = ''; } });
      legende.appendChild(U.creer('p', null, 'Chaque couleur est une région. Cliquez sur un département pour ouvrir sa page.'));
      return;
    }
    svg.classList.remove('colo-reg');
    var valeurs = liste.filter(function (d) { return d.a === 2023; }).map(function (d) { return valeur(d, mode); });
    var s = FR.seuils(valeurs, 6);
    Array.prototype.forEach.call(formes, function (f) {
      var d = index[f.getAttribute('data-c')], p = f.querySelector('path');
      if (d && p) { p.style.fill = TEINTES[FR.classe(valeur(d, mode), s)]; }
    });
    var ul = U.creer('ul', 'echelle');
    var bornes = [0].concat(s);
    bornes.forEach(function (b, i) {
      var li = U.creer('li');
      var pastille = U.creer('span', 'pastille');
      pastille.style.background = TEINTES[i];
      li.appendChild(pastille);
      var fin = i < s.length ? s[i] : null;
      var unite = mode === 'pop' ? ' hab.' : ' hab./km²';
      li.appendChild(document.createTextNode(fin === null ? FR.fr(b) + unite + ' et plus' : (i === 0 ? 'moins de ' + FR.fr(fin) + unite : FR.fr(b) + ' à ' + FR.fr(fin) + unite)));
      ul.appendChild(li);
    });
    legende.appendChild(ul);
    legende.appendChild(U.creer('p', null, mode === 'pop' ? 'Population municipale 2023 (Mayotte : 2017), six classes de taille égale.' :
      'Habitants par km² (population 2023, Mayotte : 2017), six classes de taille égale.'));
  }
  function montrer(code) {
    var d = index && index[code];
    if (!d || !info) { return; }
    U.vider(info);
    info.appendChild(U.creer('strong', null, d.c + ' · ' + d.n));
    info.appendChild(U.creer('span', null, 'Préfecture : ' + d.p));
    info.appendChild(U.creer('span', null, 'Région : ' + d.r));
    info.appendChild(U.creer('span', null, FR.fr(d.pop) + ' habitants (' + d.a + ') · ' + FR.fr(d.pop / d.s) + ' hab./km²'));
  }
  function surDep(e) {
    var t = e.target;
    while (t && t !== svg && !(t.classList && t.classList.contains('dep'))) { t = t.parentNode; }
    if (t && t !== svg) { montrer(t.getAttribute('data-c')); }
  }
  svg.addEventListener('mouseover', surDep);
  svg.addEventListener('focusin', surDep);
  choix.addEventListener('change', function () {
    var m = MODES[choix.value] ? choix.value : 'region';
    U.ecrire(m === 'region' ? {} : { couleur: m });
    colorer(m);
  });
  U.donnees().then(function (l) {
    liste = l;
    index = U.parCode(l);
    var m = U.param('couleur');
    if (m && MODES[m]) { choix.value = m; }
    colorer(choix.value);
  }, function () {
    colorer('region');
    U.erreur('erreurOutil', "Les chiffres n'ont pas pu être chargés : la carte reste cliquable, colorée par région.");
  });
  U.partage();
})();
