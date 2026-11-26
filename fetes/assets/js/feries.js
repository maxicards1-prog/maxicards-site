/* Jours fériés d'une année : tableau, prochain jour férié, jours ouvrés et calendrier de l'année. */
(function () {
  'use strict';
  var FE = window.FE, CQ = window.CQ, FX = window.FX;

  function lieu() { var l = CQ.valeur('l'); return FE.lieuValide(l) ? l : 'fr'; }

  function prochain(l, auj) {
    var a = FE.date(auj).a, liste = FE.feries(a, l).concat(a < FE.FERIES_MAX ? FE.feries(a + 1, l) : []), i;
    for (i = 0; i < liste.length; i++) { if (liste[i].n >= auj) { return liste[i]; } }
    return null;
  }

  function recalcul() {
    var a = FX.annee('a', FE.FERIES_MIN, FE.FERIES_MAX, FX.anneeCourante()), l = lieu(), auj = FX.aujourdhui();
    var liste = FE.feries(a, l), jours = {}, semaine = 0, weekend = 0, ponts = [], longs = 0, marques = {};
    liste.forEach(function (x) {
      marques[x.n] = { classe: x.local ? 'local' : 'ferie', titre: marques[x.n] ? marques[x.n].titre + ' et ' + x.nom : x.nom };
      if (jours[x.n]) { return; }
      jours[x.n] = true;
      if (x.js === 0 || x.js === 6) { weekend++; } else { semaine++; }
      if (x.effet === 'pont-lundi' || x.effet === 'pont-vendredi') { ponts.push(x); }
      if (x.effet === 'lundi' || x.effet === 'vendredi') { longs++; }
    });
    var p = prochain(l, auj);
    CQ.texte('rProchain', p ? p.nom : '–');
    FX.ecrire('lProchain', p ? FX.majuscule(FE.texteDate(p.n)) + ', ' + FX.dans(p.n, auj) : 'prochain jour férié');
    CQ.texte('rSemaine', String(semaine));
    CQ.texte('rOuvres', String(FE.ouvres(a, l).total));
    FX.ecrire('titreTableau', 'Les jours fériés de ' + a + ' (' + FE.LIEUX[l].nom + ')');
    FX.ecrire('titreCal', 'Le calendrier ' + a);
    // Tableau (texte seulement, étiquette d'effet créée élément par élément).
    var corps = document.getElementById('corps'), suivant = p ? p.n : NaN;
    FX.vider(corps);
    liste.forEach(function (x) {
      var tr = FX.el('tr', x.n < auj ? 'passe' : x.n === suivant ? 'prochain' : ''), td = FX.el('td');
      tr.appendChild(FX.el('td', '', x.nom + (x.local ? ' *' : '')));
      tr.appendChild(FX.el('td', '', FX.majuscule(FE.texteDate(x.n, false))));
      td.appendChild(FX.etiquette(x.effet));
      tr.appendChild(td);
      corps.appendChild(tr);
    });
    FX.ecrire('noteLocale', l === 'fr' ? '' : '* Jour férié propre à ce territoire, en plus des 11 jours fériés nationaux.');
    var t = 'En ' + a + ', ' + liste.length + ' jours fériés (' + FE.LIEUX[l].nom + ') : ' + semaine + ' en semaine et ' + weekend +
      ' un samedi ou un dimanche. ';
    t += ponts.length ? (ponts.length === 1 ? 'Un pont possible : ' : ponts.length + ' ponts possibles : ') +
      ponts.map(function (x) { return x.nom + ' (' + FE.JOURS[x.js] + ' ' + FE.jourMois(x.n) + ')'; }).join(', ') + '. ' : 'Aucun pont d\'un seul jour. ';
    t += longs ? (longs === 1 ? 'Un week-end de 3 jours.' : longs + ' week-ends de 3 jours.') : '';
    FX.ecrire('phrase', t);
    FX.calendrier('cal', a, 1, 12, marques);
  }

  FX.defaut('a', FX.anneeCourante());
  CQ.surChangement(['a', 'l'], recalcul);
  CQ.initPartage(recalcul);
}());
