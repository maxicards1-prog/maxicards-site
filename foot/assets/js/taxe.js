/* Calculateur de taxe EA SPORTS FC Ultimate Team (5 % sur chaque vente). */
(function () {
  'use strict';
  var O = window.OCP;
  var TAXE = 0.05;
  // Paliers de prix du marché des transferts (relevés par la communauté, inchangés depuis plusieurs éditions).
  function pas(prix) {
    if (prix < 1000) { return 50; }
    if (prix < 10000) { return 100; }
    if (prix < 50000) { return 250; }
    if (prix < 100000) { return 500; }
    return 1000;
  }
  function arrondiHaut(prix) { var p = pas(prix); return Math.ceil(prix / p) * p; }
  function net(prix) { return Math.floor(prix * (1 - TAXE)); }

  function calculer() {
    var vente = O.nombre('prixVente', 0, 15000000);
    var achat = O.nombre('prixAchat', 0, 15000000);
    O.texte('rTaxe', isFinite(vente) ? O.entier(vente - net(vente)) : '–');
    O.texte('rNet', isFinite(vente) ? O.entier(net(vente)) : '–');
    if (isFinite(vente) && isFinite(achat)) {
      var b = net(vente) - achat;
      O.texte('rBenef', (b > 0 ? '+' : '') + O.entier(b));
      O.classe('rBenef', 'positif', b > 0);
      O.classe('rBenef', 'negatif', b < 0);
    } else { O.texte('rBenef', '–'); }
    if (isFinite(achat)) {
      var mini = arrondiHaut(Math.max(1, achat / (1 - TAXE)));
      while (net(mini) < achat) { mini = arrondiHaut(mini + 1); }
      O.texte('rMini', O.entier(mini));
    } else { O.texte('rMini', '–'); }
    if (isFinite(vente)) {
      var v = arrondiHaut(vente);
      O.texte('message', v !== vente ? 'Le marché n\'accepte pas ' + O.entier(vente) + ' : prix valide le plus proche au-dessus = ' + O.entier(v) + ' pièces.' : '');
    }
  }
  O.surChangement(['prixVente', 'prixAchat'], calculer);
  calculer();
}());
