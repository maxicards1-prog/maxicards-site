/* Ponts et congés : les périodes de repos de l'année autour des jours fériés, selon le nombre de jours de congé posés.
   Calcul direct sur la liste des jours travaillés (FE.periodes, 10 jours de congé au plus) : aucune boucle non bornée. */
(function () {
  'use strict';
  var FE = window.FE, CQ = window.CQ, FX = window.FX;
  var choisie = 0, liste = [];

  function lieu() { var l = CQ.valeur('l'); return FE.lieuValide(l) ? l : 'fr'; }
  function conges() { var k = Math.round(CQ.nombre('k', 1, 10)); return isFinite(k) ? k : 4; }
  function du(p) {
    return 'Du ' + FE.texteDate(p.debut, false) + (FE.date(p.debut).a !== FE.date(p.fin).a ? ' ' + FE.date(p.debut).a : '') +
      ' au ' + FE.texteDate(p.fin, FE.date(p.debut).a !== FE.date(p.fin).a);
  }
  function meilleure(l) {
    var b = -1;
    l.forEach(function (p, i) {
      if (p.k < 1) { return; }
      if (b < 0 || p.longueur / p.k > l[b].longueur / l[b].k || (p.longueur / p.k === l[b].longueur / l[b].k && p.longueur > l[b].longueur)) { b = i; }
    });
    return b;
  }

  function dessiner() {
    var p = liste[choisie];
    if (!p) { FX.vider(document.getElementById('cal')); return; }
    var marques = {}, n, lieuChoisi = lieu();
    for (n = p.debut; n <= p.fin; n++) { marques[n] = { classe: 'repos', titre: 'Repos' }; }
    p.poses.forEach(function (x) { marques[x] = { classe: 'pose', titre: 'Jour de congé à poser' }; });
    p.feries.forEach(function (f) { marques[f.n] = { classe: 'ferie', titre: f.nom }; });
    var d = FE.date(p.debut), f = FE.date(p.fin), nb = (f.a - d.a) * 12 + f.mo - d.mo + 1;
    FX.calendrier('cal', d.a, d.mo, nb, marques);
    FX.ecrire('titreCal', du(p) + ' : ' + p.longueur + ' jours de repos' + (lieuChoisi === 'fr' ? '' : ' (' + FE.LIEUX[lieuChoisi].nom + ')'));
    Array.prototype.forEach.call(document.querySelectorAll('#periodes li'), function (li, i) { li.classList.toggle('meilleure', i === choisie); });
  }

  function recalcul() {
    var a = FX.annee('a', FE.FERIES_MIN, FE.FERIES_MAX, FX.anneeCourante()), k = conges(), l = lieu();
    liste = FE.periodes(a, l, k);
    var b = meilleure(liste), ul = document.getElementById('periodes'), uns = 0, longs = 0;
    choisie = b >= 0 ? b : 0;
    FX.vider(ul);
    liste.forEach(function (p, i) {
      if (p.k === 1) { uns++; }
      if (p.k === 0) { longs++; }
      var li = FX.el('li'), j = FX.el('span', 'jours', String(p.longueur)), txt = FX.el('div'), bouton = FX.el('button', '', 'Voir');
      j.appendChild(FX.el('small', '', 'jours'));
      li.appendChild(j);
      txt.appendChild(FX.el('strong', '', du(p)));
      txt.appendChild(FX.el('span', 'detail', (p.k === 0 ? 'Sans poser de congé' : 'Congés à poser (' + p.k + ') : ' +
        p.poses.map(function (x) { return FE.JOURS[FE.jourSemaine(x)] + ' ' + FE.jourMois(x); }).join(', ')) +
        ' · ' + p.feries.map(function (f) { return f.nom; }).join(', ')));
      li.appendChild(txt);
      bouton.type = 'button';
      bouton.setAttribute('aria-label', 'Voir sur le calendrier : ' + du(p));
      bouton.addEventListener('click', function () { choisie = i; dessiner(); });
      txt.appendChild(bouton);
      ul.appendChild(li);
    });
    var m = liste[b];
    CQ.texte('rMeilleur', m ? m.longueur + ' jours' : '–');
    FX.ecrire('lMeilleur', m ? 'de repos pour ' + m.k + (m.k > 1 ? ' jours' : ' jour') + ' de congé : le meilleur rapport de ' + a : 'meilleur rapport');
    CQ.texte('rPonts', String(uns));
    CQ.texte('rLongs', String(longs));
    FX.ecrire('phrase', liste.length ? 'En ' + a + ', avec ' + k + (k > 1 ? ' jours' : ' jour') + ' de congé au plus : ' + liste.length +
      ' façons de profiter des jours fériés, dont ' + uns + (uns > 1 ? ' ponts' : ' pont') + ' d\'un seul jour de congé.' :
      'Aucun jour férié ne tombe en semaine avec ces réglages.');
    dessiner();
  }

  FX.defaut('a', FX.anneeCourante());
  CQ.surChangement(['a', 'k', 'l'], recalcul);
  CQ.initPartage(recalcul);
}());
