/* Traducteur braille français (intégral) : texte <-> caractères braille Unicode, en direct. */
(function () {
  'use strict';
  var CQ = window.CQ, $ = CQ.el, CO = window.CO;
  var texte = $('br-texte'), braille = $('br-braille'), msg = $('br-msg');
  function message(t, ko) { msg.textContent = t; msg.classList.toggle('ko', !!ko); }
  function depuisTexte() {
    var r = CO.texteVersBraille(texte.value);
    braille.value = r.braille;
    message(r.inconnus.length ? 'Pas dans la table du braille français, laissé tel quel : ' + r.inconnus.join(' ') : '', r.inconnus.length > 0);
  }
  function depuisBraille() {
    var r = CO.brailleVersTexte(braille.value);
    texte.value = r.texte;
    message(r.inconnus ? r.inconnus + ' signe(s) non reconnu(s), affiché(s) □ (braille abrégé ou signe hors table ?)' : '', r.inconnus > 0);
  }
  texte.addEventListener('input', depuisTexte);
  braille.addEventListener('input', depuisBraille);
  $('br-copier-braille').addEventListener('click', function () { CQ.copier(braille.value, 'Braille copié'); });
  $('br-copier-texte').addEventListener('click', function () { CQ.copier(texte.value, 'Texte copié'); });
  $('br-effacer').addEventListener('click', function () { texte.value = ''; braille.value = ''; message(''); texte.focus(); });
  depuisTexte();
}());
