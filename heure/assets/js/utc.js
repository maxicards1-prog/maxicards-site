/* Heure UTC : horloges en direct (UTC, Paris, appareil), conversion d'une heure et décalages actuels de toutes les villes. */
(function () {
  'use strict';
  var CQ = window.CQ, HE = window.HE, HX = window.HX;
  var derniereMinute = -1;

  function tic() {
    var now = Date.now(), zi = HX.zoneAppareil();
    var pu = HE.parties('UTC', now), pp = HE.parties('Europe/Paris', now), pa = HE.parties(zi, now);
    HX.ecrire('hUtc', HX.hms(pu));
    HX.ecrire('hUtcInfo', HX.dateLongue(pu));
    HX.ecrire('hParis', HX.hms(pp));
    HX.ecrire('hParisInfo', HE.texteUTC(HE.decalage('Europe/Paris', now)) + ' · ' + HX.dateCourte(pp));
    HX.ecrire('hApp', HX.hms(pa));
    HX.ecrire('hAppInfo', zi.replace(/_/g, ' ') + ' · ' + HE.texteUTC(HE.decalage(zi, now)));
    if (pu.mi !== derniereMinute) { derniereMinute = pu.mi; decalages(now); }
  }

  // Villes regroupées par décalage actuel.
  function decalages(now) {
    var groupes = {};
    Object.keys(window.HV || {}).forEach(function (id) {
      var v = HX.ville(id), d = HE.decalage(v.zone, now);
      (groupes[d] = groupes[d] || []).push(v.nom);
    });
    var cles = Object.keys(groupes).map(Number).sort(function (a, b) { return a - b; });
    CQ.lignes('decalages', cles.map(function (d) {
      return { cellules: [HE.texteUTC(d), groupes[d].sort(function (a, b) { return a.localeCompare(b, 'fr'); }).join(', ')] };
    }));
  }

  function recalcul() {
    var v = HX.ville(CQ.valeur('ville')) || HX.ville('paris'), sens = CQ.valeur('sens');
    var d = HX.lireDate(CQ.valeur('d'), 1900, 2100), h = HX.lireHeure(CQ.valeur('h'));
    if (!d || !h) { CQ.texte('rConv', '–'); CQ.texte('rDec', '–'); CQ.texte('phrase', 'Indiquez une date et une heure.'); return; }
    var t, pd, pa, msg = '';
    if (sens === 'ville') {
      var r = HE.versInstant(v.zone, d.a, d.mo, d.j, h.h, h.mi);
      t = r.ms; pd = HE.parties(v.zone, t); pa = HE.parties('UTC', t);
      if (!r.ok) { msg = 'Cette heure n\'existe pas à ' + v.nom + ' ce jour-là (passage à l\'heure d\'été) : calcul fait pour ' + HX.heureTexte(pd) + '. '; }
      HX.ecrire('lConv', 'en UTC');
      msg += HX.heureTexte(pd) + ' à ' + v.nom + ' le ' + HX.dateCourte(pd) + ' = ' + HX.heureTexte(pa) + ' UTC le ' + HX.dateCourte(pa) + '.';
    } else {
      t = Date.UTC(d.a, d.mo - 1, d.j, h.h, h.mi); pd = HE.parties('UTC', t); pa = HE.parties(v.zone, t);
      HX.ecrire('lConv', 'à ' + v.nom);
      msg = HX.heureTexte(pd) + ' UTC le ' + HX.dateCourte(pd) + ' = ' + HX.heureTexte(pa) + ' à ' + v.nom + ' le ' + HX.dateCourte(pa) + '.';
    }
    var dec = HE.decalage(v.zone, t);
    CQ.texte('rConv', HX.heureTexte(pa) + (HX.jourRelatif(pa, pd) ? ' (' + HX.texteJour(HX.jourRelatif(pa, pd)) + ')' : ''));
    CQ.texte('rDec', HE.texteUTC(dec));
    HX.ecrire('lDec', 'décalage de ' + v.nom + ' ce jour-là');
    CQ.texte('phrase', msg);
  }

  CQ.surChangement(['sens', 'ville', 'd', 'h'], recalcul);
  CQ.initPartage(function () {
    if (!CQ.valeur('d')) { CQ.el('d').value = HX.iso(HE.parties('UTC', Date.now())); }
    recalcul();
    HX.chaqueSeconde(tic);
  });
}());
