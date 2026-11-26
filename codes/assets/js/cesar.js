/* Code César : chiffrer, déchiffrer, et les 25 décalages essayés d'un coup. */
(function () {
  'use strict';
  var CQ = window.CQ, $ = CQ.el, CO = window.CO;
  var texte = $('ce-texte'), dec = $('ce-decalage'), mode = $('ce-mode'), accents = $('ce-accents'), res = $('ce-res'), essais = $('ce-essais');
  var ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function maj() {
    var d = Math.min(25, Math.max(1, Math.round(Number(dec.value)) || 3));
    $('ce-decalage-v').textContent = String(d);
    res.value = CO.cesar(texte.value, mode.value === 'dechiffrer' ? 26 - d : d, accents.checked);
    $('ce-clair').textContent = 'Clair :   ' + ABC;
    $('ce-chiffre').textContent = 'Chiffré : ' + CO.cesar(ABC, d, false);
    CQ.vider(essais);
    var tous = CO.essaisCesar(CO.sansAccents(texte.value).slice(0, 500)), m = CO.meilleurEssai(CO.sansAccents(texte.value).slice(0, 500));
    tous.forEach(function (x) {
      var li = CQ.cree('li', m && m[0] === x[0] ? 'meilleur' : '');
      li.appendChild(CQ.cree('span', 'dec', 'Décalage ' + x[0]));
      li.appendChild(CQ.cree('span', 'txt', x[1] || '–'));
      essais.appendChild(li);
    });
    $('ce-piste').textContent = m ? 'Piste : le décalage ' + m[0] + ' donne des mots français courants (ligne en couleur).' : 'Aucun décalage ne donne de mots français courants pour l\'instant.';
  }
  [texte, dec, mode, accents].forEach(function (el) { el.addEventListener('input', maj); el.addEventListener('change', maj); });
  $('ce-copier').addEventListener('click', function () { CQ.copier(res.value, 'Résultat copié'); });
  maj();
}());
