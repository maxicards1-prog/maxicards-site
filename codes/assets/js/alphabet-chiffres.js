/* Alphabet en chiffres (A = 1 … Z = 26) dans les deux sens. */
(function () {
  'use strict';
  var CQ = window.CQ, $ = CQ.el, CO = window.CO;
  var texte = $('ac-texte'), nombres = $('ac-nombres'), msg = $('ac-msg');
  function message(t, ko) { msg.textContent = t; msg.classList.toggle('ko', !!ko); }
  texte.addEventListener('input', function () { nombres.value = CO.lettresVersNombres(texte.value); message(''); });
  nombres.addEventListener('input', function () {
    var r = CO.nombresVersLettres(nombres.value);
    texte.value = r.texte;
    message(r.inconnus ? r.inconnus + ' nombre(s) hors de 1 à 26, affiché(s) □' : '', r.inconnus > 0);
  });
  $('ac-copier').addEventListener('click', function () { CQ.copier(nombres.value, 'Nombres copiés'); });
  $('ac-copier-texte').addEventListener('click', function () { CQ.copier(texte.value, 'Texte copié'); });
  nombres.value = CO.lettresVersNombres(texte.value);
}());
