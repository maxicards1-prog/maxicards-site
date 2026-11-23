/* Feuille de temps de la semaine : heures travaillées par jour et total, en heures-minutes et en décimal. */
(function () {
  'use strict';
  var CQ = window.CQ;
  var JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  function recalcul() {
    var total = 0, joursTravailles = 0, nuit = false;
    for (var i = 1; i <= 7; i++) {
      var a = CQ.minutes(CQ.valeur('a' + i)), d = CQ.minutes(CQ.valeur('d' + i));
      var p = CQ.nombre('p' + i, 0, 1440);
      if (!isFinite(p)) { p = 0; }
      var duree = NaN;
      if (isFinite(a) && isFinite(d)) {
        duree = d - a;
        if (duree < 0) { duree += 1440; nuit = true; } // fin après minuit
        duree = Math.max(0, duree - p);
        total += duree;
        if (duree > 0) { joursTravailles++; }
      }
      CQ.texte('t' + i, isFinite(duree) ? CQ.hm(duree) : '–');
    }
    var ref = CQ.nombre('reference', 1, 80);
    if (!isFinite(ref)) { ref = 35; }
    var ecart = total - ref * 60;
    CQ.texte('rTotal', CQ.hm(total));
    CQ.texte('rDecimal', CQ.decimal(total / 60, 2) + ' h');
    CQ.texte('rEcart', (ecart > 0 ? '+' : '') + CQ.hm(ecart));
    CQ.texte('rMoyenne', joursTravailles ? CQ.hm(total / joursTravailles) : '–');
    var taux = CQ.nombre('taux', 0, 10000);
    CQ.texte('rPaie', isFinite(taux) ? CQ.euros(total / 60 * taux) : '–');
    CQ.texte('phrase', 'Total de la semaine : ' + CQ.hm(total) + ', soit ' + CQ.decimal(total / 60, 2) + ' h en décimal' +
      (ecart > 0 ? ', dont ' + CQ.hm(ecart) + ' au-delà de ' + CQ.souple(ref, 2) + ' h' : '') + '.' +
      (nuit ? ' Une fin plus tôt que le début est comptée comme le lendemain (travail de nuit).' : ''));
  }
  var ids = ['reference', 'taux'];
  for (var i = 1; i <= 7; i++) { ids.push('a' + i, 'd' + i, 'p' + i); }
  CQ.surChangement(ids, recalcul);
  var raz = CQ.el('vider');
  if (raz) {
    raz.addEventListener('click', function () {
      for (var j = 1; j <= 7; j++) { CQ.el('a' + j).value = ''; CQ.el('d' + j).value = ''; CQ.el('p' + j).value = ''; }
      recalcul();
      CQ.el('a1').dispatchEvent(new Event('change'));
    });
  }
  var copie = CQ.el('copierLundi');
  if (copie) {
    copie.addEventListener('click', function () {
      for (var j = 2; j <= 5; j++) {
        CQ.el('a' + j).value = CQ.el('a1').value; CQ.el('d' + j).value = CQ.el('d1').value; CQ.el('p' + j).value = CQ.el('p1').value;
      }
      recalcul();
      CQ.el('a1').dispatchEvent(new Event('change'));
    });
  }
  window.CQ_JOURS = JOURS;
  CQ.initPartage(recalcul);
}());
