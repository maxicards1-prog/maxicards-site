/* Test de la souris : boutons, molette, clics qui rebondissent (double-clic involontaire). Rien n'est envoyé. */
(function () {
  'use strict';
  var TP = window.TP, $ = TP.$, T = TP.t;
  var zone = $('sZone'), verdict = $('sVerdict'), seuilEl = $('sSeuil'), seuilTxt = $('sSeuilTxt'), btnRaz = $('sRaz');
  var NOMS = { 0: T('gauche'), 1: T('milieu (molette)'), 2: T('droit'), 3: T('bouton 4 (précédent)'), 4: T('bouton 5 (suivant)') };
  var IDS = { 0: 'sB0', 1: 'sB1', 2: 'sB2', 3: 'sB3', 4: 'sB4' };
  var evts = [], compte = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }, molette = { haut: 0, bas: 0 };

  function rendre() {
    Object.keys(IDS).forEach(function (b) { $(IDS[b]).querySelector('.n').textContent = compte[b]; });
    $('sMolHaut').textContent = molette.haut; $('sMolBas').textContent = molette.bas;
    var seuil = +seuilEl.value; seuilTxt.textContent = seuil + ' ms';
    var r = TP.detecterRebonds(evts, seuil), total = evts.length;
    var lignes = [];
    Object.keys(r.plusCourt).forEach(function (b) { lignes.push(T('Bouton {nom} : intervalle le plus court entre deux clics = {ms} ms', { nom: NOMS[b], ms: TP.nf(r.plusCourt[b], 0) })); });
    var liste = $('sIntervalles'); TP.vider(liste);
    lignes.forEach(function (l) { liste.appendChild(TP.creer('li', '', l)); });
    if (total < 6) { TP.verdict(verdict, 'attente', T('Cliquez 10 fois sur chaque bouton, lentement'), T('Un clic à la fois, comme pour ouvrir un fichier. Le test cherche deux clics collés l’un à l’autre.')); return; }
    var par = {};
    r.suspects.forEach(function (s) { par[s.bouton] = (par[s.bouton] || 0) + 1; });
    var boutons = Object.keys(par);
    if (!boutons.length) {
      TP.verdict(verdict, 'ok', T('Ça marche : aucun clic en double détecté'), T('{n} clics enregistrés, aucun n’est suivi d’un autre en moins de {ms} ms.', { n: total, ms: seuil }));
    } else {
      var txt = boutons.map(function (b) { return T('{n} fois sur le bouton {nom}', { n: par[b], nom: NOMS[b] }); }).join(', ');
      TP.verdict(verdict, 'ko', T('Double-clic involontaire possible : {liste}', { liste: txt }),
        T('Deux clics sont arrivés à moins de {ms} ms l’un de l’autre alors que vous cliquiez lentement. Refaites le test : si cela revient sur le même bouton, c’est le signe d’un interrupteur fatigué.', { ms: seuil }),
        [T('Refaites 10 clics lents sur ce bouton et regardez si le compteur monte plus vite que vos clics.'), T('Essayez la souris sur un autre port USB ou avec un autre câble ou une autre pile.'), T('Testez sur un autre ordinateur : si le défaut suit la souris, c’est la souris.'), T('Regardez la garantie du fabricant ou remplacez la souris.')],
        '/depannage/double-clic-tout-seul-souris/', T('Double-clic tout seul : la solution complète'));
    }
  }
  function lumiere(b, on) { var e = $(IDS[b]); if (e) { e.classList.toggle('on', on); } }
  function bloquer(ev) { ev.preventDefault(); }
  zone.addEventListener('mousedown', function (ev) {
    ev.preventDefault();
    var b = ev.button;
    if (compte[b] === undefined) { return; }
    compte[b]++; evts.push({ t: ev.timeStamp, bouton: b }); lumiere(b, true); rendre();
  });
  zone.addEventListener('mouseup', function (ev) { ev.preventDefault(); lumiere(ev.button, false); });
  zone.addEventListener('mouseleave', function () { Object.keys(IDS).forEach(function (b) { lumiere(b, false); }); });
  ['contextmenu', 'auxclick', 'dblclick', 'dragstart', 'selectstart'].forEach(function (n) { zone.addEventListener(n, bloquer); });
  zone.addEventListener('wheel', function (ev) {
    ev.preventDefault();
    if (ev.deltaY < 0) { molette.haut++; } else if (ev.deltaY > 0) { molette.bas++; }
    var b = $('sMolette'); b.classList.add('on'); clearTimeout(b._t); b._t = setTimeout(function () { b.classList.remove('on'); }, 150);
    rendre();
  }, { passive: false });
  seuilEl.addEventListener('input', rendre);
  btnRaz.addEventListener('click', function () { evts = []; Object.keys(compte).forEach(function (b) { compte[b] = 0; }); molette = { haut: 0, bas: 0 }; rendre(); });
  rendre();
}());
