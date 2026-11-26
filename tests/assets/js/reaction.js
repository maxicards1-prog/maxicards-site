/* Test de temps de réaction : 5 essais, moyenne, médiane, meilleur temps. Un seul changement de couleur par essai (vert), à un moment aléatoire. */
(function () {
  'use strict';
  var TP = window.TP, $ = TP.$, T = TP.t;
  var zone = $('rZone'), titre = $('rTitre'), sous = $('rSous'), liste = $('rListe'), bilan = $('rBilan'), btnRaz = $('rRaz');
  var N = 5, temps = [], etat = 'pret', t0 = 0, minuteur = 0;
  function aleatoire() { var a = new Uint32Array(1); if (window.crypto && crypto.getRandomValues) { crypto.getRandomValues(a); return a[0] / 4294967296; } return Math.random(); }
  function style(e) { zone.className = 'reaction ' + e; }
  function rendreListe() {
    TP.vider(liste);
    temps.forEach(function (t, i) { liste.appendChild(TP.creer('li', '', T('Essai {n} : {ms} ms', { n: i + 1, ms: TP.nf(t, 0) }))); });
    var s = TP.stats(temps);
    if (temps.length) {
      var v = { moy: TP.nf(s.moyenne, 0), med: TP.nf(s.mediane, 0), min: TP.nf(s.min, 0), n: temps.length };
      bilan.textContent = temps.length > 1 ? T('Moyenne : {moy} ms · médiane : {med} ms · meilleur : {min} ms ({n} essais)', v) : T('Moyenne : {moy} ms · médiane : {med} ms · meilleur : {min} ms ({n} essai)', v);
    } else { bilan.textContent = ''; }
  }
  function attendre() {
    etat = 'attente'; style('attente');
    titre.textContent = T('Attendez le vert…'); sous.textContent = T('Ne cliquez pas encore.');
    minuteur = setTimeout(function () { etat = 'vert'; style('vert'); titre.textContent = T('CLIQUEZ !'); sous.textContent = ''; t0 = performance.now(); }, TP.attenteReaction(aleatoire(), 1500, 5000));
  }
  function action(ev) {
    if (ev && ev.preventDefault) { ev.preventDefault(); }
    var now = performance.now();
    if (etat === 'pret' || etat === 'trop-tot' || etat === 'resultat') { if (temps.length >= N) { temps = []; rendreListe(); } attendre(); return; }
    if (etat === 'attente') { clearTimeout(minuteur); etat = 'trop-tot'; style('trop-tot'); titre.textContent = T('Trop tôt !'); sous.textContent = T('Cliquez pour recommencer cet essai.'); return; }
    if (etat === 'vert') {
      var t = now - t0; temps.push(t); rendreListe();
      etat = 'resultat'; style('resultat');
      titre.textContent = TP.nf(t, 0) + ' ms';
      sous.textContent = temps.length >= N ? T('Série terminée. Cliquez pour recommencer une série.') : T('Essai {n} sur {total}. Cliquez pour continuer.', { n: temps.length, total: N });
    }
  }
  zone.addEventListener('pointerdown', function (ev) { if (ev.button === 0 || ev.button === undefined) { action(ev); } });
  zone.addEventListener('keydown', function (ev) { if (ev.key === ' ' || ev.key === 'Enter') { action(ev); } });
  btnRaz.addEventListener('click', function () { clearTimeout(minuteur); temps = []; etat = 'pret'; style('pret'); titre.textContent = T('Cliquez pour commencer'); sous.textContent = T('Quand la zone devient verte, cliquez le plus vite possible.'); rendreListe(); });
  window.addEventListener('pagehide', function () { clearTimeout(minuteur); });
  style('pret');
}());
