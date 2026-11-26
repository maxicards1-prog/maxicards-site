/* Chiffre de Vigenère : chiffrer ou déchiffrer avec une clé (lettres seulement, 50 au plus). */
(function () {
  'use strict';
  var CQ = window.CQ, $ = CQ.el, CO = window.CO;
  var texte = $('vi-texte'), cle = $('vi-cle'), mode = $('vi-mode'), accents = $('vi-accents'), res = $('vi-res'), msg = $('vi-msg');
  function maj() {
    var k = CO.cleVigenere(cle.value);
    res.value = CO.vigenere(texte.value, k, mode.value === 'dechiffrer', accents.checked);
    msg.textContent = k ? 'Clé utilisée : ' + k + ' (' + k.length + ' lettre' + (k.length > 1 ? 's' : '') + ')' : 'Écrivez une clé (des lettres) : sans clé, le texte ne change pas.';
    msg.classList.toggle('ko', !k);
  }
  [texte, cle, mode, accents].forEach(function (el) { el.addEventListener('input', maj); el.addEventListener('change', maj); });
  $('vi-copier').addEventListener('click', function () { CQ.copier(res.value, 'Résultat copié'); });
  $('vi-inverser').addEventListener('click', function () {
    texte.value = res.value;
    mode.value = mode.value === 'dechiffrer' ? 'chiffrer' : 'dechiffrer';
    maj();
  });
  maj();
}());
