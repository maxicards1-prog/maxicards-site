/* Accords : choix de la note et du type, grand diagramme (copie du diagramme statique de la page), écoute de l'accord.
   Le son est synthétisé dans le navigateur (aucun fichier, rien n'est envoyé). Jamais de innerHTML. */
(function () {
  'use strict';
  var sec = document.querySelector('.outil-accords');
  if (!sec) { return; }
  var TYPES = ['maj', 'min', '7', 'm7', 'maj7', 'sus2', 'sus4'];
  var ANCRE = /^(c|cd|d|eb|e|f|fd|g|ab|a|bb|b)(-(min|7|m7|maj7|sus2|sus4))?$/;
  var $ = function (id) { return document.getElementById(id); };
  var dessin = $('accordDessin'), btnEcoute = $('accordEcouter');
  var r = 0, t = 'maj';
  var reduit = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function figure(nr, nt) {
    var liste = document.querySelectorAll('figure.accord[data-r]');
    for (var i = 0; i < liste.length; i++) {
      if (liste[i].getAttribute('data-r') === String(nr) && liste[i].getAttribute('data-t') === nt) { return liste[i]; }
    }
    return null;
  }
  function presser(classe, attr, valeur) {
    var b = sec.querySelectorAll('.' + classe);
    for (var i = 0; i < b.length; i++) { b[i].setAttribute('aria-pressed', b[i].getAttribute(attr) === String(valeur) ? 'true' : 'false'); }
  }
  function afficher(nr, nt) {
    var f = figure(nr, nt);
    if (!f) { return null; }
    r = nr; t = nt;
    presser('ch-racine', 'data-r', nr); presser('ch-type', 'data-t', nt);
    var svg = f.querySelector('svg');
    if (svg && dessin) {
      var copie = svg.cloneNode(true);
      copie.setAttribute('class', 'diagramme grand');
      while (dessin.firstChild) { dessin.removeChild(dessin.firstChild); }
      dessin.appendChild(copie);
    }
    $('accordSymbole').textContent = f.getAttribute('data-symbole') || '';
    $('accordNom').textContent = f.getAttribute('data-nom') || '';
    $('accordNotes').textContent = f.getAttribute('data-noms') || '';
    $('accordFrettes').textContent = f.getAttribute('data-frettes') || '';
    return f;
  }
  function depuisAncre(defiler) {
    var h = (location.hash || '').slice(1);
    if (!ANCRE.test(h)) { return; }
    var f = document.getElementById(h);
    if (!f || !f.hasAttribute('data-r')) { return; }
    afficher(parseInt(f.getAttribute('data-r'), 10), f.getAttribute('data-t'));
    if (defiler) { sec.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'start' }); }
  }

  sec.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button') : null;
    if (!b || !sec.contains(b)) { return; }
    if (b.classList.contains('ch-racine')) {
      var nr = parseInt(b.getAttribute('data-r'), 10);
      if (nr >= 0 && nr < 12) { afficher(nr, t); }
    } else if (b.classList.contains('ch-type')) {
      var nt = b.getAttribute('data-t');
      if (TYPES.indexOf(nt) >= 0) { afficher(r, nt); }
    }
  });
  // Un clic dans la grille affiche l'accord en grand, en haut, sans recharger la page.
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a.accord-lien') : null;
    if (!a) { return; }
    var h = (a.getAttribute('href') || '').slice(1);
    if (!ANCRE.test(h)) { return; }
    e.preventDefault();
    if (history.replaceState) { history.replaceState(null, '', '#' + h); }
    depuisAncre(true);
  });
  window.addEventListener('hashchange', function () { depuisAncre(true); });

  /* ---------- son : corde pincée (onde périodique + enveloppe), de la note la plus grave à la plus aiguë ---------- */
  var ctx = null, onde = null, sortie = null;
  function contexte() {
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) { return null; }
    if (!ctx) {
      ctx = new C();
      onde = null;
      sortie = ctx.createGain();
      sortie.gain.value = 0.5;
      sortie.connect(ctx.destination);
    }
    if (ctx.state === 'suspended' && ctx.resume) { ctx.resume(); }
    return ctx;
  }
  function pincer(c, freq, t0, vol) {
    if (!onde) {
      var n = 10, re = new Float32Array(n + 1), im = new Float32Array(n + 1);
      for (var k = 1; k <= n; k++) { im[k] = Math.pow(0.62, k - 1) / k; }
      onde = c.createPeriodicWave(re, im);
    }
    var o = c.createOscillator(), g = c.createGain();
    o.setPeriodicWave(onde);
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4);
    o.connect(g); g.connect(sortie);
    o.start(t0); o.stop(t0 + 2.5);
  }
  if (btnEcoute) {
    btnEcoute.addEventListener('click', function () {
      var f = figure(r, t), c = contexte();
      if (!f || !c) { return; }
      var notes = (f.getAttribute('data-midi') || '').split(' ').map(function (x) { return parseInt(x, 10); })
        .filter(function (m) { return m >= 20 && m <= 100; }).slice(0, 8);
      var t0 = c.currentTime + 0.03;
      notes.forEach(function (m, i) { pincer(c, 440 * Math.pow(2, (m - 69) / 12), t0 + i * 0.045, 0.22); });
    });
  }
  window.addEventListener('pagehide', function () {
    if (ctx && ctx.close) { ctx.close().catch(function () { /* déjà fermé */ }); }
    ctx = null; onde = null;
  });

  /* ---------- « Copier le lien de cet accord » ---------- */
  var bl = $('copierLien'), el = $('etatLien');
  if (bl) {
    bl.addEventListener('click', function () {
      var f = figure(r, t);
      var url = location.origin + location.pathname + (f ? '#' + f.id : '');  // aucun paramètre d'arrivée recopié
      var fin = function (ok) { if (el) { el.textContent = ok ? 'Lien copié.' : 'Copie impossible : copiez l’adresse du navigateur.'; } };
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url).then(function () { fin(true); }, function () { fin(false); }); } else { fin(false); }
    });
  }
  depuisAncre(false);
}());
