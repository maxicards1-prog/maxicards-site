/* Auto : carte grise, chevaux fiscaux, malus, Crit'Air, recharge. Logique pure (aucun accès à la page) :
   testée sous Node (tests\test_logique.py), copiée dans public/assets/js/. Barèmes dans donnees.json (sources datées). */
(function (racine) {
  'use strict';
  function fabriquer(D) {
    var AU = { D: D };
    function dans(v, a, b) { return typeof v === 'number' && isFinite(v) && v >= a && v <= b; }
    function centimes(v) { return Math.round(v * 100) / 100; }
    AU.dans = dans;

    // ---------- carte grise ----------
    AU.region = function (id) {
      var r = D.carte_grise.regions.filter(function (x) { return x.id === id; });
      return r.length ? r[0] : null;
    };
    // tarif du cheval fiscal appliqué (Île-de-France : tarif régional + majoration IDF Mobilités)
    AU.tarifCV = function (id) {
      var r = AU.region(id);
      return r ? r.cv + (r.majoration || 0) : NaN;
    };
    // o : {region, cv, genre: 'vp'|'moto'|'cyclo', energie: 'thermique'|'elec', age10: bool, malus: nombre}
    // Les réductions ne se cumulent pas : on garde la plus forte (CIBS L421-45 à L421-49).
    AU.carteGrise = function (o) {
      var r = AU.region(o.region);
      if (!r || !dans(o.cv, 1, 99) || Math.floor(o.cv) !== o.cv) { return null; }
      var reductions = [], motifs = [];
      if (o.genre === 'cyclo') { reductions.push(0); motifs.push('cyclomoteur : taxe régionale nulle'); }
      if (o.genre === 'moto') { reductions.push(0.5); motifs.push('moto : moitié prix'); }
      if (o.energie === 'elec' && typeof r.electrique === 'number') { reductions.push(r.electrique); motifs.push('électrique ou hydrogène : ' + (r.electrique === 0 ? 'gratuit' : 'moitié prix') + ' dans cette région'); }
      if (o.age10) { reductions.push(0.5); motifs.push('10 ans ou plus : moitié prix'); }
      var facteur = reductions.length ? Math.min.apply(null, reductions) : 1;
      var tarif = r.cv + (r.majoration || 0);
      var regionale = centimes(tarif * o.cv * facteur);
      var malus = dans(o.malus, 0, 1e6) ? o.malus : 0;
      var total = centimes(regionale + D.carte_grise.taxe_fixe + D.carte_grise.redevance + malus);
      return { tarif: tarif, facteur: facteur, regionale: regionale, fixe: D.carte_grise.taxe_fixe, redevance: D.carte_grise.redevance,
        malus: malus, total: total, motifs: motifs };
    };

    // ---------- malus écologique (barème 2026) ----------
    AU.malusCO2 = function (g) {
      var M = D.malus_co2;
      if (!dans(g, 0, 2000)) { return NaN; }
      g = Math.floor(g);
      if (g < M.debut) { return 0; }
      var i = g - M.debut;
      return i < M.valeurs.length ? M.valeurs[i] : M.maximum;
    };
    // somme par tranches, bornes incluses : 1 950 kg = 200 x 10 + 100 x 15 + 100 x 20 + 51 x 25 = 6 775 €
    AU.malusPoids = function (kg) {
      if (!dans(kg, 0, 100000)) { return NaN; }
      kg = Math.floor(kg);
      var s = 0;
      D.malus_poids.tranches.forEach(function (t) {
        var n = Math.min(kg, t.fin) - t.debut + 1;
        if (n > 0) { s += n * t.tarif; }
      });
      return s;
    };
    // émissions retenues après les abattements (E85 : -40 % jusqu'à 250 g ; famille de 3 enfants ou plus : 20 g par enfant)
    AU.co2Retenu = function (g, energie, enfants) {
      var M = D.malus_co2, v = Math.floor(g);
      if (energie === 'e85' && v <= M.e85_limite) { v = Math.floor(v * (1 - M.e85_abattement)); }
      if (enfants >= M.famille_enfants_min) { v -= M.famille_g_par_enfant * Math.floor(enfants); }
      return Math.max(0, v);
    };
    // masse retenue (hybride et micro-hybride : -100 kg ; hybride rechargeable de plus de 50 km : -200 kg, 15 % au plus ; famille : 200 kg par enfant)
    AU.masseRetenue = function (kg, energie, enfants) {
      var P = D.malus_poids, v = Math.floor(kg);
      if (energie === 'hybride') { v -= P.hybride_kg; }
      if (energie === 'phev50') { v -= Math.min(P.phev_kg, P.phev_limite * Math.floor(kg)); }
      if (enfants >= D.malus_co2.famille_enfants_min) { v -= P.famille_kg_par_enfant * Math.floor(enfants); }
      return Math.max(0, Math.floor(v));
    };
    // o : {co2, masse, energie: 'thermique'|'e85'|'hybride'|'phev50'|'phev'|'elec', enfants, exonere: bool}
    AU.malus = function (o) {
      if (!dans(o.co2, 0, 2000) || !dans(o.masse, 300, 10000)) { return null; }
      var enfants = dans(o.enfants, 0, 30) ? Math.floor(o.enfants) : 0;
      if (o.energie === 'elec' || o.exonere) {
        return { co2Retenu: 0, masseRetenue: 0, malusCO2: 0, malusPoids: 0, total: 0, exonere: true };
      }
      var g = AU.co2Retenu(o.co2, o.energie, enfants), m = AU.masseRetenue(o.masse, o.energie, enfants);
      var c = AU.malusCO2(g), p = AU.malusPoids(m);
      p = Math.max(0, Math.min(p, D.malus_co2.maximum - c));   // le total ne dépasse pas le malus CO2 maximal
      return { co2Retenu: g, masseRetenue: m, malusCO2: c, malusPoids: p, total: c + p, exonere: false };
    };
    // décote d'un véhicule d'occasion importé (en %, selon l'ancienneté en mois)
    AU.decote = function (mois) {
      if (!dans(mois, 1, 2000)) { return NaN; }
      var t = D.decote_import;
      for (var i = 0; i < t.length; i++) { if (mois <= t[i][0]) { return t[i][1]; } }
      return 100;
    };

    // ---------- chevaux fiscaux ----------
    AU.kwDepuisCh = function (ch) { return ch * D.chevaux.kw_par_ch; };
    // voiture de tourisme immatriculée à partir du 01/01/2021 (CIBS L421-16)
    AU.chevauxNouveaux = function (kw) {
      if (!dans(kw, 1, 2000)) { return NaN; }
      var x = kw / 100;
      return Math.round(1.8 * x * x + 3.87 * x + 1.34);
    };
    // voiture immatriculée du 01/07/1998 au 31/12/2020 (loi 98-546, art. 62) : CO2 / 45 + (P / 40) puissance 1,6
    AU.chevauxAnciens = function (kw, co2) {
      if (!dans(kw, 1, 2000) || !dans(co2, 0, 2000)) { return NaN; }
      return Math.round(co2 / 45 + Math.pow(kw / 40, 1.6));
    };
    // deux-roues à moteur thermique, selon la cylindrée (CIBS L421-17)
    AU.chevauxMoto = function (cm3) {
      if (!dans(cm3, 1, 10000)) { return NaN; }
      if (cm3 <= 125) { return 1; }
      if (cm3 <= 175) { return 2; }
      if (cm3 <= 250) { return 3; }
      if (cm3 <= 350) { return 4; }
      if (cm3 <= 500) { return 5; }
      return Math.ceil(5 + 8 * (cm3 / 1000 - 0.5) - 1e-9);
    };
    // formule à appliquer selon la date de 1re immatriculation (AAAA-MM-JJ)
    AU.formuleChevaux = function (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) { return ''; }
      if (date >= D.chevaux.date_nouvelle) { return 'nouvelle'; }
      if (date >= D.chevaux.date_ancienne) { return 'ancienne'; }
      return 'avant1998';
    };

    // ---------- Crit'Air (arrêté du 21 juin 2016, annexe I) ----------
    // o : {type: 'vp'|'vul'|'moto'|'cyclo', energie: 'essence'|'diesel'|'gaz'|'phev'|'elec', date: 'AAAA-MM-JJ', euro: ''|'1'..'6'}
    AU.critair = function (o) {
      var C = D.critair;
      if (o.energie === 'elec') { return { classe: '0', par: 'energie' }; }
      var deuxRoues = o.type === 'moto' || o.type === 'cyclo';
      if (!deuxRoues && (o.energie === 'gaz' || o.energie === 'phev')) { return { classe: '1', par: 'energie' }; }
      var diesel = !deuxRoues && o.energie === 'diesel';
      var tableEuro = deuxRoues ? C.euro_2roues : (diesel ? C.euro_diesel : C.euro_essence);
      if (o.euro && Object.prototype.hasOwnProperty.call(tableEuro, o.euro)) {
        return { classe: String(tableEuro[o.euro]), par: 'euro' };
      }
      var d = String(o.date || '');
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
      if (!m || +m[1] < 1900 || +m[1] > 2100 || +m[2] < 1 || +m[2] > 12 || +m[3] < 1 || +m[3] > 31) { return null; }
      var cle = deuxRoues ? o.type : ((o.type === 'vul' ? 'vul_' : 'vp_') + (diesel ? 'diesel' : 'essence'));
      var t = C[cle];
      for (var i = 0; i < t.length; i++) { if (d >= t[i][0]) { return { classe: String(t[i][1]), par: 'date' }; } }
      return { classe: 'nc', par: 'date' };
    };

    // ---------- voiture électrique ----------
    // o : {capacite (kWh), depart (%), arrivee (%), borne (kW), voiture (kW, 0 = inconnue), pertes (%)}
    AU.tempsRecharge = function (o) {
      if (!dans(o.capacite, 1, 300) || !dans(o.depart, 0, 100) || !dans(o.arrivee, 0, 100) || o.arrivee <= o.depart ||
          !dans(o.borne, 0.5, 1000) || !dans(o.pertes, 0, 50)) { return null; }
      var voiture = dans(o.voiture, 0.5, 1000) ? o.voiture : Infinity;
      var puissance = Math.min(o.borne, voiture);
      var batterie = o.capacite * (o.arrivee - o.depart) / 100;
      var utile = puissance * (1 - o.pertes / 100);
      return { batterie: batterie, reseau: batterie / (1 - o.pertes / 100), puissance: puissance, heures: batterie / utile };
    };
    // o : {capacite, depart, arrivee, prix (€/kWh), pertes (%), conso (kWh/100 km, facultatif)}
    AU.coutRecharge = function (o) {
      if (!dans(o.capacite, 1, 300) || !dans(o.depart, 0, 100) || !dans(o.arrivee, 0, 100) || o.arrivee <= o.depart ||
          !dans(o.prix, 0, 10) || !dans(o.pertes, 0, 50)) { return null; }
      var batterie = o.capacite * (o.arrivee - o.depart) / 100, reseau = batterie / (1 - o.pertes / 100);
      var res = { batterie: batterie, reseau: reseau, cout: reseau * o.prix, cout100: NaN, km: NaN };
      if (dans(o.conso, 3, 100)) {
        res.cout100 = o.conso / (1 - o.pertes / 100) * o.prix;
        res.km = batterie / o.conso * 100;
      }
      return res;
    };
    // o : {capacite, charge (%), reserve (%), conso (kWh/100 km)}
    AU.autonomie = function (o) {
      if (!dans(o.capacite, 1, 300) || !dans(o.charge, 0, 100) || !dans(o.reserve, 0, 100) || !dans(o.conso, 3, 100)) { return NaN; }
      var part = Math.max(0, o.charge - o.reserve) / 100;
      return o.capacite * part / o.conso * 100;
    };
    return AU;
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = fabriquer; }
  else { racine.AU = fabriquer(racine.AU_DATA); }
}(typeof window !== 'undefined' ? window : this));
