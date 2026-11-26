/* Test de clics par seconde (CPS) : 1, 5 ou 10 secondes. Le chrono démarre au premier clic. */
(function () {
  'use strict';
  var TP = window.TP, $ = TP.$, T = TP.t;
  var zone = $('cpsZone'), cptEl = $('cpsClics'), tpsEl = $('cpsTemps'), resEl = $('cpsResultat'), lib = $('cpsLibelle'), meilleurs = $('cpsMeilleurs'), btnRaz = $('cpsRecommencer');
  var duree = 5, clics = 0, t0 = 0, etat = 'pret', iv = 0, fin = 0, record = {};
  function radios() { return document.querySelectorAll('input[name="cpsDuree"]'); }
  function maj() { cptEl.textContent = clics; }
  function reinit() {
    clearInterval(iv); clearTimeout(fin);
    etat = 'pret'; clics = 0; t0 = 0; maj();
    tpsEl.textContent = TP.nf(duree, 1) + ' s';
    zone.classList.remove('fini'); zone.classList.remove('actif');
    lib.textContent = T('Cliquez ici le plus vite possible (le chrono démarre au premier clic)');
  }
  function terminer() {
    clearInterval(iv); etat = 'fini'; zone.classList.remove('actif'); zone.classList.add('fini');
    var v = TP.cps(clics, duree);
    resEl.textContent = T('{n} clics par seconde', { n: TP.nf(v, 2) });
    tpsEl.textContent = TP.nf(0, 1) + ' s';
    lib.textContent = T('{n} clics en {d} s. Cliquez sur « Recommencer » pour un nouvel essai.', { n: clics, d: duree });
    if (!record[duree] || v > record[duree]) { record[duree] = v; }
    TP.vider(meilleurs);
    [1, 5, 10].forEach(function (d) { if (record[d]) { meilleurs.appendChild(TP.creer('li', '', T('Meilleur essai sur {d} s : {v} CPS', { d: d, v: TP.nf(record[d], 2) }))); } });
  }
  function clic(ev) {
    if (ev.button !== undefined && ev.button !== 0) { return; }
    if (etat === 'fini') { return; }
    ev.preventDefault();
    if (etat === 'pret') {
      etat = 'cours'; t0 = performance.now(); zone.classList.add('actif'); resEl.textContent = '';
      iv = setInterval(function () { var r = duree - (performance.now() - t0) / 1000; tpsEl.textContent = TP.nf(Math.max(0, r), 1) + ' s'; if (r <= 0) { terminer(); } }, 50);
      fin = setTimeout(function () { if (etat === 'cours') { terminer(); } }, duree * 1000 + 30);
    }
    if (performance.now() - t0 <= duree * 1000) { clics++; maj(); }
  }
  zone.addEventListener('pointerdown', clic);
  zone.addEventListener('keydown', function (ev) { if (ev.key === ' ' || ev.key === 'Enter') { clic({ button: 0, preventDefault: function () { ev.preventDefault(); } }); } });
  ['contextmenu', 'dragstart', 'selectstart'].forEach(function (n) { zone.addEventListener(n, function (e) { e.preventDefault(); }); });
  Array.prototype.forEach.call(radios(), function (r) { r.addEventListener('change', function () { if (r.checked) { duree = +r.value; resEl.textContent = ''; reinit(); } }); });
  btnRaz.addEventListener('click', function () { resEl.textContent = ''; reinit(); zone.focus(); });
  reinit();
}());
