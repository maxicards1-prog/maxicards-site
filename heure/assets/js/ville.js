/* Pages « Heure à… » et pages par région : horloges en direct, écart avec Paris, et conversion d'une heure de Paris.
   Pages région : liste compacte [data-direct] (heure) + [data-info] (ville, UTC, écart, jour), sans champ à remplir. */
(function () {
  'use strict';
  var CQ = window.CQ, HE = window.HE, HX = window.HX;
  var P = 'Europe/Paris';
  function tous(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  var cartes = tous('.horloge[data-ville]'), conv = tous('[data-conv]'), directs = tous('[data-direct]'), infos = tous('[data-info]');

  function ecartParis(d, dp) { return d === dp ? 'même heure qu\'à Paris' : HE.texteEcart(d - dp) + ' qu\'à Paris'; }

  function tic() {
    var now = Date.now(), dp = HE.decalage(P, now), pp = HE.parties(P, now);
    cartes.forEach(function (c) {
      var v = HX.ville(c.getAttribute('data-ville'));
      if (!v) { return; }
      var p = HE.parties(v.zone, now), d = HE.decalage(v.zone, now);
      HX.ecrire(c.querySelector('.h-heure'), HX.hms(p));
      HX.ecrire(c.querySelector('.h-info'), HX.dateCourte(p) + ' · ' + HE.texteUTC(d) + (v.zone === P ? '' : ' · ' + HE.texteEcart(d - dp) + ' qu\'à Paris'));
    });
    directs.forEach(function (el) {
      var v = HX.ville(el.getAttribute('data-direct'));
      if (v) { HX.ecrire(el, HX.hms(HE.parties(v.zone, now))); }
    });
    infos.forEach(function (el) {
      var v = HX.ville(el.getAttribute('data-info'));
      if (!v) { return; }
      var p = HE.parties(v.zone, now), d = HE.decalage(v.zone, now), j = HX.jourRelatif(p, pp);
      HX.ecrire(el, v.nom + ' · ' + HE.texteUTC(d) + ' · ' + ecartParis(d, dp) + (j ? ' · ' + HX.texteJour(j) : ''));
    });
  }

  function phrase() {
    var now = Date.now(), principale = cartes.length ? HX.ville(cartes[0].getAttribute('data-ville')) : null;
    if (!principale || !CQ.el('phrase')) { return; }
    var e = HE.decalage(principale.zone, now) - HE.decalage(P, now);
    CQ.texte('phrase', 'En ce moment, ' + principale.nom + ' ' + (e === 0 ? 'a la même heure que Paris' : 'a ' + HE.texteEcart(e) + ' que Paris') +
      ' (' + principale.nom + ' : ' + HE.texteUTC(HE.decalage(principale.zone, now)) + ', Paris : ' + HE.texteUTC(HE.decalage(P, now)) + ').');
  }

  function convertir() {
    if (!conv.length) { return; }
    var h = HX.lireHeure(CQ.valeur('h')) || { h: 12, mi: 0 };
    var aj = HE.parties(P, Date.now()), r = HE.versInstant(P, aj.a, aj.mo, aj.j, h.h, h.mi), pp = HE.parties(P, r.ms);
    conv.forEach(function (el) {
      var v = HX.ville(el.getAttribute('data-conv'));
      if (!v) { return; }
      var p = HE.parties(v.zone, r.ms), j = HX.jourRelatif(p, pp);
      CQ.texte(el.id, HX.heureTexte(p) + (j ? ' (' + HX.texteJour(j) + ')' : ''));
    });
    HX.ecrire('convNote', r.ok ? 'Calcul fait pour aujourd\'hui, ' + HX.dateCourte(pp) + '.' : 'Cette heure n\'existe pas à Paris aujourd\'hui (passage à l\'heure d\'été).');
  }

  function demarrer() { phrase(); convertir(); HX.chaqueSeconde(tic); }
  CQ.surChangement(['h'], convertir);
  // Sans champ à remplir (pages région), initPartage ne rappelle pas : on démarre directement.
  if (document.querySelector('[data-p]')) { CQ.initPartage(demarrer); } else { demarrer(); }
}());
