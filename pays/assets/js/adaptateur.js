/* Faut-il un adaptateur de prise ? Pays de départ et pays d'arrivée (codes de pays seulement dans l'adresse). */
(function () {
  'use strict';
  var LP = window.LP, D = window.PD || [], CQ = window.CQ;
  var orig = document.getElementById('origine');
  var dest = document.getElementById('destination');
  if (!orig || !dest || !LP || !CQ) { return; }
  var PAR = {};
  D.forEach(function (p) { PAR[p.i] = p; });
  var lien = document.querySelector('link[rel="stylesheet"]');
  var racine = lien ? lien.getAttribute('href').replace(/assets\/style\.css.*$/, '') : '/pays/';
  var $ = function (id) { return document.getElementById(id); };
  var CLASSE = { non: 'v-non', mixte: 'v-plat', plat: 'v-plat', oui: 'v-oui' };

  function calcul() {
    var p = PAR[dest.value], o = LP.ORIGINES[orig.value];
    var verdict = $('verdict');
    if (!p || !o) { verdict.textContent = ''; return; }
    var r = LP.adaptateur(orig.value, p.pr, p.v, p.hz);
    verdict.className = 'verdict ' + (r ? CLASSE[r.niveau] : '');
    verdict.textContent = r ? LP.phraseAdaptateur(r, orig.value, p.n, LP.dans(p), p.pr, p.v) : 'Pas de donnée sur les prises de ce pays.';
    $('prisesDest').textContent = p.pr.join(', ');
    $('tensionDest').textContent = p.v.map(function (v) { return v + ' V'; }).join(' / ') + ' · ' + p.hz.map(function (h) { return h + ' Hz'; }).join(' / ');
    $('fichesOrig').textContent = o.fiches.map(function (f) { return f === 'EF' ? 'E/F' : f; }).join(', ');
    $('tensionOrig').textContent = o.v[0] + ' V · ' + o.hz[0] + ' Hz';
    var a = $('lienFiche');
    a.href = racine + p.s + '/';
    a.textContent = 'La fiche ' + LP.de(p) + ' : indicatif, monnaie, heure sur place';
  }
  CQ.surChangement(['origine', 'destination'], calcul);
  CQ.initPartage(calcul);
}());
