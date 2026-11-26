/* ROT13 et Atbash : le même geste chiffre et déchiffre. Le chiffre utilisé est lu sur la section (data-chiffre). */
(function () {
  'use strict';
  var CQ = window.CQ, $ = CQ.el, CO = window.CO;
  var section = document.querySelector('.outil[data-chiffre]');
  if (!section) { return; }
  var genre = section.getAttribute('data-chiffre');
  var texte = $('cs-texte'), res = $('cs-res'), accents = $('cs-accents');
  function maj() {
    var t = accents.checked ? CO.sansAccents(texte.value) : texte.value;
    res.value = genre === 'atbash' ? CO.atbash(t, false) : CO.rot13(t);
  }
  [texte, accents].forEach(function (el) { el.addEventListener('input', maj); el.addEventListener('change', maj); });
  $('cs-copier').addEventListener('click', function () { CQ.copier(res.value, 'Résultat copié'); });
  $('cs-inverser').addEventListener('click', function () { texte.value = res.value; maj(); texte.focus(); });
  maj();
}());
