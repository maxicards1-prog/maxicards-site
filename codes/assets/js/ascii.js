/* Table ASCII : chercher un caractère, un code (décimal ou 0x..) ou un nom ; fiche du caractère tapé, même hors ASCII. */
(function () {
  'use strict';
  var CQ = window.CQ, $ = CQ.el, CO = window.CO;
  var cherche = $('as-cherche'), lignes = Array.prototype.slice.call(document.querySelectorAll('#as-corps tr'));
  var fiche = $('as-fiche');
  function ajouter(dl, terme, valeur) { dl.appendChild(CQ.cree('dt', '', terme)); dl.appendChild(CQ.cree('dd', '', valeur)); }
  function maj() {
    var q = cherche.value.slice(0, 40), brut = q, bas = q.trim().toLowerCase();
    var cible = -1;
    if (Array.from(brut).length === 1) { cible = brut.codePointAt(0); } else if (/^0x[0-9a-f]{1,2}$/.test(bas)) { cible = parseInt(bas.slice(2), 16); } else if (/^[0-9]{1,3}$/.test(bas)) { cible = Number(bas); }
    lignes.forEach(function (tr) {
      var dec = Number(tr.getAttribute('data-dec'));
      var montre = !bas && !brut ? true : cible >= 0 ? dec === cible : tr.textContent.toLowerCase().indexOf(bas) >= 0;
      tr.classList.toggle('cache', !montre);
      tr.classList.toggle('trouve', cible >= 0 && dec === cible);
    });
    CQ.vider(fiche);
    var info = Array.from(brut).length === 1 ? CO.infoCaractere(brut) : null;
    if (!info) { fiche.appendChild(CQ.cree('p', 'fiche-vide', 'Tapez un caractère (A, é, €…), un code (65, 0x41) ou un nom (tabulation).')); return; }
    var tete = CQ.cree('div', 'fiche-tete');
    tete.appendChild(CQ.cree('span', 'fiche-car fiche-car-code', info.car.trim() ? info.car : '␠'));
    tete.appendChild(CQ.cree('span', 'fiche-nom', info.ascii ? 'Caractère ASCII n° ' + info.dec : 'Hors ASCII : caractère Unicode ' + info.point));
    fiche.appendChild(tete);
    var dl = CQ.cree('dl', 'fiche-codes');
    ajouter(dl, 'Code (décimal)', String(info.dec));
    ajouter(dl, 'Point de code Unicode', info.point);
    ajouter(dl, 'Octets en UTF-8 (hexa)', info.octets);
    ajouter(dl, 'Octets en UTF-8 (binaire)', CO.texteVersBinaire(info.car, ' '));
    fiche.appendChild(dl);
  }
  cherche.addEventListener('input', maj);
  maj();
}());
