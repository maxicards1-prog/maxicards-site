/* Liste des pays : tri en cliquant sur un titre de colonne, filtre par continent et par nom. Les lignes sont déjà dans
   la page : le script les range et les montre ou les cache. La recherche n'est ni envoyée ni recopiée dans l'adresse. */
(function () {
  'use strict';
  var LP = window.LP;
  var corps = document.getElementById('corpsListe');
  if (!corps || !LP) { return; }
  var filtre = document.getElementById('filtre');
  var cont = document.getElementById('continentListe');
  var compte = document.getElementById('compteListe');
  var lignes = Array.prototype.slice.call(corps.querySelectorAll('tr')).map(function (tr) {
    return { el: tr, n: tr.getAttribute('data-n'), c: tr.getAttribute('data-c'), k: tr.getAttribute('data-k'), t: tr.getAttribute('data-t'),
      m: tr.getAttribute('data-m'), d: tr.getAttribute('data-d'), x: tr.getAttribute('data-x'), q: LP.normaliser(tr.getAttribute('data-q')) };
  });
  var entetes = Array.prototype.slice.call(document.querySelectorAll('th[data-cle]'));

  function trier(cle, sens) {
    var num = cle === 't';
    LP.trier(lignes, cle, sens, num).forEach(function (l) { corps.appendChild(l.el); });
    entetes.forEach(function (th) {
      if (th.getAttribute('data-cle') === cle) { th.setAttribute('aria-sort', sens === 'desc' ? 'descending' : 'ascending'); } else { th.removeAttribute('aria-sort'); }
    });
  }
  function filtrer() {
    var q = LP.normaliser(filtre.value);
    var k = cont.value;
    var n = 0;
    lignes.forEach(function (l) {
      var ok = (!k || l.k === k) && (!q || (' ' + l.q).indexOf(' ' + q) >= 0);
      l.el.hidden = !ok;
      if (ok) { n++; }
    });
    compte.textContent = n === lignes.length ? lignes.length + ' pays et territoires.' : n + ' sur ' + lignes.length + ' affichés.';
  }
  entetes.forEach(function (th) {
    var b = th.querySelector('button');
    if (!b) { return; }
    b.addEventListener('click', function () {
      var sens = th.getAttribute('aria-sort') === 'ascending' ? 'desc' : 'asc';
      trier(th.getAttribute('data-cle'), sens);
    });
  });
  filtre.addEventListener('input', filtrer);
  cont.addEventListener('change', filtrer);
  filtrer();
}());
