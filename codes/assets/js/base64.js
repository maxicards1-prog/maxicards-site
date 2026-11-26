/* Base64 (RFC 4648) : encoder et décoder du texte UTF-8, variante « base64url » en option. */
(function () {
  'use strict';
  var CQ = window.CQ, $ = CQ.el, CO = window.CO;
  var texte = $('b6-texte'), code = $('b6-code'), url = $('b6-url'), msg = $('b6-msg');
  var ERREURS = {
    caractere: 'Caractère interdit : le Base64 n\'utilise que A-Z, a-z, 0-9, + et / (ou - et _), avec = à la fin.',
    longueur: 'Longueur impossible : il manque au moins un caractère à la fin.'
  };
  function message(t, ko) { msg.textContent = t; msg.classList.toggle('ko', !!ko); }
  function depuisTexte() { code.value = CO.base64Encoder(texte.value, url.checked); message(''); }
  function depuisCode() {
    var r = CO.base64Decoder(code.value);
    texte.value = r.texte;
    if (r.erreur === 'utf8') { message('Décodé (' + r.octets + ' octets), mais ce n\'est pas du texte : sans doute un fichier (image, PDF…).', true); } else if (r.erreur) { message(ERREURS[r.erreur], true); } else { message(r.octets ? r.octets + ' octets décodés' : '', false); }
  }
  texte.addEventListener('input', depuisTexte);
  code.addEventListener('input', depuisCode);
  url.addEventListener('change', depuisTexte);
  $('b6-copier').addEventListener('click', function () { CQ.copier(code.value, 'Base64 copié'); });
  $('b6-copier-texte').addEventListener('click', function () { CQ.copier(texte.value, 'Texte copié'); });
  $('b6-effacer').addEventListener('click', function () { texte.value = ''; code.value = ''; message(''); texte.focus(); });
  depuisTexte();
}());
