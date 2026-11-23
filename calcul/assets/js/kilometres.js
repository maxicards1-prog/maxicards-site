/* Barème kilométrique fiscal (frais 2025 déclarés en 2026 ; inchangé depuis 2023, service-public A14686).
   Chaque tranche : [a, b] -> montant = d × a + b. */
(function () {
  'use strict';
  var CQ = window.CQ;
  var B = {
    voiture: { seuils: [5000, 20000], lignes: {
      '3': [[0.529, 0], [0.316, 1065], [0.370, 0]], '4': [[0.606, 0], [0.340, 1330], [0.407, 0]],
      '5': [[0.636, 0], [0.357, 1395], [0.427, 0]], '6': [[0.665, 0], [0.374, 1457], [0.447, 0]],
      '7': [[0.697, 0], [0.394, 1515], [0.470, 0]] } },
    moto: { seuils: [3000, 6000], lignes: {
      '2': [[0.395, 0], [0.099, 891], [0.248, 0]], '5': [[0.468, 0], [0.082, 1158], [0.275, 0]],
      '6': [[0.606, 0], [0.079, 1583], [0.343, 0]] } },
    cyclo: { seuils: [3000, 6000], lignes: { '0': [[0.315, 0], [0.079, 711], [0.198, 0]] } }
  };
  var CV = {
    voiture: [['3', '3 CV et moins'], ['4', '4 CV'], ['5', '5 CV'], ['6', '6 CV'], ['7', '7 CV et plus']],
    moto: [['2', '1 ou 2 CV'], ['5', '3 à 5 CV'], ['6', 'plus de 5 CV']],
    cyclo: [['0', 'cyclomoteur (50 cm³ ou moins)']]
  };
  var dernierType = '';
  function remplirCv(type, voulu) {
    var sel = CQ.el('cv');
    while (sel.firstChild) { sel.removeChild(sel.firstChild); }
    CV[type].forEach(function (o) {
      var op = document.createElement('option');
      op.value = o[0]; op.textContent = o[1]; sel.appendChild(op);
    });
    if (CV[type].some(function (o) { return o[0] === voulu; })) { sel.value = voulu; } else if (type === 'voiture') { sel.value = '5'; }
  }
  function recalcul() {
    var type = CQ.valeur('vehicule');
    if (!B[type]) { type = 'voiture'; }
    if (type !== dernierType) { remplirCv(type, CQ.valeur('cv')); dernierType = type; }
    CQ.el('blocElec').hidden = type !== 'voiture';
    var d = CQ.nombre('km', 0, 1e6), b = B[type];
    var l = b.lignes[CQ.valeur('cv')] || b.lignes[Object.keys(b.lignes)[0]];
    if (!isFinite(d)) { CQ.texte('rMontant', '–'); CQ.texte('rParKm', '–'); CQ.texte('phrase', ''); return; }
    var t = d <= b.seuils[0] ? 0 : (d <= b.seuils[1] ? 1 : 2), f = l[t];
    var montant = d * f[0] + f[1], elec = type === 'voiture' && CQ.coche('electrique');
    if (elec) { montant *= 1.2; }
    CQ.texte('rMontant', CQ.euros(montant));
    CQ.texte('rParKm', d > 0 ? CQ.euros(montant / d) : '–');
    CQ.texte('phrase', CQ.souple(d, 0) + ' km × ' + CQ.souple(f[0], 3) + (f[1] ? ' + ' + CQ.souple(f[1], 0) + ' €' : '') +
      (elec ? ', puis + 20 % (voiture 100 % électrique)' : '') + ' = ' + CQ.euros(montant) + ' de frais à déclarer.');
  }
  CQ.surChangement(['vehicule', 'cv', 'km', 'electrique'], recalcul);
  // Au chargement, le lien partagé peut porter une puissance de moto : on garde la valeur lue dans l'adresse.
  var cvLu = new URLSearchParams(location.search).get('cv');
  CQ.initPartage(function () {
    if (cvLu !== null) { dernierType = CQ.valeur('vehicule'); remplirCv(dernierType, cvLu); cvLu = null; }
    recalcul();
  });
}());
