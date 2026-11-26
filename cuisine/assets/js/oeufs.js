/* Cuisson des œufs avec minuteur intégré. */
(function () {
  'use strict';
  var CQ = window.CQ, CU = window.CU;
  var fin = 0, minuterie = null, restant = 0;
  function mmss(s) { s = Math.max(0, Math.round(s)); var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
  function bip() {
    try {
      var C = window.AudioContext || window.webkitAudioContext; if (!C) { return; }
      var c = new C(), o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.value = 0.2;
      o.start(); o.stop(c.currentTime + 0.6);
    } catch (e) { /* pas de son : le texte suffit */ }
  }
  function recalcul() {
    var x = CU.oeuf(CQ.valeur('type'), CQ.coche('froid'));
    CQ.texte('rTemps', mmss(x.secondes));
    CQ.texte('phrase', x.o.detail + (CQ.coche('froid') && x.secondes !== x.o.min * 60 ? ' Œuf sorti du frigo : 30 secondes de plus.' : ''));
    if (!minuterie) { CQ.texte('rMinuteur', mmss(x.secondes)); }
  }
  function arreter() { if (minuterie) { clearInterval(minuterie); minuterie = null; } }
  function demarrer() {
    arreter();
    var x = CU.oeuf(CQ.valeur('type'), CQ.coche('froid'));
    fin = Date.now() + x.secondes * 1000;
    CQ.texte('etatMinuteur', 'Plongez l\'œuf dans l\'eau qui bout, puis attendez.');
    minuterie = setInterval(function () {
      restant = (fin - Date.now()) / 1000;
      if (restant <= 0) { arreter(); CQ.texte('rMinuteur', '0:00'); CQ.texte('etatMinuteur', 'C\'est prêt : sortez l\'œuf et passez-le sous l\'eau froide.'); bip(); return; }
      CQ.texte('rMinuteur', mmss(restant));
    }, 250);
  }
  document.getElementById('lancer').addEventListener('click', demarrer);
  document.getElementById('stop').addEventListener('click', function () { arreter(); CQ.texte('etatMinuteur', 'Minuteur arrêté.'); recalcul(); });
  CQ.surChangement(['type', 'froid'], function () { arreter(); recalcul(); });
  CQ.initPartage(recalcul);
}());
