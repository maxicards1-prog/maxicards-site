/* Son et clignotement du morse (WebAudio). Tout est programmé d'avance sur l'horloge audio : le rythme reste juste
   même si la page est occupée. Clignotement : la page appelante limite la vitesse (au plus 3 éclairs par seconde). */
(function () {
  'use strict';
  var ctx = null, osc = null, gain = null, raf = 0, lampe = null, surFin = null;

  function arreter() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (lampe) { lampe.classList.remove('allumee'); lampe = null; }
    if (osc) {
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        osc.stop();
      } catch (e) { /* déjà arrêté */ }
      osc.disconnect();
      osc = null;
    }
    var f = surFin;
    surFin = null;
    if (f) { f(); }
  }

  // options : mpm, frequence, allonge (espaces allongés), son (vrai/faux), lampe (élément ou null), surFin (fonction)
  function jouer(morse, options) {
    arreter();
    var p = window.CO.planMorse(morse, !!options.allonge);
    if (!p.sons.length) { return false; }
    var unite = window.CO.dureePoint(options.mpm) / 1000;
    var AC = window.AudioContext || window.webkitAudioContext;
    var avecSon = options.son !== false && !!AC;
    if (avecSon && !ctx) { ctx = new AC(); }
    if (avecSon && ctx.state === 'suspended') { ctx.resume(); }
    var horloge = avecSon ? function () { return ctx.currentTime; } : function () { return performance.now() / 1000; };
    var debut = horloge() + 0.1;
    if (avecSon) {
      var f = Math.min(1000, Math.max(300, Number(options.frequence) || 600));
      var r = Math.min(0.005, unite / 4), vol = 0.45;
      osc = ctx.createOscillator();
      gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      p.sons.forEach(function (s) {
        var a = debut + s[0] * unite, b = a + s[1] * unite;
        gain.gain.setValueAtTime(0, a);
        gain.gain.linearRampToValueAtTime(vol, a + r);
        gain.gain.setValueAtTime(vol, b - r);
        gain.gain.linearRampToValueAtTime(0, b);
      });
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(Math.max(ctx.currentTime, debut - 0.05));
      osc.stop(debut + p.total * unite + 0.1);
    }
    lampe = options.lampe || null;
    surFin = options.surFin || null;
    var i = 0;
    function image() {
      var t = (horloge() - debut) / unite;
      if (t >= p.total + 0.5) { arreter(); return; }
      if (lampe) {
        while (i < p.sons.length && p.sons[i][0] + p.sons[i][1] <= t) { i += 1; }
        lampe.classList.toggle('allumee', i < p.sons.length && p.sons[i][0] <= t);
      }
      raf = requestAnimationFrame(image);
    }
    raf = requestAnimationFrame(image);
    return true;
  }

  window.SON = { jouer: jouer, arreter: arreter };
}());
