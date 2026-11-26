/* Ce drapeau, quel pays ? Les cases cochées (couleurs, motifs) masquent les drapeaux qui ne correspondent pas.
   Les drapeaux sont déjà dans la page : le script ne fait que les montrer ou les cacher. */
(function () {
  'use strict';
  var LP = window.LP, D = window.PD || [];
  var grille = document.getElementById('grilleDrapeaux');
  var compte = document.getElementById('compte');
  if (!grille || !LP || !D.length) { return; }
  var cases = Array.prototype.slice.call(document.querySelectorAll('input[name="couleur"], input[name="motif"], #exact'));
  var items = Array.prototype.slice.call(grille.querySelectorAll('li[data-i]'));
  var raz = document.getElementById('raz');

  function coches(nom) {
    return cases.filter(function (c) { return c.name === nom && c.checked; }).map(function (c) { return c.value; });
  }
  function maj() {
    var couleurs = coches('couleur'), motifs = coches('motif');
    var exact = document.getElementById('exact').checked;
    var garde = {};
    LP.filtrerDrapeaux(D, couleurs, motifs, exact).forEach(function (i) { garde[i] = true; });
    var n = 0;
    items.forEach(function (li) {
      var ok = !!garde[li.getAttribute('data-i')];
      li.hidden = !ok;
      if (ok) { n++; }
    });
    var filtre = couleurs.length || motifs.length;
    compte.textContent = !filtre ? 'Cochez une ou plusieurs cases : les ' + items.length + ' drapeaux sont affichés.' :
      n === 0 ? 'Aucun drapeau ne correspond : décochez une case.' :
        n === 1 ? 'Un seul drapeau correspond.' : n + ' drapeaux correspondent.';
  }
  cases.forEach(function (c) { c.addEventListener('change', maj); });
  if (raz) {
    raz.addEventListener('click', function () {
      cases.forEach(function (c) { c.checked = false; });
      maj();
    });
  }
  maj();
}());
