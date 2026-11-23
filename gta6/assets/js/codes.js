/* Tableau des codes GTA 6 : filtre par plateforme, catégorie, texte et codes connus. Aucun appel réseau. */
(function () {
  'use strict';
  var table = document.getElementById('tableCodes');
  if (!table) { return; }
  var lignes = Array.prototype.slice.call(table.querySelectorAll('tbody tr'));
  var plateforme = document.getElementById('plateforme');
  var categorie = document.getElementById('categorie');
  var recherche = document.getElementById('recherche');
  var connus = document.getElementById('connus');
  var compte = document.getElementById('compteCodes');
  var saisie = document.getElementById('saisiePlateforme');
  var messagePC = document.getElementById('messagePC');
  var TOUCHES = {
    ps5: 'Sur PS5 : appuyez sur ↑ (croix directionnelle) pour sortir le téléphone, maintenez L1 puis appuyez sur R1, puis tapez la combinaison avec la croix directionnelle.',
    xbox: 'Sur Xbox Series X|S : appuyez sur ↑ (croix directionnelle) pour sortir le téléphone, maintenez LB puis appuyez sur RB, puis tapez la combinaison avec la croix directionnelle.',
    pc: 'GTA 6 n’est pas sorti sur PC : aucune date n’est annoncée, il n’existe donc aucun code PC à ce jour. Les combinaisons ci-dessous sont celles des consoles.'
  };

  function sansAccent(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function appliquer() {
    var p = plateforme ? plateforme.value : 'ps5';
    var c = categorie ? categorie.value : 'tous';
    var q = recherche ? sansAccent(recherche.value.trim()) : '';
    var seulConnus = connus ? connus.checked : false;
    var vus = 0;
    var avecCode = 0;
    lignes.forEach(function (tr) {
      var ok = (c === 'tous' || tr.getAttribute('data-cat') === c) &&
        (!seulConnus || tr.getAttribute('data-connu') === '1') &&
        (q === '' || sansAccent(tr.textContent).indexOf(q) !== -1);
      tr.hidden = !ok;
      if (ok) {
        vus += 1;
        if (tr.getAttribute('data-connu') === '1') { avecCode += 1; }
      }
    });
    if (compte) {
      compte.textContent = vus + ' code' + (vus > 1 ? 's' : '') + ' affiché' + (vus > 1 ? 's' : '') +
        ', dont ' + avecCode + ' avec une combinaison connue.';
    }
    if (saisie) { saisie.textContent = TOUCHES[p] || TOUCHES.ps5; }
    if (messagePC) { messagePC.hidden = p !== 'pc'; }
  }

  [plateforme, categorie, connus].forEach(function (el) {
    if (el) { el.addEventListener('change', appliquer); }
  });
  if (recherche) { recherche.addEventListener('input', appliquer); }
  var params = new URLSearchParams(window.location.search);
  var cat = params.get('categorie');
  if (cat && categorie && categorie.querySelector('option[value="' + cat.replace(/[^a-z]/g, '') + '"]')) {
    categorie.value = cat.replace(/[^a-z]/g, '');
  }
  appliquer();
})();
