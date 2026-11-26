/* Calculateur de prix par booster et par carte (display, coffret, lot) */
(function () {
  'use strict';
  var O = window.OCP;
  if (!O || !document.getElementById('tableOffres')) { return; }
  var OFFRES = ['A', 'B', 'C'];

  function cellule(tr, texte, classe) {
    var td = document.createElement('td');
    td.textContent = texte;
    if (classe) { td.className = classe; }
    tr.appendChild(td);
  }

  function calculer() {
    var cartes = O.nombre('cartesParBooster', 1, 100);
    var unite = O.nombre('prixUnite', 0, 1e5);
    var lignes = [];
    OFFRES.forEach(function (k) {
      var prix = O.nombre('prix' + k, 0, 1e7);
      var nb = O.nombre('nb' + k, 1, 10000);
      var port = O.nombre('port' + k, 0, 1e5);
      if (!(prix > 0) || !(nb >= 1)) { return; }
      nb = Math.floor(nb);
      var total = prix + (isFinite(port) ? port : 0);
      var nom = String(document.getElementById('nom' + k).value).trim().slice(0, 40) || (O.t('Offre ', 'Offer ', 'Oferta ', 'Oferta ') + k);
      lignes.push({ nom: nom, total: total, nb: nb, parBooster: total / nb });
    });
    var corps = document.getElementById('resultatsOffres');
    while (corps.firstChild) { corps.removeChild(corps.firstChild); }
    var min = Infinity;
    lignes.forEach(function (l) { if (l.parBooster < min) { min = l.parBooster; } });
    lignes.forEach(function (l) {
      var tr = document.createElement('tr');
      if (lignes.length > 1 && l.parBooster === min) { tr.className = 'meilleur'; }
      cellule(tr, l.nom);
      cellule(tr, O.euros(l.total), 'nombre');
      cellule(tr, O.euros(l.parBooster), 'nombre');
      cellule(tr, cartes >= 1 ? O.euros(l.parBooster / cartes) : '–', 'nombre');
      if (unite > 0) {
        var eco = unite * l.nb - l.total;
        cellule(tr, (eco >= 0 ? '' : '+') + O.euros(Math.abs(eco)) + (eco >= 0 ? O.t(' économisés', ' saved', ' ahorrados', ' economizados') : O.t(' de plus', ' more', ' más', ' a mais')), 'nombre');
      } else {
        cellule(tr, '–', 'nombre');
      }
      corps.appendChild(tr);
    });
    var msg = '';
    if (lignes.length === 0) { msg = O.t('Saisissez au moins un prix et un nombre de boosters.', 'Enter at least one price and a number of packs.', 'Escribe al menos un precio y un número de sobres.', 'Digite pelo menos um preço e um número de boosters.'); }
    else if (lignes.length > 1) {
      var best = lignes.filter(function (l) { return l.parBooster === min; })[0];
      msg = O.t('Le moins cher par booster : ', 'Cheapest per pack: ', 'La más barata por sobre: ', 'A mais barata por booster: ') + best.nom + ' (' + O.euros(best.parBooster) + O.t(' le booster).', ' per pack).', ' el sobre).', ' por booster).');
    }
    O.texte('rMessage', msg);
  }

  var ids = ['cartesParBooster', 'prixUnite'];
  OFFRES.forEach(function (k) { ids.push('nom' + k, 'prix' + k, 'nb' + k, 'port' + k); });
  O.surChangement(ids, calculer);
  calculer();
}());
