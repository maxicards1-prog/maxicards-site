/* Décalage horaire entre deux villes : écart en ce moment, heures en direct, écart sur toute l'année et prochains changements. */
(function () {
  'use strict';
  var CQ = window.CQ, HE = window.HE, HX = window.HX;

  function villes() { return [HX.ville(CQ.valeur('a')) || HX.ville('paris'), HX.ville(CQ.valeur('b')) || HX.ville('new-york')]; }

  function tic() {
    var vs = villes(), now = Date.now();
    HX.ecrire('rA', HX.hm(HE.parties(vs[0].zone, now)));
    HX.ecrire('rB', HX.hm(HE.parties(vs[1].zone, now)));
  }

  function recalcul() {
    var vs = villes(), A = vs[0], B = vs[1], now = Date.now();
    var e = HE.ecartZones(A.zone, B.zone, now);
    var dA = HE.decalage(A.zone, now), dB = HE.decalage(B.zone, now);
    CQ.texte('rEcart', e === 0 ? '0 h' : (e > 0 ? '+' : '−') + HE.texteDuree(e));
    HX.ecrire('lA', 'heure à ' + A.nom);
    HX.ecrire('lB', 'heure à ' + B.nom);
    tic();
    var p = A.id === B.id ? 'Choisissez deux villes différentes.' :
      e === 0 ? A.nom + ' et ' + B.nom + ' ont la même heure en ce moment (' + HE.texteUTC(dA) + ').' :
        'À ' + B.nom + ', il est ' + HE.texteDuree(e) + (e > 0 ? ' de plus' : ' de moins') + ' qu\'à ' + A.nom + ' en ce moment (' +
        A.nom + ' : ' + HE.texteUTC(dA) + ', ' + B.nom + ' : ' + HE.texteUTC(dB) + ').';
    // Écart sur l'année en cours (dates à l'heure de la ville de départ).
    var an = HE.parties(A.zone, now).a, per = HE.periodesEcart(A.zone, B.zone, an);
    HX.ecrire('anPeriodes', String(an));
    CQ.lignes('periodes', per.map(function (x, i) {
      var du = i === 0 ? '1er janvier' : HX.jourMois(HE.parties(A.zone, x.debut));
      var au = i === per.length - 1 ? '31 décembre' : HX.jourMois(HE.parties(A.zone, x.fin));
      var actuelle = now >= x.debut && now < x.fin;
      return { cellules: [du, au, x.ecart === 0 ? 'même heure' : HE.texteEcart(x.ecart) + ' à ' + B.nom], classe: actuelle ? 'ligne-active' : '' };
    }));
    if (per.length > 1) {
      p += ' L\'écart change ' + (per.length - 1) + ' fois en ' + an + ' : voyez le tableau ci-dessous.';
    } else if (A.id !== B.id) {
      p += ' Cet écart ne change pas en ' + an + '.';
    }
    CQ.texte('phrase', p);
    // Prochains changements d'heure des deux villes (sur un peu plus d'un an).
    var lignes = [];
    [A, B].forEach(function (v, i) {
      if (i === 1 && B.zone === A.zone) { return; }
      HE.transitions(v.zone, an).concat(HE.transitions(v.zone, an + 1)).forEach(function (t) {
        if (t.ms > now && t.ms < now + 400 * HE.JOUR) {
          lignes.push({ ms: t.ms, cellules: [v.nom, HX.dateLongue(HE.parties(v.zone, t.ms)), HX.avantChangement(v.zone, t) + ' → ' + HX.heureTexte(HE.parties(v.zone, t.ms))] });
        }
      });
    });
    lignes.sort(function (x, y) { return x.ms - y.ms; });
    if (!lignes.length) { lignes.push({ cellules: ['Aucun changement d\'heure prévu dans l\'année pour ces deux villes.', '', ''] }); }
    CQ.lignes('trans', lignes);
  }

  CQ.el('inverser').addEventListener('click', function () {
    var a = CQ.el('a'), b = CQ.el('b'), x = a.value;
    a.value = b.value; b.value = x;
    HX.signaler(a);
    recalcul();
  });
  CQ.surChangement(['a', 'b'], recalcul);
  CQ.initPartage(function () { recalcul(); HX.chaqueSeconde(tic); });
}());
