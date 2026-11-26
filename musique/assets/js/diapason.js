/* Diapason / générateur de note : aucun son avant un clic ; fondu de 30 ms à l'arrêt ; volume plafonné.
   Le son s'arrête en quittant la page et quand l'onglet est caché. */
(function () {
  'use strict';
  var MU = window.MU, $ = MU.$;
  var zoneNotes = $('diaNotes');
  if (!zoneNotes) { return; }
  var selOct = $('diaOctave'), champLa = $('diaLa'), selTimbre = $('diaTimbre'), curseurVol = $('diaVolume');
  var btnJ = $('diaJouer'), btnS = $('diaArreter'), champLibre = $('diaLibre'), btnLibre = $('diaLibreJouer');
  var elNom = $('diaNom'), elHz = $('diaHz'), elEtat = $('diaEtat'), elVol = $('diaVolumeValeur');
  var boutons = Array.prototype.slice.call(zoneNotes.querySelectorAll('button[data-pc]'), 0, 12);
  var pc = 9, source = 'note', tenue = null, pincee = null;

  function volume() { return MU.bornerVolume((curseurVol ? Number(curseurVol.value) : 30) / 100); }
  function frequence() {
    if (source === 'libre') { return MU.bornerFreq(champLibre.value); }
    return MU.freqDeMidi(12 * (MU.bornerOctave(selOct.value) + 1) + pc, MU.bornerLa(champLa.value));
  }
  function afficher() {
    var f = frequence();
    if (source === 'libre') {
      var p = MU.noteProche(f, MU.bornerLa(champLa.value));
      elNom.textContent = 'Fréquence libre' + (p ? ' (proche de ' + p.fr + p.octave + ', ' + MU.texteCents(p.cents) + ')' : '');
    } else {
      var n = MU.nomNote(12 * (MU.bornerOctave(selOct.value) + 1) + pc);
      elNom.textContent = n.fr + n.octave + ' (' + n.en + n.octave + ')';
    }
    elHz.textContent = MU.nf(f, 2) + ' Hz';
    boutons.forEach(function (b) { b.setAttribute('aria-pressed', source === 'note' && Number(b.getAttribute('data-pc')) === pc ? 'true' : 'false'); });
    if (elVol) { elVol.textContent = MU.nf(Math.round(volume() * 100), 0) + ' %'; }
    if (tenue) { tenue.frequence(f); }
  }
  function etat(t) { if (elEtat.textContent !== t) { elEtat.textContent = t; } }
  function arreter() {
    if (tenue) { tenue.arreter(); tenue = null; }
    if (pincee) { pincee.arreter(); pincee = null; }
    btnS.disabled = true;
    etat('Son arrêté.');
  }
  function jouer() {
    var f = frequence(), timbre = selTimbre.value;
    if (!MU.son.dispo()) { etat('Ce navigateur ne sait pas produire de son.'); return; }
    if (timbre === 'corde') {
      if (tenue) { tenue.arreter(); tenue = null; }
      if (pincee) { pincee.arreter(); }
      pincee = MU.son.corde(f, volume(), 3.5);
    } else if (tenue) {
      tenue.frequence(f);
    } else {
      tenue = MU.son.tenue(f, timbre === 'triangle' ? 'triangle' : 'sine', volume());
    }
    btnS.disabled = false;
    etat('Lecture : ' + elNom.textContent + ', ' + elHz.textContent + '.');
  }

  boutons.forEach(function (b) {
    b.addEventListener('click', function () {
      pc = Math.round(MU.borner(b.getAttribute('data-pc'), 0, 11, 9));
      source = 'note';
      afficher();
      if (tenue || selTimbre.value === 'corde') { jouer(); }
    });
  });
  selOct.addEventListener('change', function () { source = 'note'; afficher(); if (tenue) { jouer(); } });
  champLa.addEventListener('input', afficher);
  champLa.addEventListener('change', function () { champLa.value = String(MU.bornerLa(champLa.value)); afficher(); });
  selTimbre.addEventListener('change', function () { if (tenue) { tenue.arreter(); tenue = null; jouer(); } });
  if (curseurVol) { curseurVol.addEventListener('input', function () { afficher(); if (tenue) { tenue.volume(volume()); } }); }
  champLibre.addEventListener('input', function () { source = 'libre'; afficher(); });
  champLibre.addEventListener('change', function () { champLibre.value = String(Math.round(MU.bornerFreq(champLibre.value) * 100) / 100); source = 'libre'; afficher(); });
  if (btnLibre) { btnLibre.addEventListener('click', function () { source = 'libre'; champLibre.value = String(Math.round(MU.bornerFreq(champLibre.value) * 100) / 100); afficher(); jouer(); }); }
  btnJ.addEventListener('click', jouer);
  btnS.addEventListener('click', arreter);
  window.addEventListener('pagehide', arreter);
  document.addEventListener('visibilitychange', function () { if (document.hidden && (tenue || pincee)) { arreter(); } });
  btnS.disabled = true;
  afficher();
}());
