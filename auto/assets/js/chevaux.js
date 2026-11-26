/* Chevaux fiscaux : formule de 2021 (kW), formule de 1998 (CO2 et kW), deux-roues selon la cylindrée. */
(function () {
  'use strict';
  var CQ = window.CQ, AU = window.AU;
  function recalcul() {
    var moto = CQ.valeur('vehicule') === 'moto';
    ['ch-puissance', 'ch-unite', 'ch-co2', 'ch-date'].forEach(function (id) { CQ.montrer(id, !moto); });
    CQ.montrer('ch-cm3', moto);
    if (moto) {
      var cm3 = CQ.nombre('cm3', 0, 100000), m = AU.chevauxMoto(cm3);
      CQ.texte('rCV', isFinite(m) ? String(m) : '–');
      CQ.texte('rKW', '–'); CQ.texte('rNouv', '–'); CQ.texte('rAnc', '–');
      CQ.texte('phrase', isFinite(m) ? 'Deux-roues thermique de ' + CQ.entier(cm3) + ' cm³ : ' + m + ' CV' +
        (cm3 > 500 ? ' (5 + 8 × (' + CQ.souple(cm3 / 1000, 3) + ' − 0,5), arrondi à l’unité supérieure).' : '.') :
        'Tapez la cylindrée en cm³ (case P.1).');
      return;
    }
    var p = CQ.nombre('puissance', 0, 100000);
    var kw = CQ.valeur('unite') === 'ch' ? AU.kwDepuisCh(p) : p;
    var co2 = CQ.nombre('co2', 0, 5000);
    var n = AU.chevauxNouveaux(kw), a = AU.chevauxAnciens(kw, co2);
    var f = AU.formuleChevaux(CQ.valeur('date'));
    CQ.texte('rKW', isFinite(kw) && kw > 0 ? CQ.souple(kw, 1) + ' kW' : '–');
    CQ.texte('rNouv', isFinite(n) ? n + ' CV' : '–');
    CQ.texte('rAnc', isFinite(a) ? a + ' CV' : '–');
    var cv = f === 'nouvelle' ? n : (f === 'ancienne' ? a : NaN);
    CQ.texte('rCV', isFinite(cv) ? String(cv) : '–');
    var t;
    if (!isFinite(n)) { t = 'Tapez la puissance du moteur (case P.2, en kW).'; }
    else if (f === 'nouvelle') { t = 'Immatriculée depuis le 1er janvier 2021 : formule de 2021, ' + n + ' CV.'; }
    else if (f === 'ancienne') {
      t = isFinite(a) ? 'Immatriculée entre le 1er juillet 1998 et le 31 décembre 2020 : formule de 1998, ' + a + ' CV. Si le modèle a été réceptionné à partir du 1er novembre 2019, c’est la formule de 2021 qui compte : ' + n + ' CV.'
        : 'Pour une voiture de 1998 à 2020, tapez aussi le CO2 en g/km (case V.7).';
    } else if (f === 'avant1998') { t = 'Avant le 1er juillet 1998, le calcul reposait sur la cylindrée : lisez la case P.6 de la carte grise.'; }
    else { t = 'Choisissez la date de première immatriculation (case B).'; }
    CQ.texte('phrase', t);
  }
  CQ.initPartage(recalcul);
  CQ.surChangement(['vehicule', 'puissance', 'unite', 'co2', 'date', 'cm3'], recalcul);
}());
