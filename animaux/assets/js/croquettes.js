/* Ration de croquettes : énergie au repos x facteur, divisée par l'énergie du paquet. Chien et chat. */
(function () {
  'use strict';
  var CQ = window.CQ, CU = window.CU, EN = CU.D.energie;
  var espece = CQ.el('statut').getAttribute('data-espece');
  var kgMax = espece === 'chat' ? EN.kg_max_chat : EN.kg_max_chien;
  function g(v) { return isFinite(v) ? CQ.souple(Math.round(v), 0) + ' g' : '–'; }
  function recalcul() {
    var kg = CQ.nombre('kg', EN.kg_min, kgMax), kcal100 = CQ.nombre('kcal', 0, 100000);
    var repas = Math.round(CQ.nombre('repas', 1, 8));
    var kcal = CU.kcalJour(espece, kg, CQ.valeur('statut'));
    CQ.texte('rKcal', isFinite(kcal) ? CQ.souple(Math.round(kcal), 0) + ' kcal' : '–');
    var okKcal = isFinite(kcal100) && kcal100 >= 150 && kcal100 <= 600;
    var gj = okKcal ? CU.grammes(kcal, kcal100) : NaN, msg = '';
    var mixte = !!CQ.el('part');
    var part = mixte ? Number(CQ.valeur('part')) / 100 : 0;
    if (mixte && part > 0) {
      var kp = CQ.nombre('kcalp', 0, 100000);
      if (isFinite(kp) && kp >= 30 && kp <= 300) {
        var gp = CU.grammes(kcal * part, kp), gs = okKcal ? CU.grammes(kcal * (1 - part), kcal100) : NaN;
        CQ.texte('rG', g(gs)); CQ.texte('rPatee', g(gp));
        CQ.texte('rRepas', isFinite(gs) && repas ? g(gs / repas) : '–');
        msg = isFinite(gs) ? 'Pour ' + CQ.souple(Math.round(part * 100), 0) + ' % des calories en pâtée : environ ' + g(gp) + ' de pâtée et ' + g(gs) + ' de croquettes par jour.' : '';
      } else {
        CQ.texte('rG', '–'); CQ.texte('rPatee', '–'); CQ.texte('rRepas', '–');
        msg = 'Indiquez l\'énergie de la pâtée en kcal pour 100 g (étiquette).';
      }
    } else {
      CQ.texte('rG', g(gj));
      if (mixte) { CQ.texte('rPatee', '–'); }
      CQ.texte('rRepas', isFinite(gj) && repas ? g(gj / repas) : '–');
      if (isFinite(gj)) { msg = 'Repère : environ ' + g(gj) + ' de croquettes par jour, soit ' + CQ.souple(Math.round(kcal), 0) + ' kcal. L\'étiquette du paquet et votre vétérinaire font foi ; surveillez le poids.'; }
      else if (!okKcal) { msg = 'Vérifiez l\'énergie du paquet : elle se lit en kcal pour 100 g sur l\'étiquette.'; }
    }
    CQ.texte('rRer', isFinite(kg) ? CQ.souple(Math.round(CU.rer(kg)), 0) + ' kcal' : '–');
    CQ.texte('phrase', msg);
    if (CQ.el('gabRepas')) {
      var m = CQ.nombre('moisChiot', 0, 24);
      CQ.texte('phraseRepas', isFinite(m) ? CU.repasChiot(CQ.valeur('gabRepas'), m) : '');
    }
  }
  CQ.surChangement(['kg', 'statut', 'kcal', 'repas', 'part', 'kcalp', 'gabRepas', 'moisChiot'], recalcul);
  CQ.initPartage(recalcul);
}());
