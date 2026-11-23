/* Calcul d'âge exact : années, mois, jours, total de jours vécus, prochain anniversaire. */
(function () {
  'use strict';
  var CQ = window.CQ;
  function recalcul() {
    var n = CQ.jour(CQ.valeur('naissance'));
    var ref = CQ.jour(CQ.valeur('reference'));
    if (!isFinite(ref)) { ref = CQ.aujourdhui(); }
    var ids = ['rAge', 'rDetail', 'rJours', 'rProchain', 'rJourNaissance'];
    if (!isFinite(n)) { ids.forEach(function (id) { CQ.texte(id, '–'); }); CQ.texte('phrase', ''); return; }
    if (n > ref) { ids.forEach(function (id) { CQ.texte(id, '–'); }); CQ.texte('phrase', 'La date de naissance est après la date de calcul.'); return; }
    var a = CQ.versDate(n), b = CQ.versDate(ref);
    var ans = b.getUTCFullYear() - a.getUTCFullYear();
    var mois = b.getUTCMonth() - a.getUTCMonth();
    var jours = b.getUTCDate() - a.getUTCDate();
    if (jours < 0) { mois--; jours += new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0)).getUTCDate(); }
    if (mois < 0) { ans--; mois += 12; }
    // prochain anniversaire (un 29 février est fêté le 28 février les années non bissextiles)
    var anniv = function (an) {
      var dj = new Date(Date.UTC(an, a.getUTCMonth() + 1, 0)).getUTCDate();
      return Date.UTC(an, a.getUTCMonth(), Math.min(a.getUTCDate(), dj)) / 86400000;
    };
    var p = anniv(b.getUTCFullYear());
    if (p < ref) { p = anniv(b.getUTCFullYear() + 1); }
    var dans = p - ref;
    CQ.texte('rAge', ans + ' an' + (ans > 1 ? 's' : ''));
    CQ.texte('rDetail', ans + ' an' + (ans > 1 ? 's' : '') + ', ' + mois + ' mois, ' + jours + ' jour' + (jours > 1 ? 's' : ''));
    CQ.texte('rJours', CQ.entier(ref - n));
    CQ.texte('rSemaines', CQ.entier(Math.floor((ref - n) / 7)));
    CQ.texte('rProchain', dans === 0 ? "aujourd'hui !" : 'dans ' + CQ.entier(dans) + ' jour' + (dans > 1 ? 's' : ''));
    CQ.texte('rJourNaissance', CQ.nomJour(n));
    CQ.texte('phrase', 'Né(e) un ' + CQ.dateLongue(n) + ', vous avez ' + ans + ' an' + (ans > 1 ? 's' : '') + ' le ' + CQ.dateLongue(ref) +
      '. Prochain anniversaire (' + (ans + (dans === 0 ? 0 : 1)) + ' ans) : ' + CQ.dateLongue(p) + '. Le cap des 10 000 jours : ' + CQ.dateLongue(n + 10000) + '.');
  }
  var r = CQ.el('reference');
  if (r && !r.value) { r.value = CQ.versTexteIso(CQ.aujourdhui()); }
  CQ.surChangement(['naissance', 'reference'], recalcul);
  CQ.initPartage(recalcul);
}());
