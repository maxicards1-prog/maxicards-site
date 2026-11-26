/* Phase de la Lune (Meeus, chapitres 48 et 49) : phase, part éclairée, âge, dessin, prochaines phases (heure de Paris). */
(function () {
  'use strict';
  var CQ = window.CQ, HE = window.HE, HX = window.HX;
  var P = 'Europe/Paris';

  function instant() {
    var d = HX.lireDate(CQ.valeur('d'), 1900, 2100);
    if (!d) { return { ms: Date.now(), maintenant: true }; }
    return { ms: HE.versInstant(P, d.a, d.mo, d.j, 22, 0).ms, maintenant: false };
  }

  function recalcul() {
    var t = instant(), L = HE.lune(t.ms), sud = CQ.valeur('hemi') === 's';
    var pj = HE.parties(P, t.ms);
    var nom = HE.nomPhaseJour(HE.versInstant(P, pj.a, pj.mo, pj.j, 0, 0).ms, HE.versInstant(P, pj.a, pj.mo, pj.j, 23, 59).ms);
    CQ.texte('rPhase', nom.nom);
    CQ.texte('rFrac', Math.round(L.fraction * 100) + ' %');
    CQ.texte('rAge', isFinite(L.age) ? CQ.decimal(L.age, 1) + ' jours' : '–');
    CQ.texte('rSens', L.croissante ? 'croissante' : 'décroissante');
    var chemin = HX.cheminLune(L.fraction, L.croissante, sud);
    CQ.el('clair').setAttribute('d', chemin || 'M50 50');
    CQ.el('dessin').setAttribute('aria-label', 'Lune ' + (L.croissante ? 'croissante' : 'décroissante') + ', éclairée à ' + Math.round(L.fraction * 100) + ' %');
    var p = HE.parties(P, t.ms);
    var msg = (t.maintenant ? 'En ce moment' : 'Le ' + HX.dateLongue(p) + ' à 22 h (heure de Paris)') + ', la Lune est ' +
      (nom.principale >= 0 ? 'à la phase « ' + nom.nom.toLowerCase() + ' » (' + HX.heureTexte(HE.parties(P, nom.ms)) + ', heure de Paris)' : 'en phase « ' + nom.nom.toLowerCase() + ' »') +
      ', éclairée à ' + Math.round(L.fraction * 100) + ' %. Elle est ' + (L.croissante ? 'croissante : elle grossit jusqu\'à la pleine lune' : 'décroissante : elle diminue jusqu\'à la nouvelle lune') + '.';
    var ph = HE.phasesEntre(t.ms, t.ms + 120 * HE.JOUR);
    var pleine = ph.filter(function (x) { return x.type === 2; })[0], nouvelle = ph.filter(function (x) { return x.type === 0; })[0];
    if (pleine) { msg += ' Prochaine pleine lune : ' + HX.dateLongue(HE.parties(P, pleine.ms)) + ' à ' + HX.heureTexte(HE.parties(P, pleine.ms)) + '.'; }
    if (nouvelle) { msg += ' Prochaine nouvelle lune : ' + HX.dateLongue(HE.parties(P, nouvelle.ms)) + ' à ' + HX.heureTexte(HE.parties(P, nouvelle.ms)) + '.'; }
    CQ.texte('phrase', msg);
    CQ.lignes('prochaines', ph.slice(0, 8).map(function (x) {
      var q = HE.parties(P, x.ms);
      return { cellules: [HE.NOMS_PHASES[x.type], HX.dateLongue(q), HX.heureTexte(q)], nombres: [2] };
    }));
  }

  CQ.surChangement(['d', 'hemi'], recalcul);
  CQ.initPartage(recalcul);
}());
