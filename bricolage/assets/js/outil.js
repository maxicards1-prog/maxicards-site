/* Lien entre la page et les calculs (calculs.js) : lit les cases, calcule, écrit les résultats.
   Jamais de HTML construit avec du texte saisi : textContent seulement. */
(function () {
  'use strict';
  var CQ = window.CQ, BRI = window.BRI;
  var section = document.querySelector('section.outil[data-calcul]');
  if (!section || !BRI || !CQ) { return; }
  var nom = section.getAttribute('data-calcul');
  var fonction = BRI.calc[nom];
  if (typeof fonction !== 'function') { return; }
  var champs = Array.prototype.slice.call(section.querySelectorAll('[data-p]'));
  var tuiles = Array.prototype.slice.call(section.querySelectorAll('.tuile .valeur'));

  function lire() {
    var v = {};
    champs.forEach(function (el) {
      var cle = el.getAttribute('data-p');
      if (el.type === 'checkbox') { v[cle] = el.checked; }
      else if (el.tagName === 'SELECT') { v[cle] = /^-?\d+(\.\d+)?$/.test(el.value) ? Number(el.value) : el.value; }
      else { v[cle] = CQ.nombre(el.id); }
    });
    return v;
  }
  function visibilite() {
    Array.prototype.forEach.call(section.querySelectorAll('[data-si]'), function (bloc) {
      var regles = bloc.getAttribute('data-si').split(';');
      var ok = regles.every(function (r) {
        var p = r.split('=');
        var el = document.getElementById(p[0]);
        return el && p[1].split('|').indexOf(el.value) !== -1;
      });
      bloc.hidden = !ok;
    });
  }
  function recalcul() {
    visibilite();
    var res;
    try { res = fonction(lire()); } catch (e) { res = { ok: false, message: 'Un calcul n\'a pas abouti : vérifiez les nombres saisis.', t: {} }; }
    tuiles.forEach(function (el) { CQ.texte(el.id, res.ok && res.t[el.id] !== undefined ? res.t[el.id] : '–'); });
    var alertes = res.ok ? (res.alertes || []) : [res.message];
    CQ.paragraphes('alertes', alertes, 'p');
    var zoneAlerte = document.getElementById('alertes');
    if (zoneAlerte) { zoneAlerte.hidden = alertes.length === 0; zoneAlerte.className = 'message' + (res.ok ? '' : ' erreur'); }
    CQ.lignes('liste', res.ok ? res.liste : []);
    CQ.paragraphes('ecrit', res.ok ? res.ecrit : [], 'li');
  }
  champs.forEach(function (el) { el.addEventListener('input', recalcul); el.addEventListener('change', recalcul); });
  CQ.initPartage(recalcul);
}());
