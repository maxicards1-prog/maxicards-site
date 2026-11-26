/* Changement d'heure en France : le prochain (date, sens, compte des jours) et les dates d'une année au choix.
   Règle européenne : dernier dimanche de mars et dernier dimanche d'octobre, à 1 h UTC. */
(function () {
  'use strict';
  var CQ = window.CQ, HE = window.HE, HX = window.HX;
  var P = 'Europe/Paris';

  function texteEvenement(ms, ete) {
    var p = HE.parties(P, ms);
    return HX.dateLongue(p) + (ete ? ' : à 2 h, il sera 3 h' : ' : à 3 h, il sera 2 h');
  }

  function prochain() {
    var now = Date.now(), a = HE.parties(P, now).a, evts = [];
    [a - 1, a, a + 1].forEach(function (x) {
      var c = HE.changementsFrance(x);
      evts.push({ ms: c.ete.ms, ete: true }, { ms: c.hiver.ms, ete: false });
    });
    var suiv = null, prec = null;
    evts.forEach(function (e) { if (e.ms > now && (!suiv || e.ms < suiv.ms)) { suiv = e; } if (e.ms <= now && (!prec || e.ms > prec.ms)) { prec = e; } });
    var ps = HE.parties(P, suiv.ms), pn = HE.parties(P, now);
    var jours = Math.round((Date.UTC(ps.a, ps.mo - 1, ps.j) - Date.UTC(pn.a, pn.mo - 1, pn.j)) / HE.JOUR);
    CQ.texte('rProchain', HX.dateCourte(ps) + ' ' + ps.a);
    CQ.texte('rDans', jours === 0 ? 'cette nuit' : jours === 1 ? 'demain' : 'dans ' + jours + ' jours');
    CQ.texte('rSens', suiv.ete ? 'on avance (+1 h)' : 'on recule (−1 h)');
    var veille = HE.parties('UTC', suiv.ms - HE.JOUR);
    CQ.texte('phrase', 'Dans la nuit du ' + HX.JOURS[veille.js] + ' ' + veille.j + (veille.j === 1 ? 'er' : '') + ' au ' + HX.dateLongue(ps) + ', ' +
      (suiv.ete ? 'à 2 h du matin, il sera 3 h : on avance d\'une heure et on passe à l\'heure d\'été (UTC+2). La nuit est plus courte d\'une heure.'
        : 'à 3 h du matin, il sera 2 h : on recule d\'une heure et on revient à l\'heure d\'hiver (UTC+1). La nuit est plus longue d\'une heure.') +
      (prec ? ' Changement précédent : ' + texteEvenement(prec.ms, prec.ete) + '.' : ''));
  }

  function annee() {
    var a = CQ.nombre('a', 2001, 2100);
    if (!isFinite(a)) { a = HE.parties(P, Date.now()).a; }
    a = Math.round(a);
    var c = HE.changementsFrance(a);
    HX.ecrire('anChoisie', String(a));
    CQ.texte('rEte', HX.dateCourte(HE.parties(P, c.ete.ms)));
    CQ.texte('rHiver', HX.dateCourte(HE.parties(P, c.hiver.ms)));
  }

  CQ.surChangement(['a'], annee);
  CQ.initPartage(function () { prochain(); annee(); });
}());
