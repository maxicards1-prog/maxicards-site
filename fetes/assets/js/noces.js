/* Noces de mariage : nom de l'anniversaire selon le nombre d'années, ou à partir de la date du mariage.
   La date du mariage n'est jamais écrite dans l'adresse de la page ni gardée : seul le nombre d'années (?n=) peut l'être. */
(function () {
  'use strict';
  var FE = window.FE, CQ = window.CQ, FX = window.FX;

  function nom(n) { var x = FE.noces(n); return x ? 'Noces ' + FE.deNoces(x) : 'Pas de nom traditionnel'; }
  // Anniversaire de l'année a (un mariage du 29 février se fête le 28 février les années non bissextiles).
  function anniversaire(d, a) { return FE.num(a, d.mo, Math.min(d.j, FE.joursDansMois(a, d.mo))); }

  function parNombre() {
    var e = document.getElementById('n'), n = Math.round(CQ.nombre('n', 1, 80));
    if (!isFinite(n) || (e && e.value.trim() === '')) { n = 25; }
    CQ.texte('rNom', nom(n));
    FX.ecrire('lNom', n + (n > 1 ? ' ans' : ' an') + ' de mariage');
    FX.ecrire('phraseN', FE.noces(n) ? '' : 'La liste traditionnelle donne un nom à chaque année de 1 à 60 ans, puis à 65, 70, 75 et 80 ans.');
    Array.prototype.forEach.call(document.querySelectorAll('#listeNoces tr'), function (tr) {
      tr.classList.toggle('ligne-active', tr.getAttribute('data-n') === String(n));
    });
  }

  function parDate() {
    var n = FE.lireIso(CQ.valeur('mariage')), auj = FX.aujourdhui();
    if (!isFinite(n) || n > auj || FE.date(n).a < 1900) {
      CQ.texte('rAns', '–'); CQ.texte('rActuelles', '–'); CQ.texte('rProchaines', '–');
      FX.ecrire('lProchaines', 'prochain anniversaire');
      FX.ecrire('phraseD', CQ.valeur('mariage') ? 'Saisissez une date passée, après 1900.' : '');
      return;
    }
    var d = FE.date(n), t = FE.date(auj), ans = t.a - d.a - (anniversaire(d, t.a) > auj ? 1 : 0);
    var prochainAn = d.a + ans + 1, prochain = anniversaire(d, prochainAn);
    if (anniversaire(d, t.a) === auj && ans > 0) { prochainAn = d.a + ans; prochain = auj; }
    var k = prochainAn - d.a;
    CQ.texte('rAns', String(ans));
    CQ.texte('rActuelles', ans >= 1 ? nom(ans) : 'Première année');
    CQ.texte('rProchaines', nom(k));
    FX.ecrire('lProchaines', k + (k > 1 ? ' ans' : ' an') + ', le ' + FE.texteDate(prochain) + ' (' + FX.dans(prochain, auj) + ')');
    FX.ecrire('phraseD', prochain === auj ? 'Joyeux anniversaire de mariage : ' + k + (k > 1 ? ' ans' : ' an') + " aujourd'hui !" : '');
  }

  CQ.surChangement(['n'], parNombre);
  CQ.surChangement(['mariage'], parDate);
  CQ.initPartage(parNombre);
  parDate();
}());
