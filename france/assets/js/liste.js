/* Outil « Liste des départements » : tri par colonne et filtre, sur les 101 départements. */
(function () {
  'use strict';
  var FR = window.FR, U = window.FRU;
  if (!FR || !U) { return; }
  var corps = U.el('corpsListe'), filtre = U.el('filtreListe'), compte = U.el('compteListe');
  var boutons = document.querySelectorAll('button[data-tri]');
  if (!corps || !filtre) { return; }
  var liste = null, tri = 'code', sens = 'asc';

  function cellule(tr, texte, classe) {
    var td = U.creer('td', classe || null, texte);
    tr.appendChild(td);
    return td;
  }
  function rendre() {
    if (!liste) { return; }
    var l = FR.trier(FR.filtrer(liste, filtre.value), tri, sens);
    var frag = document.createDocumentFragment();
    l.forEach(function (d) {
      var tr = document.createElement('tr');
      cellule(tr, d.c, 'code');
      var td = U.creer('td');
      td.appendChild(U.lien(d, d.n));
      tr.appendChild(td);
      cellule(tr, d.p);
      cellule(tr, d.r);
      cellule(tr, FR.fr(d.pop) + (d.a !== 2023 ? ' (' + d.a + ')' : ''), 'nombre');
      cellule(tr, FR.fr(d.s, d.s < 100 ? 1 : 0), 'nombre');
      cellule(tr, FR.fr(d.pop / d.s), 'nombre');
      cellule(tr, FR.fr(d.com), 'nombre');
      frag.appendChild(tr);
    });
    U.vider(corps);
    corps.appendChild(frag);
    compte.textContent = l.length === liste.length ? 'Les ' + l.length + ' départements' :
      (l.length ? l.length + ' département' + (l.length > 1 ? 's' : '') + ' sur ' + liste.length : 'Aucun département ne correspond.');
    Array.prototype.forEach.call(boutons, function (b) {
      var th = b.parentNode;
      var actif = b.getAttribute('data-tri') === tri;
      th.setAttribute('aria-sort', actif ? (sens === 'asc' ? 'ascending' : 'descending') : 'none');
      b.setAttribute('data-fleche', actif ? (sens === 'asc' ? '▲' : '▼') : '');
    });
  }
  Array.prototype.forEach.call(boutons, function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-tri');
      if (k === tri) { sens = sens === 'asc' ? 'desc' : 'asc'; }
      else { tri = k; sens = (k === 'pop' || k === 'sup' || k === 'dens' || k === 'com') ? 'desc' : 'asc'; }
      U.ecrire(tri === 'code' && sens === 'asc' ? {} : { tri: tri, sens: sens });
      rendre();
    });
  });
  filtre.addEventListener('input', rendre);
  U.donnees().then(function (l) {
    liste = l;
    var t = FR.cleValide(U.param('tri') || '');
    if (t) { tri = t; sens = U.param('sens') === 'desc' ? 'desc' : 'asc'; }
    rendre();
  }, function () {
    U.erreur('erreurOutil', "Le tri n'a pas pu être chargé : le tableau ci-dessous reste lisible, dans l'ordre des numéros.");
  });
  U.partage();
})();
