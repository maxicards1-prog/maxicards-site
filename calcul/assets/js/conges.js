/* Congés payés : jours acquis (2,5 j ouvrables par mois, 2 j en arrêt maladie non professionnel),
   conversion ouvrables / ouvrés, indemnité au 1/10e. */
(function () {
  'use strict';
  var CQ = window.CQ;
  function recalcul() {
    var mois = CQ.nombre('mois', 0, 12);
    var maladie = CQ.nombre('maladie', 0, 12);
    if (!isFinite(mois)) { mois = 0; }
    if (!isFinite(maladie)) { maladie = 0; }
    if (mois + maladie > 12) { maladie = Math.max(0, 12 - mois); }
    var brutAnnuel = CQ.nombre('brut', 0, 1e7);
    var acquisTravail = mois * 2.5;
    var acquisMaladie = maladie * 2;
    var total = Math.min(30, acquisTravail + acquisMaladie);
    // Le Code du travail arrondit au nombre entier de jours immédiatement supérieur.
    var arrondi = Math.ceil(total - 1e-9);
    var ouvres = arrondi * 5 / 6;
    CQ.texte('rOuvrables', CQ.souple(total, 2) + ' j');
    CQ.texte('rArrondi', arrondi + ' j');
    CQ.texte('rOuvres', CQ.souple(ouvres, 2) + ' j');
    CQ.texte('rSemaines', CQ.souple(arrondi / 6, 2));
    CQ.texte('rDixieme', isFinite(brutAnnuel) ? CQ.euros(brutAnnuel / 10) : '–');
    CQ.texte('rParJour', isFinite(brutAnnuel) && arrondi > 0 ? CQ.euros(brutAnnuel / 10 / arrondi) : '–');
    CQ.texte('phrase', CQ.souple(mois, 2) + ' mois travaillés × 2,5 j' + (maladie ? ' + ' + CQ.souple(maladie, 2) + ' mois d\'arrêt maladie × 2 j' : '') +
      ' = ' + CQ.souple(acquisTravail + acquisMaladie, 2) + ' jours ouvrables' + (acquisTravail + acquisMaladie > 30 ? ', plafonnés à 30' : '') +
      ', arrondis à ' + arrondi + ' jours.');
  }
  CQ.surChangement(['mois', 'maladie', 'brut'], recalcul);
  CQ.initPartage(recalcul);
}());
