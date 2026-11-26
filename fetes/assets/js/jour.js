/* Quel jour de la semaine tombe une date (calendrier grégorien, 1583 à 9999), son numéro de semaine et son rang dans
   l'année. La date saisie n'est jamais écrite dans l'adresse de la page. */
(function () {
  'use strict';
  var FE = window.FE, CQ = window.CQ, FX = window.FX;

  function recalcul() {
    var n = FE.lireIso(CQ.valeur('d')), auj = FX.aujourdhui();
    if (!isFinite(n)) {
      CQ.texte('rJour', '–'); CQ.texte('rSemaine', '–'); CQ.texte('rRang', '–');
      FX.ecrire('phrase', CQ.valeur('d') ? 'Saisissez une date entre le 1er janvier 1583 et le 31 décembre 9999.' : '');
      CQ.lignes('memes', []);
      return;
    }
    var d = FE.date(n), s = FE.semaineIso(n), r = FE.jourDeLAnnee(n), total = FE.bissextile(d.a) ? 366 : 365;
    CQ.texte('rJour', FX.majuscule(FE.JOURS[d.js]));
    CQ.texte('rSemaine', 'Semaine ' + s.semaine);
    FX.ecrire('lSemaine', 'numéro de semaine (norme ISO)' + (s.annee !== d.a ? ', de l\'année ' + s.annee : ''));
    CQ.texte('rRang', r + (r === 1 ? 'er' : 'e') + ' jour');
    FX.ecrire('lRang', 'sur ' + total + ' en ' + d.a + (total === 366 ? ' (année bissextile)' : ''));
    var verbe = n < auj ? 'était' : n === auj ? 'est' : 'sera';
    var fetes = d.a >= FE.FERIES_MIN && d.a <= FE.FERIES_MAX ? FE.fetes(d.a).filter(function (x) { return x.n === n; }).map(function (x) { return x.nom; }) : [];
    FX.ecrire('phrase', 'Le ' + FE.jourMois(n) + ' ' + d.a + ' ' + verbe + ' un ' + FE.JOURS[d.js] + (n === auj ? " (c'est aujourd'hui)" : '') + '.' +
      (fetes.length ? ' Ce jour-là : ' + fetes.join(', ') + '.' : ''));
    var suite = FE.anneesOu(d.mo, d.j, d.js, d.a + 1, 6);
    FX.ecrire('titreMemes', 'Les prochaines années où le ' + FE.jourMois(n) + ' tombe un ' + FE.JOURS[d.js]);
    CQ.lignes('memes', suite.map(function (b) { return { cellules: [String(b), FX.majuscule(FE.texteDate(FE.num(b, d.mo, d.j)))] }; }));
  }

  var e = document.getElementById('d');
  if (e && !FE.valide.apply(null, (e.value || '').split('-').map(Number))) { e.value = FE.iso(FX.aujourdhui()); }
  CQ.surChangement(['d'], recalcul);
  recalcul();
}());
