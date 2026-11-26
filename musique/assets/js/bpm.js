/* BPM en millisecondes : durées des notes (normale, pointée, triolet) en ms et en Hz ; conversion inverse ms -> BPM. */
(function () {
  'use strict';
  var MU = window.MU, $ = MU.$;
  var champ = $('bpmValeur');
  if (!champ) { return; }
  var champMs = $('bpmMs'), selNote = $('bpmNote'), elInverse = $('bpmInverse'), elTerme = $('bpmTerme');
  var VARIANTES = ['normale', 'pointee', 'triolet'];

  function remplir() {
    var b = MU.borner(champ.value, 20, 300, 120);
    MU.dureesNotes(b).forEach(function (d) {
      VARIANTES.forEach(function (v) {
        var ms = $('bpm-' + d.id + '-' + v), hz = $('bpm-' + d.id + '-' + v + '-hz');
        if (ms) { ms.textContent = MU.nf(d[v], 2) + ' ms'; }
        if (hz) { hz.textContent = MU.nf(MU.hzDeMs(d[v]), 2) + ' Hz'; }
      });
    });
    var t = MU.termeTempo(b);
    if (elTerme) { elTerme.textContent = MU.nf(b, b % 1 ? 1 : 0) + ' bpm : ' + (t ? t.terme + ' (' + t.sens + ', indicatif)' : ''); }
  }
  function inverse() {
    var noires = 1;
    MU.NOTES_DUREES.forEach(function (x) { if (x[0] === selNote.value) { noires = x[2]; } });
    var b = MU.bpmDeMs(champMs.value, noires);
    elInverse.textContent = isFinite(b) ? MU.nf(b, 2) + ' bpm' + (b < 20 || b > 300 ? ' (hors de la plage habituelle 20-300)' : '') : 'Entrez une durée en ms (de 1 à 600 000).';
  }
  champ.addEventListener('input', function () { if (champ.value !== '') { remplir(); } });
  champ.addEventListener('change', function () { champ.value = String(MU.borner(champ.value, 20, 300, 120)); remplir(); });
  champMs.addEventListener('input', inverse);
  selNote.addEventListener('change', inverse);
  remplir();
  inverse();
}());
