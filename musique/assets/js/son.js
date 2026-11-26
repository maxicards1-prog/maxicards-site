/* Outils du musicien : sons (Web Audio). L'AudioContext n'est créé qu'au premier clic ; aucun son sans clic.
   Corde pincée : PeriodicWave (harmoniques décroissantes) + filtre qui se referme + enveloppe ; la hauteur est exacte. */
(function () {
  'use strict';
  var MU = window.MU;
  var S = MU.son = {};
  var ctx = null, vagueCorde = null;
  S.PLAFOND = 0.5;   // gain maximal (volume à 100 %)
  S.dispo = function () { return !!(window.AudioContext || window.webkitAudioContext); };
  // À appeler seulement depuis un gestionnaire de clic ou de touche.
  S.contexte = function () {
    if (!ctx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) { return null; }
      ctx = new C();
    }
    if (ctx.state === 'suspended' && ctx.resume) { ctx.resume().catch(function () { /* ok */ }); }
    return ctx;
  };
  S.existant = function () { return ctx; };
  function gainDe(volume) { var v = MU.bornerVolume(volume); return S.PLAFOND * v * v; }   // courbe douce
  function vague(c) {
    if (!vagueCorde) {
      var h = MU.harmoniquesCorde(32), re = new Float32Array(h.length + 1), im = new Float32Array(h.length + 1);
      for (var k = 0; k < h.length; k++) { im[k + 1] = h[k]; }
      vagueCorde = c.createPeriodicWave(re, im);
    }
    return vagueCorde;
  }
  // Note de corde pincée (s'éteint seule). Renvoie {arreter()}.
  S.corde = function (freq, volume, duree) {
    var c = S.contexte();
    if (!c) { return null; }
    var f = MU.bornerFreq(freq), d = MU.borner(duree, 0.3, 6, 2.5), t = c.currentTime + 0.01;
    var osc = c.createOscillator(), filtre = c.createBiquadFilter(), g = c.createGain();
    osc.setPeriodicWave(vague(c));
    osc.frequency.setValueAtTime(f, t);
    filtre.type = 'lowpass';
    filtre.frequency.setValueAtTime(Math.min(16000, f * 14), t);
    filtre.frequency.setTargetAtTime(Math.min(16000, f * 3), t, d / 5);
    var v = gainDe(volume);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.005);
    g.gain.setTargetAtTime(0, t + 0.005, d / 4.5);
    osc.connect(filtre); filtre.connect(g); g.connect(c.destination);
    osc.start(t); osc.stop(t + d + 0.1);
    var fini = false;
    osc.onended = function () { fini = true; try { g.disconnect(); } catch (e) { /* ok */ } };
    return {
      arreter: function () {
        if (fini) { return; }
        var n = c.currentTime;
        g.gain.cancelScheduledValues(n);
        g.gain.setValueAtTime(g.gain.value, n);
        g.gain.linearRampToValueAtTime(0, n + 0.03);
        try { osc.stop(n + 0.04); } catch (e) { /* déjà arrêté */ }
      }
    };
  };
  // Son tenu (sinus ou triangle) : fondu d'entrée et de sortie de 30 ms (aucun clic). Renvoie {frequence(f), volume(v), arreter()}.
  S.tenue = function (freq, type, volume) {
    var c = S.contexte();
    if (!c) { return null; }
    var t = c.currentTime + 0.01, osc = c.createOscillator(), g = c.createGain(), fini = false;
    osc.type = type === 'triangle' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(MU.bornerFreq(freq), t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gainDe(volume), t + 0.03);
    osc.connect(g); g.connect(c.destination);
    osc.start(t);
    osc.onended = function () { try { g.disconnect(); } catch (e) { /* ok */ } };
    return {
      frequence: function (f) { if (!fini) { osc.frequency.setTargetAtTime(MU.bornerFreq(f), c.currentTime, 0.01); } },
      volume: function (v) { if (!fini) { g.gain.setTargetAtTime(gainDe(v), c.currentTime, 0.02); } },
      arreter: function () {
        if (fini) { return; }
        fini = true;
        var n = c.currentTime;
        g.gain.cancelScheduledValues(n);
        g.gain.setValueAtTime(g.gain.value, n);
        g.gain.linearRampToValueAtTime(0, n + 0.03);
        osc.stop(n + 0.04);
      }
    };
  };
  // Clic de métronome programmé à l'instant t (horloge de l'AudioContext). niveau : 3 accent, 2 appui, 1 temps, 0 subdivision.
  var HAUTEURS = [800, 1000, 1250, 1600], FORCES = [0.45, 0.75, 0.9, 1];
  S.clic = function (t, niveau, volume) {
    var c = ctx;
    if (!c) { return; }
    var nv = Math.max(0, Math.min(3, niveau | 0)), v = gainDe(volume) * 1.6 * FORCES[nv];
    var osc = c.createOscillator(), g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(HAUTEURS[nv], t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(Math.max(0.0002, v), t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.connect(g); g.connect(c.destination);
    osc.start(t); osc.stop(t + 0.07);
    osc.onended = function () { try { g.disconnect(); } catch (e) { /* ok */ } };
  };
}());
