/* Tap tempo : clic, toucher, Espace ou Entrée. Remise à zéro après 2 s sans frappe ; moyenne des 12 dernières frappes. */
(function () {
  'use strict';
  var MU = window.MU, $ = MU.$;
  var zoneTap = $('tapZone');
  if (!zoneTap) { return; }
  var elBpm = $('tapBpm'), elArrondi = $('tapArrondi'), elFrappes = $('tapFrappes'), elNoire = $('tapNoire'), elCroche = $('tapCroche');
  var btnRaz = $('tapRaz'), lien = $('tapLien'), elEtat = $('tapEtat');
  var taps = [], dernierAnnonce = '';

  function afficher() {
    var r = MU.bpmDeTaps(taps);
    elFrappes.textContent = taps.length + (taps.length > 1 ? ' frappes' : ' frappe');
    if (!r) {
      elBpm.textContent = '–'; elArrondi.textContent = taps.length ? 'Continuez…' : '–';
      elNoire.textContent = '–'; elCroche.textContent = '–';
      lien.hidden = true;
      return;
    }
    var b = MU.bornerBpm(r.arrondi);
    elBpm.textContent = MU.nf(r.bpm, 1);
    elArrondi.textContent = MU.nf(r.arrondi, 0) + ' bpm';
    elNoire.textContent = MU.nf(60000 / r.bpm, 0) + ' ms';
    elCroche.textContent = MU.nf(30000 / r.bpm, 0) + ' ms';
    lien.href = MU.lien('/metronome/?bpm=' + b);
    lien.hidden = false;
    // aria-live : on annonce le tempo arrondi seulement quand il change
    var t = 'Tempo : ' + r.arrondi + ' bpm';
    if (t !== dernierAnnonce && taps.length >= 3) { dernierAnnonce = t; elEtat.textContent = t; }
  }
  function frapper(t) {
    taps = MU.ajouterTap(taps, t);
    zoneTap.classList.remove('frappe');
    if (!MU.mouvementReduit()) { void zoneTap.offsetWidth; zoneTap.classList.add('frappe'); }
    afficher();
  }
  // pointerdown : instant précis (souris et toucher) ; le clic qui suit est ignoré.
  zoneTap.addEventListener('pointerdown', function (e) { if (e.button === 0 || e.pointerType !== 'mouse') { frapper(e.timeStamp || performance.now()); } });
  zoneTap.addEventListener('keydown', function (e) {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); frapper(e.timeStamp || performance.now()); }
  });
  zoneTap.addEventListener('click', function (e) { e.preventDefault(); });
  // Espace / Entrée ailleurs sur la page (hors champ, hors bouton) : frappe aussi.
  document.addEventListener('keydown', function (e) {
    if (e.target === zoneTap || MU.dansUnChamp(e.target) || e.ctrlKey || e.altKey || e.metaKey) { return; }
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); frapper(e.timeStamp || performance.now()); }
  });
  btnRaz.addEventListener('click', function () { taps = []; dernierAnnonce = ''; elEtat.textContent = 'Remis à zéro.'; afficher(); });
  afficher();
}());
