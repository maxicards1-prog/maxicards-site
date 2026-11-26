/* Métronome précis : un minuteur de 25 ms programme les clics à l'avance (horizon 0,1 s) sur l'horloge de l'AudioContext
   (MU.prochainsClics, fonction pure testée). Le son ne démarre qu'au clic. Il continue quand on change d'onglet
   (horizon allongé à 1,2 s car les minuteurs ralentissent) et s'arrête en quittant la page. */
(function () {
  'use strict';
  var MU = window.MU, $ = MU.$;
  var btn = $('metDemarrer');
  if (!btn) { return; }
  var champ = $('metBpm'), curseur = $('metCurseur'), selMesure = $('metMesure'), selSub = $('metSubdiv');
  var caseAccent = $('metAccent'), curseurVol = $('metVolume'), elVol = $('metVolumeValeur');
  var zonePoints = $('metPoints'), elTerme = $('metTerme'), elEtat = $('metEtat'), btnTaper = $('metTaper');
  var MINUTEUR_MS = 25, HORIZON = 0.1, HORIZON_CACHE = 1.2;
  var bpm = 100, marche = false, minuteur = 0, raf = 0, etat = null, file = [], points = [], taps = [];
  var reduit = MU.mouvementReduit();

  function mesure() { return MU.MESURES[selMesure.value] ? selMesure.value : '4/4'; }
  function subdiv() { var s = Math.round(MU.borner(selSub.value, 1, 4, 1)); return s; }
  function volume() { return MU.bornerVolume(Number(curseurVol.value) / 100); }
  function annoncer(t) { if (elEtat.textContent !== t) { elEtat.textContent = t; } }

  function regler(v, depuis) {
    bpm = MU.bornerBpm(v);
    if (depuis !== champ) { champ.value = String(bpm); }
    if (depuis !== curseur) { curseur.value = String(bpm); }
    var t = MU.termeTempo(bpm);
    elTerme.textContent = t ? t.terme + ' (' + t.sens + ', indicatif)' : '';
    if (etat) { etat.bpm = bpm; }
  }
  function construirePoints() {
    MU.vider(zonePoints); points = [];
    var m = MU.MESURES[mesure()];
    for (var i = 0; i < m.temps && i < 12; i++) {
      var p = MU.creer('span', 'met-point' + (m.accents[i] === 3 ? ' fort' : m.accents[i] === 2 ? ' appui' : ''));
      p.setAttribute('aria-hidden', 'true');
      zonePoints.appendChild(p);
      points.push(p);
    }
  }
  function allumer(i) {
    points.forEach(function (p, k) { p.classList.toggle('allume', k === i); });
  }

  /* ---------- programmation ---------- */
  function programmer() {
    var c = MU.son.existant();
    if (!marche || !c) { return; }
    var maintenant = c.currentTime;
    if (etat.prochain < maintenant - 0.2) { etat.prochain = maintenant + 0.05; }   // retard (onglet endormi) : on se recale
    etat.bpm = bpm; etat.mesure = mesure(); etat.subdiv = subdiv(); etat.accent = caseAccent.checked;
    var r = MU.prochainsClics(etat, maintenant + (document.hidden ? HORIZON_CACHE : HORIZON));
    etat = r.etat;
    var v = volume();
    r.clics.forEach(function (k) {
      MU.son.clic(k.t, k.niveau, v);
      if (k.sub === 0 && file.length < 64) { file.push(k); }
    });
  }
  function dessiner() {
    if (!marche) { return; }
    var c = MU.son.existant();
    if (c) {
      var der = null;
      while (file.length && file[0].t <= c.currentTime) { der = file.shift(); }
      if (der && !reduit) { allumer(der.temps); }
    }
    raf = requestAnimationFrame(dessiner);
  }
  function demarrer() {
    var c = MU.son.contexte();
    if (!c) { annoncer('Ce navigateur ne sait pas produire de son.'); return; }
    marche = true;
    etat = { prochain: c.currentTime + 0.06, temps: 0, sub: 0, bpm: bpm, mesure: mesure(), subdiv: subdiv(), accent: caseAccent.checked };
    file = [];
    programmer();
    minuteur = setInterval(programmer, MINUTEUR_MS);
    raf = requestAnimationFrame(dessiner);
    btn.textContent = 'Arrêter';
    btn.setAttribute('aria-pressed', 'true');
    annoncer('Métronome en marche : ' + bpm + ' bpm, ' + mesure() + '.');
  }
  function arreter() {
    marche = false;
    clearInterval(minuteur); minuteur = 0;
    cancelAnimationFrame(raf);
    file = []; etat = null;
    allumer(-1);
    btn.textContent = 'Démarrer';
    btn.setAttribute('aria-pressed', 'false');
    annoncer('Métronome arrêté.');
  }
  function basculer() { if (marche) { arreter(); } else { demarrer(); } }

  /* ---------- commandes ---------- */
  btn.addEventListener('click', basculer);
  champ.addEventListener('input', function () { if (champ.value !== '') { regler(champ.value, champ); } });
  champ.addEventListener('change', function () { regler(champ.value); });
  curseur.addEventListener('input', function () { regler(curseur.value, curseur); });
  [['metMoins5', -5], ['metMoins1', -1], ['metPlus1', 1], ['metPlus5', 5]].forEach(function (x) {
    var b = $(x[0]);
    if (b) { b.addEventListener('click', function () { regler(bpm + x[1]); }); }
  });
  selMesure.addEventListener('change', function () {
    construirePoints();
    if (etat) { etat.temps = 0; etat.sub = 0; }
  });
  selSub.addEventListener('change', function () { if (etat) { etat.sub = 0; } });
  curseurVol.addEventListener('input', function () { elVol.textContent = MU.nf(Math.round(volume() * 100), 0) + ' %'; });
  if (btnTaper) {
    btnTaper.addEventListener('click', function () {
      taps = MU.ajouterTap(taps, performance.now());
      var b = MU.bpmDeTaps(taps);
      if (b) { regler(b.arrondi); annoncer('Tempo tapé : ' + MU.bornerBpm(b.arrondi) + ' bpm (' + b.frappes + ' frappes).'); } else { annoncer('Continuez à taper en rythme…'); }
    });
  }
  // Barre d'espace : démarrer / arrêter, sauf si le focus est dans un champ ou sur un bouton.
  document.addEventListener('keydown', function (e) {
    if ((e.key === ' ' || e.code === 'Space') && !e.repeat && !e.ctrlKey && !e.altKey && !e.metaKey && !MU.dansUnChamp(e.target)) {
      e.preventDefault();
      basculer();
    }
  });
  window.addEventListener('pagehide', function () { if (marche) { arreter(); } });

  var depuisAdresse = MU.lireBpmAdresse(location.search);
  regler(depuisAdresse !== null ? depuisAdresse : champ.value || 100);
  construirePoints();
  elVol.textContent = MU.nf(Math.round(volume() * 100), 0) + ' %';
  btn.setAttribute('aria-pressed', 'false');
}());
