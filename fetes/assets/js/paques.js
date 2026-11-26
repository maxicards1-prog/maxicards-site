/* Date de Pâques d'une année (méthode de Meeus, Jones et Butcher, calendrier grégorien, 1583 à 3000) et les fêtes
   qui en dépendent : Mardi gras, Rameaux, Ascension, Pentecôte… */
(function () {
  'use strict';
  var FE = window.FE, CQ = window.CQ, FX = window.FX;

  function ecart(e) {
    if (e === 0) { return 'Pâques'; }
    return (e < 0 ? -e : e) + ' jours ' + (e < 0 ? 'avant' : 'après') + ' Pâques';
  }

  function recalcul() {
    var a = FX.annee('a', 1583, 3000, FX.anneeCourante()), m = FE.mobiles(a), p = FE.paques(a);
    var get = function (id) { return m.filter(function (x) { return x.id === id; })[0]; };
    CQ.texte('rPaques', FX.majuscule(FE.texteDate(p)));
    CQ.texte('rMardi', FX.majuscule(FE.texteDate(get('mardi-gras').n, false)));
    CQ.texte('rAscension', FX.majuscule(FE.texteDate(get('ascension').n, false)));
    CQ.texte('rPentecote', FX.majuscule(FE.texteDate(get('pentecote').n, false)));
    var tot = p - FE.num(a, 3, 22), tard = FE.num(a, 4, 25) - p;
    FX.ecrire('phrase', 'En ' + a + ', Pâques tombe le ' + FE.jourMois(p) + ' : ' +
      (tot === 0 ? 'la date la plus précoce possible.' : tard === 0 ? 'la date la plus tardive possible.' :
        tot + (tot > 1 ? ' jours' : ' jour') + ' après la date la plus précoce (22 mars) et ' + tard + (tard > 1 ? ' jours' : ' jour') + ' avant la plus tardive (25 avril).'));
    FX.ecrire('titreMobiles', 'Les fêtes liées à Pâques en ' + a);
    CQ.lignes('mobiles', m.map(function (x) { return { cellules: [x.nom, FX.majuscule(FE.texteDate(x.n, false)), ecart(x.ecart)], classe: x.ecart === 0 ? 'ligne-active' : '' }; }));
    var l = [], k;
    for (k = a; k < a + 10 && k <= 3000; k++) {
      l.push({ cellules: [String(k), FX.majuscule(FE.texteDate(FE.paques(k), false)), FX.majuscule(FE.texteDate(FE.paques(k) + 1, false))], classe: k === a ? 'ligne-active' : '' });
    }
    CQ.lignes('suivantes', l);
    FX.ecrire('titreSuivantes', 'Pâques de ' + a + ' à ' + (k - 1));
  }

  FX.defaut('a', FX.anneeCourante());
  CQ.surChangement(['a'], recalcul);
  CQ.initPartage(recalcul);
}());
