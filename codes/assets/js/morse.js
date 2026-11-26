/* Traducteur morse : texte <-> morse en direct, son et clignotement. Rien n'est envoyé ni gardé. */
(function () {
  'use strict';
  var $ = window.CQ.el, CO = window.CO;
  var texte = $('mo-texte'), morse = $('mo-morse'), msg = $('mo-msg');
  var vitesse = $('mo-vitesse'), freq = $('mo-freq'), lampeCase = $('mo-lampe-case'), sonCase = $('mo-son'), allonge = $('mo-allonge');
  var lampe = $('mo-lampe'), ecouter = $('mo-ecouter'), arreter = $('mo-arreter');
  var MAX_FLASH = 7;

  function message(t, ko) { msg.textContent = t; msg.classList.toggle('ko', !!ko); }

  function depuisTexte() {
    var r = CO.texteVersMorse(texte.value);
    morse.value = r.morse;
    var m = [];
    if (r.sansAccent.length) { m.push('Accent retiré (absent du morse international) : ' + r.sansAccent.join(' ')); }
    if (r.inconnus.length) { m.push('Sans équivalent dans la norme, non traduit : ' + r.inconnus.join(' ')); }
    message(m.join(' · '), r.inconnus.length > 0);
  }
  function depuisMorse() {
    var r = CO.morseVersTexte(morse.value);
    texte.value = r.texte;
    message(r.inconnus ? r.inconnus + ' code(s) inconnu(s), affiché(s) □. Séparez les lettres par une espace et les mots par une barre /.' : '', r.inconnus > 0);
  }
  function majReglages() {
    $('mo-vitesse-v').textContent = vitesse.value + ' mots/min';
    $('mo-freq-v').textContent = freq.value + ' Hz';
    lampe.classList.toggle('active', lampeCase.checked);
  }
  function fini() { ecouter.disabled = false; arreter.disabled = true; }

  texte.addEventListener('input', depuisTexte);
  morse.addEventListener('input', depuisMorse);
  [vitesse, freq, lampeCase].forEach(function (el) { el.addEventListener('input', majReglages); el.addEventListener('change', majReglages); });
  ecouter.addEventListener('click', function () {
    var mpm = CO.vitesseBornee(vitesse.value);
    if (lampeCase.checked && mpm > MAX_FLASH) {
      mpm = MAX_FLASH;
      message('Clignotement : vitesse ramenée à ' + MAX_FLASH + ' mots par minute (moins de 3 éclairs par seconde).', false);
    }
    var ok = window.SON.jouer(morse.value, {
      mpm: mpm, frequence: freq.value, allonge: allonge.checked, son: sonCase.checked,
      lampe: lampeCase.checked ? lampe : null, surFin: fini
    });
    if (ok) { ecouter.disabled = true; arreter.disabled = false; } else { message('Rien à jouer : écrivez un texte ou du morse.', true); }
  });
  arreter.addEventListener('click', function () { window.SON.arreter(); });
  $('mo-copier-morse').addEventListener('click', function () { window.CQ.copier(morse.value, 'Morse copié'); });
  $('mo-copier-texte').addEventListener('click', function () { window.CQ.copier(texte.value, 'Texte copié'); });
  $('mo-effacer').addEventListener('click', function () { window.SON.arreter(); texte.value = ''; morse.value = ''; message(''); texte.focus(); });
  majReglages();
  depuisTexte();
}());
