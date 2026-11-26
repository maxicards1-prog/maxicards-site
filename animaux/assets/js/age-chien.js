/* Âge du chien en âge humain : repère usuel par gabarit, formule de l'étude californienne, sens inverse. */
(function () {
  'use strict';
  var CQ = window.CQ, CU = window.CU, D = CU.D;
  function arr(v) { return isFinite(v) ? CQ.souple(Math.round(v), 0) : '–'; }
  function syncRace() {
    var g = CU.gabaritRace(CQ.valeur('race'));
    if (g) { CQ.el('gab').value = g; CQ.el('kg').value = ''; }
  }
  function syncKg() {
    var kg = CQ.nombre('kg', 0.5, 120);
    if (isFinite(kg)) { CQ.el('gab').value = CU.gabarit(kg); CQ.el('race').value = ''; }
  }
  function recalcul() {
    var gab = CQ.valeur('gab'), cl = CU.classe(gab);
    var ans = CQ.nombre('ans', 0, D.age_max), mois = CQ.nombre('mois', 0, 11);
    if (!isFinite(mois)) { mois = 0; }
    var total = isFinite(ans) ? Math.min(D.age_max, ans + mois / 12) : NaN;
    var h = CU.humainRepere(gab, total), f = CU.humainFormule(total);
    CQ.texte('rHumain', isFinite(h) ? 'environ ' + arr(h) + ' ans' : '–');
    CQ.texte('rFormule', isFinite(f) ? 'environ ' + arr(f) + ' ans' : '–');
    var race = CU.race(CQ.valeur('race'));
    var txt = '';
    if (isFinite(h) && cl) {
      txt = (race ? race.nom + ' (' + race.txt + ')' : 'Chien') + ', gabarit ' + cl.nom.toLowerCase() + ' (' + cl.plage + ') : ' +
        'à ' + CQ.souple(total, 1) + ' an(s), le repère usuel donne environ ' + arr(h) + ' ans en âge humain.';
      if (isFinite(f)) { txt += ' La formule de l\'étude californienne donne environ ' + arr(f) + ' ans, mais elle vient de labradors seulement.'; }
    }
    if (isFinite(total) && !isFinite(h)) { txt = 'Au-delà de 15 ans, aucune source ne donne de repère fiable : le tableau s\'arrête à 15 ans.'; }
    CQ.texte('phrase', txt);
    var lignes = [];
    for (var y = 1; y <= 15; y++) {
      var v = CU.humainRepere(gab, y), w = CU.humainFormule(y);
      lignes.push({ cellules: [String(y), arr(v) + ' ans', arr(w) + ' ans'], nombres: [1, 2],
        classe: isFinite(total) && Math.max(1, Math.min(15, Math.round(total))) === y ? 'meilleur' : '' });
    }
    CQ.lignes('tabAge', lignes);
    var hum = CQ.nombre('humain', 0, 400);
    var inv = CU.chienDepuisHumain(gab, hum);
    CQ.texte('rInverse', isFinite(inv) ? 'environ ' + CQ.souple(inv, 1) + ' an(s)' : '–');
  }
  CQ.el('race').addEventListener('change', syncRace);
  CQ.el('kg').addEventListener('input', syncKg);
  CQ.surChangement(['race', 'kg', 'gab', 'ans', 'mois', 'humain'], recalcul);
  CQ.initPartage(recalcul);
}());
