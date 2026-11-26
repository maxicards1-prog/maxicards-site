/* Équinoxes et solstices (Meeus, chapitre 27) : dates et heures d'une année (heure de Paris), durée des saisons,
   prochain événement. */
(function () {
  'use strict';
  var CQ = window.CQ, HE = window.HE, HX = window.HX;
  var P = 'Europe/Paris';
  var NOMS = ['Équinoxe de mars', 'Solstice de juin', 'Équinoxe de septembre', 'Solstice de décembre'];
  var SAISONS = ['Printemps', 'Été', 'Automne', 'Hiver'];

  function txt(ms) { var p = HE.parties(P, ms); return HX.dateCourte(p) + ', ' + HX.heureTexte(p); }
  function duree(ms) {
    var m = Math.round(ms / 60000), j = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60);
    return j + ' jours ' + h + ' h ' + HE.deux(m % 60);
  }

  function recalcul() {
    var now = Date.now(), a = CQ.nombre('a', 1900, 2100);
    a = isFinite(a) ? Math.round(a) : HE.parties(P, now).a;
    var s = HE.saisons(a), suiv = HE.saisons(a + 1);
    s.forEach(function (ms, i) { CQ.texte('rS' + i, txt(ms)); });
    CQ.lignes('durees', [0, 1, 2, 3].map(function (i) {
      var fin = i < 3 ? s[i + 1] : suiv[0];
      return { cellules: [SAISONS[i] + ' (hémisphère nord)', txt(s[i]), txt(fin), duree(fin - s[i])] };
    }));
    var tous = HE.saisons(HE.parties(P, now).a).concat(HE.saisons(HE.parties(P, now).a + 1));
    var prochain = null, idx = 0;
    tous.forEach(function (ms, i) { if (!prochain && ms > now) { prochain = ms; idx = i % 4; } });
    var jours = Math.ceil((prochain - now) / HE.JOUR);
    CQ.texte('phrase', 'Prochain rendez-vous : ' + NOMS[idx].toLowerCase() + ' le ' + HX.dateLongue(HE.parties(P, prochain)) + ' à ' + HX.heureTexte(HE.parties(P, prochain)) +
      ' (heure de Paris), dans ' + jours + (jours > 1 ? ' jours' : ' jour') + '. ' +
      (a < 1951 || a > 2050 ? 'Pour ' + a + ', les heures sont données à quelques minutes près.' : 'Heures calculées à la minute près.'));
  }

  CQ.surChangement(['a'], recalcul);
  CQ.el('a').value = String(HE.parties(P, Date.now()).a);
  CQ.initPartage(recalcul);
}());
