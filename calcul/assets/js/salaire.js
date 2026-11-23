/* Salaire brut -> net (et net -> brut), secteur privé, taux salariaux 2026 (service-public.fr, fiche F2302). */
(function () {
  'use strict';
  var CQ = window.CQ;
  var PSS = 4005; // plafond mensuel de la Sécurité sociale 2026
  // Cotisations salariales : [libellé, taux, assiette]
  function cotisations(brut, cadre) {
    var t1 = Math.min(brut, PSS);
    var t2 = Math.max(0, Math.min(brut, 8 * PSS) - PSS);
    var assietteCsg = 0.9825 * Math.min(brut, 4 * PSS) + Math.max(0, brut - 4 * PSS);
    var l = [
      ['Assurance vieillesse plafonnée', 0.069, t1],
      ['Assurance vieillesse déplafonnée', 0.004, brut],
      ['Retraite complémentaire Agirc-Arrco T1', 0.0315, t1],
      ["Contribution d'équilibre général T1", 0.0086, t1]
    ];
    if (t2 > 0) {
      l.push(['Retraite complémentaire Agirc-Arrco T2', 0.0864, t2]);
      l.push(["Contribution d'équilibre général T2", 0.0108, t2]);
      l.push(["Contribution d'équilibre technique", 0.0014, Math.min(brut, 8 * PSS)]);
    }
    if (cadre) { l.push(['APEC (cadres)', 0.00024, Math.min(brut, 4 * PSS)]); }
    l.push(['CSG déductible', 0.068, assietteCsg]);
    l.push(['CSG non déductible', 0.024, assietteCsg]);
    l.push(['CRDS', 0.005, assietteCsg]);
    return l.map(function (x) { return { nom: x[0], taux: x[1], assiette: x[2], montant: x[1] * x[2] }; });
  }
  function calcul(brut, cadre, retenues, pas) {
    var lignes = cotisations(brut, cadre);
    var total = 0, nonDeductible = 0;
    lignes.forEach(function (x) {
      total += x.montant;
      if (x.nom === 'CSG non déductible' || x.nom === 'CRDS') { nonDeductible += x.montant; }
    });
    var net = brut - total - retenues;
    var imposable = net + nonDeductible;
    var impot = Math.max(0, imposable * pas / 100);
    return { brut: brut, lignes: lignes, cotis: total, net: net, imposable: imposable, impot: impot, apresImpot: net - impot };
  }
  // net -> brut par dichotomie (le net croît avec le brut)
  function brutDepuisNet(net, cadre, retenues) {
    var bas = 0, haut = Math.max(10, net * 2 + retenues * 2 + 10);
    for (var i = 0; i < 80; i++) {
      var m = (bas + haut) / 2;
      if (calcul(m, cadre, retenues, 0).net < net) { bas = m; } else { haut = m; }
    }
    return (bas + haut) / 2;
  }
  function recalcul() {
    var montant = CQ.nombre('montant', 0, 1e7);
    var sens = CQ.valeur('sens');
    var periode = CQ.valeur('periode');
    var cadre = CQ.valeur('statut') === 'cadre';
    var heures = CQ.nombre('heures', 1, 60);
    if (!isFinite(heures)) { heures = 35; }
    var mois = CQ.nombre('mois', 12, 16);
    if (!isFinite(mois)) { mois = 12; }
    var retenues = CQ.nombre('retenues', 0, 1e5);
    if (!isFinite(retenues)) { retenues = 0; }
    var pas = CQ.nombre('pas', 0, 60);
    if (!isFinite(pas)) { pas = 0; }
    var heuresMois = heures * 52 / 12;
    if (!isFinite(montant) || montant <= 0) {
      ['rBrutM', 'rNetM', 'rNetA', 'rNetH', 'rApres', 'rTaux'].forEach(function (id) { CQ.texte(id, '–'); });
      CQ.lignes('detail', []);
      CQ.texte('phrase', '');
      return;
    }
    // montant ramené au mois
    var mensuel = periode === 'heure' ? montant * heuresMois : periode === 'annee' ? montant / mois : montant;
    var brutM = sens === 'net' ? brutDepuisNet(mensuel, cadre, retenues) : mensuel;
    var r = calcul(brutM, cadre, retenues, pas);
    var tauxCharges = r.brut > 0 ? (r.brut - r.net) / r.brut * 100 : NaN;
    CQ.texte('rBrutM', CQ.euros(r.brut));
    CQ.texte('rNetM', CQ.euros(r.net));
    CQ.texte('rNetA', CQ.euros(r.net * mois));
    CQ.texte('rBrutA', CQ.euros(r.brut * mois));
    CQ.texte('rNetH', CQ.euros(r.net / heuresMois));
    CQ.texte('rBrutH', CQ.euros(r.brut / heuresMois));
    CQ.texte('rApres', CQ.euros(r.apresImpot));
    CQ.texte('rImposable', CQ.euros(r.imposable));
    CQ.texte('rTaux', CQ.pourcent(tauxCharges, 1));
    var lignes = r.lignes.map(function (x) {
      return { cellules: [x.nom, CQ.euros(x.assiette), CQ.pourcent(x.taux * 100, 3), CQ.euros(x.montant)], nombres: [1, 2, 3] };
    });
    if (retenues > 0) { lignes.push({ cellules: ['Autres retenues (mutuelle, prévoyance…)', '', '', CQ.euros(retenues)], nombres: [3] }); }
    lignes.push({ cellules: ['Total retenu', '', '', CQ.euros(r.cotis + retenues)], nombres: [3], classe: 'meilleur' });
    CQ.lignes('detail', lignes);
    // barre de répartition
    var pNet = Math.max(0, r.apresImpot / r.brut * 100), pImp = Math.max(0, r.impot / r.brut * 100);
    var pCot = Math.max(0, 100 - pNet - pImp);
    CQ.el('bNet').style.width = pNet + '%';
    CQ.el('bCot').style.width = pCot + '%';
    CQ.el('bImp').style.width = pImp + '%';
    CQ.texte('phrase', 'Sur 100 € de salaire brut, vous touchez ' + CQ.euros(r.net / r.brut * 100) +
      ' net avant impôt' + (pas > 0 ? ' et ' + CQ.euros(r.apresImpot / r.brut * 100) + ' après le prélèvement à la source' : '') + '.');
  }
  CQ.surChangement(['montant', 'sens', 'periode', 'statut', 'heures', 'mois', 'retenues', 'pas'], recalcul);
  CQ.initPartage(recalcul);
}());
