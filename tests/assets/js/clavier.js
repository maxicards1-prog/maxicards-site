/* Test du clavier : touches qui s'allument, touches jamais pressées, touches simultanées (anti-ghosting), code de la touche. Rien n'est envoyé. */
(function () {
  'use strict';
  var TP = window.TP, $ = TP.$, T = TP.t;
  var suivi = TP.creerSuiviTouches();
  var actif = false, echapRecent = 0;
  var elems = {};   // code -> élément
  var etiquettes = {}; // code -> {e, f}
  var zones = { principal: $('kPrincipal'), navigation: $('kNavigation'), pave: $('kPave') };
  var selDispo = $('kDispo'), selTaille = $('kTaille'), btnD = $('kDemarrer'), btnA = $('kArreter'), btnR = $('kRaz');
  var eKey = $('kKey'), eCode = $('kCode'), eEnf = $('kEnf'), eMax = $('kMax'), eTest = $('kTestees'), eMan = $('kManquantes'), verdict = $('kVerdict');

  function construire() {
    ['principal', 'navigation', 'pave'].forEach(function (nom) {
      TP.CLAVIER[nom].forEach(function (rang) {
        var ligne = TP.creer('div', 'k-rang');
        rang.forEach(function (t) {
          if (t.espace !== undefined) { var s = TP.creer('span', 'k-esp'); s.style.setProperty('--w', t.espace); ligne.appendChild(s); return; }
          var k = TP.creer('div', 'touche');
          k.style.setProperty('--w', t.w);
          k.appendChild(TP.creer('span', 'k-lib', T(t.e)));
          elems[t.c] = k; etiquettes[t.c] = t;
          ligne.appendChild(k);
        });
        zones[nom].appendChild(ligne);
      });
    });
  }
  function etiqueter() {
    var az = selDispo.value === 'azerty';
    Object.keys(elems).forEach(function (c) {
      var t = etiquettes[c], lib = az ? t.f : t.e;
      elems[c].firstChild.textContent = T(lib);
      elems[c].title = c;
    });
    majManquantes();
  }
  function codesVisibles() {
    var t = selTaille.value, out = [];
    ['principal', 'navigation', 'pave'].forEach(function (z) {
      if ((z === 'navigation' && t === 'compact') || (z === 'pave' && t !== 'complet')) { return; }
      TP.CLAVIER[z].forEach(function (r) { r.forEach(function (x) { if (x.c) { out.push(x.c); } }); });
    });
    return out;
  }
  function taille() {
    var t = selTaille.value;
    zones.navigation.parentNode.hidden = t === 'compact';
    zones.pave.parentNode.hidden = t !== 'complet';
    majManquantes();
  }
  function libelle(c) { var t = etiquettes[c]; var l = selDispo.value === 'azerty' ? t.f : t.e; return l ? T(l) : c; }
  function majManquantes() {
    var codes = codesVisibles(), manquantes = codes.filter(function (c) { return !suivi.estPresse(c); });
    eTest.textContent = T('{n} sur {total}', { n: codes.length - manquantes.length, total: codes.length });
    TP.vider(eMan);
    if (!suivi.etat().total) { eMan.textContent = T('Appuyez sur les touches : celles qui n’ont pas encore réagi resteront listées ici.'); return; }
    if (!manquantes.length) { eMan.textContent = T('Toutes les touches affichées ont réagi.'); return; }
    manquantes.forEach(function (c) { eMan.appendChild(TP.creer('span', 'k-man', libelle(c))); });
  }
  function majStats() {
    var e = suivi.etat();
    eEnf.textContent = e.enfoncees; eMax.textContent = e.max;
    if (e.max >= 2) {
      TP.verdict(verdict, 'info', T('Maximum de touches tenues en même temps : {n}', { n: e.max }),
        T('Tenez plusieurs touches ensemble (par exemple Z, Q, D, Maj et Espace dans un jeu). Si ce nombre est plus petit que le nombre de touches que vous tenez vraiment, le clavier n’envoie pas toutes les touches : c’est la limite appelée « ghosting ».'));
    }
  }
  function marquer(code, enfoncee) {
    var k = elems[code];
    if (!k) { return; }
    k.classList.toggle('enf', enfoncee);
    if (enfoncee) { k.classList.add('vu'); }
  }
  function onDown(ev) {
    if (!actif) { return; }
    ev.preventDefault();
    if (ev.code === 'Escape') { var t = Date.now(); if (t - echapRecent < 700) { arreter(); return; } echapRecent = t; }
    suivi.appui(ev.code);
    marquer(ev.code, true);
    eKey.textContent = ev.key === ' ' ? T('Espace') : ev.key; eCode.textContent = ev.code;
    if (!elems[ev.code]) { eMan.dataset.inconnue = ev.code; }
    majManquantes(); majStats();
  }
  function onUp(ev) {
    if (!actif) { return; }
    ev.preventDefault();
    suivi.relache(ev.code); marquer(ev.code, false); majStats();
  }
  function demarrer() {
    actif = true; btnD.disabled = true; btnA.disabled = false;
    if (document.activeElement && document.activeElement.blur) { document.activeElement.blur(); }
    TP.verdict(verdict, 'ok', T('Le test écoute votre clavier'), T('Appuyez sur n’importe quelle touche. Pour finir : double appui sur Échap, ou le bouton « Arrêter ».'));
  }
  function arreter() {
    actif = false; btnD.disabled = false; btnA.disabled = true;
    suivi.toutRelacher();
    Object.keys(elems).forEach(function (c) { elems[c].classList.remove('enf'); });
    eEnf.textContent = '0';
    TP.verdict(verdict, 'attente', T('Test en pause'), T('Le clavier fonctionne de nouveau normalement dans cette page. Cliquez sur « Démarrer le test » pour reprendre.'));
  }
  function raz() {
    suivi.raz();
    Object.keys(elems).forEach(function (c) { elems[c].classList.remove('enf', 'vu'); });
    eKey.textContent = '–'; eCode.textContent = '–'; eEnf.textContent = '0'; eMax.textContent = '0';
    majManquantes();
  }
  construire(); etiqueter(); taille();
  document.addEventListener('keydown', onDown, true);
  document.addEventListener('keyup', onUp, true);
  window.addEventListener('blur', function () { suivi.toutRelacher(); Object.keys(elems).forEach(function (c) { elems[c].classList.remove('enf'); }); });
  selDispo.addEventListener('change', etiqueter);
  selTaille.addEventListener('change', taille);
  btnD.addEventListener('click', demarrer);
  btnA.addEventListener('click', arreter);
  btnR.addEventListener('click', raz);
  btnA.disabled = true;
}());
