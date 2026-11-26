/* Binaire <-> texte et hexadécimal <-> texte (UTF-8). Le format est lu sur la section (data-format). */
(function () {
  'use strict';
  var CQ = window.CQ, $ = CQ.el, CO = window.CO;
  var section = document.querySelector('.outil[data-format]');
  if (!section) { return; }
  var hex = section.getAttribute('data-format') === 'hex';
  var texte = $('oc-texte'), code = $('oc-code'), msg = $('oc-msg'), sep = $('oc-sep'), maj = $('oc-maj');
  var ERREURS = {
    caractere: hex ? 'Seuls les chiffres 0 à 9 et les lettres A à F sont permis (les espaces et 0x sont acceptés).' : 'Seuls 0 et 1 sont permis (les espaces sont acceptés).',
    longueur: hex ? 'Il manque un chiffre : un octet s\'écrit avec 2 chiffres hexadécimaux.' : 'Il manque des bits : un octet compte 8 bits (séparez les octets par une espace).'
  };
  function message(t, ko) { msg.textContent = t; msg.classList.toggle('ko', !!ko); }
  function separateur() { return sep.value === 'aucun' ? '' : ' '; }
  function depuisTexte() {
    code.value = hex ? CO.texteVersHex(texte.value, separateur(), maj && maj.checked) : CO.texteVersBinaire(texte.value, separateur());
    var n = CO.utf8(texte.value).length;
    message(n ? n + ' octet' + (n > 1 ? 's' : '') + ' en UTF-8' : '', false);
  }
  function depuisCode() {
    var r = hex ? CO.hexVersTexte(code.value) : CO.binaireVersTexte(code.value);
    texte.value = r.texte;
    if (r.erreur === 'utf8') { message('Ces octets ne forment pas du texte UTF-8 valable (octet n° ' + r.rang + ').', true); } else if (r.erreur) { message(ERREURS[r.erreur], true); } else { message(r.octets ? r.octets + ' octet' + (r.octets > 1 ? 's' : '') + ' lus' : '', false); }
  }
  texte.addEventListener('input', depuisTexte);
  code.addEventListener('input', depuisCode);
  sep.addEventListener('change', depuisTexte);
  if (maj) { maj.addEventListener('change', depuisTexte); }
  $('oc-copier').addEventListener('click', function () { CQ.copier(code.value, 'Copié'); });
  $('oc-copier-texte').addEventListener('click', function () { CQ.copier(texte.value, 'Texte copié'); });
  $('oc-effacer').addEventListener('click', function () { texte.value = ''; code.value = ''; message(''); texte.focus(); });
  depuisTexte();
}());
