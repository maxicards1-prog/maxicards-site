/* Test du son et des haut-parleurs : gauche, droite, balayage de fréquences, basses. Volume prudent, jamais plus de 0,5 de gain. */
(function () {
  'use strict';
  var TP = window.TP, $ = TP.$, T = TP.t;
  var ctx = null, osc = null, env = null, pan = null, maitre = null, tFin = 0, raf = 0, debut = 0, dureeBal = 0;
  var vol = $('sonVol'), volTxt = $('sonVolTxt'), verdict = $('sonVerdict'), affFreq = $('sonFreqAff'), barreF = $('sonBarre');

  function init() {
    if (ctx) { if (ctx.state === 'suspended') { ctx.resume(); } return true; }
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) { TP.verdict(verdict, 'ko', T('Navigateur non compatible'), T('Ce navigateur ne sait pas produire de sons de test.')); return false; }
    ctx = new C();
    maitre = ctx.createGain(); maitre.gain.value = TP.gainDepuisCurseur(vol.value);
    maitre.connect(ctx.destination);
    return true;
  }
  function arreter(message) {
    clearTimeout(tFin); cancelAnimationFrame(raf); raf = 0;
    if (osc && ctx) {
      var o = osc, e = env, t = ctx.currentTime;
      try { e.gain.cancelScheduledValues(t); e.gain.setValueAtTime(e.gain.value, t); e.gain.linearRampToValueAtTime(0, t + 0.06); o.stop(t + 0.08); } catch (x) { /* déjà arrêté */ }
    }
    osc = null; env = null; pan = null;
    affFreq.textContent = '–'; barreF.style.width = '0%';
    if (message !== false) { TP.verdict(verdict, 'attente', T('Son arrêté'), T('Choisissez un test ci-dessous.')); }
  }
  function lancer(freq, panVal, dureeS, texte, balayage) {
    if (!init()) { return; }
    arreter(false);
    osc = ctx.createOscillator(); env = ctx.createGain(); pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    osc.type = 'sine'; osc.frequency.value = freq;
    env.gain.value = 0;
    osc.connect(env);
    if (pan) { pan.pan.value = panVal; env.connect(pan); pan.connect(maitre); } else { env.connect(maitre); }
    var t = ctx.currentTime;
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(1, t + 0.08);
    if (balayage) { osc.frequency.setValueAtTime(balayage[0], t); osc.frequency.exponentialRampToValueAtTime(balayage[1], t + dureeS); }
    osc.start(t);
    var o = osc;
    env.gain.setValueAtTime(1, t + dureeS - 0.1); env.gain.linearRampToValueAtTime(0, t + dureeS);
    o.stop(t + dureeS + 0.05);
    tFin = setTimeout(function () { if (osc === o) { arreter(false); TP.verdict(verdict, 'attente', T('Test terminé'), T('Avez-vous entendu le son du bon côté, sans craquements ? Sinon, voir la liste « Si ça ne marche pas » plus bas.')); } }, dureeS * 1000 + 150);
    TP.verdict(verdict, 'info', texte, T('Écoutez : le son doit venir du côté indiqué, net, sans craquements. Cliquez sur « Arrêter » à tout moment.'));
    debut = ctx.currentTime; dureeBal = dureeS;
    var f0 = balayage ? balayage[0] : freq, f1 = balayage ? balayage[1] : freq;
    (function maj() {
      if (!osc) { return; }
      var f = balayage ? TP.freqBalayage(ctx.currentTime - debut, dureeBal, f0, f1) : f0;
      affFreq.textContent = TP.nf(f, 0) + ' Hz';
      barreF.style.width = Math.round(100 * Math.log(f / 20) / Math.log(1000)) + '%';
      raf = requestAnimationFrame(maj);
    }());
  }
  function freqLibre() { var v = +$('sonFreq').value; return isFinite(v) && v >= 20 && v <= 20000 ? v : 440; }
  $('sonGauche').addEventListener('click', function () { lancer(freqLibre(), -1, 3, T('Son à GAUCHE seulement')); });
  $('sonDroite').addEventListener('click', function () { lancer(freqLibre(), 1, 3, T('Son à DROITE seulement')); });
  $('sonCentre').addEventListener('click', function () { lancer(freqLibre(), 0, 3, T('Son des deux côtés')); });
  $('sonBalayage').addEventListener('click', function () { lancer(20, 0, 20, T('Balayage de 20 Hz à 20 000 Hz (20 secondes)'), [20, 20000]); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-basse]'), function (b) {
    b.addEventListener('click', function () { var f = +b.getAttribute('data-basse'); lancer(f, 0, 4, T('Note grave à {f} Hz', { f: f })); });
  });
  $('sonStop').addEventListener('click', function () { arreter(); });
  vol.addEventListener('input', function () {
    volTxt.textContent = T('{n} %', { n: vol.value });
    if (maitre) { maitre.gain.setTargetAtTime(TP.gainDepuisCurseur(vol.value), ctx.currentTime, 0.02); }
  });
  window.addEventListener('pagehide', function () { arreter(false); if (ctx && ctx.close) { ctx.close().catch(function () { /* ok */ }); ctx = null; } });
  volTxt.textContent = T('{n} %', { n: vol.value });
}());
